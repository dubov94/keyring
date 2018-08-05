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
  <v-dialog v-model="isVisible" :width="1904 * (3 / 12)">
    <v-card>
      <v-card-title>
        <v-text-field :type="reveal ? 'text': 'password'" solo flat
          placeholder="Secret" v-model="secret" ref="secret"></v-text-field>
        <v-btn icon @click="reveal = !reveal">
          <v-icon>{{ reveal ? 'visibility_off' : 'visibility' }}</v-icon>
        </v-btn>
        <v-btn icon @click="generate">
          <v-icon>autorenew</v-icon>
        </v-btn>
        <v-btn icon @click="save">
          <v-icon>save</v-icon>
        </v-btn>
        <v-btn icon @click="remove" v-if="identifier !== null">
          <v-icon>delete</v-icon>
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
    </v-card>
  </v-dialog>
</template>

<script>
  import Draggable from 'vuedraggable'
  import {mapActions, mapMutations} from 'vuex'
  import {random, ALPHANUMERIC_CHARACTERS} from '../utilities'

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
        identifier: null,
        reveal: false,
        secret: '',
        chips: []
      }
    },
    computed: {
      isVisible: {
        get () {
          return this.$store.state.interface.editor.show
        },
        set (value) {
          if (value === false) {
            this.closeEditor()
          } else {
            throw new Error('Dialog requested a show!')
          }
        }
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
      },
      async remove () {
        if (confirm('Are you sure?')) {
          await this.removeKey({ identifier: this.identifier })
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
          if (this.identifier === null) {
            this.secret = ''
            this.chips = []
          } else {
            let key = this.$store.state.administration.keys.find(
              (item) => item.identifier === this.identifier)
            this.secret = key.value
            this.chips = key.tags.slice()
          }
          await this.$nextTick()
          this.$refs.secret.focus()
        }
      }
    }
  }
</script>
