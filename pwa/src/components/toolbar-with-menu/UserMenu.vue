<template>
  <v-navigation-drawer app
    :temporary="isTemporary" :floating="isTemporary"
    :permanent="isPermanent" :clipped="isPermanent"
    :value="value" @input="input">
    <v-list two-line>
      <v-list-item to="/dashboard">
        <v-list-item-action>
          <v-icon>dashboard</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title>
            Dashboard
          </v-list-item-title>
          <v-list-item-subtitle>
            Search for items
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
      <v-list-item to="/security/threat-analysis" :disabled="!canAccessApi">
        <v-list-item-action>
          <v-icon>security</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title>
            Threats
          </v-list-item-title>
          <v-list-item-subtitle>
            Password safety
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
      <v-list-item to="/security/recent-sessions" :disabled="!canAccessApi">
        <v-list-item-action>
          <v-icon>history</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title>
            Sessions
          </v-list-item-title>
          <v-list-item-subtitle>
            Account activity
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
      <v-list-item to="/portation" :disabled="!canAccessApi">
        <v-list-item-action>
          <v-icon>backup</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title>
            Portation
          </v-list-item-title>
          <v-list-item-subtitle>
            Import or export
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script lang="ts">
import Vue from 'vue'
import { canAccessApi } from '@/redux/modules/user/account/selectors'

export default Vue.extend({
  props: ['value'],
  computed: {
    canAccessApi (): boolean {
      return canAccessApi(this.$data.$state)
    },
    isTemporary (): boolean {
      return this.$vuetify.breakpoint.xsOnly
    },
    isPermanent (): boolean {
      return !this.isTemporary
    }
  },
  methods: {
    input (value: boolean) {
      this.$emit('input', value)
    }
  }
})
</script>
