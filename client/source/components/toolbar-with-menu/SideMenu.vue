<template>
  <v-navigation-drawer app temporary clipped floating
    :value="value" @input="input">
    <v-list two-line class="py-0">
      <v-list-tile v-on="isOffline ? {'click': reload} : {}">
        <v-list-tile-action>
          <v-icon :color="connectionIconColor">wifi</v-icon>
        </v-list-tile-action>
        <v-list-tile-content>
          <v-list-tile-title>
            {{ connectionTitle }}
          </v-list-tile-title>
          <v-list-tile-sub-title v-if="isOffline">
            Click to reload
          </v-list-tile-sub-title>
        </v-list-tile-content>
      </v-list-tile>
      <v-divider></v-divider>
      <v-list-tile to="/dashboard">
        <v-list-tile-action>
          <v-icon>dashboard</v-icon>
        </v-list-tile-action>
        <v-list-tile-content>
          Dashboard
        </v-list-tile-content>
      </v-list-tile>
      <v-list-tile to="/security">
        <v-list-tile-action>
          <v-icon>shield</v-icon>
        </v-list-tile-action>
        <v-list-tile-content>
          Security
        </v-list-tile-content>
      </v-list-tile>
      <v-list-tile to="/settings">
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
          <v-list-tile-title>
            Log out
          </v-list-tile-title>
          <v-list-tile-sub-title>
            Clears the clipboard
          </v-list-tile-sub-title>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
  import Status from '../../store/root/status'
  import {mapState} from 'vuex'
  import {reloadPage, purgeSessionStorageAndLoadLogIn} from '../../utilities'

  export default {
    props: ['value'],
    computed: {
      ...mapState({
        status: (state) => state.status
      }),
      connectionIconColor () {
        return {
          [Status.OFFLINE]: 'error',
          [Status.CONNECTING]: 'warning',
          [Status.ONLINE]: 'success'
        }[this.status]
      },
      connectionTitle () {
        return {
          [Status.OFFLINE]: 'Offline',
          [Status.CONNECTING]: 'Connecting...',
          [Status.ONLINE]: 'Online'
        }[this.status]
      },
      isOffline () {
        return this.status === Status.OFFLINE
      }
    },
    methods: {
      input (value) {
        this.$emit('input', value)
      },
      reload () {
        reloadPage()
      },
      async logOut () {
        await navigator.clipboard.writeText('')
        purgeSessionStorageAndLoadLogIn()
      }
    }
  }
</script>
