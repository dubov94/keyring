<template>
  <v-app-bar app :clipped-left="clipLeft" color="primary" dark
    :height="64" :extension-height="64">
    <v-app-bar-nav-icon v-if="showNavIcon" @click="toggle">
    </v-app-bar-nav-icon>
    <v-btn icon :to="homeTarget">
      <v-icon>$vuetify.icons.logomark</v-icon>
    </v-btn>
    <slot>
      <v-spacer></v-spacer>
    </slot>
    <v-btn icon href="https://github.com/dubov94/keyring" target="_blank"
      rel="noopener noreferrer">
      <v-icon>help_outline</v-icon>
    </v-btn>
    <v-btn v-if="!isAuthenticated" icon to="/log-in">
      <v-icon>login</v-icon>
    </v-btn>
    <v-menu v-if="isAuthenticated" offset-y :nudge-bottom="5">
      <template #activator="{ on }">
        <v-btn v-on="on" text>
          {{ username }}
          <v-icon right>account_circle</v-icon>
        </v-btn>
      </template>
      <v-list two-line class="py-0">
        <v-list-item to="/settings">
          <v-list-item-action>
            <v-icon>settings</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>
              Settings
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item @click="logOut">
          <v-list-item-action>
            <v-icon>logout</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>
              Log out
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-menu>
    <template slot="extension" v-if="extended">
      <slot name="extension"></slot>
    </template>
  </v-app-bar>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import { Framework } from 'vuetify'
import { sessionUsername } from '@/redux/modules/session/selectors'
import { isAuthenticated } from '@/redux/modules/user/account/selectors'
import { logOut, LogoutTrigger } from '@/redux/modules/user/account/actions'

interface Mixins {
  value: boolean;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  props: ['value', 'hasMenu', 'extended'],
  computed: {
    isAuthenticated () {
      return isAuthenticated(this.$data.$state)
    },
    username () {
      return sessionUsername(this.$data.$state)
    },
    homeTarget (): string {
      return this.isAuthenticated ? '/dashboard' : '/'
    },
    clipLeft (): boolean {
      return this.hasMenu && (this.$vuetify as Framework).breakpoint.smAndUp
    },
    showNavIcon (): boolean {
      return this.hasMenu && (this.$vuetify as Framework).breakpoint.xsOnly
    }
  },
  methods: {
    toggle () {
      this.$emit('input', !this.value)
    },
    logOut () {
      this.dispatch(logOut(LogoutTrigger.USER_REQUEST))
    }
  }
})
</script>
