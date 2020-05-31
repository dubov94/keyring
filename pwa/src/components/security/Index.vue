<template>
  <page>
    <side-menu v-model="showMenu"></side-menu>
    <toolbar v-model="showMenu"></toolbar>
    <v-content>
        <v-tabs fixed-tabs>
          <v-tab to="/security/threat-analysis">Threat analysis</v-tab>
          <v-tab to="/security/recent-sessions">Recent sessions</v-tab>
        </v-tabs>
        <router-view></router-view>
    </v-content>
  </page>
</template>

<script>
  import Page from '../Page'
  import SideMenu from '../toolbar-with-menu/SideMenu'
  import Toolbar from '../toolbar-with-menu/Toolbar'

  export default {
    components: {
      page: Page,
      sideMenu: SideMenu,
      toolbar: Toolbar
    },
    data () {
      return { showMenu: false }
    }
  }
</script>
