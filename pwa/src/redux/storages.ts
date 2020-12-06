import last from 'lodash/last'

type StorageVersion = number
type StorageUpgrade = (
  get: <T>(key: string) => T | null,
  set: <T>(key: string, value: T) => void,
  remove: (key: string) => void
) => void

const STORAGE_VERSION_KEY = 'version'

export class StorageManager {
  private storage: Storage;
  private upgrades: Array<[StorageVersion, StorageUpgrade]>;

  constructor (storage: Storage, upgrades: Array<[StorageVersion, StorageUpgrade]>) {
    this.storage = storage
    this.upgrades = upgrades
  }

  open () {
    if (this.storage.length > 0) {
      const storageVersion = Number(sessionStorage.getItem(STORAGE_VERSION_KEY))
      if (isNaN(storageVersion)) {
        throw new Error(`Storage version '${storageVersion}' is not a number`)
      }
      let upgradeIndex = 0
      while (upgradeIndex < this.upgrades.length && this.upgrades[upgradeIndex][0] <= storageVersion) {
        upgradeIndex += 1
      }
      for (; upgradeIndex < this.upgrades.length; upgradeIndex += 1) {
        const [version, upgrade] = this.upgrades[upgradeIndex]
        upgrade(
          (key) => this.getItem(key),
          (key, value) => this.setItem(key, value),
          (key) => this.removeItem(key)
        )
        this.storage.setItem(STORAGE_VERSION_KEY, String(version))
      }
    }
  }

  private getItem<T> (key: string): T | null {
    const item = this.storage.getItem(key)
    return item === null ? null : JSON.parse(item)
  }

  getObject<T> (key: string): T | null {
    return this.getItem(key)
  }

  private setItem<T> (key: string, value: T) {
    this.storage.setItem(key, JSON.stringify(value))
  }

  setObject<T> (key: string, value: T) {
    this.storage.setItem(STORAGE_VERSION_KEY, String(last(this.upgrades)![0]))
    this.setItem(key, value)
  }

  private removeItem (key: string) {
    this.storage.removeItem(key)
  }
}
