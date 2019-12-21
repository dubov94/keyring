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
        <router-link to="/" tag="span" class="home-link">
          Key Ring
        </router-link>
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
