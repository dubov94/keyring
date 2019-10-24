<style scoped>
  .card >>> .card__title {
    padding-top: 0;
    padding-bottom: 0;
  }

  .chip {
    font-size: 14px;
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

  .key >>> input,
  .tag__input {
    caret-color: black !important;
  }

  /* Matches `.chip`. */
  .new_tag_button {
    height: 34px;
    margin: 4px;
    min-width: 0;
  }
</style>

<template>
  <v-dialog :value="isVisible" persistent :max-width="maxWidth">
    <v-card>
      <v-card-title>
        <v-text-field :type="reveal ? 'text' : 'password'" solo flat
          placeholder="Secret" class="key" v-model="secret">
        </v-text-field>
        <v-btn flat color="primary" :disabled="requestInProgress"
          @click="suggest">
          Generate
        </v-btn>
        <v-btn icon @click="copySecret">
          <v-icon>fa-copy</v-icon>
        </v-btn>
        <v-menu>
          <v-btn icon slot="activator">
            <v-icon small>fa-ellipsis-v</v-icon>
          </v-btn>
          <v-list>
            <v-list-tile @click="reveal = !reveal">
              <v-list-tile-title>
                {{ reveal ? 'Hide' : 'Show' }}
              </v-list-tile-title>
            </v-list-tile>
          </v-list>
        </v-menu>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <draggable v-model="chips" :options="draggableOptions" :move="move">
          <v-chip disabled outline color="black"
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
          <v-btn @click="addTag" outline round class="new_tag_button"
            :disabled="requestInProgress">
            <v-icon left small>fa-plus</v-icon>Label
          </v-btn>
        </draggable>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <v-progress-circular indeterminate color="green"
          v-if="requestInProgress"></v-progress-circular>
        <v-spacer></v-spacer>
        <v-btn flat color="error" :disabled="!isOnline || requestInProgress"
          v-if="identifier !== null" @click="maybeRemove">
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
  import {mapActions, mapGetters, mapMutations} from 'vuex'
  import {XL_MINIMAL_WIDTH} from './constants'
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
          let key = this.$store.state.userKeys.find(
            (item) => item.identifier === this.identifier)
          return { value: key.value, tags: key.tags.slice() }
        }
      },
      doDiscard () {
        this.closeEditor()
      },
      hasChanges () {
        let state = this.getDefaultState()
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
      addTag () {
        this.chips.push('')
      },
      async suggest () {
        let suggestion = generateSequenceOffRanges([
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
      }
    },
    watch: {
      async isVisible (value) {
        if (value === true) {
          let editorState = this.$store.state.interface.editor
          this.reveal = editorState.reveal
          this.identifier = editorState.identifier
          let state = this.getDefaultState()
          this.secret = state.value
          this.chips = state.tags
          if (this.identifier === null) {
            await this.$nextTick()
            this.$refs.tags[0].focus()
          }
        }
      }
    }
  }
</script>
