<style scoped>
  .card >>> .card__title {
    padding-top: 0;
    padding-bottom: 0;
  }

  .chip >>> .chip__content {
    cursor: pointer;
  }
</style>

<template>
  <v-card>
    <v-card-title>
      <v-text-field :type="reveal ? 'text' : 'password'" solo flat readonly
        :value="value"></v-text-field>
      <v-btn icon @click="copyText(value)">
        <v-icon small>fa-copy</v-icon>
      </v-btn>
      <v-menu>
        <v-btn icon slot="activator">
          <v-icon small>fa-ellipsis-v</v-icon>
        </v-btn>
        <v-list>
          <v-list-tile @click="toggleReveal">
            <v-list-tile-content>
              {{ reveal ? 'Hide' : 'Show' }}
            </v-list-tile-content>
          </v-list-tile>
          <v-list-tile @click="edit" :disabled="!canAccessApi">
            <v-list-tile-content>
              Edit
            </v-list-tile-content>
          </v-list-tile>
        </v-list>
      </v-menu>
    </v-card-title>
    <template v-if="tags.length > 0">
      <v-divider></v-divider>
      <v-card-text>
        <v-chip disabled v-for="(label, index) in tags" :key="index"
          color="white" class="elevation-3" @click="copyText(label)">
          {{ label }}
        </v-chip>
      </v-card-text>
    </template>
  </v-card>
</template>

<script lang="ts">
import Vue from 'vue'
import { showToast$ } from '@/store/root/modules/interface/toast'
import { canAccessApi$ } from '@/store/root/modules/user'
import { Undefinable } from '@/utilities'

export default Vue.extend({
  props: ['identifier', 'value', 'tags'],
  data () {
    return {
      ...{
        reveal: false
      },
      ...{
        canAccessApi: undefined as Undefinable<boolean>
      }
    }
  },
  subscriptions () {
    return {
      canAccessApi: canAccessApi$
    }
  },
  methods: {
    async copyText (string: string): Promise<void> {
      await navigator.clipboard.writeText(string)
      showToast$.next({ message: 'Done. Some clipboards retain history — be careful! 😱' })
    },
    toggleReveal (): void {
      this.reveal = !this.reveal
    },
    edit (): void {
      if (this.canAccessApi) {
        this.$emit('edit', { reveal: this.reveal })
        this.reveal = false
      }
    }
  }
})
</script>
