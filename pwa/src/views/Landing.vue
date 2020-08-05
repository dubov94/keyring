<style scoped>
  .article {
    margin-top: 128px;
  }

  .heading {
    color: white;
    text-align: center;
  }

  .background {
    position: absolute;
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
      <v-container fluid>
        <div class="article">
          <h1 class="heading" :class="nameDynamicClasses">Key Ring</h1>
          <h2 class="heading mt-3" :class="descriptionDynamicClasses">
            An unobtrusive password manager 😋
          </h2>
          <div class="mt-5 text-xs-center">
            <v-btn large outline color="white" @click="goToLogin">Log in</v-btn>
            <v-btn large outline color="white" @click="goToRegistration">Register</v-btn>
          </div>
        </div>
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
    nameDynamicClasses () {
      return {
        'display-4': this.$vuetify.breakpoint.lgAndUp,
        'display-3': this.$vuetify.breakpoint.mdOnly,
        'display-2': this.$vuetify.breakpoint.smAndDown
      }
    },
    descriptionDynamicClasses () {
      return {
        'display-2': this.$vuetify.breakpoint.lgAndUp,
        'display-1': this.$vuetify.breakpoint.mdOnly,
        headline: this.$vuetify.breakpoint.smAndDown
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
