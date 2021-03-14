<style scoped>
  .card >>> .card__title {
    padding-top: 0;
    padding-bottom: 0;
  }

  .chip {
    font-size: 14px;
    border: none;
  }

  .chip >>> .badge__close {
    margin-left: 0;
  }

  .badge__handle {
    cursor: move;
  }

  .badge__content {
    position: relative;
    margin-right: 2px;
  }

  .badge__input {
    position: absolute;
    width: 100%;
    padding-left: 4px;
    color: transparent;
  }

  .badge__label {
    padding: 0 4px;
  }

  .key {
    font-family: 'Roboto Mono', monospace;
  }

  .key >>> input,
  .badge__input {
    caret-color: black !important;
  }

  /* Matches `.chip`. */
  .new-badge-button {
    border: none;
    height: 32px;
    margin: 4px;
    min-width: 0;
  }
</style>

<template>
  <v-dialog :value="true" persistent :max-width="maxWidth">
    <v-card>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat color="primary" @click="suggest">
          Generate
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn flat color="primary" @click="copySecret">
          Copy
        </v-btn>
        <v-spacer></v-spacer>
      </v-card-actions>
      <v-card-text class="pt-0">
        <v-text-field :type="reveal ? 'text' : 'password'"
          solo class="key" v-model="draft.secret"
          :append-icon="reveal ? 'visibility_off' : 'visibility'"
          :append-icon-cb="() => reveal = !reveal">
        </v-text-field>
        <strength-score :value="strengthScore"></strength-score>
        <draggable v-model="draft.chips" :options="draggableOptions" :move="move">
          <v-chip disabled outline class="elevation-3" color="black"
            :close="draft.chips.length > 1 || index > 0"
            v-for="(value, index) in draft.chips" :key="index"
            @input="removeChip(index)">
            <v-icon small class="badge__handle">drag_indicator</v-icon>
            <div class="badge__content">
              <input type="text" :value="value" class="badge__input" ref="chips"
                @input.stop="setChip(index, $event.target.value)">
              <span class="badge__label">{{ value }}</span>
            </div>
          </v-chip>
          <v-btn @click="addChip" outline round class="new-badge-button elevation-3">
            <v-icon left small>fa-plus</v-icon>Label
          </v-btn>
        </draggable>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <v-progress-circular indeterminate color="green"
          v-if="inProgress"></v-progress-circular>
        <v-spacer></v-spacer>
        <v-btn flat v-if="identifier !== null" color="error" @click="requestRemoval">
          Remove
        </v-btn>
        <v-btn flat color="primary" @click="requestDiscard">
          Cancel
        </v-btn>
        <v-btn flat color="primary" @click="save">
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
    <yes-no-dialog v-model="removalConfirmation" @affirm="performRemoval"
      message="Are you sure?"></yes-no-dialog>
    <yes-no-dialog v-model="discardConfirmation" @affirm="performDiscard"
      message="Discard changes?"></yes-no-dialog>
  </v-dialog>
</template>

<script lang="ts">
import Vue from 'vue'
import Draggable from 'vuedraggable'
import YesNoDialog from './YesNoDialog.vue'
import { concat, interval, Subject, merge } from 'rxjs'
import { switchMap, take, takeUntil, takeWhile, tap, filter } from 'rxjs/operators'
import { XL_MINIMAL_WIDTH } from './dimensions'
import { generateInclusiveCombination, createCharacterRange } from '@/combinatorics'
import isEqual from 'lodash/isEqual'
import { Key } from '@/redux/entities'
import { option, function as fn, array } from 'fp-ts'
import { userKeys, inProgress } from '@/redux/modules/user/keys/selectors'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { create, delete_, update, creationSignal, updationSignal, deletionSignal } from '@/redux/modules/user/keys/actions'
import cloneDeep from 'lodash/cloneDeep'
import { DeepReadonly } from 'ts-essentials'
import { isActionSuccess3 } from '@/redux/flow_signal'
import { logOut } from '@/redux/modules/user/account/actions'
import { isActionOf } from 'typesafe-actions'
import { container } from 'tsyringe'
import StrengthScore from './StrengthScore.vue'
import { Score, StrengthTestService, STRENGTH_TEST_SERVICE_TOKEN } from '@/cryptography/strength_test_service'

const PASSWORD_SUGGESTION_LENGTH = 12
const TYPEWRITER_DELAY_IN_MILLIS = 50

const generateSuggestion = (length: number): string => generateInclusiveCombination(
  [
    '@#$_&-+()/' + '*"\':;!?',
    createCharacterRange('0', '9'),
    createCharacterRange('A', 'Z'),
    createCharacterRange('a', 'z')
  ],
  length
)

interface Draft {
  secret: string;
  chips: string[];
}

const emptyDraft = (): Draft => ({
  secret: '',
  chips: ['']
})

const draftByIdentifier = (keys: DeepReadonly<Key[]>, identifier: string | null): Draft => {
  return fn.pipe(
    option.fromNullable(identifier),
    option.chain((identifier) => array.findFirst<DeepReadonly<Key>>(
      (key) => key.identifier === identifier)([...keys])),
    option.map((key) => ({
      secret: key.value,
      chips: [...key.tags]
    })),
    option.getOrElse(emptyDraft)
  )
}

export default Vue.extend({
  props: ['params'],
  components: {
    draggable: Draggable,
    strengthScore: StrengthScore,
    yesNoDialog: YesNoDialog
  },
  data () {
    const identifier: string | null = this.params.identifier
    return {
      generatorSubject: new Subject<void>(),
      discardConfirmation: false,
      removalConfirmation: false,
      identifier,
      draft: emptyDraft(),
      reveal: this.params.reveal
    }
  },
  created () {
    this.draft = this.initialDraft()
    this.generatorSubject.pipe(
      switchMap(() => {
        const suggestion = generateSuggestion(PASSWORD_SUGGESTION_LENGTH)
        return concat(
          interval(TYPEWRITER_DELAY_IN_MILLIS).pipe(
            takeWhile(() => this.draft.secret.length > 0),
            tap(() => {
              this.draft.secret = this.draft.secret.slice(0, -1)
            })
          ),
          interval(TYPEWRITER_DELAY_IN_MILLIS).pipe(
            take(suggestion.length),
            tap((index) => {
              this.draft.secret = suggestion.slice(0, index + 1)
            })
          )
        )
      }),
      takeUntil(this.$data.$destruction)
    ).subscribe()
    this.$data.$actions.pipe(
      filter(isActionSuccess3([creationSignal, updationSignal, deletionSignal])),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.$emit('close')
    })
    const unloadHandlerRemoval = merge(
      this.$data.$destruction,
      this.$data.$actions.pipe(filter(isActionOf(logOut)))
    ).subscribe(() => {
      window.removeEventListener('beforeunload', this.onBeforeUnload)
      unloadHandlerRemoval.unsubscribe()
    })
  },
  mounted () {
    if (this.identifier === null) {
      this.focusChip(0)
    }
    window.addEventListener('beforeunload', this.onBeforeUnload)
  },
  computed: {
    draggableOptions (): { handle: string; animation: number } {
      return {
        handle: '.badge__handle',
        animation: 150
      }
    },
    maxWidth (): number {
      return XL_MINIMAL_WIDTH * (3 / 12)
    },
    inProgress (): boolean {
      return inProgress(this.$data.$state)
    },
    strengthScore (): Score {
      const service = container.resolve<StrengthTestService>(STRENGTH_TEST_SERVICE_TOKEN)
      return service.score(this.draft.secret, this.draft.chips)
    }
  },
  methods: {
    initialDraft () {
      return draftByIdentifier(userKeys(this.$data.$state), this.identifier)
    },
    hasChanges (): boolean {
      return !isEqual(this.draft, this.initialDraft())
    },
    performDiscard () {
      this.discardConfirmation = false
      this.$emit('close')
    },
    requestDiscard () {
      if (this.hasChanges()) {
        this.discardConfirmation = true
      } else {
        this.$emit('close')
      }
    },
    onBeforeUnload (event: BeforeUnloadEvent): boolean | null {
      if (this.hasChanges()) {
        event.returnValue = true
        return true
      } else {
        return null
      }
    },
    suggest () {
      this.generatorSubject.next()
    },
    async copySecret (): Promise<void> {
      await navigator.clipboard.writeText(this.draft.secret)
      this.dispatch(showToast({ message: 'Done. Remember to save!' }))
    },
    move ({ relatedContext }: { relatedContext: { element?: HTMLElement } }): boolean {
      return relatedContext.element !== undefined
    },
    setChip (index: number, value: string) {
      this.$set(this.draft.chips, index, value)
    },
    removeChip (index: number) {
      this.draft.chips.splice(index, 1)
    },
    async addChip (): Promise<void> {
      this.draft.chips.push('')
      await this.$nextTick()
      this.focusChip(-1)
    },
    save () {
      if (this.identifier === null) {
        this.dispatch(create(cloneDeep({
          value: this.draft.secret,
          tags: this.draft.chips
        })))
      } else {
        this.dispatch(update(cloneDeep({
          identifier: this.identifier!,
          value: this.draft.secret,
          tags: this.draft.chips
        })))
      }
    },
    performRemoval () {
      this.removalConfirmation = false
      this.dispatch(delete_(this.identifier!))
    },
    requestRemoval () {
      this.removalConfirmation = true
    },
    focusChip (pointer: number) {
      const index = (pointer + this.draft.chips.length) % this.draft.chips.length
      ;(this.$refs.chips as HTMLInputElement[])[index].focus()
    }
  }
})
</script>
