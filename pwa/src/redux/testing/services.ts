import { Color, Score, StrengthTestService } from '@/cryptography/strength_test_service'
import { UidService } from '@/cryptography/uid_service'
import { CreateCredentialResult, ReadCredentialResult, WebAuthnService } from '@/cryptography/web_authn'

export class SequentialFakeUidService implements UidService {
  _uidCounter: number

  constructor () {
    this._uidCounter = 1
  }

  v4 () {
    return `uid-${this._uidCounter++}`
  }
}

export class PositiveFakeStrengthTestService implements StrengthTestService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  score (password: string, inputs: string[]): Score {
    return {
      value: 1,
      color: Color.GREEN
    }
  }
}

export class FakeTurnstileApi implements Turnstile.Api {
  _widgetId: string
  _token: string
  _container: null | HTMLElement

  constructor (widgetId: string, token: string) {
    this._widgetId = widgetId
    this._token = token
    this._container = null
  }

  render (container: HTMLElement, params: Turnstile.RenderParameters) {
    this._container = container
    params.callback!(this._token)
    return this._widgetId
  }

  reset () {}

  remove () {}

  getResponse () {
    return this._token
  }
}

export class FakeWebAuthn implements WebAuthnService {
  _credentialCounter: number
  _credentials: {
    credentialId: string;
    userId: string;
    userName: string;
  }[]

  constructor () {
    this._credentialCounter = 1
    this._credentials = []
  }

  async createCredential (userId: string, userName: string): Promise<CreateCredentialResult> {
    const counter = this._credentialCounter++
    const credentialId = `credential-${counter}`
    this._credentials.push({
      credentialId,
      userId,
      userName
    })
    const salt = 'salt'
    return {
      credentialId,
      prfFirstSalt: salt,
      prfFirstResult: `${credentialId}-${salt}-result`
    }
  }

  async readCredential (credentialId: string, prfFirstSalt: string): Promise<ReadCredentialResult> {
    const credential = this._credentials.find((credential) => credential.credentialId === credentialId)
    if (!credential) {
      throw new Error(`Credential '${credentialId}' is not found`)
    }
    return {
      prfFirstResult: `${credential.credentialId}-${prfFirstSalt}-result`
    }
  }

  async deleteCredential (credentialId: string): Promise<void> {
    const index = this._credentials.findIndex((credential) => credential.credentialId === credentialId)
    if (index === -1) {
      throw new Error(`Credential '${credentialId}' is not found`)
    }
    this._credentials.splice(index, 1)
  }
}
