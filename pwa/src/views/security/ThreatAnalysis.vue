<style scoped>
  .container {
    max-width: var(--max-content-width);
    margin: 0 auto;
  }
</style>

<template>
  <v-container fluid>
    <v-layout justify-center align-center wrap>
      <v-flex xs8>
        <h2>Threat analysis</h2>
        <p class="mb-0">
          Click the button to toggle reactive password scrutiny for this
          session. Note that we use
          <a href="https://haveibeenpwned.com/Passwords"
            target="_blank" rel="noopener noreferrer">Have I Been Pwned</a>
          under the hood.
        </p>
      </v-flex>
      <v-flex xs3 offset-xs1 class="text-xs-right">
        <v-btn color="primary" @click="toggle">
          {{ isEnabled ? 'Disable' : 'Enable'}}
        </v-btn>
      </v-flex>
    </v-layout>
    <duplicate-passwords v-if="isEnabled" class="mt-4" @edit="editKey">
    </duplicate-passwords>
    <compromised-passwords v-if="isEnabled" class="mt-4" @edit="editKey">
    </compromised-passwords>
    <editor></editor>
  </v-container>
</template>

<script lang="ts">
import Vue from 'vue'
import CompromisedPasswords from './CompromisedPasswords.vue'
import DuplicatePasswords from './DuplicatePasswords.vue'
import Editor from '@/components/Editor.vue'
import { openEditor$ } from '@/store/root/modules/interface/editor'
import { securityOn$ } from '@/store/root/modules/user/modules/security'

export default Vue.extend({
  components: {
    compromisedPasswords: CompromisedPasswords,
    duplicatePasswords: DuplicatePasswords,
    editor: Editor
  },
  data () {
    return {
      isEnabled: securityOn$.getValue()
    }
  },
  methods: {
    toggle () {
      this.isEnabled = !this.isEnabled
      securityOn$.next(this.isEnabled)
    },
    editKey ({ identifier, reveal }: { identifier: string; reveal: boolean }) {
      openEditor$.next({ identifier, reveal })
    }
  }
})
</script>
