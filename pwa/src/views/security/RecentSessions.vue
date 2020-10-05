<template>
  <v-container fluid>
    <v-layout justify-center>
      <v-flex xs10>
        <h2>Recent sessions</h2>
        <p>The table contains entries from the last 28 days.</p>
        <v-data-table :loading="isLoading"
          class="elevation-1" disable-initial-sort
          :headers="headers" :items="items">
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

<script lang="ts">
import Vue from 'vue'
import { UAParser } from 'ua-parser-js'
import { Undefinable } from '@/utilities'
import { RecentSessionsProgress, RecentSessionsProgressState } from '@/store/state'
import { recentSessions$, fetchRecentSessions$ } from '@/store/root/modules/user/modules/security'
import { data } from '@/store/flow'
import { act, reset } from '@/store/resettable_action'

export default Vue.extend({
  data () {
    return {
      ...{
        recentSessions: undefined as Undefinable<RecentSessionsProgress>
      }
    }
  },
  subscriptions () {
    return {
      recentSessions: recentSessions$
    }
  },
  computed: {
    isLoading (): boolean {
      return this.recentSessions?.state === RecentSessionsProgressState.WORKING
    },
    headers (): Array<{ text: string; value: string }> {
      return [
        { text: 'Timestamp', value: 'moment' },
        { text: 'IP address', value: 'location' },
        { text: 'User agent', value: 'browser' }
      ]
    },
    items (): Array<{ moment: string; location: string; browser: { name?: string; version?: string } }> {
      if (this.recentSessions) {
        return data(this.recentSessions, []).map(
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
            const browser = new UAParser(userAgent).getBrowser()
            return { moment, location, browser }
          }
        )
      }
      return []
    }
  },
  created () {
    fetchRecentSessions$.next(act(undefined))
  },
  beforeDestroy () {
    fetchRecentSessions$.next(reset())
  }
})
</script>
