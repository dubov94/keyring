<style scoped>
  .card >>> .card__title {
    padding-top: 0;
    padding-bottom: 0;
  }

  .chip >>> .chip__content {
    cursor: pointer;
  }
</style>

<template>
  <v-card>
    <v-card-title>
      <v-text-field :type="reveal ? 'text' : 'password'" solo flat readonly
        :value="value"></v-text-field>
      <v-btn icon @click="copyText(value)">
        <v-icon>fa-copy</v-icon>
      </v-btn>
      <template v-if="$vuetify.breakpoint.smAndUp">
        <v-btn icon @click="toggleReveal">
          <v-icon>{{ reveal ? 'fa-eye-slash' : 'fa-eye' }}</v-icon>
        </v-btn>
        <v-btn icon @click="edit">
          <v-icon>fa-edit</v-icon>
        </v-btn>
      </template>
      <v-menu v-else>
        <v-btn icon slot="activator">
          <v-icon>fa-ellipsis-v</v-icon>
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
          color="white" class="elevation-3" @click="copyText(label)">
          {{ label }}
        </v-chip>
      </v-card-text>
    </template>
  </v-card>
</template>

<script>
  import {mapActions, mapMutations} from 'vuex'

  export default {
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
      async copyText (string) {
        await navigator.clipboard.writeText(string)
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
