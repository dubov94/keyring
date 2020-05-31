<style scoped>
  .container {
    max-width: var(--max-content-width);
    margin: 0 auto;
  }

  .analysis-switch {
    position: fixed;
    right: 16px;
    bottom: 16px;
  }
</style>

<template>
  <v-container fluid>
    <v-layout justify-center align-center wrap>
      <v-flex xs8>
        <h2>Threat analysis</h2>
        <p class="mb-0">
          Click the button to enable reactive password scrutiny for this
          session. Note that we use
          <a href="https://haveibeenpwned.com/Passwords"
            target="_blank" rel="noopener noreferrer">Have I Been Pwned</a>
          under the hood.
        </p>
      </v-flex>
      <v-flex xs3 offset-xs1 class="text-xs-right">
        <v-btn color="primary" :disabled="!isOnline || isAnalysisEnabled"
          @click="enableAnalysis">
          {{ isAnalysisEnabled ? 'Enabled' : 'Enable'}}
        </v-btn>
      </v-flex>
    </v-layout>
    <duplicate-passwords v-if="isAnalysisEnabled" class="mt-4"
      @edit="handleEditKey">
    </duplicate-passwords>
    <compromised-passwords v-if="isAnalysisEnabled" class="mt-4"
      @edit="handleEditKey">
    </compromised-passwords>
    <editor></editor>
  </v-container>
</template>

<script>
  import CompromisedPasswords from './CompromisedPasswords'
  import DuplicatePasswords from './DuplicatePasswords'
  import Editor from '../Editor'
  import {mapActions, mapGetters, mapMutations, mapState} from 'vuex'

  export default {
    components: {
      compromisedPasswords: CompromisedPasswords,
      duplicatePasswords: DuplicatePasswords,
      editor: Editor
    },
    computed: {
      ...mapState({
        isAnalysisEnabled: state => state.threats.isAnalysisEnabled
      }),
      ...mapGetters({
        isOnline: 'isOnline'
      })
    },
    methods: {
      ...mapMutations({
        openEditor: 'interface/openEditor'
      }),
      ...mapActions({
        enableAnalysis: 'threats/enableAnalysis'
      }),
      handleEditKey ({ identifier, reveal }) {
        this.openEditor({ identifier, reveal })
      }
    }
  }
</script>
