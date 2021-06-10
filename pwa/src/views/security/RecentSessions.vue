<template>
  <v-container fluid>
    <v-row justify-center>
      <v-col xs10>
        <h2>Recent sessions</h2>
        <p>The table contains entries from the last 28 days.</p>
        <v-data-table :loading="isLoading" class="elevation-1"
          :headers="headers" :items="items">
          <template #item="{ item }">
            <td>{{ item.moment }}</td>
            <td>{{ item.location }}</td>
            <td>
              {{ item.browser.name }}
              {{ item.browser.version }}
            </td>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import { UAParser } from 'ua-parser-js'
import { recentSessions, RecentSessions } from '@/redux/modules/user/security/selectors'
import { fetchRecentSessions, recentSessionsRetrievalReset } from '@/redux/modules/user/security/actions'
import { hasIndicator, data } from '@/redux/remote_data'
import { function as fn, option } from 'fp-ts'
import { Session } from '@/redux/entities'
import { DeepReadonly } from 'ts-essentials'

interface Item {
  moment: string;
  location: string;
  browser: { name?: string; version?: string };
}

const convertSessionToItem = ({ creationTimeInMillis, ipAddress, userAgent, geolocation }: DeepReadonly<Session>): Item => {
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

export default Vue.extend({
  computed: {
    recentSessions (): DeepReadonly<RecentSessions> {
      return recentSessions(this.$data.$state)
    },
    isLoading (): boolean {
      return hasIndicator(this.recentSessions)
    },
    headers (): { text: string; value: string }[] {
      return [
        { text: 'Timestamp', value: 'moment' },
        { text: 'IP address', value: 'location' },
        { text: 'User agent', value: 'browser' }
      ]
    },
    items (): Item[] {
      return fn.pipe(
        data(this.recentSessions),
        option.map((sessions: DeepReadonly<Session[]>) => sessions.map(convertSessionToItem)),
        option.getOrElse(() => [] as Item[])
      )
    }
  },
  created () {
    this.dispatch(fetchRecentSessions())
  },
  beforeDestroy () {
    this.dispatch(recentSessionsRetrievalReset())
  }
})
</script>
