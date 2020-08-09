<template>
  <auth-guard>
    <page :has-menu="true" :show-menu="showMenu" @menuSwitch="menuSwitch">
      <user-menu v-model="showMenu"></user-menu>
      <v-content>
        <v-container fluid>
          <v-layout wrap justify-center align-center>
            <v-flex xs12 sm8 md6 lg4 xl3 pa-4>
              <change-master-key></change-master-key>
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
  </auth-guard>
</template>

<script>
import AuthGuard from '@/components/AuthGuard'
import ChangeMail from './ChangeMail'
import ChangeMasterKey from './ChangeMasterKey'
import ChangeUsername from './ChangeUsername'
import DeleteAccount from './DeleteAccount'
import Page from '@/components/Page'
import UserMenu from '@/components/toolbar-with-menu/UserMenu'

export default {
  components: {
    authGuard: AuthGuard,
    changeMail: ChangeMail,
    changeMasterKey: ChangeMasterKey,
    changeUsername: ChangeUsername,
    deleteAccount: DeleteAccount,
    page: Page,
    userMenu: UserMenu
  },
  data () {
    return {
      showMenu: false
    }
  },
  methods: {
    menuSwitch (value) {
      this.showMenu = value
    }
  }
}
</script>
