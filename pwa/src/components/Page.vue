<style scoped>
  .no-background {
    background: none;
  }
</style>

<template>
  <v-app :class="appClasses">
    <toolbar :has-menu="hasMenu" :value="showMenu" @input="menuSwitch">
      <slot name="menu"></slot>
    </toolbar>
    <slot></slot>
    <toast></toast>
  </v-app>
</template>

<script>
import Toast from '@/components/Toast'
import Toolbar from '@/components/toolbar-with-menu/Toolbar'

export default {
  props: ['hasMenu', 'showMenu', 'noBackground'],
  components: {
    toast: Toast,
    toolbar: Toolbar
  },
  computed: {
    appClasses () {
      return {
        'no-background': this.noBackground
      }
    }
  },
  methods: {
    menuSwitch (value) {
      this.$emit('menuSwitch', value)
    }
  }
}
</script>
