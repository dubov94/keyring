<template>
  <a :href="href" target="_blank" rel="noopener noreferrer" @click.stop><slot></slot></a>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  props: ['href']
})
</script>
