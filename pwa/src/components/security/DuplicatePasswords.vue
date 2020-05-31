<template>
  <v-card>
    <v-card-title>
      <v-layout justify-space-between align-center>
        <h3>
          Duplicate groups &mdash;
          <span class="success--text" v-if="groupCount === 0">
            0
          </span>
          <span class="warning--text" v-else>{{ groupCount }}</span>
        </h3>
        <v-progress-circular v-show="inProgress" indeterminate
          :size="24" :width="2" color="primary">
        </v-progress-circular>
      </v-layout>
    </v-card-title>
    <v-divider v-if="groupCount > 0"></v-divider>
    <v-card-text v-if="groupCount > 0">
      <div class="mb-3 text-xs-center">
        <v-pagination v-model="groupNumber" :length="groupCount" circle
          :total-visible="$vuetify.breakpoint.smAndUp ? 7 : 5"></v-pagination>
      </div>
      <password-masonry :user-keys="groupCards" @edit="handleEditKey">
      </password-masonry>
    </v-card-text>
  </v-card>
</template>

<script>
import PasswordMasonry from '../PasswordMasonry'
import { mapState } from 'vuex'

export default {
  components: {
    passwordMasonry: PasswordMasonry
  },
  data () {
    return {
      groupNumber: 1
    }
  },
  computed: {
    ...mapState({
      userKeys: state => state.userKeys,
      duplicateGroups: state => state.threats.duplicateGroups,
      groupCount: state => state.threats.duplicateGroups.length,
      inProgress: state => state.threats.gettingDuplicateGroups
    }),
    groupCards () {
      const list = []
      if (this.groupNumber <= this.groupCount) {
        for (const identifier of this.duplicateGroups[this.groupNumber - 1]) {
          const index = this.userKeys.findIndex(
            key => key.identifier === identifier)
          if (index > -1) {
            list.push(this.userKeys[index])
          }
        }
      }
      return list
    }
  },
  methods: {
    handleEditKey ({ identifier, reveal }) {
      this.$emit('edit', { identifier, reveal })
    }
  },
  watch: {
    duplicateGroups (newValue) {
      // Since one cannot add keys from this page, we do not have to worry
      // about potentially changing `groupNumber` to stay at the same group.
      if (this.groupNumber > newValue.length) {
        this.groupNumber = newValue.length
      }
    }
  }
}
</script>
