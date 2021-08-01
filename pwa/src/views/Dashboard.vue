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
      <v-container fluid class="mt-3">
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
import debounce from 'lodash/debounce'
import { from, of, Subject } from 'rxjs'
import { concatMap, filter, map, takeUntil } from 'rxjs/operators'
import { DeepReadonly } from 'ts-essentials'
import { isActionOf } from 'typesafe-actions'
import Vue from 'vue'
import Editor from '@/components/Editor.vue'
import Page from '@/components/Page.vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import UserMenu from '@/components/toolbar-with-menu/UserMenu.vue'
import { Key } from '@/redux/entities'
import { isActionSuccess } from '@/redux/flow_signal'
import { canAccessApi } from '@/redux/modules/user/account/selectors'
import { creationSignal, userKeysUpdate } from '@/redux/modules/user/keys/actions'
import { userKeys } from '@/redux/modules/user/keys/selectors'

enum UpdateType {
  SCROLL = 'SCROLL',
  MATCH = 'MATCH'
}

export default Vue.extend({
  props: ['cardsPerPage'],
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
    userKeys (): DeepReadonly<Key[]> {
      return userKeys(this.$data.$state)
    },
    canAccessApi (): boolean {
      return canAccessApi(this.$data.$state)
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
    scrollAndMatchDebounced: debounce(function (this: { updateQueue$: Subject<UpdateType> }) {
      this.updateQueue$.next(UpdateType.SCROLL)
      this.updateQueue$.next(UpdateType.MATCH)
    }, 200),
    setQuery (value: string) {
      this.query = value
      this.scrollAndMatchDebounced()
    }
  },
  created () {
    this.updateQueue$.pipe(
      concatMap((updateType) => {
        switch (updateType) {
          case UpdateType.SCROLL:
            return from(this.$vuetify.goTo(0)).pipe(
              map(() => updateType)
            )
          case UpdateType.MATCH: {
            const prefix = this.query.trim().toLowerCase()
            this.matchedCards = this.userKeys.filter(key =>
              key.tags.some(tag => tag.toLowerCase().startsWith(prefix)))
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
    if (this.userKeys.length > 0) {
      ;(this.$refs.search as HTMLInputElement).focus()
    }
  }
})
</script>
