<style scoped>
  .mt-32 {
    margin-top: 128px;
  }

  .background {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: -1;
    /* Removes the stripe at the bottom. */
    overflow: hidden;
  }

  .authentication-panel {
    display: inline-grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: calc(2 * 4px);
  }
</style>

<template>
  <page :no-background="true">
    <div class="background" ref="background">
      <canvas class="background__canvas" ref="backgroundCanvas"></canvas>
    </div>
    <v-main>
      <v-container fluid>
        <div class="article">
          <div class="mt-32 text-center white--text">
            <div class="d-inline-block">
              <div class="text-center" :class="nameDynamicClasses">Parolica</div>
              <div class="text-right text-caption" :class="ipaDynamicClasses">
                [pɐˈrolʲɪtsə]
              </div>
            </div>
          </div>
          <div class="text-center white--text mt-4" :class="descriptionDynamicClasses">
            An unobtrusive password manager 😋
          </div>
          <div class="text-center mt-12">
            <template v-if="!isAuthenticated">
              <div class="authentication-panel">
                <v-btn large outlined color="white" @click="logIn">Log in</v-btn>
                <v-btn large outlined color="white" @click="register">Register</v-btn>
              </div>
            </template>
            <template v-if="isAuthenticated">
              <v-btn large outlined color="white" to="/dashboard">Go to dashboard</v-btn>
            </template>
          </div>
          <div class="text-caption text-center white--text mt-32">{{ version }}</div>
        </div>
      </v-container>
    </v-main>
  </page>
</template>

<script lang="ts">
import { function as fn, option } from 'fp-ts'
import trianglify from 'trianglify'
import Vue, { VueConstructor } from 'vue'
import Page from '@/components/Page.vue'
import { getFlags } from '@/flags'
import { webAuthnRequest } from '@/redux/modules/depot/actions'
import { webAuthnData } from '@/redux/modules/depot/selectors'
import { isAuthenticated } from '@/redux/modules/user/account/selectors'
import { data } from '@/redux/remote_data'

interface Mixins {
  resizeObserver: any;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  components: {
    page: Page
  },
  data () {
    return {
      version: getFlags().version
    }
  },
  computed: {
    isAuthenticated () {
      return isAuthenticated(this.$data.$state)
    },
    nameDynamicClasses (): { [key: string]: boolean } {
      return {
        'text-h1': this.$vuetify.breakpoint.lgAndUp,
        'text-h2': this.$vuetify.breakpoint.mdOnly,
        'text-h3': this.$vuetify.breakpoint.smAndDown
      }
    },
    ipaDynamicClasses (): { [key: string]: boolean } {
      return {
        'mt-n3': this.$vuetify.breakpoint.lgAndUp,
        'mt-n2': this.$vuetify.breakpoint.mdOnly,
        'mt-n1': this.$vuetify.breakpoint.smAndDown
      }
    },
    descriptionDynamicClasses (): { [key: string]: boolean } {
      return {
        'text-h3': this.$vuetify.breakpoint.lgAndUp,
        'text-h4': this.$vuetify.breakpoint.mdOnly,
        'text-h5': this.$vuetify.breakpoint.smAndDown
      }
    },
    webAuthnCredentialId (): string | null {
      return fn.pipe(
        webAuthnData(this.$data.$state),
        data,
        option.map((data) => data === null ? null : data.credentialId),
        option.getOrElse(() => null)
      )
    }
  },
  methods: {
    renderBackground () {
      const background = this.$refs.background as HTMLElement
      const pattern = trianglify({
        width: background.clientWidth,
        height: background.clientHeight,
        xColors: ['#052842', '#54b5f9', '#db4367', '#b31d1f'],
        seed: 'keyring'
      })
      pattern.toCanvas(this.$refs.backgroundCanvas as HTMLElement)
    },
    logIn () {
      this.$router.push('/log-in')
      const credentialId = this.webAuthnCredentialId
      if (credentialId !== null) {
        this.dispatch(webAuthnRequest({ credentialId }))
      }
    },
    register () {
      this.$router.push('/register')
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
