<template>
  <page>
    <side-menu v-model="showMenu"></side-menu>
    <toolbar v-model="showMenu"></toolbar>
    <v-content>
      <recent-sessions></recent-sessions>
    </v-content>
  </page>
</template>

<script>
  import Page from '../Page'
  import RecentSessions from './RecentSessions'
  import SideMenu from '../toolbar-with-menu/SideMenu'
  import Toolbar from '../toolbar-with-menu/Toolbar'

  export default {
    components: {
      page: Page,
      recentSessions: RecentSessions,
      sideMenu: SideMenu,
      toolbar: Toolbar
    },
    data () {
      return { showMenu: false }
    }
  }
</script>
