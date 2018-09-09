<style scoped>
  .card >>> .card__title {
    padding-top: 0;
    padding-bottom: 0;
  }

  .chip >>> .chip__close {
    margin-left: 0;
  }

  .tag__handle {
    cursor: move;
  }

  .tag__label {
    padding-left: 8px;
  }
</style>

<template>
  <v-dialog :value="isVisible" persistent :max-width="maxWidth">
    <v-card>
      <v-card-title>
        <v-text-field :type="reveal ? 'text' : 'password'" solo flat
          placeholder="Secret" v-model="secret" ref="secret"></v-text-field>
        <v-btn icon @click="reveal = !reveal">
          <v-icon>{{ reveal ? 'visibility_off' : 'visibility' }}</v-icon>
        </v-btn>
        <v-btn icon @click="generate">
          <v-icon>autorenew</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <draggable v-model="chips" :options="draggableOptions" :move="move">
          <v-chip disabled close v-for="(_, index) in chips" :key="index"
            @input="removeTag(index)" color="accent" text-color="white">
            <v-icon small class="tag__handle">drag_indicator</v-icon>
            <input type="text" v-model="chips[index]" @input.stop
              v-autowidth="autoWidthSettings" class="tag__label" v-focus>
          </v-chip>
          <v-btn icon @click="addTag" color="accent">
            <v-icon>add</v-icon>
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
    <confirm v-model="removeConfirmation" @affirm="doRemove"
      message="Are you sure?"></confirm>
    <confirm v-model="discardConfirmation" @affirm="doDiscard"
      message="Discard changes?"></confirm>
  </v-dialog>
</template>

<script>
  import Draggable from 'vuedraggable'
  import Confirm from './Confirm'
  import {mapActions, mapMutations} from 'vuex'
  import {XL_MINIMAL_WIDTH} from './constants'
  import {ALPHANUMERIC_CHARACTERS} from '../constants'
  import {areArraysEqual, sleep, random} from '../utilities'

  export default {
    components: {
      draggable: Draggable,
      confirm: Confirm
    },
    data () {
      return {
        autoWidthSettings: {
          comfortZone: 8
        },
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
        createKey: 'administration/createKey',
        updateKey: 'administration/updateKey',
        removeKey: 'administration/removeKey'
      }),
      ...mapMutations({
        closeEditor: 'interface/closeEditor'
      }),
      getDefaultState () {
        if (this.identifier === null) {
          return { value: '', tags: [] }
        } else {
          let key = this.$store.state.administration.keys.find(
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
