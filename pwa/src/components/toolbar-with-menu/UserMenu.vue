<template>
  <v-navigation-drawer app temporary floating :width="300"
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
    </v-list>
  </v-navigation-drawer>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  props: ['value'],
  methods: {
    input (value: boolean) {
      this.$emit('input', value)
    }
  }
})
</script>
