<template>
  <v-card>
    <v-card-title>
      <v-row justify-space-between align-center>
        <h3>
          Vulnerable passwords &mdash;
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
      <password-masonry :user-keys="scoredKeys" @edit="editKey">
      </password-masonry>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import PasswordMasonry, { ScoredKey as MasonryKey } from '@/components/PasswordMasonry.vue'
import { ScoredKey } from '@/redux/modules/user/security/actions'
import { VulnerableKeys, vulnerableKeys } from '@/redux/modules/user/security/selectors'
import { hasIndicator, data } from '@/redux/remote_data'
import { option, function as fn, array } from 'fp-ts'
import { Key } from '@/redux/entities'
import { userKeys } from '@/redux/modules/user/keys/selectors'
import { DeepReadonly, Writable } from 'ts-essentials'

export default Vue.extend({
  components: {
    passwordMasonry: PasswordMasonry
  },
  data () {
    return {
      groupNumber: 1
    }
  },
  computed: {
    vulnerableKeys (): DeepReadonly<VulnerableKeys> {
      return vulnerableKeys(this.$data.$state)
    },
    userKeys (): DeepReadonly<Key[]> {
      return userKeys(this.$data.$state)
    },
    inProgress (): boolean {
      return hasIndicator(this.vulnerableKeys)
    },
    scoredKeys (): DeepReadonly<MasonryKey[]> {
      return fn.pipe(
        data(this.vulnerableKeys) as option.Option<Writable<ScoredKey[]>>,
        option.map(array.filterMap<
          DeepReadonly<ScoredKey>,
          DeepReadonly<MasonryKey>
        >(({ identifier, score }) => fn.pipe(
          [...this.userKeys],
          array.findFirst<DeepReadonly<Key>>((key) => key.identifier === identifier),
          option.map<DeepReadonly<Key>, DeepReadonly<MasonryKey>>((key) => ({ ...key, score }))
        ))),
        option.getOrElse<DeepReadonly<MasonryKey[]>>(() => [])
      )
    },
    keyCount (): number {
      return fn.pipe(
        data(this.vulnerableKeys),
        option.map((value) => value.length),
        option.getOrElse(() => -1)
      )
    }
  },
  methods: {
    editKey ({ identifier, reveal }: { identifier: string; reveal: boolean }) {
      this.$emit('edit', { identifier, reveal })
    }
  }
})
</script>
