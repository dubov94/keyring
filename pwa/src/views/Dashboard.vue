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
      <v-container fluid class="pt-8">
        <v-row v-if="anyFeaturePrompts">
          <v-col :cols="12">
            <v-alert :value="releasePrompt" @input="ackReleasePrompt"
              type="info" outlined dismissible border="left" class="mb-0">
              🎉 Parolica has reached its release milestone &mdash; check out
              <external-link href="https://github.com/dubov94/keyring#readme">the documentation</external-link>,
              feel free to file
              <external-link href="https://github.com/dubov94/keyring/issues">feature requests</external-link>
              and spread the word!
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
import { ServiceFeatureType } from '@/api/definitions'
import Page from '@/components/Page.vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import UserMenu from '@/components/toolbar-with-menu/UserMenu.vue'
import { getUidService } from '@/cryptography/uid_service'
import { Key } from '@/redux/domain'
import { backgroundAuthnError } from '@/redux/modules/authn/selectors'
import { ackFeaturePrompt } from '@/redux/modules/user/account/actions'
import { canAccessApi, featurePrompts } from '@/redux/modules/user/account/selectors'
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
    releasePrompt (): boolean {
      return this.featurePrompts.findIndex(
        (fp) => fp.featureType === ServiceFeatureType.RELEASE) === 0
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
    ackReleasePrompt () {
      this.dispatch(ackFeaturePrompt(ServiceFeatureType.RELEASE))
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
