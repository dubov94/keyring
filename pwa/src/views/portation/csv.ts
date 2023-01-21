import { either } from 'fp-ts'
import Papa from 'papaparse'
import isEmpty from 'lodash/isEmpty'

export interface VaultItem {
  url: string;
  username: string;
  password: string;
  labels: string[];
}

export interface ImportError {
  message: string;
}

const EXPECTED_COLUMNS = ['url', 'username', 'password']

export const deserializeVault = (csv: string): either.Either<ImportError, VaultItem[]> => {
  const results = Papa.parse<{ [key: string]: string }>(csv, {
    header: true,
    skipEmptyLines: true
  })
  if (results.errors.length > 0) {
    const error = results.errors[0]
    return either.left({ message: `${error.message} (row ${error.row + 1})` })
  }
  if (results.meta.fields === undefined) {
    return either.left({ message: 'No fields found' })
  }
  for (const columnName of EXPECTED_COLUMNS) {
    if (!results.meta.fields.includes(columnName)) {
      return either.left({ message: `Missing column '${columnName}'` })
    }
  }
  const vaultItems: VaultItem[] = []
  for (const item of results.data) {
    const labels: string[] = []
    for (const [columnName, value] of Object.entries(item)) {
      if (!EXPECTED_COLUMNS.includes(columnName) && !isEmpty(value)) {
        labels.push(value)
      }
    }
    vaultItems.push({
      url: item.url ?? '',
      username: item.username ?? '',
      password: item.password ?? '',
      labels: labels
    })
  }
  return either.right(vaultItems)
}
