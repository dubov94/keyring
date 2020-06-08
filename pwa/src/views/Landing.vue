<style scoped>
  .app {
    background: none;
  }

  .background {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: -1;
  }

  .background__canvas {
    width: 100%;
    height: 100%;
  }
</style>

<template>
  <v-app class="app">
    <div class="background">
      <div class="background__canvas" ref="vantaRef"></div>
    </div>
    <v-content>
      <v-container fluid fill-height>
        <v-layout align-center>
          <v-flex xs12 class="text-xs-center white--text">
            <h1 :class="headerClasses">
              Your passwords.
            </h1>
            <h2 :class="subHeaderClasses">
              Accessible. Safe.
            </h2>
            <div class="mt-5">
              <v-btn large outline color="white" @click="goToLogin">Log in</v-btn>
              <v-btn large outline color="white" @click="goToRegistration">Register</v-btn>
            </div>
          </v-flex>
        </v-layout>
      </v-container>
    </v-content>
  </v-app>
</template>

<script>
import * as THREE from 'three'
import VantaWaves from 'vanta/dist/vanta.waves.min'

export default {
  data () {
    return {
      vantaEffect: null
    }
  },
  computed: {
    headerClasses () {
      return {
        'display-4': this.$vuetify.breakpoint.lgAndUp,
        'display-3': this.$vuetify.breakpoint.mdOnly,
        'display-2': this.$vuetify.breakpoint.smAndDown
      }
    },
    subHeaderClasses () {
      return {
        'display-3': this.$vuetify.breakpoint.lgAndUp,
        'display-2': this.$vuetify.breakpoint.mdOnly,
        'display-1': this.$vuetify.breakpoint.smAndDown
      }
    }
  },
  methods: {
    goToLogin () {
      this.$router.push('/log-in')
    },
    goToRegistration () {
      this.$router.push('/register')
    }
  },
  mounted () {
    this.vantaEffect = VantaWaves({
      THREE,
      el: this.$refs.vantaRef
    })
  },
  beforeDestroy () {
    if (this.vantaEffect !== null) {
      this.vantaEffect.destroy()
    }
  }
}
</script>
