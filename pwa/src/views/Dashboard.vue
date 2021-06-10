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
    <v-text-field :slot="toolbarSearchSlot" solo-inverted flat ref="search"
      v-model="query" prepend-icon="search" label="Search" class="search">
    </v-text-field>
    <user-menu v-model="showMenu"></user-menu>
    <v-main>
      <v-container fluid mx-auto>
        <div class="mb-4 text-center">
          <v-pagination v-model="pageNumber" :length="pageCount"
            :total-visible="paginationVisibleCount" circle></v-pagination>
        </div>
        <password-masonry :user-keys="visibleCards" @edit="openEditor">
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
import Vue from 'vue'
import Editor from '@/components/Editor.vue'
import Page from '@/components/Page.vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import UserMenu from '@/components/toolbar-with-menu/UserMenu.vue'
import { userKeys } from '@/redux/modules/user/keys/selectors'
import { Key } from '@/redux/entities'
import { DeepReadonly } from 'ts-essentials'
import { takeUntil, filter } from 'rxjs/operators'
import { isActionSuccess } from '@/redux/flow_signal'
import { creationSignal } from '@/redux/modules/user/keys/actions'
import { canAccessApi } from '@/redux/modules/user/account/selectors'

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
      pageNumber: 1,
      query: '',
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
    pageCount (): number {
      return Math.max(Math.floor(
        (this.matchingCards.length + this.cardsPerPage - 1) / this.cardsPerPage), 1)
    },
    paginationVisibleCount (): number {
      return this.$vuetify.breakpoint.smAndUp ? 7 : 5
    },
    normalizedQuery (): string {
      return this.query.trim().toLowerCase()
    },
    matchingCards (): DeepReadonly<Key[]> {
      const prefix = this.normalizedQuery
      if (prefix === '') {
        return this.userKeys
      }
      return this.userKeys.filter(key =>
        key.tags.some(tag => tag.toLowerCase().startsWith(prefix)))
    },
    visibleCards (): DeepReadonly<Key[]> {
      const startIndex = (this.pageNumber - 1) * this.cardsPerPage
      return this.matchingCards.slice(startIndex, startIndex + this.cardsPerPage)
    },
    cardsCount (): number {
      return this.matchingCards.length
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
    clearQuery () {
      this.query = ''
    },
    resetNavigation () {
      this.pageNumber = 1
    }
  },
  watch: {
    cardsCount () {
      if (this.pageNumber > this.pageCount) {
        this.pageNumber = this.pageCount
      }
    },
    normalizedQuery () {
      this.resetNavigation()
    }
  },
  created () {
    this.$data.$actions.pipe(
      filter(isActionSuccess(creationSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.clearQuery()
      this.resetNavigation()
    })
  },
  mounted () {
    if (this.userKeys.length > 0) {
      ;(this.$refs.search as HTMLInputElement).focus()
    }
  }
})
</script>
