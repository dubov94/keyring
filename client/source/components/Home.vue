<style scoped>
  .brick {
    margin-bottom: 16px;
  }
</style>

<template>
  <v-app>
    <v-toolbar app color="primary" dark>
      <v-toolbar-title>KeyRing</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-text-field solo-inverted flat v-model="query"
        prepend-icon="search" label="Search"></v-text-field>
      <v-spacer></v-spacer>
    </v-toolbar>
    <v-content>
      <v-container fluid>
        <masonry :cols="masonrySettings" :gutter="16">
          <div v-for="item in matches" class="brick">
            <password :key="item.identifier" :identifier="item.identifier"
              :value="item.value" :tags="item.tags">
            </password>
          </div>
        </masonry>
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
        masonrySettings: {
          default: 4,
          1264: 3,
          960: 2,
          600: 1
        },
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
