<template>
  <v-card>
    <v-card-title>
      <v-container fluid>
        <v-row justify="space-between" align="center">
          <h4>
            Duplicate groups &mdash;
            <span v-if="groupCount < 0">⚠️</span>
            <span class="success--text" v-else-if="groupCount === 0">0</span>
            <span class="warning--text" v-else>{{ groupCount }}</span>
          </h4>
          <v-progress-circular v-show="inProgress" indeterminate
            :size="24" :width="2" color="primary">
          </v-progress-circular>
        </v-row>
      </v-container>
    </v-card-title>
    <v-divider v-if="groupCount > 0"></v-divider>
    <v-card-text v-if="groupCount > 0">
      <div class="text-center">
        <v-pagination v-model="groupNumber" :length="groupCount" circle
          :total-visible="$vuetify.breakpoint.smAndUp ? 7 : 5"></v-pagination>
      </div>
      <v-container fluid>
        <password-masonry :user-keys="groupCards" @edit="editKey">
        </password-masonry>
      </v-container>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { DuplicateGroups, duplicateGroups } from '@/redux/modules/user/security/selectors'
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
    duplicateGroups (): DeepReadonly<DuplicateGroups> {
      return duplicateGroups(this.$data.$state)
    },
    userKeys (): DeepReadonly<Key[]> {
      return userKeys(this.$data.$state)
    },
    inProgress (): boolean {
      return hasIndicator(this.duplicateGroups)
    },
    groupCount (): number {
      return fn.pipe(
        data(this.duplicateGroups),
        option.map((value) => value.length),
        option.getOrElse(() => -1)
      )
    },
    groupCards (): DeepReadonly<Key[]> {
      return fn.pipe(
        data(this.duplicateGroups) as option.Option<Writable<Writable<string[]>[]>>,
        option.chain(array.lookup(this.groupNumber - 1)),
        option.map(array.filterMap<string, DeepReadonly<Key>>((identifier) => {
          return array.findFirst<DeepReadonly<Key>>((key) => key.identifier === identifier)([...this.userKeys])
        })),
        option.getOrElse<DeepReadonly<Key[]>>(() => [])
      )
    }
  },
  methods: {
    editKey ({ identifier, reveal }: { identifier: string; reveal: boolean }) {
      this.$emit('edit', { identifier, reveal })
    }
  },
  watch: {
    duplicateGroups (newValue: DeepReadonly<DuplicateGroups>, oldValue: DeepReadonly<DuplicateGroups>) {
      this.groupNumber = fn.pipe(
        option.Do,
        option.bind('newMatrix', () => data(newValue)),
        option.bind('oldMatrix', () => data(oldValue)),
        option.map(({ newMatrix, oldMatrix }) => fn.pipe(
          newMatrix as Writable<Writable<string[]>[]>,
          array.findIndex(array.every((id) => oldMatrix[this.groupNumber - 1].includes(id))),
          option.fold(() => Math.max(Math.min(this.groupNumber, newMatrix.length), 1), (index) => index + 1)
        )),
        option.getOrElse(() => 1)
      )
    }
  }
})
</script>
