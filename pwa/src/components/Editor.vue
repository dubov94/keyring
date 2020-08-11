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
        <v-btn flat color="primary" :disabled="requestInProgress"
          @click="suggest">
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
          <v-btn @click="addTag" outline round :disabled="requestInProgress"
            class="new-tag-button elevation-3">
            <v-icon left small>fa-plus</v-icon>Label
          </v-btn>
        </draggable>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <v-progress-circular indeterminate color="green"
          v-if="requestInProgress"></v-progress-circular>
        <v-spacer></v-spacer>
        <v-btn flat v-if="identifier !== null" color="error"
          :disabled="!isOnline || requestInProgress" @click="maybeRemove">
          Remove
        </v-btn>
        <v-btn flat color="primary" :disabled="requestInProgress"
          @click="maybeDiscard">
          Cancel
        </v-btn>
        <v-btn flat color="primary" :disabled="!isOnline || requestInProgress"
          @click="save">
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

<script>
import Draggable from 'vuedraggable'
import YesNoDialog from './YesNoDialog'
import { mapActions, mapGetters, mapMutations } from 'vuex'
import { XL_MINIMAL_WIDTH } from './constants'
import {
  areArraysEqual,
  createCharacterRange,
  generateSequenceOffRanges,
  sleep
} from '../utilities'

const SYMBOLS_RANGE = '@#$_&-+()/' + '*"\':;!?'
const DIGITS_RANGE = createCharacterRange('0', '9')
const UPPERCASE_LETTERS_RANGE = createCharacterRange('A', 'Z')
const LOWERCASE_LETTERS_RANGE = createCharacterRange('a', 'z')

const PASSWORD_SUGGESTION_LENGTH = 12
const TYPEWRITER_DELAY_IN_MILLIS = 50

export default {
  components: {
    draggable: Draggable,
    yesNoDialog: YesNoDialog
  },
  data () {
    return {
      draggableOptions: {
        handle: '.tag__handle',
        animation: 150
      },
      maxWidth: XL_MINIMAL_WIDTH * (3 / 12),
      requestInProgress: false,
      discardConfirmation: false,
      removeConfirmation: false,
      identifier: null,
      reveal: false,
      secret: '',
      chips: []
    }
  },
  mounted () {
    window.addEventListener('beforeunload', this.onBeforeUnload)
  },
  beforeDestroy () {
    window.removeEventListener('beforeunload', this.onBeforeUnload)
    if (this.isVisible) {
      this.closeEditor()
    }
  },
  computed: {
    ...mapGetters({
      isOnline: 'isOnline'
    }),
    isVisible () {
      return this.$store.state.interface.editor.show
    }
  },
  methods: {
    ...mapActions({
      createKey: 'createUserKey',
      updateKey: 'updateUserKey',
      removeKey: 'removeUserKey',
      displaySnackbar: 'interface/displaySnackbar'
    }),
    ...mapMutations({
      closeEditor: 'interface/closeEditor'
    }),
    getDefaultState () {
      if (this.identifier === null) {
        return { value: '', tags: [''] }
      } else {
        const key = this.$store.state.userKeys.find(
          (item) => item.identifier === this.identifier)
        return { value: key.value, tags: key.tags.slice() }
      }
    },
    doDiscard () {
      this.closeEditor()
    },
    hasChanges () {
      const state = this.getDefaultState()
      return !(this.secret === state.value &&
          areArraysEqual(this.chips, state.tags))
    },
    maybeDiscard () {
      if (this.hasChanges()) {
        this.discardConfirmation = true
      } else {
        this.closeEditor()
      }
    },
    onBeforeUnload (event) {
      if (this.isVisible && this.hasChanges()) {
        event.returnValue = true
        return true
      } else {
        return null
      }
    },
    async copySecret () {
      await navigator.clipboard.writeText(this.secret)
      this.displaySnackbar({
        message: 'Done. Remember to save!',
        timeout: 3000
      })
    },
    move ({ relatedContext }) {
      return relatedContext.element !== undefined
    },
    setTag (index, value) {
      this.$set(this.chips, index, value)
    },
    removeTag (index) {
      this.chips.splice(index, 1)
    },
    async addTag () {
      this.chips.push('')
      await this.$nextTick()
      this.focusTag(-1)
    },
    async suggest () {
      const suggestion = generateSequenceOffRanges([
        SYMBOLS_RANGE,
        DIGITS_RANGE,
        UPPERCASE_LETTERS_RANGE,
        LOWERCASE_LETTERS_RANGE
      ], PASSWORD_SUGGESTION_LENGTH)
      this.requestInProgress = true
      while (this.secret.length > 0) {
        await sleep(TYPEWRITER_DELAY_IN_MILLIS)
        this.secret = this.secret.slice(0, -1)
      }
      for (let length = 1; length <= suggestion.length; ++length) {
        await sleep(TYPEWRITER_DELAY_IN_MILLIS)
        this.secret = suggestion.slice(0, length)
      }
      this.requestInProgress = false
    },
    async save () {
      try {
        this.requestInProgress = true
        if (this.identifier === null) {
          await this.createKey({ value: this.secret, tags: this.chips })
        } else {
          await this.updateKey({
            identifier: this.identifier,
            value: this.secret,
            tags: this.chips
          })
        }
        this.closeEditor()
      } finally {
        this.requestInProgress = false
      }
    },
    async doRemove () {
      try {
        this.requestInProgress = true
        await this.removeKey({ identifier: this.identifier })
        this.closeEditor()
      } finally {
        this.requestInProgress = false
      }
    },
    maybeRemove () {
      this.removeConfirmation = true
    },
    focusTag (pointer) {
      const index = (pointer + this.chips.length) % this.chips.length
      this.$refs.tags[index].focus()
    }
  },
  watch: {
    async isVisible (value) {
      if (value === true) {
        const editorState = this.$store.state.interface.editor
        this.reveal = editorState.reveal
        this.identifier = editorState.identifier
        const state = this.getDefaultState()
        this.secret = state.value
        this.chips = state.tags
        if (this.identifier === null) {
          await this.$nextTick()
          this.focusTag(0)
        }
      }
    }
  }
}
</script>
