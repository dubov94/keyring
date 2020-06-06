<template>
  <page>
    <v-content>
      <v-container fluid fill-height>
        <v-layout align-center justify-center>
          <v-flex xs12 sm6 md4 lg3 xl2>
            <router-view></router-view>
          </v-flex>
        </v-layout>
      </v-container>
    </v-content>
  </page>
</template>

<script>
import Page from '@/components/Page'

export default {
  components: {
    page: Page
  }
}
</script>
