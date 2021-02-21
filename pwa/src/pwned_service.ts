export const PWNED_SERVICE_TOKEN = 'PwnedService'

export interface PwnedService {
  checkKey: (key: string) => Promise<boolean>;
}

type SHA1 = (message: string) => Promise<string>
type RANGE_FETCHER = (prefix: string) => Promise<string>

export class HaveIBeenPwnedService implements PwnedService {
  private PREFIX_LENGTH = 5
  private dictionary: Map<string, Promise<string[]>>
  private sha1: SHA1
  private fetchRange: RANGE_FETCHER

  constructor (sha1: SHA1, fetchRange: RANGE_FETCHER) {
    this.dictionary = new Map()
    this.sha1 = sha1
    this.fetchRange = fetchRange
  }

  private parseRange (data: string): string[] {
    return data.trim().split('\n').map((line) => line.split(':')[0])
  }

  private async getOrFetch (prefix: string): Promise<string[]> {
    if (this.dictionary.has(prefix)) {
      return this.dictionary.get(prefix)!
    }
    const future = this.fetchRange(prefix).then((data) => this.parseRange(data))
    this.dictionary.set(prefix, future)
    future.catch((error) => {
      this.dictionary.delete(prefix)
      throw error
    })
    return future
  }

  async checkKey (key: string): Promise<boolean> {
    const hash = await this.sha1(key)
    const prefix = hash.slice(0, this.PREFIX_LENGTH)
    const suffix = hash.slice(this.PREFIX_LENGTH)
    return (await this.getOrFetch(prefix)).includes(suffix)
  }
}
