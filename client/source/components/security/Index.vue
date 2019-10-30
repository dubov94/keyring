<template>
  <page>
    <side-menu v-model="showMenu"></side-menu>
    <toolbar v-model="showMenu"></toolbar>
    <v-content>
      <v-container fluid>
        <p class="text-xs-center text--secondary caption">
          If you do not recognize one of the sessions, your account may have
          been compromised.
        </p>
        <v-layout justify-center>
          <v-flex xs10>
            <v-data-table :loading="isOnline && !hasSessionsData"
              class="elevation-1" disable-initial-sort
              :headers="headers" :items="items">
              <template slot="no-data">
                <p v-if="!isOnline" class="text-xs-center my-0">
                  Connect to see recent sessions.
                </p>
              </template>
              <template slot="items" slot-scope="slotProps">
                <td>{{ slotProps.item.moment }}</td>
                <td>{{ slotProps.item.location }}</td>
                <td>
                  {{ slotProps.item.browser.name }}
                  {{ slotProps.item.browser.version }}
                </td>
              </template>
            </v-data-table>
          </v-flex>
        </v-layout>
      </v-container>
    </v-content>
  </page>
</template>

<script>
  import UaParser from 'ua-parser-js'
  import Page from '../Page'
  import SideMenu from '../toolbar-with-menu/SideMenu'
  import Toolbar from '../toolbar-with-menu/Toolbar'
  import {mapActions, mapGetters, mapState} from 'vuex'

  export default {
    components: {
      page: Page,
      sideMenu: SideMenu,
      toolbar: Toolbar
    },
    data () {
      return { showMenu: false }
    },
    computed: {
      ...mapState({
        recentSessions: state => state.recentSessions || []
      }),
      ...mapGetters({
        hasSessionsData: 'hasSessionsData',
        isOnline: 'isOnline'
      }),
      headers () {
        return [
          { text: 'Timestamp', value: 'moment' },
          { text: 'IP address', value: 'location' },
          { text: 'User agent', value: 'browser' }
        ]
      },
      items () {
        return this.recentSessions.map(
          ({creationTimeInMillis, ipAddress, userAgent, geolocation}) => {
            let moment = new Date(creationTimeInMillis).toLocaleString()
            let area = null
            if (geolocation.country) {
              if (geolocation.city) {
                area = `${geolocation.city}, ${geolocation.country}`
              } else {
                area = geolocation.country
              }
            }
            let location = area === null ? ipAddress : `${ipAddress}, ${area}`
            let browser = new UaParser(userAgent).getBrowser()
            return {moment, location, browser}
          }
        )
      }
    },
    methods: {
      ...mapActions({
        fetchRecentSessions: 'fetchRecentSessions'
      })
    },
    watch: {
      isOnline: {
        immediate: true,
        handler (newValue) {
          if (newValue && !this.hasSessionsData) {
            this.fetchRecentSessions()
          }
        }
      }
    }
  }
</script>
