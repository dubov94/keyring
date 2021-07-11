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
      <v-col :cols="12" :md="10">
        <duplicate-passwords v-if="isAnalysisOn" @edit="editKey">
        </duplicate-passwords>
        <compromised-passwords v-if="isAnalysisOn" class="mt-6" @edit="editKey">
        </compromised-passwords>
        <vulnerable-passwords v-if="isAnalysisOn" class="mt-6" @edit="editKey">
        </vulnerable-passwords>
      </v-col>
    </v-row>
    <editor v-if="showEditor" :params="editorParams" @close="closeEditor"></editor>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import CompromisedPasswords from './CompromisedPasswords.vue'
import DuplicatePasswords from './DuplicatePasswords.vue'
import VulnerablePasswords from './VulnerablePasswords.vue'
import Editor from '@/components/Editor.vue'
import { isAnalysisOn } from '@/redux/modules/user/security/selectors'
import { enableAnalysis, disableAnalysis } from '@/redux/modules/user/security/actions'
import { DeepReadonly } from 'ts-essentials'

export default Vue.extend({
  components: {
    compromisedPasswords: CompromisedPasswords,
    duplicatePasswords: DuplicatePasswords,
    editor: Editor,
    vulnerablePasswords: VulnerablePasswords
  },
  data () {
    return {
      editorParams: {
        identifier: null,
        reveal: false
      } as DeepReadonly<{
        identifier: string | null;
        reveal: boolean;
      }>,
      showEditor: false
    }
  },
  computed: {
    isAnalysisOn (): boolean {
      return isAnalysisOn(this.$data.$state)
    }
  },
  methods: {
    toggle () {
      this.dispatch(this.isAnalysisOn ? disableAnalysis() : enableAnalysis())
    },
    editKey (editorParams: DeepReadonly<{ identifier: string; reveal: boolean }>) {
      this.editorParams = editorParams
      this.showEditor = true
    },
    closeEditor () {
      this.showEditor = false
      this.editorParams = { identifier: null, reveal: false }
    }
  }
})
</script>
