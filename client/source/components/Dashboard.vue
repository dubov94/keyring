<style scoped>
  .navigation {
    margin-bottom: 16px;
    text-align: center;
  }

  .masonry {
    display: flex;
    max-width: calc(1264px - 1px);
    margin: 0 auto;
  }

  .masonry__arch {
    flex: 1;
  }

  .masonry__brick {
    margin: 0 8px 16px;
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
    <v-navigation-drawer app v-model="showDrawer" temporary clipped floating>
      <v-list>
        <v-list-tile @click="$router.push('/settings')">
          <v-list-tile-action>
            <v-icon>settings</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            Settings
          </v-list-tile-content>
        </v-list-tile>
        <v-list-tile @click="logOut">
          <v-list-tile-action>
            <v-icon>exit_to_app</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            Log out
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-navigation-drawer>
    <v-toolbar app clipped-left prominent color="primary" dark>
      <v-toolbar-side-icon @click="toggleDrawer"></v-toolbar-side-icon>
      <v-toolbar-title v-if="$vuetify.breakpoint.mdAndUp">
          Key Ring
      </v-toolbar-title>
      <v-text-field solo-inverted flat ref="search" v-model="query" :class=
        "$vuetify.breakpoint.mdAndUp ? 'search--desktop' : 'search--mobile'"
        prepend-icon="search" label="Search"></v-text-field>
    </v-toolbar>
    <v-content>
      <v-container fluid>
        <div class="navigation">
          <v-pagination v-model="pageNumber" :length="pageCount"
            :total-visible="7" circle></v-pagination>
        </div>
        <div class="masonry">
          <div v-for="columnNumber in columnCount"
            :key="columnNumber" class="masonry__arch">
            <div v-for="card in generateSlice(columnNumber)"
              :key="card.identifier" class="masonry__brick">
              <password :identifier="card.identifier" 
                :value="card.value" :tags="card.tags">
              </password>
            </div>
          </div>
        </div>
      </v-container>
      <div class="dial">
        <v-btn fab color="error" @click="addKey">
          <v-icon>add</v-icon>
        </v-btn>
        <v-btn fab small @click="clearClipboard">
          <v-icon>layers_clear</v-icon>
        </v-btn>
      </div>
    </v-content>
    <editor></editor>
  </page>
</template>

<script>
  import Editor from './Editor'
  import Password from './Password'
  import Page from './Page'
  import {mapActions, mapMutations, mapState} from 'vuex'
  import {logOut} from '../utilities'

  const CARDS_PER_PAGE = 12

  export default {
    components: {
      editor: Editor,
      password: Password,
      page: Page
    },
    data () {
      return {
        showDrawer: false,
        pageNumber: 1,
        query: ''
      }
    },
    computed: {
      ...mapState({
        userKeys: state => state.userKeys
      }),
      pageCount () {
        return Math.max(Math.floor(
          (this.matchingCards.length + CARDS_PER_PAGE - 1) / CARDS_PER_PAGE), 1)
      },
      normalizedQuery () {
        return this.query.trim().toLowerCase()
      },
      matchingCards () {
        let prefix = this.normalizedQuery
        let list = this.userKeys
        if (prefix !== '') {
          list = list.filter(key =>
            key.tags.some(tag => tag.toLowerCase().startsWith(prefix)))
        }
        return list
      },
      cardsCount () {
        return this.matchingCards.length
      },
      columnCount () {
        let number = 1
        for (let margin of [960, 1264]) {
          if (this.$vuetify.breakpoint.width >= margin) {
            number += 1
          } else {
            break
          }
        }
        return number
      },
      cardsPerColumn () {
        return CARDS_PER_PAGE / this.columnCount
      }
    },
    methods: {
      ...mapActions({
        displaySnackbar: 'interface/displaySnackbar'
      }),
      ...mapMutations({
        openEditor: 'interface/openEditor'
      }),
      generateSlice (columnNumber) {
        let slice = []
        let index = (this.pageNumber - 1) * CARDS_PER_PAGE + columnNumber - 1
        for (; index < this.matchingCards.length &&
          slice.length < this.cardsPerColumn; index += this.columnCount) {
          slice.push(this.matchingCards[index])
        }
        return slice
      },
      toggleDrawer () {
        this.showDrawer = !this.showDrawer
      },
      addKey () {
        this.openEditor({ identifier: null, reveal: false })
      },
      resetNavigation () {
        this.pageNumber = 1
      },
      logOut () {
        logOut()
      },
      async clearClipboard () {
        await navigator.clipboard.writeText('')
        this.displaySnackbar({
          message: 'Clipboard is cleared. Watch out for tools that may keep ' +
            'the history of copied items anyway!',
          timeout: 4500
        })
      }
    },
    watch: {
      cardsCount (current, previous) {
        if (current > previous) {
          this.resetNavigation()
        } else if (this.pageNumber > this.pageCount) {
          this.pageNumber = this.pageCount
        }
      },
      normalizedQuery () {
        this.resetNavigation()
      }
    },
    mounted () {
      if (this.userKeys.length > 0) {
        this.$refs.search.focus()
      }
    }
  }
</script>
