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
            <template v-if="!isAuthenticated">
              <v-btn large outline color="white" to="/log-in">Log in</v-btn>
              <v-btn large outline color="white" to="/register">Register</v-btn>
            </template>
            <template v-if="isAuthenticated">
              <v-btn large outline color="white" to="/dashboard">Go to dashboard</v-btn>
            </template>
          </div>
        </div>
      </v-container>
    </v-content>
  </page>
</template>

<script lang="ts">
import Vue, { VueConstructor } from 'vue'
import trianglify from 'trianglify'
import Page from '@/components/Page.vue'
import { isAuthenticated$ } from '@/store/root/modules/user'

interface Mixins {
  resizeObserver: any;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  components: {
    page: Page
  },
  subscriptions () {
    return {
      isAuthenticated: isAuthenticated$
    }
  },
  computed: {
    nameDynamicClasses (): { [key: string]: boolean } {
      return {
        'display-4': this.$vuetify.breakpoint.lgAndUp,
        'display-3': this.$vuetify.breakpoint.mdOnly,
        'display-2': this.$vuetify.breakpoint.smAndDown
      }
    },
    descriptionDynamicClasses (): { [key: string]: boolean } {
      return {
        'display-2': this.$vuetify.breakpoint.lgAndUp,
        'display-1': this.$vuetify.breakpoint.mdOnly,
        headline: this.$vuetify.breakpoint.smAndDown
      }
    }
  },
  methods: {
    renderBackground (): void {
      const background = this.$refs.background as HTMLElement
      const pattern = trianglify({
        width: background.clientWidth,
        height: background.clientHeight,
        xColors: 'YlGnBu',
        seed: 'keyring'
      })
      pattern.toCanvas(this.$refs.backgroundCanvas as HTMLElement)
    }
  },
  created () {
    // https://github.com/microsoft/TypeScript/issues/37861
    this.resizeObserver = new (window as any).ResizeObserver(() => {
      this.renderBackground()
    })
  },
  mounted () {
    this.resizeObserver.observe(this.$refs.background)
  },
  beforeDestroy () {
    this.resizeObserver.unobserve(this.$refs.background)
  }
})
</script>
