<style scoped>
  .container {
    max-width: var(--max-content-width);
  }

  .search {
    margin: 0 32px !important;
  }

  .toolbar {
    z-index: 5 !important;
  }

  .dial {
    position: fixed;
    right: 16px;
    bottom: 16px;
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
  }
</style>

<template>
  <page :has-menu="true" :show-menu="showMenu" @menuSwitch="menuSwitch"
    :toolbar-is-extended="toolbarIsExtended">
    <v-text-field :slot="toolbarSearchSlot" solo-inverted flat ref="search" hide-details
      :value="query" @input="setQuery" prepend-inner-icon="search" label="Search" class="search">
    </v-text-field>
    <user-menu v-model="showMenu"></user-menu>
    <v-main>
      <v-container fluid class="pt-4">
        <v-row v-if="anyFeaturePrompts">
          <v-col :cols="12">
            <!-- `<v-alert>`s are added here. -->
          </v-col>
        </v-row>
        <v-row>
          <div class="flex-1 d-flex flex-wrap justify-center">
            <v-chip v-if="canAccessApi && !isOtpEnabled" large outlined tag="div" class="ma-2">
              <v-icon left :color="tfaBoxColor">pin</v-icon>
              <div class="d-flex align-center">
                <div>
                  <div>Second factor</div>
                  <div class="text-body-2 text--secondary">
                    One-time codes {{ isOtpEnabled ? 'enabled' : 'disabled' }}
                  </div>
                </div>
              </div>
              <v-btn :color="tfaBoxColor" icon class="ml-4" @click="manageOtp">
                <v-icon>arrow_forward</v-icon>
              </v-btn>
            </v-chip>
            <v-chip large outlined tag="div" class="ma-2">
              <v-icon left :color="depotBoxColor">offline_pin</v-icon>
              <div class="d-flex align-center">
                <div>
                  <div>Trusted device</div>
                  <div class="text-body-2 text--secondary">
                    <template v-if="isOtpEnabled">
                      Offline access & seamless
                      <external-link href="https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html">2FA</external-link>
                    </template>
                    <template v-else>
                      Offline access
                    </template>
                  </div>
                </div>
                <v-switch hide-details class="mt-0 pt-0 ml-4" :color="depotBoxColor"
                  :input-value="isDepotActive" @change="toggleDepot"></v-switch>
              </div>
            </v-chip>
            <v-chip large outlined disabled tag="div" class="ma-2">
              <v-icon left>fingerprint</v-icon>
              <div class="d-flex align-center">
                <div>
                  <div>Biometrics</div>
                  <div class="text-body-2 text--secondary">
                    Coming soon!
                  </div>
                </div>
              </div>
            </v-chip>
          </div>
        </v-row>
        <v-row v-if="newCliques.length + cliques.length === 0">
          <v-col :cols="12" class="text-center">
            <div class="mt-6"><v-icon :size="128">celebration</v-icon></div>
            <div class="text-h3 mt-12">Welcome!</div>
            <p class="mt-6">
              To create a password, click on the pencil button in the bottom right corner.
            </p>
          </v-col>
        </v-row>
        <password-masonry :additions="newCliques" :cliques="matchedItems" @addition="evolveAddition">
        </password-masonry>
      </v-container>
      <div class="dial">
        <v-btn fab color="secondary" @click="addKey"
          :disabled="!canAccessApi" :loading="!canAccessApi && !backgroundAuthnError">
          <v-icon>{{ canAccessApi ? 'edit' : 'wifi_off' }}</v-icon>
        </v-btn>
      </div>
    </v-main>
  </page>
</template>

<script lang="ts">
import { array, function as fn, option, readonlyArray } from 'fp-ts'
import Fuse from 'fuse.js'
import debounce from 'lodash/debounce'
import { from, of, Subject } from 'rxjs'
import { concatMap, filter, takeUntil, mapTo } from 'rxjs/operators'
import { DeepReadonly } from 'ts-essentials'
import { isActionOf } from 'typesafe-actions'
import Vue, { VueConstructor } from 'vue'
import Page from '@/components/Page.vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import UserMenu from '@/components/toolbar-with-menu/UserMenu.vue'
import { getUidService } from '@/cryptography/uid_service'
import { Key } from '@/redux/domain'
import { backgroundAuthnError } from '@/redux/modules/authn/selectors'
import { toggleDepot } from '@/redux/modules/depot/actions'
import { isDepotActive } from '@/redux/modules/depot/selectors'
import { canAccessApi, featurePrompts, isOtpEnabled } from '@/redux/modules/user/account/selectors'
import { userKeysUpdate } from '@/redux/modules/user/keys/actions'
import { Clique, cliques, getCliqueRepr } from '@/redux/modules/user/keys/selectors'

enum UpdateType {
  SCROLL = 'SCROLL',
  MATCH = 'MATCH'
}

interface FuseInput {
  name: string;
  repr: DeepReadonly<Key>;
}
const FUSE_OPTIONS: Fuse.IFuseOptions<FuseInput> = { keys: ['repr.tags'] }

export default (Vue as VueConstructor<Vue>).extend({
  props: ['debounceMillis'],
  components: {
    page: Page,
    passwordMasonry: PasswordMasonry,
    userMenu: UserMenu
  },
  data () {
    return {
      showMenu: false,
      query: '',
      updateQueue$: new Subject<UpdateType>(),
      newCliques: [] as string[],
      matchedCliques: [] as string[]
    }
  },
  computed: {
    isDepotActive (): boolean {
      return isDepotActive(this.$data.$state)
    },
    depotBoxColor (): string {
      return this.isDepotActive ? 'success' : 'grey lighten-1'
    },
    isOtpEnabled (): boolean {
      return isOtpEnabled(this.$data.$state)
    },
    tfaBoxColor (): string {
      return this.isOtpEnabled ? 'success' : 'warning'
    },
    backgroundAuthnError (): boolean {
      return backgroundAuthnError(this.$data.$state)
    },
    canAccessApi (): boolean {
      return canAccessApi(this.$data.$state)
    },
    cliques (): DeepReadonly<Clique[]> {
      return cliques(this.$data.$state)
    },
    matchedItems (): DeepReadonly<Clique[]> {
      return fn.pipe(
        this.matchedCliques,
        array.map((matchedClique) => readonlyArray.findFirst(
          (clique: DeepReadonly<Clique>) => clique.name === matchedClique
        )(this.cliques)),
        array.compact
      )
    },
    featurePrompts () {
      return featurePrompts(this.$data.$state)
    },
    anyFeaturePrompts (): boolean {
      return this.featurePrompts.length > 0
    },
    toolbarIsExtended (): boolean {
      return this.$vuetify.breakpoint.xsOnly
    },
    toolbarSearchSlot (): string {
      return this.toolbarIsExtended ? 'toolbarExtension' : 'toolbarDefault'
    },
    fuseInputs (): FuseInput[] {
      return array.compact(
        this.cliques.map((clique: DeepReadonly<Clique>) => fn.pipe(
          getCliqueRepr(clique),
          option.map((repr) => ({ name: clique.name, repr }))
        ))
      )
    },
    fuseInstance (): Fuse<FuseInput> {
      return new Fuse(this.fuseInputs, FUSE_OPTIONS)
    }
  },
  methods: {
    menuSwitch (value: boolean) {
      this.showMenu = value
    },
    toggleDepot (value: boolean) {
      this.dispatch(toggleDepot(value))
    },
    manageOtp () {
      this.$router.push('/settings')
    },
    addKey () {
      this.newCliques.unshift(getUidService().v4())
      this.updateQueue$.next(UpdateType.SCROLL)
    },
    scrollAndMatch () {
      this.updateQueue$.next(UpdateType.SCROLL)
      this.updateQueue$.next(UpdateType.MATCH)
    },
    setQuery (value: string) {
      this.query = value
      this.scrollAndMatch()
    },
    evolveAddition (clique: string, attach: boolean) {
      this.newCliques = this.newCliques.filter(
        (newClique) => newClique !== clique)
      if (attach) {
        this.setQuery('')
      }
    }
  },
  created () {
    if (this.debounceMillis !== null) {
      this.scrollAndMatch = debounce(this.scrollAndMatch, this.debounceMillis)
    }
    this.updateQueue$.pipe(
      concatMap((updateType) => {
        switch (updateType) {
          case UpdateType.SCROLL:
            return from(this.$vuetify.goTo(0)).pipe(
              mapTo(updateType)
            )
          case UpdateType.MATCH: {
            const query = this.query.trim()
            if (query === '') {
              this.matchedCliques = this.cliques.map((item) => item.name)
            } else {
              this.matchedCliques = this.fuseInstance.search(query).map(
                (result) => result.item.name)
            }
            return of(updateType)
          }
        }
      }),
      takeUntil(this.$data.$destruction)
    ).subscribe()
    this.updateQueue$.next(UpdateType.MATCH)
    this.$data.$actions.pipe(
      filter(isActionOf(userKeysUpdate)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.updateQueue$.next(UpdateType.MATCH)
    })
  },
  mounted () {
    if (this.matchedCliques.length > 0) {
      ;(this.$refs.search as HTMLInputElement).focus()
    }
  }
})
</script>
