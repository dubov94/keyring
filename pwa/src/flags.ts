import memoize from 'lodash/memoize'

type Mode = 'development' | 'test' | 'production'
interface Flags {
  version: string;
  // https://cli.vuejs.org/guide/mode-and-env.html
  mode: Mode;
}

const readMetaContent = (name: string): string => {
  const selector = `meta[name="${name}"]`
  const element = document.querySelector(selector)
  if (element === null) {
    throw new Error(`Element ${selector} is not found`)
  }
  return (<HTMLMetaElement>element).content
}

export const readFlags = memoize((): Flags => ({
  version: readMetaContent('keyring-version'),
  mode: <Mode>readMetaContent('keyring-mode')
}))
