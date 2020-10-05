<template>
  <v-card>
    <v-card-title>
      <v-layout justify-space-between align-center>
        <h3>
          Compromised passwords &mdash;
          <span v-if="keyCount < 0">⚠️</span>
          <span v-else-if="keyCount === 0" class="success--text">0</span>
          <span v-else class="error--text">{{ keyCount }}</span>
        </h3>
        <v-progress-circular v-show="inProgress" indeterminate
          :size="24" :width="2" color="primary">
        </v-progress-circular>
      </v-layout>
    </v-card-title>
    <v-divider v-if="keyCount > 0"></v-divider>
    <v-card-text v-if="keyCount > 0">
      <password-masonry :user-keys="exposedKeys" @edit="editKey">
      </password-masonry>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { userKeys$ } from '@/store/root/modules/user'
import { exposedUserKeyIds$ } from '@/store/root/modules/user/modules/security'
import { Undefinable } from '@/utilities'
import { ExposedUserKeyIdsProgress, Key, ExposedUserKeyIdsProgressState } from '@/store/state'
import { data, isError } from '@/store/flow'

export default Vue.extend({
  components: {
    passwordMasonry: PasswordMasonry
  },
  data () {
    return {
      ...{
        userKeys: undefined as Undefinable<Array<Key>>,
        exposedKeyIds: undefined as Undefinable<ExposedUserKeyIdsProgress>
      }
    }
  },
  subscriptions () {
    return {
      userKeys: userKeys$,
      exposedKeyIds: exposedUserKeyIds$
    }
  },
  computed: {
    exposedKeys (): Undefinable<Array<Key>> {
      if (this.userKeys && this.exposedKeyIds && !isError(this.exposedKeyIds)) {
        return this.userKeys.filter(({ identifier }) =>
          data(this.exposedKeyIds!, []).includes(identifier))
      }
      return undefined
    },
    keyCount (): number {
      const count = this.exposedKeys?.length
      return count === undefined ? -1 : count
    },
    inProgress (): boolean {
      return this.exposedKeyIds?.state === ExposedUserKeyIdsProgressState.WORKING
    }
  },
  methods: {
    editKey ({ identifier, reveal }: { identifier: string; reveal: boolean }) {
      this.$emit('edit', { identifier, reveal })
    }
  }
})
</script>
