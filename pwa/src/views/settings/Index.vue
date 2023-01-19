<style scoped>
  .v-expansion-panels {
    max-width: calc(var(--max-content-width) / 2);
    margin: 0 auto;
  }
</style>

<template>
  <page>
    <v-main>
      <div class="my-4 mx-2 text-center">
        <div class="d-inline-block">
          <v-btn block depressed @click="$router.back()">
            <v-icon left>arrow_back</v-icon>
            Back
          </v-btn>
          <v-expansion-panels class="my-4" inset>
            <change-username></change-username>
            <change-master-key></change-master-key>
            <otp-switch></otp-switch>
            <change-mail></change-mail>
            <delete-account></delete-account>
          </v-expansion-panels>
        </div>
      </div>
    </v-main>
  </page>
</template>

<script lang="ts">
import Vue from 'vue'
import ChangeMail from './ChangeMail.vue'
import ChangeMasterKey from './ChangeMasterKey.vue'
import ChangeUsername from './ChangeUsername.vue'
import DeleteAccount from './DeleteAccount.vue'
import OtpSwitch from './OtpSwitch.vue'
import Page from '@/components/Page.vue'

export default Vue.extend({
  components: {
    changeMail: ChangeMail,
    changeMasterKey: ChangeMasterKey,
    changeUsername: ChangeUsername,
    deleteAccount: DeleteAccount,
    page: Page,
    otpSwitch: OtpSwitch
  }
})
</script>
