<template>
  <v-card>
    <v-card-title>Import</v-card-title>
    <v-card-text>
      <p>
        The uploaded vault must be a
        <external-link href="https://en.wikipedia.org/wiki/Comma-separated_values">CSV</external-link>
        file with a <b>password</b> column &mdash; it is usually exported by default by other providers.
        Values of all other columns are automatically appended as labels in the original order, though
        <b>url</b> and <b>username</b> will be prioritised.
      </p>
      <v-file-input accept="text/csv" label=".csv" hide-details outlined
        @change="loadFile" :value="file"></v-file-input>
      <div class="mt-4">
        <v-btn block color="primary" :disabled="!hasVault" @click="import_">
          Import
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
import { either, function as fn } from 'fp-ts'
import { takeUntil, filter } from 'rxjs/operators'
import { DeepReadonly } from 'ts-essentials'
import Vue from 'vue'
import PasswordMasonry from '@/components/PasswordMasonry.vue'
import { PASSWORD_MIN_HEIGHT } from '@/components/dimensions'
import { getUidService } from '@/cryptography/uid_service'
import { isActionSuccess } from '@/redux/flow_signal'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { extractPassword, import_, importSignal, importReset } from '@/redux/modules/user/keys/actions'
import { Clique, createCliqueFromPassword } from '@/redux/modules/user/keys/selectors'
import { ImportedRow, deserializeVault, convertImportedRowToPassword } from './csv'

export default Vue.extend({
  components: {
    passwordMasonry: PasswordMasonry
  },
  data () {
    return {
      file: null as null | File,
      importedRows: null as null | ImportedRow[]
    }
  },
  created () {
    this.$data.$actions.pipe(
      filter(isActionSuccess(importSignal)),
      takeUntil(this.$data.$destruction)
    ).subscribe(() => {
      this.file = null
      this.importedRows = null
      this.dispatch(importReset())
      this.dispatch(showToast({ message: this.$t('DONE') as string }))
    })
  },
  computed: {
    hasVault (): boolean {
      return this.importedRows !== null
    },
    vaultPreviewStyles (): { [key: string]: string } {
      return {
        maxHeight: `${PASSWORD_MIN_HEIGHT * 2}px`,
        overflowY: 'auto'
      }
    },
    cliques (): DeepReadonly<Clique>[] {
      if (this.importedRows === null) {
        return []
      }
      const uidService = getUidService()
      const cliques: DeepReadonly<Clique>[] = []
      for (const importedRow of this.importedRows) {
        cliques.push(createCliqueFromPassword(
          /* cliqueName */ uidService.v4(),
          /* keyId */ uidService.v4(),
          /* password */ convertImportedRowToPassword(importedRow),
          /* creationTimeInMillis */ Date.now()
        ))
      }
      return cliques
    }
  },
  methods: {
    async loadFile (file: null | File) {
      this.file = file
      if (file === null) {
        this.importedRows = null
        return
      }
      const vaultResults = deserializeVault(await file.text())
      fn.pipe(
        vaultResults,
        either.fold(
          (error) => {
            this.dispatch(showToast({ message: error.message }))
          },
          (importedRows) => {
            if (importedRows.length === 0) {
              this.dispatch(showToast({
                message: 'The vault does not contain any items'
              }))
              return
            }
            this.importedRows = importedRows
          }
        )
      )
    },
    import_ () {
      if (this.importedRows === null) {
        console.warn('`importedRows` is `null`')
        return
      }
      this.dispatch(import_(this.cliques.map(
        (clique) => extractPassword(clique.parent!))))
    }
  },
  beforeDestroy () {
    this.dispatch(importReset())
  }
})
</script>
