<style scoped>
  .v-card >>> .v-card__title {
    padding-top: 0;
    padding-bottom: 0;
  }

  .v-chip >>> .v-chip__content {
    cursor: pointer;
  }

  .key {
    font-family: 'Roboto Mono', monospace;
  }

  .key >>> .v-input__slot {
    padding: 0 4px !important;
  }
</style>

<template>
  <v-card>
    <v-card-title>
      <v-text-field :type="reveal ? 'text' : 'password'" solo flat readonly
        class="key" :value="value" hide-details></v-text-field>
      <v-btn icon @click="copyText(value)" class="ma-2">
        <v-icon small>fa-copy</v-icon>
      </v-btn>
      <v-menu>
        <template #activator="{ on }">
          <v-btn v-on="on" icon class="ma-2">
            <v-icon small>fa-ellipsis-v</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item @click="toggleReveal">
            <v-list-item-content>
              {{ reveal ? 'Hide' : 'Show' }}
            </v-list-item-content>
          </v-list-item>
          <v-list-item @click="edit" :disabled="!canAccessApi">
            <v-list-item-content>
              Edit
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-card-title>
    <strength-score v-if="showScore" :value="score"></strength-score>
    <v-divider v-if="showTags && !showScore"></v-divider>
    <v-card-text v-if="showTags">
      <v-chip v-for="(label, index) in tags" :key="index"
        class="ma-1 elevation-3" outlined @click="copyText(label)">
        {{ label }}
      </v-chip>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { canAccessApi } from '@/redux/modules/user/account/selectors'
import { showToast } from '@/redux/modules/ui/toast/actions'
import StrengthScore from './StrengthScore.vue'

export default Vue.extend({
  props: ['identifier', 'value', 'tags', 'score'],
  components: {
    strengthScore: StrengthScore
  },
  data () {
    return {
      reveal: false
    }
  },
  computed: {
    canAccessApi (): boolean {
      return canAccessApi(this.$data.$state)
    },
    showTags (): boolean {
      return this.tags.length > 0
    },
    showScore (): boolean {
      return this.score !== undefined
    }
  },
  methods: {
    async copyText (string: string): Promise<void> {
      await navigator.clipboard.writeText(string)
      this.dispatch(showToast({ message: 'Done. Some clipboards retain history — be careful! 😱' }))
    },
    toggleReveal () {
      this.reveal = !this.reveal
    },
    edit () {
      if (this.canAccessApi) {
        this.$emit('edit', { reveal: this.reveal })
        this.reveal = false
      }
    }
  }
})
</script>
