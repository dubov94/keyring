<template>
  <v-toolbar app clipped-left prominent color="primary" dark>
    <v-toolbar-side-icon @click="toggle"></v-toolbar-side-icon>
    <slot>
      <v-toolbar-title>
        Key Ring
      </v-toolbar-title>
    </slot>
  </v-toolbar>
</template>

<script>
  export default {
    props: ['value'],
    methods: {
      toggle () {
        this.$emit('input', !this.value)
      }
    }
  }
</script>
