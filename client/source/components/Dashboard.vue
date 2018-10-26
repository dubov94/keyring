<style scoped>
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
      <v-text-field solo-inverted flat ref="search" :class=
          "$vuetify.breakpoint.mdAndUp ? 'search--desktop' : 'search--mobile'"
        v-model="query" prepend-icon="search" label="Search"></v-text-field>
    </v-toolbar>
    <v-content>
      <v-container fluid>
        <div class="masonry">
          <div v-for="columnNumber in columnCount" :key="columnNumber"
            class="masonry__arch">
            <template v-for="(item, index) in matches"
              v-if="index % columnCount == columnNumber - 1">
              <div class="masonry__brick">
                <password :key="item.identifier" :identifier="item.identifier"
                  :value="item.value" :tags="item.tags">
                </password>
              </div>
            </template>
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

  export default {
    components: {
      editor: Editor,
      password: Password,
      page: Page
    },
    data () {
      return {
        showDrawer: false,
        query: ''
      }
    },
    computed: {
      ...mapState({
        userKeys: state => state.userKeys
      }),
      matches () {
        let prefix = this.query.trim().toLowerCase()
        if (prefix === '') {
          return this.userKeys
        } else {
          return this.userKeys.filter(key => key.tags.some(
            tag => tag.toLowerCase().startsWith(prefix)))
        }
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
      }
    },
    methods: {
      ...mapActions({
        displaySnackbar: 'interface/displaySnackbar'
      }),
      ...mapMutations({
        openEditor: 'interface/openEditor'
      }),
      toggleDrawer () {
        this.showDrawer = !this.showDrawer
      },
      addKey () {
        this.openEditor({ identifier: null, reveal: false })
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
    async mounted () {
      if (this.userKeys.length > 0) {
        this.$refs.search.focus()
      }
    }
  }
</script>
