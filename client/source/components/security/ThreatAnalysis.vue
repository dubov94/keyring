<style scope>
  .analysis-switch {
    position: fixed;
    right: 16px;
    bottom: 16px;
  }
</style>

<template>
  <v-container fluid>
    <v-layout justify-center>
      <v-flex xs10>
        <h2>Threat analysis</h2>
        <p>
          Click the lock button in the corner to enable password scrutiny for
          this session. Note that we use
          <a href="https://haveibeenpwned.com/Passwords">Have I Been Pwned</a>
          under the hood.
        </p>
      </v-flex>
    </v-layout>
    <v-btn fab class="analysis-switch" color="error" @click="switchAnalysis">
      <v-icon>{{ isAnalysisEnabled ? 'lock' : 'lock_open' }}</v-icon>
    </v-btn>
  </v-container>
</template>

<script>
  import {mapActions, mapState} from 'vuex'

  export default {
    computed: {
      ...mapState({
        isAnalysisEnabled: state => state.threats.isAnalysisEnabled
      })
    },
    methods: {
      ...mapActions({
        enableAnalysis: 'threats/enableAnalysis',
        disableAnalysis: 'threats/disableAnalysis'
      }),
      async switchAnalysis () {
        if (this.isAnalysisEnabled) {
          await this.disableAnalysis()
        } else {
          await this.enableAnalysis()
        }
      }
    }
  }
</script>
