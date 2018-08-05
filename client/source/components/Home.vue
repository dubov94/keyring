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
    margin: 0 32px !important;
  }
</style>

<template>
  <v-app>
    <v-toolbar app prominent color="primary" dark>
      <v-toolbar-title v-if="$vuetify.breakpoint.mdAndUp">
        KeyRing
      </v-toolbar-title>
      <v-text-field solo-inverted flat
        :class="$vuetify.breakpoint.mdAndUp
          ? 'search--desktop' : 'search--mobile'" v-model="query"
        prepend-icon="search" label="Search"></v-text-field>
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
      <v-btn fab color="error" fixed bottom right @click="addKey">
        <v-icon>add</v-icon>
      </v-btn>
    </v-content>
    <editor></editor>
    <toast></toast>
  </v-app>
</template>

<script>
  import Editor from './Editor'
  import Password from './Password'
  import Toast from './Toast'
  import {mapActions, mapMutations, mapState} from 'vuex'

  export default {
    components: {
      editor: Editor,
      password: Password,
      toast: Toast
    },
    data () {
      return {
        query: ''
      }
    },
    computed: {
      ...mapState({
        passwords: state => state.administration.keys
      }),
      matches () {
        if (this.query === '') {
          return this.passwords
        } else {
          return this.passwords.filter(key => key.tags.some(
            tag => tag.startsWith(this.query)))
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
        readKeys: 'administration/readKeys'
      }),
      ...mapMutations({
        openEditor: 'interface/openEditor'
      }),
      addKey () {
        this.openEditor({ identifier: null, reveal: false })
      }
    },
    mounted () {
      this.readKeys()
    }
  }
</script>
