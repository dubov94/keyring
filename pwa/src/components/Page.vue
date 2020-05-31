<template>
  <v-app>
    <slot></slot>
    <toast></toast>
  </v-app>
</template>

<script>
  import Toast from './Toast'

  export default {
    components: {
      toast: Toast
    }
  }
</script>
