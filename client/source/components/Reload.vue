<template>
  <v-dialog v-model="externs.askForReload" persistent :max-width="maxWidth">
    <v-card>
      <v-card-text>A new version is available!</v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn flat color="success" @click="reload">
          Reload
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  import {XL_MINIMAL_WIDTH} from './constants'

  export default {
    data () {
      return {
        maxWidth: XL_MINIMAL_WIDTH * (1.5 / 12),
        externs: window.externs
      }
    },
    methods: {
      reload () {
        location.reload()
      }
    }
  }
</script>
