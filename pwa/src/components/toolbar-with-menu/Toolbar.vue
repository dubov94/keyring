<template>
  <v-toolbar app clipped-left prominent color="primary" dark>
    <v-toolbar-side-icon v-if="hasMenu" @click="toggle">
    </v-toolbar-side-icon>
    <v-btn icon :to="homeTarget">
      <v-icon>home</v-icon>
    </v-btn>
    <slot>
      <v-spacer></v-spacer>
    </slot>
    <v-btn v-if="!isAuthenticated" icon to="/log-in">
      <v-icon>login</v-icon>
    </v-btn>
    <v-menu v-if="isAuthenticated" offset-y :nudge-bottom="5">
      <v-btn slot="activator" flat>
        {{ username }}
        <v-icon right>account_circle</v-icon>
      </v-btn>
      <v-list two-line class="py-0">
        <v-list-tile @click="logOut">
          <v-list-tile-action>
            <v-icon>fa-sign-out-alt</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>
              Log out
            </v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-menu>
    <template slot="extension" v-if="extended">
      <slot name="extension"></slot>
    </template>
  </v-toolbar>
</template>

<script lang="ts">
import Vue from 'vue'
import { isAuthenticated$, logOut$ } from '@/store/root/modules/user'
import { getSessionUsername } from '@/store/root/modules/session'
import { applySelector } from '@/store/state_rx'
import { Undefinable } from '@/utilities'

export default Vue.extend({
  props: ['value', 'hasMenu', 'extended'],
  data () {
    return {
      ...{
        isAuthenticated: undefined as Undefinable<boolean>
      }
    }
  },
  subscriptions () {
    return {
      isAuthenticated: isAuthenticated$,
      username: applySelector(getSessionUsername)
    }
  },
  computed: {
    homeTarget (): string {
      return this.isAuthenticated ? '/dashboard' : '/'
    }
  },
  methods: {
    toggle (): void {
      this.$emit('input', !this.value)
    },
    logOut (): void {
      logOut$.next()
    }
  }
})
</script>
