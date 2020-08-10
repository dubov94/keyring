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
    <div class="background" ref="background">
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
            <template v-if="!isUserActive">
              <v-btn large outline color="white" to="/log-in">Log in</v-btn>
              <v-btn large outline color="white" to="/register">Register</v-btn>
            </template>
            <template v-if="isUserActive">
              <v-btn large outline color="white" to="/dashboard">Go to dashboard</v-btn>
            </template>
          </div>
        </div>
      </v-container>
    </v-content>
  </page>
</template>

<script>
import { mapGetters } from 'vuex'
import trianglify from 'trianglify'
import Page from '@/components/Page'

export default {
  components: {
    page: Page
  },
  data () {
    return {
      animationRequestId: null,
      lastBackgroundHeight: 0
    }
  },
  computed: {
    ...mapGetters({
      isUserActive: 'isUserActive'
    }),
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
    renderBackground () {
      const canvas = this.$refs.backgroundCanvas
      const pattern = trianglify({
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        xColors: 'YlGnBu',
        seed: 'keyring'
      })
      pattern.toCanvas(canvas)
    },
    scheduleAnimationFrame () {
      // `ResizeObserver` does not work properly on mobile Chrome
      // if the previous view had the keyboard open -- it causes
      // the canvas to be smaller in height.
      this.animationRequestId = window.requestAnimationFrame(() => {
        const newBackgroundHeight = this.$refs.background.clientHeight
        if (this.lastBackgroundHeight !== newBackgroundHeight) {
          this.renderBackground()
          this.lastBackgroundHeight = newBackgroundHeight
        }
        this.scheduleAnimationFrame()
      })
    }
  },
  mounted () {
    this.scheduleAnimationFrame()
  },
  beforeDestroy () {
    window.cancelAnimationFrame(this.animationRequestId)
  }
}
</script>
