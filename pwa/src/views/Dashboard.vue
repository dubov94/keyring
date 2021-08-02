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
            <v-alert :value="otpPrompt" @input="ackOtpPrompt" type="info" outlined dismissible border="left" class="mb-0">
              You can enable two-factor authentication in <router-link to="/settings">settings</router-link> now.
            </v-alert>
          </v-col>
        </v-row>
        <password-masonry :user-keys="matchedCards" @edit="openEditor">
        </password-masonry>
      </v-container>
      <div class="dial">
        <v-btn fab color="error" @click="addKey" :disabled="!canAccessApi">
          <v-icon small>fa-plus</v-icon>
        </v-btn>
      </div>
    </v-main>
    <editor v-if="showEditor" :params="editorParams" @close="closeEditor"></editor>
  </page>
</template>

<script lang="ts">
import Fuse from 'fuse.js'
import { function as fn } from 'fp-ts'
import debounce from 'lodash/debounce'
import { from, of, Subject } from 'rxjs'
import { concatMap, filter, map, takeUntil } from 'rxjs/operators'
import { DeepReadonly } from 'ts-essentials'
import { isActionOf } from 'typesafe-actions'
import Vue, { VueConstructor } from 'vue'
import { ServiceFeatureType } from '@/api/definitions'
import Editor from '@/components/Editor.vue'
import Page from '@/components/Page.vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import UserMenu from '@/components/toolbar-with-menu/UserMenu.vue'
import { Key } from '@/redux/entities'
import { isActionSuccess } from '@/redux/flow_signal'
import { ackFeaturePrompt } from '@/redux/modules/user/account/actions'
import { canAccessApi, featurePrompts } from '@/redux/modules/user/account/selectors'
import { creationSignal, userKeysUpdate } from '@/redux/modules/user/keys/actions'
import { userKeys } from '@/redux/modules/user/keys/selectors'

enum UpdateType {
  SCROLL = 'SCROLL',
  MATCH = 'MATCH'
}

interface Mixins {
  scrollAndMatch: () => void;
}

export default (Vue as VueConstructor<Vue & Mixins>).extend({
  props: ['debounceMillis'],
  components: {
    editor: Editor,
    page: Page,
    passwordMasonry: PasswordMasonry,
    userMenu: UserMenu
  },
  data () {
    return {
      showMenu: false,
      query: '',
      updateQueue$: new Subject<UpdateType>(),
      matchedCards: [] as DeepReadonly<Key>[],
      showEditor: false,
      editorParams: {
        identifier: null,
        reveal: false
      } as DeepReadonly<{
        identifier: string | null;
        reveal: boolean;
      }>
    }
  },
  computed: {
    canAccessApi (): boolean {
      return canAccessApi(this.$data.$state)
    },
    featurePrompts () {
      return featurePrompts(this.$data.$state)
    },
    otpPrompt (): boolean {
      return this.featurePrompts.findIndex(
        (fp) => fp.featureType === ServiceFeatureType.OTP) === 0
    },
    toolbarIsExtended (): boolean {
      return this.$vuetify.breakpoint.xsOnly
    },
    toolbarSearchSlot (): string {
      return this.toolbarIsExtended ? 'toolbarExtension' : 'toolbarDefault'
    }
  },
  methods: {
    userKeys (): DeepReadonly<Key[]> {
      return userKeys(this.$data.$state)
    },
    menuSwitch (value: boolean) {
      this.showMenu = value
    },
    ackOtpPrompt () {
      this.dispatch(ackFeaturePrompt(ServiceFeatureType.OTP))
    },
    addKey () {
      this.showEditor = true
    },
    openEditor (editorParams: DeepReadonly<{ identifier: string; reveal: boolean }>) {
      this.editorParams = editorParams
      this.showEditor = true
    },
    closeEditor () {
      this.showEditor = false
      this.editorParams = { identifier: null, reveal: false }
    },
    setQuery (value: string) {
      this.query = value
      this.scrollAndMatch()
    }
  },
  created () {
    this.scrollAndMatch = () => {
      this.updateQueue$.next(UpdateType.SCROLL)
      this.updateQueue$.next(UpdateType.MATCH)
    }
    if (this.debounceMillis !== null) {
      this.scrollAndMatch = debounce(this.scrollAndMatch, this.debounceMillis)
    }
    this.updateQueue$.pipe(
      concatMap((updateType) => {
        switch (updateType) {
          case UpdateType.SCROLL:
            return from(this.$vuetify.goTo(0)).pipe(
              map(() => updateType)
            )
          case UpdateType.MATCH: {
            const query = this.query.trim()
            if (query === '') {
              this.matchedCards = this.userKeys().map(fn.identity)
            } else {
              const fuse = new Fuse(this.userKeys(), { keys: ['tags'] })
              this.matchedCards = fuse.search(query).map((result) => result.item)
            }
            return of(updateType)
          }
        }
      }),
      takeUntil(this.$data.$destruction)
    ).subscribe()
    this.updateQueue$.next(UpdateType.MATCH)
    this.$data.$actions.pipe(
      filter(isActionSuccess(creationSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.query = ''
      this.updateQueue$.next(UpdateType.SCROLL)
    })
    this.$data.$actions.pipe(
      filter(isActionOf(userKeysUpdate)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.updateQueue$.next(UpdateType.MATCH)
    })
  },
  mounted () {
    if (this.userKeys().length > 0) {
      ;(this.$refs.search as HTMLInputElement).focus()
    }
  }
})
</script>
