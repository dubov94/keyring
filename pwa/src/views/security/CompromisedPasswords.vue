<template>
  <v-card>
    <v-card-title>
      <v-row justify-space-between align-center>
        <h3>
          Compromised passwords &mdash;
          <span v-if="keyCount < 0">⚠️</span>
          <span v-else-if="keyCount === 0" class="success--text">0</span>
          <span v-else class="error--text">{{ keyCount }}</span>
        </h3>
        <v-progress-circular v-show="inProgress" indeterminate
          :size="24" :width="2" color="primary">
        </v-progress-circular>
      </v-row>
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
import { userKeys } from '@/redux/modules/user/keys/selectors'
import { Key } from '@/redux/entities'
import { function as fn, option, array } from 'fp-ts'
import { ExposedUserKeyIds, exposedUserKeyIds } from '@/redux/modules/user/security/selectors'
import { data, hasIndicator } from '@/redux/remote_data'
import { DeepReadonly, Writable } from 'ts-essentials'

export default Vue.extend({
  components: {
    passwordMasonry: PasswordMasonry
  },
  computed: {
    userKeys (): DeepReadonly<Key[]> {
      return userKeys(this.$data.$state)
    },
    exposedUserKeyIds (): DeepReadonly<ExposedUserKeyIds> {
      return exposedUserKeyIds(this.$data.$state)
    },
    exposedKeys (): DeepReadonly<Key[]> {
      return fn.pipe(
        data(this.exposedUserKeyIds) as option.Option<Writable<string[]>>,
        option.map(array.filterMap<string, DeepReadonly<Key>>((identifier) => {
          return array.findFirst<DeepReadonly<Key>>((key) => key.identifier === identifier)([...this.userKeys])
        })),
        option.getOrElse<DeepReadonly<Key[]>>(() => [])
      )
    },
    keyCount (): number {
      return fn.pipe(
        data(this.exposedUserKeyIds),
        option.map((value) => value.length),
        option.getOrElse(() => -1)
      )
    },
    inProgress (): boolean {
      return hasIndicator(this.exposedUserKeyIds)
    }
  },
  methods: {
    editKey ({ identifier, reveal }: { identifier: string; reveal: boolean }) {
      this.$emit('edit', { identifier, reveal })
    }
  }
})
</script>
