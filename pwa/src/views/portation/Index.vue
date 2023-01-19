<template>
  <page :has-menu="true" :show-menu="showMenu" @menuSwitch="menuSwitch">
    <user-menu v-model="showMenu"></user-menu>
    <v-main class="ma-2">
      <v-container fluid>
        <v-row no-gutters justify="center">
          <v-col :cols="12" :md="8" :xl="6">
            <import></import>
          </v-col>
        </v-row>
        <v-row class="mt-6" no-gutters justify="center">
          <v-col :cols="12" :md="8" :xl="6">
            <export></export>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </page>
</template>

<script lang="ts">
import Vue from 'vue'
import Export from './Export.vue'
import Import from './Import.vue'
import Page from '@/components/Page.vue'
import UserMenu from '@/components/toolbar-with-menu/UserMenu.vue'

export default Vue.extend({
  components: {
    export: Export,
    import: Import,
    page: Page,
    userMenu: UserMenu
  },
  data () {
    return { showMenu: false }
  },
  methods: {
    menuSwitch (value: boolean) {
      this.showMenu = value
    }
  }
})
</script>
