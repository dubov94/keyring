<template>
  <v-container fluid>
    <v-row justify="center">
      <v-col :cols="12" :md="10">
        <h2>Recent sessions</h2>
        <p>The table contains entries from the last 28 days.</p>
        <v-data-table :loading="isLoading" class="elevation-1"
          :headers="headers" :items="items">
          <template #item="{ item }">
            <tr>
              <td>{{ item.moment }}</td>
              <td>{{ item.location }}</td>
              <td>
                {{ item.browser.name }}
                {{ item.browser.version }}
              </td>
              <td>
                <v-chip :color="item.status.color">
                  {{ item.status.text }}
                </v-chip>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { function as fn, option } from 'fp-ts'
import { DeepReadonly } from 'ts-essentials'
import { UAParser } from 'ua-parser-js'
import Vue from 'vue'
import { Session, SessionStatus } from '@/redux/domain'
import { fetchRecentSessions, recentSessionsRetrievalReset } from '@/redux/modules/user/security/actions'
import { recentSessions, RecentSessions } from '@/redux/modules/user/security/selectors'
import { hasIndicator, data } from '@/redux/remote_data'

interface ItemStatus {
  text: string;
  color?: 'warning' | 'success';
}

interface Item {
  moment: string;
  location: string;
  browser: { name?: string; version?: string };
  status: ItemStatus;
}

const convertSessionToItem = ({
  creationTimeInMillis,
  ipAddress,
  userAgent,
  geolocation,
  status
}: DeepReadonly<Session>): Item => {
  const moment = new Date(creationTimeInMillis).toLocaleString()
  let area: string | null = null
  if (geolocation.country) {
    if (geolocation.city) {
      area = `${geolocation.city}, ${geolocation.country}`
    } else {
      area = geolocation.country
    }
  }
  const location = area === null ? ipAddress : `${ipAddress}, ${area}`
  const browser = new UAParser(userAgent).getBrowser()
  let itemStatus: ItemStatus = { text: 'Unknown' }
  if (status === SessionStatus.AWAITING_2FA) {
    itemStatus = { text: 'Awaiting 2FA', color: 'warning' }
  } else if (status === SessionStatus.ACTIVATED) {
    itemStatus = { text: 'Activated', color: 'success' }
  }
  return { moment, location, browser, status: itemStatus }
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
        { text: 'User agent', value: 'browser' },
        { text: 'Status', value: 'status' }
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
