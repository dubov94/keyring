<template>
  <page>
    <user-menu v-model="showMenu"></user-menu>
    <toolbar :has-menu="true" v-model="showMenu"></toolbar>
    <v-content>
      <v-container fluid>
        <v-layout row wrap justify-center align-center>
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
</template>

<script>
import ChangeMail from './ChangeMail'
import ChangeMasterKey from './ChangeMasterKey'
import ChangeUsername from './ChangeUsername'
import DeleteAccount from './DeleteAccount'
import Page from '@/components/Page'
import UserMenu from '@/components/toolbar-with-menu/UserMenu'
import Toolbar from '@/components/toolbar-with-menu/Toolbar'

export default {
  components: {
    changeMail: ChangeMail,
    changeMasterKey: ChangeMasterKey,
    changeUsername: ChangeUsername,
    deleteAccount: DeleteAccount,
    page: Page,
    userMenu: UserMenu,
    toolbar: Toolbar
  },
  data () {
    return {
      showMenu: false
    }
  }
}
</script>
