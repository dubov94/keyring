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
      <v-container fluid>
        <v-row>
          <v-col :cols="12">
            <v-alert :value="otpPrompt" @input="ackOtpPrompt"
              type="info" outlined dismissible border="left" class="mb-0">
              You can enable two-factor authentication in <router-link to="/settings">settings</router-link> now.
            </v-alert>
            <v-alert :value="fuzzySearchPrompt" @input="ackFuzzySearchPrompt"
              type="info" outlined dismissible border="left" class="mb-0">
              Search is no longer prefix-based &mdash; one can type 'vidi' to find an entry labelled as 'Veni, vidi, vici'.
            </v-alert>
          </v-col>
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
        <v-btn fab color="error" @click="addKey" :disabled="!canAccessApi">
          <v-icon>edit</v-icon>
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
import { ServiceFeatureType } from '@/api/definitions'
import Page from '@/components/Page.vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import UserMenu from '@/components/toolbar-with-menu/UserMenu.vue'
import { getUidService } from '@/cryptography/uid_service'
import { ackFeaturePrompt } from '@/redux/modules/user/account/actions'
import { canAccessApi, featurePrompts } from '@/redux/modules/user/account/selectors'
import { userKeysUpdate } from '@/redux/modules/user/keys/actions'
import { Clique, cliques, getCliqueRepr } from '@/redux/modules/user/keys/selectors'

enum UpdateType {
  SCROLL = 'SCROLL',
  MATCH = 'MATCH'
}

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
    otpPrompt (): boolean {
      return this.featurePrompts.findIndex(
        (fp) => fp.featureType === ServiceFeatureType.OTP) === 0
    },
    fuzzySearchPrompt (): boolean {
      return this.featurePrompts.findIndex(
        (fp) => fp.featureType === ServiceFeatureType.FUZZYSEARCH) === 0
    },
    toolbarIsExtended (): boolean {
      return this.$vuetify.breakpoint.xsOnly
    },
    toolbarSearchSlot (): string {
      return this.toolbarIsExtended ? 'toolbarExtension' : 'toolbarDefault'
    }
  },
  methods: {
    menuSwitch (value: boolean) {
      this.showMenu = value
    },
    ackOtpPrompt () {
      this.dispatch(ackFeaturePrompt(ServiceFeatureType.OTP))
    },
    ackFuzzySearchPrompt () {
      this.dispatch(ackFeaturePrompt(ServiceFeatureType.FUZZYSEARCH))
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
              const candidates = array.compact(
                this.cliques.map((clique: DeepReadonly<Clique>) => fn.pipe(
                  getCliqueRepr(clique),
                  option.map((repr) => ({ name: clique.name, repr }))
                ))
              )
              const fuse = new Fuse(candidates, { keys: ['repr.tags'] })
              this.matchedCliques = fuse.search(query).map(
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
