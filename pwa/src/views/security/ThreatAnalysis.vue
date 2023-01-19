<style scoped>
  .container {
    max-width: calc(2 * (12px + 24px) + var(--max-content-width));
  }
</style>

<template>
  <v-container fluid>
    <v-row justify="center" align="center">
      <v-col :cols="12" :md="9">
        <h2>Threat analysis</h2>
        <p class="mb-0">
          Click the button to toggle reactive password scrutiny for this
          session. Note that we use
          <a href="https://haveibeenpwned.com/Passwords"
            target="_blank" rel="noopener noreferrer">Have I Been Pwned</a>
          under the hood.
        </p>
      </v-col>
      <v-col :cols="12" :offset-md="1" :md="2" class="text-center text-md-right">
        <v-btn color="primary" @click="toggle">
          {{ isAnalysisOn ? 'Disable' : 'Enable'}}
        </v-btn>
      </v-col>
      <v-col v-if="isAnalysisOn" :cols="12">
        <v-expansion-panels multiple>
          <duplicate-passwords></duplicate-passwords>
          <compromised-passwords></compromised-passwords>
          <vulnerable-passwords></vulnerable-passwords>
        </v-expansion-panels>
      </v-col>
      <v-col v-else :cols="12" class="text-center">
        <div class="mt-12"><v-icon :size="128">policy</v-icon></div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import { enableAnalysis, disableAnalysis } from '@/redux/modules/user/security/actions'
import { isAnalysisOn } from '@/redux/modules/user/security/selectors'
import CompromisedPasswords from './CompromisedPasswords.vue'
import DuplicatePasswords from './DuplicatePasswords.vue'
import VulnerablePasswords from './VulnerablePasswords.vue'

export default Vue.extend({
  components: {
    compromisedPasswords: CompromisedPasswords,
    duplicatePasswords: DuplicatePasswords,
    vulnerablePasswords: VulnerablePasswords
  },
  computed: {
    isAnalysisOn (): boolean {
      return isAnalysisOn(this.$data.$state)
    }
  },
  methods: {
    toggle () {
      this.dispatch(this.isAnalysisOn ? disableAnalysis() : enableAnalysis())
    }
  }
})
</script>
