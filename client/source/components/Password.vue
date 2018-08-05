<style scoped>
  .card >>> .card__title {
    padding-top: 0;
    padding-bottom: 0;
  }
</style>

<template>
  <v-card>
    <v-card-title>
      <v-text-field :type="reveal ? 'text' : 'password'"
        :value="value" solo flat readonly></v-text-field>
      <v-btn icon v-clipboard:copy="value" v-clipboard:success="onCopy">
        <v-icon>file_copy</v-icon>
      </v-btn>
      <template v-if="$vuetify.breakpoint.smAndUp">
        <v-btn icon @click="toggleReveal">
          <v-icon>remove_red_eye</v-icon>
        </v-btn>
        <v-btn icon @click="edit">
          <v-icon>edit</v-icon>
        </v-btn>
      </template>
      <v-menu v-else>
        <v-btn icon slot="activator">
          <v-icon>more_vert</v-icon>
        </v-btn>
        <v-list>
          <v-list-tile @click="toggleReveal">
            <v-list-tile-title>
              {{ reveal ? 'Hide' : 'Show' }}
            </v-list-tile-title>
          </v-list-tile>
          <v-list-tile @click="edit">
            <v-list-tile-title>
              Edit
            </v-list-tile-title>
          </v-list-tile>
        </v-list>
      </v-menu>
    </v-card-title>
    <template v-if="tags.length > 0">
      <v-divider></v-divider>
      <v-card-text>
        <v-chip disabled v-for="(label, index) in tags" :key="index"
          color="accent" text-color="white">
          {{ label }}
        </v-chip>
      </v-card-text>
    </template>
  </v-card>
</template>

<script>
  import Editor from './Editor'
  import {mapActions, mapMutations} from 'vuex'

  export default {
    components: {
      editor: Editor
    },
    props: ['identifier', 'value', 'tags'],
    data () {
      return {
        reveal: false
      }
    },
    methods: {
      ...mapActions({
        displaySnackbar: 'interface/displaySnackbar'
      }),
      ...mapMutations({
        openEditor: 'interface/openEditor'
      }),
      onCopy () {
        this.displaySnackbar({ message: 'Copied!', timeout: 1500 })
      },
      toggleReveal () {
        this.reveal = !this.reveal
      },
      edit () {
        this.openEditor({ identifier: this.identifier, reveal: this.reveal })
        this.reveal = false
      }
    }
  }
</script>
