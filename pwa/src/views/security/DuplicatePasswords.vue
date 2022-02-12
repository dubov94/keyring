<template>
  <v-expansion-panel>
    <v-expansion-panel-header disable-icon-rotate>
      Duplicate groups
      <template v-if="!inProgress">({{ groupCount }})</template>
      <template v-slot:actions>
        <v-progress-circular v-if="inProgress" color="primary"
          indeterminate :size="24" :width="2">
        </v-progress-circular>
        <v-icon v-else-if="groupCount === 0" color="success">
          check
        </v-icon>
        <v-icon v-else-if="groupCount > 0" color="error">
          error
        </v-icon>
      </template>
    </v-expansion-panel-header>
    <v-expansion-panel-content v-if="groupCount > 0">
      <div class="text-center">
        <v-pagination v-model="groupNumber" :length="groupCount" circle
          :total-visible="$vuetify.breakpoint.smAndUp ? 7 : 5"></v-pagination>
      </div>
      <v-container fluid>
        <password-masonry :cliques="groupCards"></password-masonry>
      </v-container>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script lang="ts">
import { option, function as fn, readonlyArray } from 'fp-ts'
import { DeepReadonly } from 'ts-essentials'
import Vue from 'vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { cliques, Clique, peelClique } from '@/redux/modules/user/keys/selectors'
import { DuplicateGroups, duplicateGroups } from '@/redux/modules/user/security/selectors'
import { hasIndicator, data } from '@/redux/remote_data'

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
    cliques (): DeepReadonly<Clique[]> {
      return cliques(this.$data.$state).map(peelClique)
    },
    inProgress (): boolean {
      return hasIndicator(this.duplicateGroups)
    },
    groupCount (): number {
      return fn.pipe(
        data(this.duplicateGroups),
        option.map((value) => value.length),
        option.getOrElse(() => 0)
      )
    },
    groupCards (): DeepReadonly<Clique[]> {
      return fn.pipe(
        data(this.duplicateGroups),
        option.chain(readonlyArray.lookup(this.groupNumber - 1)),
        option.map(readonlyArray.filterMap<string, DeepReadonly<Clique>>((name) => {
          return readonlyArray.findFirst<DeepReadonly<Clique>>((clique) => clique.name === name)(this.cliques)
        })),
        option.getOrElse<DeepReadonly<Clique[]>>(() => [])
      )
    }
  },
  watch: {
    duplicateGroups (newValue: DeepReadonly<DuplicateGroups>, oldValue: DeepReadonly<DuplicateGroups>) {
      this.groupNumber = fn.pipe(
        option.Do,
        option.bind('newMatrix', () => data(newValue)),
        option.bind('oldMatrix', () => data(oldValue)),
        option.map(({ newMatrix, oldMatrix }) => fn.pipe(
          newMatrix as DeepReadonly<string[][]>,
          readonlyArray.findIndex(readonlyArray.every((id) => oldMatrix[this.groupNumber - 1].includes(id))),
          option.fold(() => Math.max(Math.min(this.groupNumber, newMatrix.length), 1), (index) => index + 1)
        )),
        option.getOrElse(() => 1)
      )
    }
  }
})
</script>
