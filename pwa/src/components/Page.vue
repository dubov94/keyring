<style scoped>
  .no-background {
    background: none;
  }
</style>

<template>
  <v-app :class="appClasses">
    <toolbar :has-menu="hasMenu" :value="showMenu" @input="menuSwitch"
      :extended="toolbarIsExtended">
      <slot name="toolbarDefault"></slot>
      <template slot="extension" v-if="toolbarIsExtended">
        <slot name="toolbarExtension"></slot>
      </template>
    </toolbar>
    <slot></slot>
    <toast></toast>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue'
import Toast from '@/components/Toast.vue'
import Toolbar from '@/components/toolbar-with-menu/Toolbar.vue'

export default Vue.extend({
  props: ['hasMenu', 'showMenu', 'noBackground', 'toolbarIsExtended'],
  components: {
    toast: Toast,
    toolbar: Toolbar
  },
  computed: {
    appClasses (): { [key: string]: boolean } {
      return {
        'no-background': this.noBackground
      }
    }
  },
  methods: {
    menuSwitch (value: boolean): void {
      this.$emit('menuSwitch', value)
    }
  }
})
</script>
