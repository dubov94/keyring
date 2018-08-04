<template>
  <v-snackbar v-model="isVisible" :timeout="timeout">
    {{ message }}
    <v-btn color="warning" flat @click="hideToast">Close</v-btn>
  </v-snackbar>
</template>

<script>
  import {mapMutations, mapState} from 'vuex'

  export default {
    computed: {
      isVisible: {
        get () {
          return this.$store.state.interface.toast.show
        },
        set (value) {
          if (value === false) {
            this.hideToast()
          } else {
            throw new Error('Snackbar requested a show!')
          }
        }
      },
      ...mapState('interface', {
        message: state => state.toast.message,
        timeout: state => state.toast.timeout
      })
    },
    methods: {
      ...mapMutations({
        hideToast: 'interface/hideToast'
      })
    }
  }
</script>
