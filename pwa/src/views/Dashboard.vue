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
    <v-content>
      <v-container fluid mx-auto>
        <div class="mb-3 text-xs-center">
          <v-pagination v-model="pageNumber" :length="pageCount"
            :total-visible="paginationVisibleCount" circle></v-pagination>
        </div>
        <password-masonry :user-keys="visibleCards" @edit="handleEditKey">
        </password-masonry>
      </v-container>
      <div class="dial">
        <v-btn fab color="error" @click="addKey" :disabled="!canAccessApi">
          <v-icon small>fa-plus</v-icon>
        </v-btn>
      </div>
    </v-content>
    <editor></editor>
  </page>
</template>

<script lang="ts">
import Vue from 'vue'
import Editor from '@/components/Editor.vue'
import Page from '@/components/Page.vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import UserMenu from '@/components/toolbar-with-menu/UserMenu.vue'
import { takeUntil, tap } from 'rxjs/operators'
import { canAccessApi$, userKeys$, createUserKeyHook$ } from '@/store/root/modules/user/index'
import { openEditor$ } from '@/store/root/modules/interface/editor'
import { Key } from '@/store/state'
import { Undefinable } from '@/utilities'

const CARDS_PER_PAGE = 12

export default Vue.extend({
  components: {
    editor: Editor,
    page: Page,
    passwordMasonry: PasswordMasonry,
    userMenu: UserMenu
  },
  data () {
    return {
      ...{
        showMenu: false,
        pageNumber: 1,
        query: ''
      },
      ...{
        userKeys: undefined as Undefinable<Array<Key>>
      }
    }
  },
  subscriptions () {
    return {
      canAccessApi: canAccessApi$,
      userKeys: userKeys$
    }
  },
  computed: {
    pageCount (): number {
      return Math.max(Math.floor(
        (this.matchingCards.length + CARDS_PER_PAGE - 1) / CARDS_PER_PAGE), 1)
    },
    paginationVisibleCount (): number {
      return this.$vuetify.breakpoint.smAndUp ? 7 : 5
    },
    normalizedQuery (): string {
      return this.query.trim().toLowerCase()
    },
    matchingCards (): Array<Key> {
      const prefix = this.normalizedQuery
      let list = this.userKeys || []
      if (prefix !== '') {
        list = list.filter(key =>
          key.tags.some(tag => tag.toLowerCase().startsWith(prefix)))
      }
      return list
    },
    visibleCards (): Array<Key> {
      const startIndex = (this.pageNumber - 1) * CARDS_PER_PAGE
      return this.matchingCards.slice(startIndex, startIndex + CARDS_PER_PAGE)
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
    menuSwitch (value: boolean): void {
      this.showMenu = value
    },
    addKey (): void {
      openEditor$.next({ identifier: null, reveal: false })
    },
    handleEditKey ({ identifier, reveal }: { identifier: string; reveal: boolean }): void {
      openEditor$.next({ identifier, reveal })
    },
    clearQuery (): void {
      this.query = ''
    },
    resetNavigation (): void {
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
    createUserKeyHook$.pipe(
      tap(() => {
        this.clearQuery()
        this.resetNavigation()
      }),
      takeUntil(this.beforeDestroy$)
    ).subscribe()
  },
  mounted () {
    if ((this.userKeys?.length || 0) > 0) {
      (this.$refs.search as HTMLInputElement).focus()
    }
  }
})
</script>
