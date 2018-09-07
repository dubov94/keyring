<template>
  <v-app>
    <v-content>
      <v-container fluid fill-height>
        <v-layout align-center justify-center>
          <v-flex xs12 sm6 md4 lg3 xl2>
            <p class="text-xs-center text--secondary">
              Do not save your password in the browser!
            </p>
            <router-view></router-view>
          </v-flex>
        </v-layout>
      </v-container>
    </v-content>
    <reload></reload>
  </v-app>
</template>

<script>
  import Reload from '../Reload'

  export default {
    components: {
      reload: Reload
    }
  }
</script>
