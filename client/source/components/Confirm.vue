<template>
  <v-dialog :value="value" @input="close"
    :max-width="maxWidth" @keydown.esc="cancel">
    <v-card>
      <v-card-text class="text-xs-center">{{ message }}</v-card-text>
      <v-card-actions>
        <v-btn flat color="error" @click="deny">
          No
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn flat color="success" @click="allow">
          Yes
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  import {XL_MINIMAL_WIDTH} from './constants'

  export default {
    props: ['value', 'message'],
    data () {
      return {
        maxWidth: XL_MINIMAL_WIDTH * (1.5 / 12)
      }
    },
    methods: {
      close () {
        this.$emit('input', false)
      },
      affirm () {
        this.$emit('affirm')
      },
      cancel () {
        this.close()
      },
      deny () {
        this.close()
      },
      allow () {
        this.close()
        this.affirm()
      }
    }
  }
</script>
