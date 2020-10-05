<template>
  <v-card>
    <v-card-title>
      <v-layout justify-space-between align-center>
        <h3>
          Duplicate groups &mdash;
          <span v-if="groupCount < 0">⚠️</span>
          <span class="success--text" v-else-if="groupCount === 0">0</span>
          <span class="warning--text" v-else>{{ groupCount }}</span>
        </h3>
        <v-progress-circular v-show="inProgress" indeterminate
          :size="24" :width="2" color="primary">
        </v-progress-circular>
      </v-layout>
    </v-card-title>
    <v-divider v-if="groupCount > 0"></v-divider>
    <v-card-text v-if="groupCount > 0">
      <div class="mb-3 text-xs-center">
        <v-pagination v-model="groupNumber" :length="groupCount" circle
          :total-visible="$vuetify.breakpoint.smAndUp ? 7 : 5"></v-pagination>
      </div>
      <password-masonry :user-keys="groupCards" @edit="editKey">
      </password-masonry>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { userKeys$ } from '@/store/root/modules/user'
import { duplicateGroups$ } from '@/store/root/modules/user/modules/security'
import { Undefinable } from '@/utilities'
import { DuplicateGroupsProgress, Key, DuplicateGroupsProgressState } from '@/store/state'
import { data, isError } from '@/store/flow'

export default Vue.extend({
  components: {
    passwordMasonry: PasswordMasonry
  },
  data () {
    return {
      ...{
        groupNumber: 1
      },
      ...{
        userKeys: undefined as Undefinable<Array<Key>>,
        duplicateGroups: undefined as Undefinable<DuplicateGroupsProgress>
      }
    }
  },
  subscriptions () {
    return {
      userKeys: userKeys$,
      duplicateGroups: duplicateGroups$
    }
  },
  computed: {
    inProgress (): boolean {
      return this.duplicateGroups?.state === DuplicateGroupsProgressState.WORKING
    },
    groupCount (): number {
      if (this.userKeys && this.duplicateGroups && !isError(this.duplicateGroups)) {
        return data(this.duplicateGroups, []).length
      }
      return -1
    },
    groupCards (): Undefinable<Array<Key>> {
      if (this.groupCount > 0) {
        const list = []
        for (const identifier of data(this.duplicateGroups!, [])[this.groupNumber - 1]) {
          const maybeIndex = this.userKeys!.findIndex(key => key.identifier === identifier)
          if (maybeIndex !== undefined && maybeIndex > -1) {
            list.push(this.userKeys![maybeIndex])
          }
        }
        return list
      }
      return undefined
    }
  },
  methods: {
    editKey ({ identifier, reveal }: { identifier: string; reveal: boolean }) {
      this.$emit('edit', { identifier, reveal })
    }
  },
  watch: {
    groupCount (newValue) {
      // Since one cannot add keys from this page, we do not have to worry
      // about potentially changing `groupNumber` to stay on the same group.
      this.groupNumber = Math.max(Math.min(this.groupNumber, newValue), 1)
    }
  }
})
</script>
