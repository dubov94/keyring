<template>
  <page>
    <v-toolbar app prominent color="primary" dark>
      <v-btn icon @click="$router.go(-1)">
        <v-icon>arrow_back</v-icon>
      </v-btn>
      <v-toolbar-title>
        Key Ring
      </v-toolbar-title>
    </v-toolbar>
    <v-content>
      <v-container fluid>
        <v-layout justify-center>
          <v-flex xs12 sm8 md6 lg4 xl3>
            <change-master-key></change-master-key>
          </v-flex>
        </v-layout>
      </v-container>
    </v-content>
  </page>
</template>

<script>
  import Page from '../Page'
  import ChangeMasterKey from './ChangeMasterKey'

  export default {
    components: {
      page: Page,
      changeMasterKey: ChangeMasterKey
    }
  }
</script>
  