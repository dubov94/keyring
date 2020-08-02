<template>
  <v-navigation-drawer app temporary clipped floating
    :value="value" @input="input">
    <v-list two-line>
      <v-list-tile to="/dashboard">
        <v-list-tile-action>
          <v-icon>dashboard</v-icon>
        </v-list-tile-action>
        <v-list-tile-content>
          Dashboard
        </v-list-tile-content>
      </v-list-tile>
      <v-list-tile to="/security">
        <v-list-tile-action>
          <v-icon>shield</v-icon>
        </v-list-tile-action>
        <v-list-tile-content>
          Security
        </v-list-tile-content>
      </v-list-tile>
      <v-list-tile to="/settings">
        <v-list-tile-action>
          <v-icon>fa-cog</v-icon>
        </v-list-tile-action>
        <v-list-tile-content>
          <v-list-tile-title>
            Settings
          </v-list-tile-title>
          <v-list-tile-sub-title>
            {{ version }}
          </v-list-tile-sub-title>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  </v-navigation-drawer>
</template>

<script>
export default {
  props: ['value'],
  data () {
    return {
      version: window.globals.version
    }
  },
  methods: {
    input (value) {
      this.$emit('input', value)
    }
  }
}
</script>
