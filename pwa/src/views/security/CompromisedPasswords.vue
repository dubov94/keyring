<template>
  <v-expansion-panel>
    <v-expansion-panel-header disable-icon-rotate>
      Compromised passwords
      <template v-if="!inProgress">({{ keyCount }})</template>
      <template v-slot:actions>
        <v-progress-circular v-if="inProgress" color="primary"
          indeterminate :size="24" :width="2">
        </v-progress-circular>
        <v-icon v-else-if="keyCount === 0" color="success">
          check
        </v-icon>
        <v-icon v-else-if="keyCount > 0" color="error">
          error
        </v-icon>
      </template>
    </v-expansion-panel-header>
    <v-expansion-panel-content v-if="keyCount > 0">
      <v-container fluid>
        <password-masonry :cliques="exposedCliques" :idToScore="idToScore">
        </password-masonry>
      </v-container>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script lang="ts">
import { function as fn, option, readonlyArray } from 'fp-ts'
import { DeepReadonly } from 'ts-essentials'
import Vue from 'vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { Color } from '@/cryptography/strength_test_service'
import { cliques, Clique, peelClique } from '@/redux/modules/user/keys/selectors'
import { ExposedCliqueIds, exposedCliqueIds } from '@/redux/modules/user/security/selectors'
import { data, hasIndicator } from '@/redux/remote_data'

export default Vue.extend({
  components: {
    passwordMasonry: PasswordMasonry
  },
  computed: {
    cliques (): DeepReadonly<Clique[]> {
      return cliques(this.$data.$state).map(peelClique)
    },
    exposedCliqueIds (): DeepReadonly<ExposedCliqueIds> {
      return exposedCliqueIds(this.$data.$state)
    },
    exposedCliques (): DeepReadonly<Clique[]> {
      return fn.pipe(
        data(this.exposedCliqueIds),
        option.map(readonlyArray.filterMap<string, DeepReadonly<Clique>>((name) => {
          return readonlyArray.findFirst<DeepReadonly<Clique>>((clique) => clique.name === name)(this.cliques)
        })),
        option.getOrElse<DeepReadonly<Clique[]>>(() => [])
      )
    },
    idToScore (): DeepReadonly<{ [key: string]: Color }> {
      return Object.fromEntries(this.exposedCliques.map((clique) => [clique.name, Color.RED]))
    },
    keyCount (): number {
      return fn.pipe(
        data(this.exposedCliqueIds),
        option.map((value) => value.length),
        option.getOrElse(() => 0)
      )
    },
    inProgress (): boolean {
      return hasIndicator(this.exposedCliqueIds)
    }
  }
})
</script>
