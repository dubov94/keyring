<template>
  <v-row align="center">
    <v-col v-for="item in userKeys" :key="item.identifier" :cols="12" :md="6" :lg="4">
      <v-lazy :min-height="64">
        <password :identifier="item.identifier" :value="item.value" :tags="item.tags"
          :score="item.score" @edit="handleEditKey(item.identifier, $event)">
        </password>
      </v-lazy>
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
