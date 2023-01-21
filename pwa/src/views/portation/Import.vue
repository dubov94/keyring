<template>
  <v-card>
    <v-card-title>Import</v-card-title>
    <v-card-text>
      <p>
        The uploaded vault must be a
        <external-link href="https://en.wikipedia.org/wiki/Comma-separated_values">CSV</external-link>
        file with <b>url</b>, <b>username</b> and <b>password</b> columns &mdash; these are usually
        exported by default by other providers. Values of all other columns will be automatically
        appended as labels in the given order.
      </p>
      <v-file-input accept="text/csv" label=".csv" hide-details outlined
        @change="changeFile"></v-file-input>
      <div class="mt-4">
        <v-btn block color="primary" :disabled="!hasVault">
          Save
        </v-btn>
      </div>
      <template v-if="hasVault">
        <v-divider class="mt-6"></v-divider>
        <div class="mt-3" :style="vaultPreviewStyles">
          <v-container fluid>
            <password-masonry :cliques="cliques" :editable="false"
              :colCountMd="1" :colCountLg="2"></password-masonry>
          </v-container>
        </div>
      </template>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { array, either, function as fn, predicate } from 'fp-ts'
import isEmpty from 'lodash/isEmpty'
import { DeepReadonly } from 'ts-essentials'
import Vue from 'vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { PASSWORD_MIN_HEIGHT } from '@/components/dimensions'
import { getUidService } from '@/cryptography/uid_service'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { Clique, createCliqueFromPassword } from '@/redux/modules/user/keys/selectors'
import { VaultItem, deserializeVault } from './csv'

export default Vue.extend({
  components: {
    passwordMasonry: PasswordMasonry
  },
  data () {
    return {
      vaultItems: null as null | VaultItem[]
    }
  },
  computed: {
    hasVault (): boolean {
      return this.vaultItems !== null
    },
    vaultPreviewStyles (): { [key: string]: string } {
      return {
        maxHeight: `${PASSWORD_MIN_HEIGHT * 2}px`,
        overflowY: 'auto'
      }
    },
    cliques (): DeepReadonly<Clique>[] {
      if (this.vaultItems === null) {
        return []
      }
      const uidService = getUidService()
      const cliques: DeepReadonly<Clique>[] = []
      for (const vaultItem of this.vaultItems) {
        cliques.push(createCliqueFromPassword(
          /* cliqueName */ uidService.v4(),
          /* keyId */ uidService.v4(),
          /* password */ {
            value: vaultItem.password,
            tags: fn.pipe(
              [vaultItem.url, vaultItem.username, ...vaultItem.labels],
              array.filter(predicate.not(isEmpty))
            )
          },
          /* creationTimeInMillis */ Date.now()
        ))
      }
      return cliques
    }
  },
  methods: {
    async changeFile (file: null | File) {
      if (file === null) {
        this.vaultItems = null
        return
      }
      const vaultResults = deserializeVault(await file.text())
      fn.pipe(
        vaultResults,
        either.fold(
          (error) => {
            this.dispatch(showToast({ message: error.message }))
          },
          (vaultItems) => {
            if (vaultItems.length === 0) {
              this.dispatch(showToast({
                message: 'The vault does not contain any items'
              }))
              return
            }
            this.vaultItems = vaultItems
          }
        )
      )
    }
  }
})
</script>
