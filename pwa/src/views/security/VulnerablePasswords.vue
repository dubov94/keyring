<template>
  <v-expansion-panel>
    <v-expansion-panel-header disable-icon-rotate>
      Weak passwords
      <template v-if="!inProgress">({{ keyCount }})</template>
      <template v-slot:actions>
        <v-progress-circular v-if="inProgress" color="primary"
          indeterminate :size="24" :width="2">
        </v-progress-circular>
        <v-icon v-if="keyCount === 0" color="success">
          check
        </v-icon>
        <v-icon v-if="keyCount > 0" color="error">
          error
        </v-icon>
      </template>
    </v-expansion-panel-header>
    <v-expansion-panel-content v-if="keyCount > 0">
      <v-container fluid>
        <password-masonry :cliques="scoredCliques" :idToScore="idToScore">
        </password-masonry>
      </v-container>
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script lang="ts">
import { option, function as fn, readonlyArray, record, semigroup } from 'fp-ts'
import { DeepReadonly } from 'ts-essentials'
import Vue from 'vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { Color } from '@/cryptography/strength_test_service'
import { cliques, Clique, peelClique } from '@/redux/modules/user/keys/selectors'
import { ScoredClique } from '@/redux/modules/user/security/actions'
import { VulnerableCliques, vulnerableCliques } from '@/redux/modules/user/security/selectors'
import { hasIndicator, data } from '@/redux/remote_data'

export default Vue.extend({
  components: {
    passwordMasonry: PasswordMasonry
  },
  computed: {
    vulnerableCliques (): DeepReadonly<VulnerableCliques> {
      return vulnerableCliques(this.$data.$state)
    },
    cliques (): DeepReadonly<Clique[]> {
      return cliques(this.$data.$state).map(peelClique)
    },
    inProgress (): boolean {
      return hasIndicator(this.vulnerableCliques)
    },
    scoredCliques (): DeepReadonly<Clique[]> {
      return fn.pipe(
        data(this.vulnerableCliques),
        option.map(readonlyArray.filterMap<DeepReadonly<ScoredClique>, DeepReadonly<Clique>>(({ name }) => {
          return readonlyArray.findFirst<DeepReadonly<Clique>>((clique) => clique.name === name)(this.cliques)
        })),
        option.getOrElse<DeepReadonly<Clique[]>>(() => [])
      )
    },
    idToScore (): DeepReadonly<{ [key: string]: Color }> {
      return fn.pipe(
        data(this.vulnerableCliques),
        option.map((items: DeepReadonly<ScoredClique[]>) => record.fromFoldableMap(
          semigroup.last<DeepReadonly<Color>>(),
          readonlyArray.Foldable
        )(
          items,
          (scoredClique) => [scoredClique.name, scoredClique.score.color]
        )),
        option.getOrElse<DeepReadonly<{ [key: string]: Color }>>(() => ({}))
      )
    },
    keyCount (): number {
      return fn.pipe(
        data(this.vulnerableCliques),
        option.map((value) => value.length),
        option.getOrElse(() => -1)
      )
    }
  }
})
</script>
