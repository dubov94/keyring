export interface Argon2Parametrization {
  separator: '$';
  type: 'argon2i' | 'argon2d' | 'argon2id';
  version: number;
  memoryInBytes: number;
  iterations: number;
  threads: number;
  salt: string;
}

const concat = (...content: string[]) => content.join('')
const list = (...items: string[]) => items.join(',')

// TODO: Re-enable version population once the grace period is over.
export const serializeArgon2Parametrization = (struct: Argon2Parametrization): string => {
  // https://github.com/jedisct1/libsodium/blob/57d950a54e6f7743084092ba5d31b8fa0641eab2/src/libsodium/crypto_pwhash/argon2/argon2-encoding.c
  return concat(
    struct.separator,
    struct.type,
    struct.separator,
    list(
      `m=${struct.memoryInBytes}`,
      `t=${struct.iterations}`,
      `p=${struct.threads}`
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
    type: groups.type,
    // https://tools.ietf.org/html/draft-irtf-cfrg-argon2-12#section-3.1
    version: Number(groups.version ?? '19'),
    memoryInBytes: Number(groups.memoryInBytes),
    iterations: Number(groups.iterations),
    threads: Number(groups.threads),
    salt: groups.salt
  }
}
