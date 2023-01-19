<template>
  <page :has-menu="true" :show-menu="showMenu" @menuSwitch="menuSwitch">
    <user-menu v-model="showMenu"></user-menu>
    <v-main class="ma-2">
      <router-view></router-view>
    </v-main>
  </page>
</template>

<script lang="ts">
import Vue from 'vue'
import Page from '@/components/Page.vue'
import UserMenu from '@/components/toolbar-with-menu/UserMenu.vue'

export default Vue.extend({
  components: {
    page: Page,
    userMenu: UserMenu
  },
  data () {
    return { showMenu: false }
  },
  methods: {
    menuSwitch (value: boolean) {
      this.showMenu = value
    }
  }
})
</script>
