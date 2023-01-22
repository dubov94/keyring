import { array, either, function as fn, option, predicate } from 'fp-ts'
import isEmpty from 'lodash/isEmpty'
import range from 'lodash/range'
import Papa from 'papaparse'
import { DeepReadonly } from 'ts-essentials'
import { Key, Password } from '@/redux/domain'
import { Clique, getCliqueRepr } from '@/redux/modules/user/keys/selectors'

export interface ImportedRow {
  url: string;
  username: string;
  password: string;
  labels: string[];
}

export interface ImportError {
  message: string;
}

const PASSWORD_COLUMN = 'password'
const PRIORITY_COLUMNS = ['url', 'username']

export const deserializeVault = (csv: string): either.Either<ImportError, ImportedRow[]> => {
  const results = Papa.parse<{ [key: string]: string }>(csv, {
    header: true,
    transformHeader: (header) => header.toLowerCase(),
    skipEmptyLines: true
  })
  if (results.errors.length > 0) {
    const error = results.errors[0]
    return either.left({ message: `${error.message} (row ${error.row + 1})` })
  }
  if (results.meta.fields === undefined) {
    return either.left({ message: 'No fields found' })
  }
  if (!results.meta.fields.includes(PASSWORD_COLUMN)) {
    return either.left({ message: `Missing column '${PASSWORD_COLUMN}'` })
  }
  const importedRows: ImportedRow[] = []
  for (const item of results.data) {
    const labels: string[] = []
    for (const columnName of results.meta.fields) {
      if (columnName === PASSWORD_COLUMN) {
        continue
      }
      if (PRIORITY_COLUMNS.includes(columnName)) {
        continue
      }
      const value = item[columnName]
      if (!isEmpty(value)) {
        labels.push(value)
      }
    }
    importedRows.push({
      url: item.url ?? '',
      username: item.username ?? '',
      password: item.password ?? '',
      labels: labels
    })
  }
  return either.right(importedRows)
}

export const convertImportedRowToPassword = (importedRow: ImportedRow): Password => ({
  value: importedRow.password,
  tags: fn.pipe(
    [importedRow.url, importedRow.username, ...importedRow.labels],
    array.filter(predicate.not(isEmpty))
  )
})

export const serializeVault = (cliques: DeepReadonly<Clique[]>): string => {
  let maxLabels = 0
  const keys: DeepReadonly<Key>[] = []
  for (const clique of cliques) {
    fn.pipe(
      getCliqueRepr(clique),
      option.fold(
        fn.constVoid,
        (key) => {
          maxLabels = Math.max(maxLabels, key.tags.length)
          keys.push(key)
        }
      )
    )
  }
  return Papa.unparse({
    fields: [
      'password',
      ...range(maxLabels).map((index) => `label_${index + 1}`)
    ],
    data: keys.map((key) => [
      key.value,
      ...key.tags,
      ...range(maxLabels - key.tags.length).map(fn.constant(''))
    ])
  }, {
    header: true,
    newline: '\n'
  })
}
