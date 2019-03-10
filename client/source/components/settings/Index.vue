<template>
  <page>
    <side-menu v-model="showMenu"></side-menu>
    <toolbar v-model="showMenu"></toolbar>
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
  import Page from '../Page'
  import SideMenu from '../toolbar-with-menu/SideMenu'
  import Toolbar from '../toolbar-with-menu/Toolbar'

  export default {
    components: {
      changeMail: ChangeMail,
      changeMasterKey: ChangeMasterKey,
      changeUsername: ChangeUsername,
      deleteAccount: DeleteAccount,
      page: Page,
      sideMenu: SideMenu,
      toolbar: Toolbar
    },
    data () {
      return {
        showMenu: false
      }
    }
  }
</script>
  