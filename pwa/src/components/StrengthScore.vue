<template>
  <v-progress-linear class="my-0" :height="4" :value="value * 100" :color="theme">
  </v-progress-linear>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { Color } from '@/cryptography/strength_test_service'

export default Vue.extend({
  props: {
    color: {
      type: String as PropType<Color>,
      required: true
    },
    value: {
      type: Number,
      default: 1
    }
  },
  computed: {
    theme (): string {
      if (this.color === Color.GREEN) {
        return 'success'
      }
      if (this.color === Color.YELLOW) {
        return 'warning'
      }
      return 'error'
    }
  }
})
</script>
