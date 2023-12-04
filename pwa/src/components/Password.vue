<style scoped>
  .header__password {
    white-space: pre-wrap;
    word-break: break-all;
  }

  .header__password,
  .editor__password {
    font-family: 'Roboto Mono';
  }
</style>

<template>
  <v-card>
    <template v-if="!edited">
      <template v-if="autosavePrompt && clique.busyness === 0">
        <v-card-actions>
          <div class="text-button px-2 warning--text">
            Unsaved draft!
          </div>
          <v-spacer></v-spacer>
          <v-btn text @click="discardDraft">Discard</v-btn>
          <v-btn text outlined @click="restoreDraft">
            See <v-icon right small>edit</v-icon>
          </v-btn>
        </v-card-actions>
        <v-divider></v-divider>
      </template>
      <v-card-actions>
        <v-btn text :disabled="isValueEmpty" @click="copyText(reprPassword.value)">
          Copy
        </v-btn>
        <v-btn icon :disabled="isValueEmpty" @click="toggleReveal">
          <v-icon>{{ reveal ? 'visibility_off' : 'visibility' }}</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn icon :disabled="!canAccessApi || autosavePrompt || togglingPin"
          @click="togglePin">
          <v-icon :class="{ 'material-icons-outlined': !isPinned }">push_pin</v-icon>
        </v-btn>
        <v-btn text @click="editBaseline" :loading="clique.busyness > 0"
          :disabled="!canAccessApi || autosavePrompt" v-if="editable">
          Edit
        </v-btn>
      </v-card-actions>
    </template>
    <template v-else>
      <v-card-actions>
        <template v-if="delRequested">
          <div class="text-button px-2">Delete?</div>
          <v-spacer></v-spacer>
          <v-btn text @click="abandonDel">No</v-btn>
          <v-btn text @click="remove" color="error">Yes</v-btn>
        </template>
        <template v-else>
          <v-btn text @click="cancel">Discard</v-btn>
          <v-spacer></v-spacer>
          <v-btn icon @click="requestDel" :loading="deleting" :disabled="hasNoParent">
            <v-icon color="error">delete</v-icon>
          </v-btn>
          <v-btn text @click="save" :loading="saving">Save</v-btn>
        </template>
      </v-card-actions>
    </template>
    <v-expand-transition>
      <div v-if="scoreColor && !edited">
        <v-divider></v-divider>
        <strength-score :color="scoreColor"></strength-score>
      </div>
    </v-expand-transition>
    <v-expand-transition>
      <div v-if="reveal">
        <v-divider></v-divider>
        <v-card-text>
          <div class="header__password">
            {{ reprPassword.value }}
          </div>
        </v-card-text>
      </div>
    </v-expand-transition>
    <v-expand-transition>
      <div v-if="!edited && reprPassword.tags.length > 0">
        <v-divider></v-divider>
        <div class="pa-4">
          <v-chip v-for="(label, index) in reprPassword.tags" :key="index"
            class="ma-1 elevation-3" outlined @click="copyText(label)">
            <span class="text-truncate">{{ label }}</span>
          </v-chip>
        </div>
      </div>
    </v-expand-transition>
    <v-expand-transition>
      <div v-if="edited">
        <v-divider></v-divider>
        <div class="pa-4">
          <draggable :value="content.tags" @input="reorder"
            handle=".v-input__icon--prepend">
            <form-text-field v-for="(label, index) in content.tags" :key="index" solo
              :value="label" label="Label" :hide-details="true" prepend-icon="drag_indicator"
              :append-icon="content.tags.length > 1 ? 'cancel' : undefined"
              :append-event="true" @click:append="delLabel(index)"
              :prepend-event="true" @click:prepend="dndLabel"
              class="mt-2" @input="setLabel(index, $event)" ref="labels">
            </form-text-field>
          </draggable>
          <v-btn block depressed class="mt-4" @click="addLabel">Add label</v-btn>
        </div>
      </div>
    </v-expand-transition>
    <v-expand-transition>
      <div v-if="edited">
        <v-divider></v-divider>
        <strength-score :color="passwordStrength.color" :value="passwordStrength.value">
        </strength-score>
        <div class="pa-4">
          <v-textarea solo hide-details :value="content.value" :rows="3"
            placeholder="Passphrase" @input="setValue" class="editor__password"></v-textarea>
          <div class="d-flex mt-4">
            <div class="flex-1">
              <v-btn block depressed @click="suggest">Generate</v-btn>
            </div>
            <div class="flex-1 ml-2">
              <v-btn block depressed @click="copyText(content.value)">Copy</v-btn>
            </div>
          </div>
        </div>
      </div>
    </v-expand-transition>
  </v-card>
</template>

<script lang="ts">
import { function as fn, option } from 'fp-ts'
import cloneDeep from 'lodash/cloneDeep'
import isEqual from 'lodash/isEqual'
import { Subject, of, iif, timer, EMPTY, interval } from 'rxjs'
import { filter, mapTo, switchMap, takeUntil, take, tap } from 'rxjs/operators'
import { DeepReadonly } from 'ts-essentials'
import { isActionOf } from 'typesafe-actions'
import Vue, { PropType } from 'vue'
import Draggable from 'vuedraggable'
import { generateInclusiveCombination, createCharacterRange } from '@/combinatorics'
import { Color, Score, getStrengthTestService } from '@/cryptography/strength_test_service'
import { Password } from '@/redux/domain'
import { isSignalFinale, isSignalSuccess } from '@/redux/flow_signal'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { canAccessApi } from '@/redux/modules/user/account/selectors'
import {
  commitShadow,
  integrateClique,
  cancelShadow,
  obliterateClique,
  cliqueIntegrationSignal,
  cliqueObliterationSignal,
  extractPassword,
  toggleCliquePin,
  keyPinTogglingSignal
} from '@/redux/modules/user/keys/actions'
import {
  Clique,
  getCliqueRepr,
  getFrontShadow,
  getCliqueRoot
} from '@/redux/modules/user/keys/selectors'
import StrengthScore from './StrengthScore.vue'

const EMPTY_PASSWORD: DeepReadonly<Password> = { value: '', tags: [''] }

const clonePassword = (password: DeepReadonly<Password>): Password => {
  return cloneDeep(password) as Password
}

enum AutosaveEventType {
  DELAYED_UPDATE = 'DELAYED_UPDATE',
  IMMEDIATE_UPDATE = 'IMMEDIATE_UPDATE',
  INTERRUPT = 'INTERRUPT'
}
interface DelayedUpdate {
  type: AutosaveEventType.DELAYED_UPDATE;
  password: Password;
}
interface ImmediateUpdate {
  type: AutosaveEventType.IMMEDIATE_UPDATE;
  password: Password;
}
interface Interrupt {
  type: AutosaveEventType.INTERRUPT;
}
type AutosaveEvent = DelayedUpdate | ImmediateUpdate | Interrupt

const PASSPHRASE_SUGGESTION_LENGTH = 12
const TYPEWRITER_DELAY_IN_MILLIS = 50

const makeSuggestion = (length: number): string => generateInclusiveCombination(
  [
    '@#$_&-+()/' + '*"\':;!?',
    createCharacterRange('0', '9'),
    createCharacterRange('A', 'Z'),
    createCharacterRange('a', 'z')
  ],
  length
)

export default Vue.extend({
  components: {
    draggable: Draggable,
    strengthScore: StrengthScore
  },
  props: {
    debounceMillis: {
      type: Number,
      default: null
    },
    clique: {
      type: Object as PropType<DeepReadonly<Clique>>,
      required: true
    },
    editable: {
      type: Boolean,
      default: true
    },
    initEdit: {
      type: Boolean,
      default: false
    },
    scoreColor: {
      type: String as PropType<Color>,
      default: null
    }
  },
  data () {
    return {
      reveal: false,
      edited: this.initEdit,
      content: clonePassword(EMPTY_PASSWORD),
      togglingPin: false,
      autosaveQueue$: new Subject<AutosaveEvent>(),
      saving: false,
      deleting: false,
      delRequested: false,
      generator$: new Subject<void>()
    }
  },
  created () {
    this.$data.$actions.pipe(
      filter(isActionOf(keyPinTogglingSignal)),
      filter((action: ReturnType<typeof keyPinTogglingSignal>) => {
        return action.meta.clique === this.clique.name
      }),
      takeUntil(this.$data.$destruction)
    ).subscribe((action: ReturnType<typeof keyPinTogglingSignal>) => {
      if (isSignalFinale(action.payload)) {
        this.togglingPin = false
      }
    })
    this.autosaveQueue$.pipe(
      switchMap((event: AutosaveEvent) => {
        switch (event.type) {
          case AutosaveEventType.DELAYED_UPDATE:
            return iif(
              () => this.debounceMillis === null,
              of(event.password),
              timer(this.debounceMillis).pipe(mapTo(event.password))
            )
          case AutosaveEventType.IMMEDIATE_UPDATE:
            return of(event.password)
          case AutosaveEventType.INTERRUPT:
            return EMPTY
        }
      }),
      takeUntil(this.$data.$destruction)
    ).subscribe((password) => {
      this.dispatch(commitShadow({
        clique: this.clique.name,
        ...password
      }))
    })
    this.$data.$actions.pipe(
      filter(isActionOf(cliqueIntegrationSignal)),
      filter((action: ReturnType<typeof cliqueIntegrationSignal>) => {
        return action.meta.clique === this.clique.name
      }),
      takeUntil(this.$data.$destruction)
    ).subscribe((action: ReturnType<typeof cliqueIntegrationSignal>) => {
      if (isSignalFinale(action.payload)) {
        this.saving = false
      }
      if (isSignalSuccess(action.payload)) {
        this.edited = false
        this.$emit('save')
      }
    })
    this.$data.$actions.pipe(
      filter(isActionOf(cliqueObliterationSignal)),
      filter((action: ReturnType<typeof cliqueObliterationSignal>) => {
        return action.meta.clique === this.clique.name
      }),
      takeUntil(this.$data.$destruction)
    ).subscribe((action: ReturnType<typeof cliqueObliterationSignal>) => {
      if (isSignalFinale(action.payload)) {
        this.deleting = false
      }
      if (isSignalSuccess(action.payload)) {
        this.edited = false
        this.$emit('delete')
      }
    })
    this.generator$.pipe(
      switchMap(() => {
        this.content.value = ''
        const suggestion = makeSuggestion(PASSPHRASE_SUGGESTION_LENGTH)
        return interval(TYPEWRITER_DELAY_IN_MILLIS).pipe(
          take(suggestion.length),
          tap((index) => {
            this.setValue(suggestion.slice(0, index + 1))
          })
        )
      }),
      takeUntil(this.$data.$destruction)
    ).subscribe()
  },
  mounted () {
    if (this.initEdit) {
      this.focusLabel(0)
    }
  },
  computed: {
    passwordStrength (): Score {
      if (!this.edited) {
        return { value: 1, color: Color.GREEN }
      }
      return getStrengthTestService().score(this.content.value, this.content.tags)
    },
    canAccessApi (): boolean {
      return canAccessApi(this.$data.$state)
    },
    reprPassword (): DeepReadonly<Password> {
      return fn.pipe(
        getCliqueRepr(this.clique),
        option.fold(() => EMPTY_PASSWORD, extractPassword)
      )
    },
    rootPassword (): DeepReadonly<Password> {
      return fn.pipe(
        getCliqueRoot(this.clique),
        option.fold(() => EMPTY_PASSWORD, extractPassword)
      )
    },
    isValueEmpty (): boolean {
      return this.reprPassword.value.trim().length === 0
    },
    autosavePrompt (): boolean {
      return this.clique.shadows.length > 0
    },
    hasNoParent (): boolean {
      return this.clique.parent === null
    },
    isPinned (): boolean {
      return fn.pipe(
        getCliqueRoot(this.clique),
        option.fold(
          () => false,
          (root) => root.attrs.isPinned
        )
      )
    }
  },
  methods: {
    focusLabel (pointer: number) {
      const index = (pointer + this.content.tags.length) % this.content.tags.length
      ;(this.$refs.labels as HTMLInputElement[])[index].focus()
    },
    async copyText (string: string): Promise<void> {
      await navigator.clipboard.writeText(string)
      this.dispatch(showToast({ message: 'Done. Some clipboards retain history — be careful! 😱' }))
    },
    toggleReveal () {
      this.reveal = !this.reveal
    },
    togglePin () {
      this.dispatch(toggleCliquePin({
        clique: this.clique.name,
        isPinned: !this.isPinned
      }))
      this.togglingPin = true
    },
    edit (source: DeepReadonly<Password>) {
      this.reveal = false
      this.content = clonePassword(source)
      this.edited = true
    },
    autosave (autosaveEventType: AutosaveEventType.DELAYED_UPDATE | AutosaveEventType.IMMEDIATE_UPDATE) {
      this.autosaveQueue$.next({
        type: autosaveEventType,
        password: clonePassword(this.content)
      })
    },
    interruptAutosave () {
      this.autosaveQueue$.next({
        type: AutosaveEventType.INTERRUPT
      })
    },
    async addLabel () {
      this.content.tags.push('')
      await this.$nextTick()
      this.focusLabel(-1)
    },
    delLabel (index: number) {
      this.content.tags.splice(index, 1)
    },
    setLabel (index: number, value: string) {
      this.$set(this.content.tags, index, value)
      this.autosave(AutosaveEventType.DELAYED_UPDATE)
    },
    dndLabel () {
      // NOP.
    },
    reorder (result: string[]) {
      this.content.tags = result
      this.autosave(AutosaveEventType.DELAYED_UPDATE)
    },
    setValue (value: string) {
      this.content.value = value
      this.autosave(AutosaveEventType.DELAYED_UPDATE)
    },
    suggest () {
      this.generator$.next()
    },
    save () {
      // `extractPassword` to omit Vue properties.
      if (isEqual(extractPassword(this.content), this.rootPassword)) {
        this.cancel()
        return
      }
      this.saving = true
      this.autosave(AutosaveEventType.IMMEDIATE_UPDATE)
      this.dispatch(integrateClique({
        clique: this.clique.name
      }))
    },
    requestDel () {
      this.delRequested = true
    },
    abandonDel () {
      this.delRequested = false
    },
    remove () {
      this.delRequested = false
      this.deleting = true
      this.interruptAutosave()
      this.dispatch(obliterateClique({
        clique: this.clique.name
      }))
    },
    cancel () {
      this.interruptAutosave()
      this.edited = false
      this.dispatch(cancelShadow({
        clique: this.clique.name
      }))
      this.$emit('cancel')
    },
    discardDraft () {
      this.cancel()
    },
    restoreDraft () {
      this.edit(fn.pipe(
        getFrontShadow(this.clique),
        option.fold(() => EMPTY_PASSWORD, extractPassword)
      ))
    },
    editBaseline () {
      this.edit(this.reprPassword)
    }
  }
})
</script>
