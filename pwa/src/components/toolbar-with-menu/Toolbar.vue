<template>
  <v-toolbar app clipped-left prominent color="primary" dark>
    <v-toolbar-side-icon v-if="hasMenu" @click="toggle">
    </v-toolbar-side-icon>
    <slot>
      <v-spacer></v-spacer>
    </slot>
    <v-btn v-if="!isUserActive" icon>
      <v-icon>login</v-icon>
    </v-btn>
    <v-menu v-if="isUserActive" offset-y>
      <v-btn slot="activator" icon>
        <v-icon>account_circle</v-icon>
      </v-btn>
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
        <v-list-tile @click="logOut">
          <v-list-tile-action>
            <v-icon>fa-sign-out-alt</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>
              Log out
            </v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-menu>
  </v-toolbar>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { Status } from '../../store/root/status'
import { reloadPage, purgeSessionStorageAndLoadLogIn } from '../../utilities'

export default {
  props: ['value', 'hasMenu'],
  computed: {
    ...mapState({
      status: (state) => state.status
    }),
    ...mapGetters({
      isUserActive: 'isUserActive'
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
    toggle () {
      this.$emit('input', !this.value)
    },
    reload () {
      reloadPage()
    },
    logOut () {
      purgeSessionStorageAndLoadLogIn()
    }
  }
}
</script>
