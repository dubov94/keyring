import last from 'lodash/last'

export interface StorageAdapter {
  getItem (key: string): string | null;
  setItem (key: string, value: string): void;
  removeItem (key: string): void;
}

export class JsonAccessor {
  private storageAdapter: StorageAdapter

  constructor (storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  get <T> (key: string): T | null {
    const item = this.storageAdapter.getItem(key)
    return item === null ? null : JSON.parse(item)
  }

  set <T> (key: string, value: T) {
    this.storageAdapter.setItem(key, JSON.stringify(value))
  }

  del (key: string) {
    this.storageAdapter.removeItem(key)
  }
}

type StorageVersion = number
type StorageUpgrade = (storageAdapter: StorageAdapter) => void

const STORAGE_VERSION_KEY = 'version'

export const initializeStorage = (storage: Storage, upgrades: Array<[StorageVersion, StorageUpgrade]>): JsonAccessor => {
  if (storage.length > 0) {
    const storageVersion = Number(storage.getItem(STORAGE_VERSION_KEY))
    if (isNaN(storageVersion)) {
      throw new Error(`Storage version '${storageVersion}' is not a number`)
    }
    let upgradeIndex = 0
    while (upgradeIndex < upgrades.length && upgrades[upgradeIndex][0] <= storageVersion) {
      upgradeIndex += 1
    }
    for (; upgradeIndex < upgrades.length; upgradeIndex += 1) {
      const [version, upgrade] = upgrades[upgradeIndex]
      upgrade(storage)
      storage.setItem(STORAGE_VERSION_KEY, String(version))
    }
  } else {
    storage.setItem(STORAGE_VERSION_KEY, String(last(upgrades)![0]))
  }
  return new JsonAccessor(storage)
}
