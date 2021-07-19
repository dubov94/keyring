<style scoped>
  .v-expansion-panels {
    max-width: var(--max-content-width);
    margin: 0 auto;
  }
</style>

<template>
  <page :has-menu="true" :show-menu="showMenu" @menuSwitch="menuSwitch">
    <user-menu v-model="showMenu"></user-menu>
    <v-main>
      <v-expansion-panels inset class="mt-4">
        <change-username></change-username>
        <change-master-key></change-master-key>
        <otp-switch v-if="showOtpSwitch"></otp-switch>
        <change-mail></change-mail>
        <delete-account></delete-account>
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
