<template>
  <v-container fluid>
    <v-row justify="center" align="center">
      <v-col :cols="12" :md="7">
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
      <v-col :cols="12" :md="10" v-if="isAnalysisOn">
        <v-expansion-panels multiple>
          <duplicate-passwords></duplicate-passwords>
          <compromised-passwords></compromised-passwords>
          <vulnerable-passwords></vulnerable-passwords>
        </v-expansion-panels>
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
