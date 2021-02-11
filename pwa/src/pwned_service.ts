import axios from 'axios'
import { sha1 } from './cryptography'

const PREFIX_LENGTH = 5
const cutHashToPrefix = (hash: string) => hash.slice(0, PREFIX_LENGTH)
const cutHashToSuffix = (hash: string) => hash.slice(PREFIX_LENGTH)

export const PWNED_SERVICE_TOKEN = 'PwnedService'

export interface PwnedService {
  checkKey: (key: string) => Promise<boolean>;
}

export class HaveIBeenPwnedService implements PwnedService {
  private prefixToSuffixes: Map<string, Array<string>> = new Map()

  async getSuffixesByPrefix (prefix: string): Promise<Array<string>> {
    if (!this.prefixToSuffixes.has(prefix)) {
      const { data } = await axios.get<string>(`https://api.pwnedpasswords.com/range/${prefix}`)
      this.prefixToSuffixes.set(prefix, data.split('\n').map(string => string.split(':')[0]))
    }
    return this.prefixToSuffixes.get(prefix) || []
  }

  async checkKey (key: string): Promise<boolean> {
    const hash = await sha1(key)
    return (await this.getSuffixesByPrefix(cutHashToPrefix(hash))).includes(cutHashToSuffix(hash))
  }
}
