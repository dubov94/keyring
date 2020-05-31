<style scoped>
  .masonry__brick {
    padding: 0 8px 16px;
  }
</style>

<template>
  <v-layout row wrap align-center>
    <v-flex v-for="item in userKeys" :key="item.identifier"
      class="masonry__brick" sm12 md6 lg4>
      <password :identifier="item.identifier" :value="item.value"
        :tags="item.tags" @edit="handleEditKey(item.identifier, $event)">
      </password>
    </v-flex>
  </v-layout>
</template>

<script>
import Password from './Password'

export default {
  components: {
    password: Password
  },
  props: ['userKeys'],
  methods: {
    handleEditKey (identifier, { reveal }) {
      this.$emit('edit', { identifier, reveal })
    }
  }
}
</script>
