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

const PASSWORD_COLUMN = 'password'
const PRIORITY_COLUMNS = ['url', 'username']

export const deserializeVault = (csv: string): either.Either<ImportError, VaultItem[]> => {
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
  const vaultItems: VaultItem[] = []
  for (const item of results.data) {
    const labels: string[] = []
    for (const [columnName, value] of Object.entries(item)) {
      if (columnName === PASSWORD_COLUMN) {
        continue
      }
      if (PRIORITY_COLUMNS.includes(columnName)) {
        continue
      }
      if (!isEmpty(value)) {
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
