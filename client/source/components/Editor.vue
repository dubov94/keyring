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
  <v-dialog :value="isVisible" @input="alter"
    :width="dialogMaximalWidth" @keydown.esc="cancel">
    <v-card>
      <v-card-title>
        <v-text-field type="text" solo flat
          placeholder="Secret" :class="{ conceal: !reveal }"
          v-model="secret" ref="secret"></v-text-field>
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
          v-if="identifier !== null" @click="remove">
          Remove
        </v-btn>
        <v-btn flat color="primary" :disabled="requestInProgress"
          @click="cancel">
          Cancel
        </v-btn>
        <v-btn flat color="primary" :disabled="requestInProgress"
          @click="save">
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  import Draggable from 'vuedraggable'
  import {mapActions, mapMutations} from 'vuex'
  import {DIALOG_MAXIMAL_WIDTH} from './constants'
  import {ALPHANUMERIC_CHARACTERS, areArraysEqual, random} from '../utilities'

  export default {
    components: {
      draggable: Draggable
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
        dialogMaximalWidth: DIALOG_MAXIMAL_WIDTH,
        requestInProgress: false,
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
      alter (value) {
        if (value === false) {
          if (!this.requestInProgress) {
            let state = this.getDefaultState()
            if (this.secret === state.value &&
              areArraysEqual(this.chips, state.tags) ||
              confirm('Do you want to discard changes?')) {
              this.closeEditor()
            }
          }
        } else {
          throw new Error('Dialog requested a show!')
        }
      },
      cancel () {
        this.alter(false)
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
      generate () {
        let suggestion = ''
        for (let index = 0; index < 12; ++index) {
          suggestion += ALPHANUMERIC_CHARACTERS.charAt(
            random(0, ALPHANUMERIC_CHARACTERS.length))
        }
        this.secret = suggestion
      },
      async save () {
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
        this.requestInProgress = false
        this.closeEditor()
      },
      async remove () {
        if (confirm('Do you want to remove the key?')) {
          this.requestInProgress = true
          await this.removeKey({ identifier: this.identifier })
          this.requestInProgress = false
          this.closeEditor()
        }
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
