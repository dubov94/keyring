<template>
  <page :has-menu="true" :show-menu="showMenu" @menuSwitch="menuSwitch">
    <user-menu v-model="showMenu"></user-menu>
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

export default {
  components: {
    page: Page,
    userMenu: UserMenu
  },
  data () {
    return { showMenu: false }
  },
  methods: {
    menuSwitch (value) {
      this.showMenu = value
    }
  }
}
</script>
