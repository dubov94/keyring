<style scoped>
  .container {
    max-width: var(--max-content-width);
  }

  .search--desktop {
    margin: 0 128px !important;
  }

  .search--mobile {
    margin: 0 32px 0 4px !important;
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
  <page>
    <side-menu v-model="showMenu"></side-menu>
    <toolbar v-model="showMenu">
      <v-toolbar-title v-if="$vuetify.breakpoint.mdAndUp">
        <toolbar-title @click.native="clearQuery"></toolbar-title>
      </v-toolbar-title>
      <v-text-field solo-inverted flat ref="search" v-model="query" :class=
        "$vuetify.breakpoint.mdAndUp ? 'search--desktop' : 'search--mobile'"
        prepend-icon="search" label="Search"></v-text-field>
    </toolbar>
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
        <v-btn fab color="error" @click="addKey" :disabled="!isOnline">
          <v-icon small>fa-plus</v-icon>
        </v-btn>
      </div>
    </v-content>
    <editor></editor>
  </page>
</template>

<script>
import Editor from '@/components/Editor'
import Page from '@/components/Page'
import PasswordMasonry from '@/components/PasswordMasonry'
import SideMenu from '@/components/toolbar-with-menu/SideMenu'
import Title from '@/components/toolbar-with-menu/Title'
import Toolbar from '@/components/toolbar-with-menu/Toolbar'
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex'

const CARDS_PER_PAGE = 12

export default {
  components: {
    editor: Editor,
    page: Page,
    passwordMasonry: PasswordMasonry,
    sideMenu: SideMenu,
    toolbarTitle: Title,
    toolbar: Toolbar
  },
  data () {
    return {
      showMenu: false,
      pageNumber: 1,
      query: ''
    }
  },
  computed: {
    ...mapState({
      userKeys: state => state.userKeys
    }),
    ...mapGetters({
      isOnline: 'isOnline'
    }),
    pageCount () {
      return Math.max(Math.floor(
        (this.matchingCards.length + CARDS_PER_PAGE - 1) / CARDS_PER_PAGE), 1)
    },
    paginationVisibleCount () {
      return this.$vuetify.breakpoint.smAndUp ? 7 : 5
    },
    normalizedQuery () {
      return this.query.trim().toLowerCase()
    },
    matchingCards () {
      const prefix = this.normalizedQuery
      let list = this.userKeys
      if (prefix !== '') {
        list = list.filter(key =>
          key.tags.some(tag => tag.toLowerCase().startsWith(prefix)))
      }
      return list
    },
    visibleCards () {
      const startIndex = (this.pageNumber - 1) * CARDS_PER_PAGE
      return this.matchingCards.slice(startIndex, startIndex + CARDS_PER_PAGE)
    },
    cardsCount () {
      return this.matchingCards.length
    }
  },
  methods: {
    ...mapActions({
      displaySnackbar: 'interface/displaySnackbar'
    }),
    ...mapMutations({
      openEditor: 'interface/openEditor',
      closeEditor: 'interface/closeEditor'
    }),
    addKey () {
      this.openEditor({ identifier: null, reveal: false })
    },
    handleEditKey ({ identifier, reveal }) {
      this.openEditor({ identifier, reveal })
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
  mounted () {
    this.unsubscribeFromStore = this.$store.subscribe((mutation) => {
      if (mutation.type === 'unshiftUserKey') {
        this.clearQuery()
        this.resetNavigation()
      }
    })
    if (this.userKeys.length > 0) {
      this.$refs.search.focus()
    }
  },
  beforeDestroy () {
    this.unsubscribeFromStore()
  }
}
</script>
