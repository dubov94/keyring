import {createCharacterRange} from './utilities'

export const ALPHANUMERIC_CHARACTERS =
  createCharacterRange('0', '9') +
  createCharacterRange('A', 'Z') +
  createCharacterRange('a', 'z')

export const SESSION_LIFETIME_IN_MS = 5 * 60 * 1000

export const SESSION_TOKEN_HEADER_NAME = 'X-Session-Token'
