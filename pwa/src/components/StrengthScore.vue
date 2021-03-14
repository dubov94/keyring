<template>
  <v-progress-linear class="my-0" :height="4" :value="value.value * 100" :color="color">
  </v-progress-linear>
</template>

<script lang="ts">
import Vue from 'vue'
import { Color } from '@/cryptography/strength_test_service'

export default Vue.extend({
  props: ['value'],
  computed: {
    color (): string {
      if (this.value.color === Color.GREEN) {
        return 'success'
      }
      if (this.value.color === Color.YELLOW) {
        return 'warning'
      }
      return 'error'
    }
  }
})
</script>
