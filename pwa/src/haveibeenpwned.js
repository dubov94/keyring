import axios from 'axios'

const PREFIX_LENGTH = 5

export const cutHashToPrefix = (hash) => hash.slice(0, PREFIX_LENGTH)

export const cutHashToSuffix = (hash) => hash.slice(PREFIX_LENGTH)

const prefixToSuffixes = new Map()

export const getSuffixesByPrefix = async (prefix) => {
  if (!prefixToSuffixes.has(prefix)) {
    const { data } = await axios.get(
      `https://api.pwnedpasswords.com/range/${prefix}`)
    prefixToSuffixes.set(prefix,
      data.split('\n').map(string => string.split(':')[0]))
  }
  return prefixToSuffixes.get(prefix)
}
