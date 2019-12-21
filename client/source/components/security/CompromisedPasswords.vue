<template>
    <password-masonry :user-keys="exposedKeys" @edit="handleEditKey">
    </password-masonry>
</template>

<script>
  import PasswordMasonry from '../PasswordMasonry'
  import {mapState} from 'vuex'

  export default {
    components: {
      passwordMasonry: PasswordMasonry
    },
    computed: {
      ...mapState({
        userKeys: state => state.userKeys,
        exposedKeys: state => state.userKeys.filter(({ identifier }) =>
          state.threats.exposedUserKeyIds.includes(identifier))
      })
    },
    methods: {
      handleEditKey ({ identifier, reveal }) {
        this.$emit('edit', { identifier, reveal })
      }
    }
  }
</script>
