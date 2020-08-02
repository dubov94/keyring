<style scoped>
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
  <page :no-background="true">
    <div class="background" v-resize.quiet="renderBackground">
      <canvas class="background__canvas" ref="backgroundCanvas"></canvas>
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
  </page>
</template>

<script>
import trianglify from 'trianglify'
import Page from '@/components/Page'

export default {
  components: {
    page: Page
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
    },
    renderBackground () {
      const canvas = this.$refs.backgroundCanvas
      const pattern = trianglify({
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        xColors: 'YlGnBu',
        seed: 'keyring'
      })
      pattern.toCanvas(canvas)
    }
  },
  mounted () {
    this.renderBackground()
  }
}
</script>
