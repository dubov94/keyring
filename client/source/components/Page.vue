<template>
  <v-app>
    <slot></slot>
    <toast></toast>
    <reload></reload>
  </v-app>
</template>

<script>
  import Toast from './Toast'
  import Reload from './Reload'

  export default {
    components: {
      toast: Toast,
      reload: Reload
    }
  }
</script>
