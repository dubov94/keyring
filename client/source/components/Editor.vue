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
    caret-color: black;
  }

  .tag__label {
    padding: 0 4px;
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
          placeholder="Secret" v-model="secret" ref="secret"></v-text-field>
        <fixed-tooltip top :nudge-y="-6">
          <span slot="label">Available after saving</span>
          <v-btn icon disabled>
            <v-icon>fa-copy</v-icon>
          </v-btn>
        </fixed-tooltip>
        <v-btn icon @click="reveal = !reveal">
          <v-icon>{{ reveal ? 'fa-eye-slash' : 'fa-eye' }}</v-icon>
        </v-btn>
        <v-btn icon :disabled="requestInProgress" @click="generate">
          <v-icon>fa-lightbulb</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <draggable v-model="chips" :options="draggableOptions" :move="move">
          <v-chip disabled outline color="black" close
            v-for="(value, index) in chips" :key="index"
            @input="removeTag(index)">
            <v-icon small class="tag__handle">drag_indicator</v-icon>
            <div class="tag__content">
              <input type="text" :value="value" class="tag__input" v-focus
                @input.stop="setTag(index, $event.target.value)">
              <span class="tag__label">{{ value }}</span>
            </div>
          </v-chip>
          <v-btn @click="addTag" outline round class="new_tag_button">
            <v-icon left small>fa-plus</v-icon> Label
          </v-btn>
        </draggable>
      </v-card-text>
      <v-divider></v-divider>
      <v-card-actions>
        <v-progress-circular indeterminate color="green"
          v-if="requestInProgress"></v-progress-circular>
        <v-spacer></v-spacer>
        <v-btn flat color="error" :disabled="requestInProgress"
          v-if="identifier !== null" @click="maybeRemove">
          Remove
        </v-btn>
        <v-btn flat color="primary" :disabled="requestInProgress"
          @click="maybeDiscard">
          Cancel
        </v-btn>
        <v-btn flat color="primary" :disabled="requestInProgress"
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
  import {mapActions, mapMutations} from 'vuex'
  import {XL_MINIMAL_WIDTH} from './constants'
  import {ALPHANUMERIC_CHARACTERS} from '../constants'
  import {areArraysEqual, sleep, random} from '../utilities'

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
    computed: {
      isVisible () {
        return this.$store.state.interface.editor.show
      }
    },
    methods: {
      ...mapActions({
        createKey: 'createUserKey',
        updateKey: 'updateUserKey',
        removeKey: 'removeUserKey'
      }),
      ...mapMutations({
        closeEditor: 'interface/closeEditor'
      }),
      getDefaultState () {
        if (this.identifier === null) {
          return { value: '', tags: [] }
        } else {
          let key = this.$store.state.userKeys.find(
            (item) => item.identifier === this.identifier)
          return { value: key.value, tags: key.tags.slice() }
        }
      },
      doDiscard () {
        this.closeEditor()
      },
      maybeDiscard () {
        let state = this.getDefaultState()
        if (this.secret === state.value &&
          areArraysEqual(this.chips, state.tags)) {
          this.closeEditor()
        } else {
          this.discardConfirmation = true
        }
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
      async generate () {
        let suggestion = ''
        for (let index = 0; index < 12; ++index) {
          suggestion += ALPHANUMERIC_CHARACTERS.charAt(
            random(0, ALPHANUMERIC_CHARACTERS.length))
        }
        this.requestInProgress = true
        while (this.secret.length > 0) {
          await sleep(50)
          this.secret = this.secret.slice(0, -1)
        }
        for (let length = 1; length <= suggestion.length; ++length) {
          await sleep(50)
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
          await this.$nextTick()
          this.$refs.secret.focus()
        }
      }
    }
  }
</script>
