<template>
  <v-navigation-drawer app temporary clipped floating
    :value="value" @input="input">
    <v-list>
      <v-list-tile>
        <v-list-tile-action>
          <v-icon color="success">wifi</v-icon>
        </v-list-tile-action>
        <v-list-tile-content>
          <v-list-tile-title>
            Online
          </v-list-tile-title>
          <v-list-tile-sub-title>
            Click to disconnect
          </v-list-tile-sub-title>
        </v-list-tile-content>
      </v-list-tile>
      <v-list-tile @click="$router.push('/dashboard')">
        <v-list-tile-action>
          <v-icon>dashboard</v-icon>
        </v-list-tile-action>
        <v-list-tile-content>
          Dashboard
        </v-list-tile-content>
      </v-list-tile>
      <v-list-tile @click="$router.push('/settings')">
        <v-list-tile-action>
          <v-icon>fa-cog</v-icon>
        </v-list-tile-action>
        <v-list-tile-content>
          Settings
        </v-list-tile-content>
      </v-list-tile>
      <v-divider></v-divider>
      <v-list-tile @click="logOut">
        <v-list-tile-action>
          <v-icon>fa-sign-out-alt</v-icon>
        </v-list-tile-action>
        <v-list-tile-content>
          Log out
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
  import {purgeSessionStorageAndLoadLogIn} from '../../utilities'

  export default {
    props: ['value'],
    methods: {
      input (value) {
        this.$emit('input', value)
      },
      logOut () {
        purgeSessionStorageAndLoadLogIn()
      }
    }
  }
</script>
