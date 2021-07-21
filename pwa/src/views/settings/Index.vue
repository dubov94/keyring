<style scoped>
  .v-expansion-panels {
    max-width: var(--max-content-width);
    margin: 0 auto;
  }
</style>

<template>
  <page :has-menu="true" :show-menu="showMenu" @menuSwitch="menuSwitch">
    <user-menu v-model="showMenu"></user-menu>
    <v-main class="px-2">
      <v-expansion-panels inset class="mt-4">
        <v-expansion-panel>
          <v-expansion-panel-header>
            Change username
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <change-username></change-username>
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel>
          <v-expansion-panel-header>
            Change password
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <change-master-key></change-master-key>
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel>
          <v-expansion-panel-header>
            Two-factor authentication
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <otp-switch v-if="showOtpSwitch"></otp-switch>
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel>
          <v-expansion-panel-header>
            Change e-mail
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <change-mail></change-mail>
          </v-expansion-panel-content>
        </v-expansion-panel>
        <v-expansion-panel>
          <v-expansion-panel-header>
            Delete account
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <delete-account></delete-account>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-main>
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
