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
      const background = this.$refs.background
      const pattern = trianglify({
        width: background.clientWidth,
        height: background.clientHeight,
        xColors: 'YlGnBu',
        seed: 'keyring'
      })
      pattern.toCanvas(this.$refs.backgroundCanvas)
    }
  },
  created () {
    this.resizeObserver = new ResizeObserver(() => {
      this.renderBackground()
    })
  },
  mounted () {
    this.resizeObserver.observe(this.$refs.background)
  },
  beforeDestroy () {
    this.resizeObserver.unobserve(this.$refs.background)
  }
}
</script>
