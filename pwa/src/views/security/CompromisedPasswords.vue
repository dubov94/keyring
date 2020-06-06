<template>
  <v-card>
    <v-card-title>
      <v-layout justify-space-between align-center>
        <h3>
          Compromised passwords &mdash;
          <span v-if="keyCount === 0" class="success--text">
            0
          </span>
          <span v-else class="error--text">{{ keyCount }}</span>
        </h3>
        <v-progress-circular v-show="inProgress" indeterminate
          :size="24" :width="2" color="primary">
        </v-progress-circular>
      </v-layout>
    </v-card-title>
    <v-divider v-if="keyCount > 0"></v-divider>
    <v-card-text v-if="keyCount > 0">
      <password-masonry :user-keys="exposedKeys" @edit="handleEditKey">
      </password-masonry>
    </v-card-text>
  </v-card>
</template>

<script>
import PasswordMasonry from '@/components/PasswordMasonry'
import { mapState } from 'vuex'

export default {
  components: {
    passwordMasonry: PasswordMasonry
  },
  computed: {
    ...mapState({
      userKeys: state => state.userKeys,
      exposedKeys: state => state.userKeys.filter(({ identifier }) =>
        state.threats.exposedUserKeyIds.includes(identifier)),
      keyCount: state => state.threats.exposedUserKeyIds.length,
      inProgress: state => state.threats.gettingExposedUserKeys
    })
  },
  methods: {
    handleEditKey ({ identifier, reveal }) {
      this.$emit('edit', { identifier, reveal })
    }
  }
}
</script>
