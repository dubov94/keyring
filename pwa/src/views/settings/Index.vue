<template>
  <page :has-menu="true" :show-menu="showMenu" @menuSwitch="menuSwitch">
    <user-menu v-model="showMenu"></user-menu>
    <v-main>
      <v-container fluid class="pa-7">
        <v-row justify="center">
          <v-col :cols="12" :sm="8" :md="6" :lg="4" :xl="3">
            <change-username></change-username>
          </v-col>
          <v-col :cols="12" :sm="8" :md="6" :lg="4" :xl="3">
            <change-master-key></change-master-key>
          </v-col>
          <v-col :cols="12" :sm="8" :md="6" :lg="4" :xl="3" v-if="showOtpSwitch">
            <otp-switch></otp-switch>
          </v-col>
          <v-col :cols="12" :sm="8" :md="6" :lg="4" :xl="3">
            <change-mail></change-mail>
          </v-col>
          <v-col :cols="12" :sm="8" :md="6" :lg="4" :xl="3">
            <delete-account></delete-account>
          </v-col>
        </v-row>
      </v-container>
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
