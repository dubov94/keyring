<style scoped>
  .masonry__brick {
    padding: 0 8px 16px;
  }
</style>

<template>
  <v-row wrap align-center>
    <v-col v-for="item in userKeys" :key="item.identifier"
      class="masonry__brick" :cols="12" :md="6" :lg="4">
      <password :identifier="item.identifier" :value="item.value" :tags="item.tags"
        :score="item.score" @edit="handleEditKey(item.identifier, $event)">
      </password>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import Password from './Password.vue'
import { Key } from '@/redux/entities'
import { Score } from '@/cryptography/strength_test_service'

export interface ScoredKey extends Key {
  score?: Score;
}

export default Vue.extend({
  components: {
    password: Password
  },
  props: {
    userKeys: {
      type: Array as PropType<ScoredKey[]>
    }
  },
  methods: {
    handleEditKey (identifier: string, { reveal }: { reveal: boolean }) {
      this.$emit('edit', { identifier, reveal })
    }
  }
})
</script>
