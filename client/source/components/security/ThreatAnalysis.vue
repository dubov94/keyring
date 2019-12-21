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
          <a href="https://haveibeenpwned.com/Passwords">Have I Been Pwned</a>
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
    <v-card v-if="isAnalysisEnabled" class="mt-4">
      <v-card-title>
        <h3>
          Duplicate groups&nbsp;&mdash;&nbsp;
          <span class="success--text" v-if="duplicateGroupsLength === 0">
            0
          </span>
          <span class="warning--text" v-else>{{ duplicateGroupsLength }}</span>
        </h3>
      </v-card-title>
      <template v-if="duplicateGroupsLength > 0">
        <v-divider></v-divider>
        <v-card-text>
          <duplicate-passwords @edit="handleEditKey"></duplicate-passwords>
        </v-card-text>
      </template>
    </v-card>
    <v-card v-if="isAnalysisEnabled" class="mt-4">
      <v-card-title>
        <h3>
          Compromised passwords&nbsp;&mdash;&nbsp;
          <span class="success--text" v-if="exposedUserKeyIdsLength === 0">
            0
          </span>
          <span class="error--text" v-else>{{ exposedUserKeyIdsLength }}</span>
        </h3>
      </v-card-title>
      <template v-if="exposedUserKeyIdsLength > 0">
        <v-divider></v-divider>
        <v-card-text>
          <compromised-passwords @edit="handleEditKey"></compromised-passwords>
        </v-card-text>
      </template>
    </v-card>
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
        isAnalysisEnabled: state => state.threats.isAnalysisEnabled,
        duplicateGroupsLength: state => state.threats.duplicateGroups.length,
        exposedUserKeyIdsLength: state => state.threats.exposedUserKeyIds.length
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
