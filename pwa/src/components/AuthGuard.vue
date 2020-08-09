<template>
  <div>
    <template v-if="isUserEligible">
      <slot></slot>
    </template>
    <page v-else>
      <v-content>
        <v-container fluid>
          <p class="text-xs-center mt-5">
            <template v-if="requiresMailVerification">
              Please <router-link to="/mail-verification">activate</router-link> your account.
            </template>
            <template v-else>
              Please <router-link to="/log-in">log in</router-link> to view this page.
            </template>
          </p>
        </v-container>
      </v-content>
    </page>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import Page from './Page'

export default {
  components: {
    page: Page
  },
  computed: {
    ...mapState({
      requiresMailVerification: state => state.requiresMailVerification
    }),
    ...mapGetters({
      isUserActive: 'isUserActive'
    }),
    isUserEligible () {
      return this.isUserActive && !this.requiresMailVerification
    }
  }
}
</script>
