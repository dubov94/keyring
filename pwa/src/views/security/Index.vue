<template>
  <page>
    <user-menu v-model="showMenu"></user-menu>
    <toolbar :has-menu="true" v-model="showMenu"></toolbar>
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
import Page from '@/components/Page'
import UserMenu from '@/components/toolbar-with-menu/UserMenu'
import Toolbar from '@/components/toolbar-with-menu/Toolbar'

export default {
  components: {
    page: Page,
    userMenu: UserMenu,
    toolbar: Toolbar
  },
  data () {
    return { showMenu: false }
  }
}
</script>
