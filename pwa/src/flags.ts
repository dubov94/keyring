import { container } from 'tsyringe'

export type Mode = 'development' | 'test' | 'production'

export interface Flags {
  version: string;
  // https://cli.vuejs.org/guide/mode-and-env.html
  mode: Mode;
  turnstileSiteKey: string;
}

export const FLAGS_TOKEN = 'FLAGS'

const readMetaContent = (name: string): string => {
  const selector = `meta[name="${name}"]`
  const element = document.querySelector(selector)
  if (element === null) {
    throw new Error(`Element ${selector} is not found`)
  }
  return (<HTMLMetaElement>element).content
}

export const readFlagsFromPage = (): Flags => ({
  version: readMetaContent('keyring-version'),
  mode: <Mode>readMetaContent('keyring-mode'),
  turnstileSiteKey: readMetaContent('keyring-turnstile-site-key')
})

export const getFlags = () => {
  return container.resolve<Flags>(FLAGS_TOKEN)
}
