<template>
  <v-navigation-drawer app temporary clipped floating
    :value="value" @input="input">
    <v-list two-line>
      <v-list-item to="/dashboard">
        <v-list-item-action>
          <v-icon>dashboard</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          Dashboard
        </v-list-item-content>
      </v-list-item>
      <v-list-item to="/security">
        <v-list-item-action>
          <v-icon>shield</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          Security
        </v-list-item-content>
      </v-list-item>
      <v-list-item to="/settings">
        <v-list-item-action>
          <v-icon>fa-cog</v-icon>
        </v-list-item-action>
        <v-list-item-content>
          <v-list-item-title>
            Settings
          </v-list-item-title>
          <v-list-item-subtitle>
            {{ version }}
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  props: ['value'],
  data () {
    return {
      version: window.globals.version
    }
  },
  methods: {
    input (value: boolean) {
      this.$emit('input', value)
    }
  }
})
</script>
