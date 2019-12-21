<template>
  <div>
    <div class="mb-3 text-xs-center">
      <v-pagination v-model="groupNumber" :length="groupCount" circle
        :total-visible="$vuetify.breakpoint.smAndUp ? 7 : 5"></v-pagination>
    </div>
    <password-masonry :user-keys="groupCards" @edit="handleEditKey">
    </password-masonry>
  </div>
</template>

<script>
  import PasswordMasonry from '../PasswordMasonry'
  import {mapState} from 'vuex'

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
        duplicateGroups: state => state.threats.duplicateGroups
      }),
      groupCards () {
        let list = []
        if (this.groupNumber <= this.groupCount) {
          for (let identifier of this.duplicateGroups[this.groupNumber - 1]) {
            let index = this.userKeys.findIndex(
              key => key.identifier === identifier)
            if (index > -1) {
              list.push(this.userKeys[index])
            }
          }
        }
        return list
      },
      groupCount () {
        return this.duplicateGroups.length
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
