<style scoped>
  .card >>> .card__title {
    padding-top: 0;
    padding-bottom: 0;
  }

  .chip {
    font-size: 14px;
    border: none;
  }

  .chip >>> .chip__close {
    margin-left: 0;
  }

  .tag__handle {
    cursor: move;
  }

  .tag__content {
    position: relative;
    margin-right: 2px;
  }

  .tag__input {
    position: absolute;
    width: 100%;
    padding-left: 4px;
    color: transparent;
  }

  .tag__label {
    padding: 0 4px;
  }

  .key {
    border-radius: 28px;
    margin: 0 4px;
  }

  .key >>> input,
  .tag__input {
    caret-color: black !important;
  }

  /* Matches `.chip`. */
  .new-tag-button {
    border: none;
    height: 34px;
    margin: 4px;
    min-width: 0;
  }
</style>

<template>
  <v-dialog :value="isVisible" persistent :max-width="maxWidth">
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
          solo class="key" v-model="secret"
          :append-icon="reveal ? 'visibility_off' : 'visibility'"
          :append-icon-cb="() => reveal = !reveal">
        </v-text-field>
        <draggable v-model="chips" :options="draggableOptions"
          :move="move" class="mt-3">
          <v-chip disabled outline class="elevation-3" color="black"
            :close="chips.length > 1 || index > 0"
            v-for="(value, index) in chips" :key="index"
            @input="removeTag(index)">
            <v-icon small class="tag__handle">drag_indicator</v-icon>
            <div class="tag__content">
              <input type="text" :value="value" class="tag__input" ref="tags"
                @input.stop="setTag(index, $event.target.value)">
              <span class="tag__label">{{ value }}</span>
            </div>
          </v-chip>
          <v-btn @click="addTag" outline round class="new-tag-button elevation-3">
            <v-icon left small>fa-plus</v-icon>Label
          </v-btn>
        </draggable>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <v-progress-circular indeterminate color="green"
          v-if="inProgress"></v-progress-circular>
        <v-spacer></v-spacer>
        <v-btn flat v-if="identifier !== null" color="error" @click="maybeRemove">
          Remove
        </v-btn>
        <v-btn flat color="primary" @click="maybeDiscard">
          Cancel
        </v-btn>
        <v-btn flat color="primary" @click="save">
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
    <yes-no-dialog v-model="removeConfirmation" @affirm="doRemove"
      message="Are you sure?"></yes-no-dialog>
    <yes-no-dialog v-model="discardConfirmation" @affirm="doDiscard"
      message="Discard changes?"></yes-no-dialog>
  </v-dialog>
</template>

<script lang="ts">
import Vue from 'vue'
import Draggable from 'vuedraggable'
import YesNoDialog from './YesNoDialog.vue'
import { concat, interval, Subject } from 'rxjs'
import { switchMap, take, takeUntil, takeWhile, tap } from 'rxjs/operators'
import { XL_MINIMAL_WIDTH } from './constants'
import { generatePassword, Undefinable } from '@/utilities'
import { editorState$, closeEditor$ } from '@/store/root/modules/interface/editor'
import cloneDeep from 'lodash/cloneDeep'
import isEqual from 'lodash/isEqual'
import { showToast$ } from '@/store/root/modules/interface/toast'
import { userKeys$, userKeysUpdate$, createUserKey$, updateUserKey$, deleteUserKey$ } from '@/store/root/modules/user'
import { Key, EditorState } from '@/store/state'

const PASSWORD_SUGGESTION_LENGTH = 12
const TYPEWRITER_DELAY_IN_MILLIS = 50

interface PasswordAttributes {
  identifier: string | null;
  secret: string;
  chips: Array<string>;
}

const getPasswordAttributes = (identifier: string | null): PasswordAttributes => {
  if (identifier === null) {
    return {
      identifier: null,
      secret: '',
      chips: ['']
    }
  } else {
    const key = userKeys$.getValue().find((item) => item.identifier === identifier)!
    return {
      identifier,
      secret: key.value,
      chips: cloneDeep(key.tags)
    }
  }
}

interface ComponentState extends PasswordAttributes {
  discardConfirmation: boolean;
  removeConfirmation: boolean;
  reveal: boolean;
}

const constructInitialState = (identifier: string | null): ComponentState => ({
  discardConfirmation: false,
  removeConfirmation: false,
  reveal: editorState$.getValue().reveal,
  ...getPasswordAttributes(identifier)
})

export default Vue.extend({
  components: {
    draggable: Draggable,
    yesNoDialog: YesNoDialog
  },
  data () {
    return {
      ...{
        draggableOptions: {
          handle: '.tag__handle',
          animation: 150
        },
        maxWidth: XL_MINIMAL_WIDTH * (3 / 12),
        generatorSubject: new Subject<void>()
      },
      ...constructInitialState(null),
      ...{
        userKeys: undefined as Undefinable<Array<Key>>,
        editorState: undefined as Undefinable<EditorState>
      }
    }
  },
  created () {
    this.generatorSubject.pipe(
      switchMap(() => {
        const suggestion = generatePassword(PASSWORD_SUGGESTION_LENGTH)
        return concat(
          interval(TYPEWRITER_DELAY_IN_MILLIS).pipe(
            takeWhile(() => this.secret.length > 0),
            tap(() => {
              this.secret = this.secret.slice(0, -1)
            })
          ),
          interval(TYPEWRITER_DELAY_IN_MILLIS).pipe(
            take(suggestion.length),
            tap((index) => {
              this.secret = suggestion.slice(0, index + 1)
            })
          )
        )
      }),
      takeUntil(this.beforeDestroy$)
    ).subscribe()
  },
  mounted () {
    window.addEventListener('beforeunload', this.onBeforeUnload)
  },
  beforeDestroy () {
    window.removeEventListener('beforeunload', this.onBeforeUnload)
    if (this.isVisible) {
      closeEditor$.next()
    }
  },
  subscriptions () {
    return {
      userKeys: userKeys$,
      inProgress: userKeysUpdate$,
      editorState: editorState$
    }
  },
  computed: {
    isVisible (): boolean {
      return this.editorState?.show || false
    }
  },
  methods: {
    hasChanges (): boolean {
      const attributes = getPasswordAttributes(this.identifier)
      return !(this.secret === attributes.secret && isEqual(this.chips, attributes.chips))
    },
    doDiscard (): void {
      this.discardConfirmation = false
      closeEditor$.next()
    },
    maybeDiscard (): void {
      if (this.hasChanges()) {
        this.discardConfirmation = true
      } else {
        closeEditor$.next()
      }
    },
    onBeforeUnload (event: BeforeUnloadEvent): boolean | null {
      if (this.isVisible && this.hasChanges()) {
        event.returnValue = true
        return true
      } else {
        return null
      }
    },
    suggest (): void {
      this.generatorSubject.next()
    },
    async copySecret (): Promise<void> {
      await navigator.clipboard.writeText(this.secret)
      showToast$.next({ message: 'Done. Remember to save!' })
    },
    move ({ relatedContext }: { relatedContext: { element?: HTMLElement } }): boolean {
      return relatedContext.element !== undefined
    },
    setTag (index: number, value: string): void {
      this.$set(this.chips, index, value)
    },
    removeTag (index: number): void {
      this.chips.splice(index, 1)
    },
    async addTag (): Promise<void> {
      this.chips.push('')
      await this.$nextTick()
      this.focusTag(-1)
    },
    save (): void {
      if (this.identifier === null) {
        createUserKey$.next({
          value: this.secret,
          tags: cloneDeep(this.chips)
        })
      } else {
        updateUserKey$.next({
          identifier: this.identifier!,
          value: this.secret,
          tags: cloneDeep(this.chips)
        })
      }
    },
    doRemove (): void {
      this.removeConfirmation = false
      deleteUserKey$.next(this.identifier!)
    },
    maybeRemove (): void {
      this.removeConfirmation = true
    },
    focusTag (pointer: number): void {
      const index = (pointer + this.chips.length) % this.chips.length
      ;(this.$refs.tags as HTMLInputElement[])[index].focus()
    }
  },
  watch: {
    async isVisible (value: boolean): Promise<void> {
      if (value === true) {
        Object.assign(this.$data, constructInitialState(this.editorState?.identifier || null))
        if (this.identifier === null) {
          await this.$nextTick()
          this.focusTag(0)
        }
      }
    }
  }
})
</script>
