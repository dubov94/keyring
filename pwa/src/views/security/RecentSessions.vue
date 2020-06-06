<template>
  <v-container fluid>
    <v-layout justify-center>
      <v-flex xs10>
        <h2>Recent sessions</h2>
        <p>The table contains entries from the last 28 days.</p>
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
</template>

<script>
import UaParser from 'ua-parser-js'
import { mapActions, mapGetters, mapState } from 'vuex'

export default {
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
        ({ creationTimeInMillis, ipAddress, userAgent, geolocation }) => {
          const moment = new Date(creationTimeInMillis).toLocaleString()
          let area = null
          if (geolocation.country) {
            if (geolocation.city) {
              area = `${geolocation.city}, ${geolocation.country}`
            } else {
              area = geolocation.country
            }
          }
          const location = area === null ? ipAddress : `${ipAddress}, ${area}`
          const browser = new UaParser(userAgent).getBrowser()
          return { moment, location, browser }
        }
      )
    }
  },
  methods: {
    ...mapActions({
      clearRecentSessions: 'clearRecentSessions',
      fetchRecentSessions: 'fetchRecentSessions'
    })
  },
  beforeDestroy () {
    this.clearRecentSessions()
  },
  watch: {
    isOnline: {
      immediate: true,
      handler (newValue) {
        if (newValue) {
          this.fetchRecentSessions()
        }
      }
    }
  }
}
</script>
