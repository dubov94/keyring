<style scope>
  .analysis-switch {
    position: fixed;
    right: 16px;
    bottom: 16px;
  }
</style>

<template>
  <v-container fluid>
    <v-layout justify-center align-center>
      <v-flex xs7>
        <h2>Threat analysis</h2>
        <p>
          Click the button on the right to enable reactive password scrutiny for
          this session. Note that we use
          <a href="https://haveibeenpwned.com/Passwords">Have I Been Pwned</a>
          under the hood.
        </p>
      </v-flex>
      <v-flex xs2 offset-xs1 class="text-xs-right">
        <v-btn color="primary" :disabled="isAnalysisEnabled"
          @click="enableAnalysis">
          {{ isAnalysisEnabled ? 'Enabled' : 'Enable'}}
        </v-btn>
      </v-flex>
    </v-layout>
    <v-layout justify-center v-if="isAnalysisEnabled">
      <v-flex xs10>
        <compromised-passwords></compromised-passwords>
      </v-flex>
    </v-layout>
    <v-layout justify-center v-if="isAnalysisEnabled">
      <v-flex xs10>
        <duplicate-passwords></duplicate-passwords>
      </v-flex>
    </v-layout>
    <editor></editor>
  </v-container>
</template>

<script>
  import CompromisedPasswords from './CompromisedPasswords'
  import DuplicatePasswords from './DuplicatePasswords'
  import Editor from '../Editor'
  import {mapActions, mapState} from 'vuex'

  export default {
    components: {
      compromisedPasswords: CompromisedPasswords,
      duplicatePasswords: DuplicatePasswords,
      editor: Editor
    },
    computed: {
      ...mapState({
        isAnalysisEnabled: state => state.threats.isAnalysisEnabled
      })
    },
    methods: {
      ...mapActions({
        enableAnalysis: 'threats/enableAnalysis'
      })
    }
  }
</script>
