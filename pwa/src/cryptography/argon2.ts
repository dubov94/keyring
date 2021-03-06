export interface Argon2Settings {
  type: 'argon2i' | 'argon2d' | 'argon2id';
  // https://tools.ietf.org/html/draft-irtf-cfrg-argon2-12#section-3.1
  // https://github.com/P-H-C/phc-winner-argon2#command-line-utility
  version: number | 'latest';
  memoryInBytes: number;
  iterations: number;
  threads: number;
}

export interface Argon2Parametrization {
  separator: '$';
  settings: Argon2Settings;
  salt: string;
}

const concat = (...content: string[]) => content.join('')
const list = (...items: string[]) => items.join(',')

export const serializeArgon2Parametrization = (struct: Argon2Parametrization): string => {
  // https://github.com/jedisct1/libsodium/blob/57d950a54e6f7743084092ba5d31b8fa0641eab2/src/libsodium/crypto_pwhash/argon2/argon2-encoding.c
  return concat(
    struct.separator,
    struct.settings.type,
    struct.settings.version === 'latest' ? '' : concat(
      struct.separator,
      `v=${struct.settings.version}`
    ),
    struct.separator,
    list(
      `m=${struct.settings.memoryInBytes}`,
      `t=${struct.settings.iterations}`,
      `p=${struct.settings.threads}`
    ),
    struct.separator,
    struct.salt
  )
}

const A2P_LEXEMS = {
  separator: '\\$',
  type: 'argon2(?:i|d|id)',
  n: '[1-9][0-9]*',
  base64: '[A-Za-z0-9-_=]+'
}

const named = (name: string, content: string) => `(?<${name}>${content})`
const group = (content: string) => `(?:${content})`
const maybe = (content: string) => `${content}?`

const A2P_REGEXP = new RegExp(concat(
  '^',
  A2P_LEXEMS.separator,
  named('type', A2P_LEXEMS.type),
  maybe(group(concat(A2P_LEXEMS.separator, `v=${named('version', A2P_LEXEMS.n)}`))),
  A2P_LEXEMS.separator,
  list(
    `m=${named('memoryInBytes', A2P_LEXEMS.n)}`,
    `t=${named('iterations', A2P_LEXEMS.n)}`,
    `p=${named('threads', A2P_LEXEMS.n)}`
  ),
  A2P_LEXEMS.separator,
  named('salt', A2P_LEXEMS.base64),
  '$'
))

export const parseArgon2Parametrization = (parametrization: string): Argon2Parametrization => {
  const match = A2P_REGEXP.exec(parametrization)
  if (match === null) {
    throw new Error(`Malformed Argon2 parametrization: ${parametrization}`)
  }
  const groups = match.groups!
  return <Argon2Parametrization>{
    separator: '$',
    settings: {
      type: groups.type,
      version: groups.version === undefined ? 'latest' : Number(groups.version),
      memoryInBytes: Number(groups.memoryInBytes),
      iterations: Number(groups.iterations),
      threads: Number(groups.threads)
    },
    salt: groups.salt
  }
}

// https://tools.ietf.org/html/draft-irtf-cfrg-argon2-12#section-4
// https://github.com/golang/crypto/blob/5ea612d1eb830b38bc4e914e37f55311eb58adce/argon2/argon2.go
export const recommendedArgon2Settings = (): Argon2Settings => ({
  type: 'argon2id',
  version: 'latest',
  memoryInBytes: 64 * 1024 * 1024,
  iterations: 1,
  threads: 1
})
