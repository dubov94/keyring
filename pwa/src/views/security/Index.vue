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
