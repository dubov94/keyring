<template>
  <page :has-menu="true" :show-menu="showMenu" @menuSwitch="menuSwitch">
    <user-menu v-model="showMenu"></user-menu>
    <v-content>
      <v-container fluid>
        <v-layout wrap justify-center align-center>
          <v-flex xs12 sm8 md6 lg4 xl3 pa-4>
            <change-master-key></change-master-key>
          </v-flex>
          <v-flex xs12 sm8 md6 lg4 xl3 pa-4 v-if="showOtpSwitch">
            <otp-switch></otp-switch>
          </v-flex>
          <v-flex xs12 sm8 md6 lg4 xl3 pa-4>
            <change-mail></change-mail>
          </v-flex>
          <v-flex xs12 sm8 md6 lg4 xl3 pa-4>
            <change-username></change-username>
          </v-flex>
          <v-flex xs12 sm8 md6 lg4 xl3 pa-4>
            <delete-account></delete-account>
          </v-flex>
        </v-layout>
      </v-container>
    </v-content>
  </page>
</template>

<script lang="ts">
import Vue from 'vue'
import ChangeMail from './ChangeMail.vue'
import ChangeMasterKey from './ChangeMasterKey.vue'
import ChangeUsername from './ChangeUsername.vue'
import DeleteAccount from './DeleteAccount.vue'
import OtpSwitch from './OtpSwitch.vue'
import Page from '@/components/Page.vue'
import UserMenu from '@/components/toolbar-with-menu/UserMenu.vue'

export default Vue.extend({
  components: {
    changeMail: ChangeMail,
    changeMasterKey: ChangeMasterKey,
    changeUsername: ChangeUsername,
    deleteAccount: DeleteAccount,
    page: Page,
    otpSwitch: OtpSwitch,
    userMenu: UserMenu
  },
  data () {
    return {
      showMenu: false,
      showOtpSwitch: window.globals.mode !== 'production'
    }
  },
  methods: {
    menuSwitch (value: boolean) {
      this.showMenu = value
    }
  }
})
</script>
