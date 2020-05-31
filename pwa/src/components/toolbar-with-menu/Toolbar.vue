<style scoped>
  .home-link {
    cursor: pointer;
  }
</style>

<template>
  <v-toolbar app clipped-left prominent color="primary" dark>
    <v-toolbar-side-icon @click="toggle"></v-toolbar-side-icon>
    <slot>
      <v-toolbar-title>
        <toolbar-title></toolbar-title>
      </v-toolbar-title>
    </slot>
  </v-toolbar>
</template>

<script>
import Title from './Title'

export default {
  components: {
    toolbarTitle: Title
  },
  props: ['value'],
  methods: {
    toggle () {
      this.$emit('input', !this.value)
    }
  }
}
</script>
