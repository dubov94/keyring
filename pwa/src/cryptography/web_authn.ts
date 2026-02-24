import { container } from 'tsyringe'

export const WEB_AUTHN_TOKEN = 'WebAuthn'

export interface CreateCredentialResult {
  credentialId: string;
  prfFirstSalt: string;
  prfFirstResult: string;
}

export interface ReadCredentialResult {
  prfFirstResult: string;
}

export interface WebAuthnService {
  createCredential(userId: string, userName: string): Promise<CreateCredentialResult>
  readCredential(credentialId: string, prfFirstSalt: string): Promise<ReadCredentialResult>
  deleteCredential(credentialId: string): Promise<void>
}

const randomBytes = (n: number) => window.crypto.getRandomValues(new Uint8Array(n))
const toBase64 = (data: Uint8Array) => data.toBase64({
  alphabet: 'base64url',
  omitPadding: true
})
const fromBase64 = (data: string) => Uint8Array.fromBase64(data, {
  alphabet: 'base64url'
})

export class NavigatorCredentialsService implements WebAuthnService {
  _rpId: string

  constructor (rpId: string) {
    this._rpId = rpId
  }

  // https://webauthn.guide/
  // https://blog.millerti.me/2023/01/22/encrypting-data-in-the-browser-using-webauthn/
  // https://github.com/w3c/webauthn/wiki/Explainer:-PRF-extension
  // https://corbado.com/blog/passkeys-prf-webauthn#7-webauthn-prf-vs-alternatives-choosing-the-right-tool
  async createCredential (userId: string, userName: string): Promise<CreateCredentialResult> {
    const textEncoder = new TextEncoder()
    const salt = randomBytes(32)
    const credential = await navigator.credentials.create({
      publicKey: {
        attestation: 'none',
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          // For Android. For GPM details, see
          // https://security.googleblog.com/2022/10/SecurityofPasskeysintheGooglePasswordManager.html.
          requireResidentKey: true,
          userVerification: 'required'
        },
        challenge: randomBytes(32),
        extensions: {
          prf: {
            eval: {
              first: salt
            }
          }
        },
        // https://chromium.googlesource.com/chromium/src/+/main/content/browser/webauth/pub_key_cred_params.md
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' }
        ],
        rp: {
          id: this._rpId,
          name: 'Parolica'
        },
        timeout: 60_000,
        user: {
          id: textEncoder.encode(userId),
          name: userName,
          displayName: userName
        }
      }
    })
    if (credential === null) {
      throw new Error('`navigator.credentials.create` resolved w/ `null`')
    }
    const publicKeyCredential = credential as PublicKeyCredential
    const prfResults = publicKeyCredential.getClientExtensionResults().prf
    if (!prfResults || !prfResults.enabled || !prfResults.results) {
      throw new Error('PRF extension is not available')
    }
    return {
      credentialId: toBase64(new Uint8Array(publicKeyCredential.rawId)),
      prfFirstSalt: toBase64(salt),
      prfFirstResult: toBase64(new Uint8Array(prfResults.results.first as ArrayBuffer))
    }
  }

  async readCredential (credentialId: string, prfFirstSalt: string): Promise<ReadCredentialResult> {
    const credential = await navigator.credentials.get({
      publicKey: {
        allowCredentials: [{
          id: fromBase64(credentialId),
          type: 'public-key'
        }],
        challenge: randomBytes(32),
        extensions: {
          prf: {
            eval: {
              first: fromBase64(prfFirstSalt)
            }
          }
        },
        rpId: this._rpId,
        timeout: 60_000,
        userVerification: 'required'
      }
    })
    if (credential === null) {
      throw new Error('`navigator.credentials.get` resolved w/ `null`')
    }
    const publicKeyCredential = credential as PublicKeyCredential
    const prfResults = publicKeyCredential.getClientExtensionResults().prf
    if (!prfResults || !prfResults.results) {
      throw new Error('PRF extension is not available')
    }
    return {
      prfFirstResult: toBase64(new Uint8Array(prfResults.results.first as ArrayBuffer))
    }
  }

  async deleteCredential (credentialId: string): Promise<void> {
    await window.PublicKeyCredential.signalUnknownCredential({
      rpId: this._rpId,
      credentialId
    })
  }
}

export const getWebAuthn = () => container.resolve<WebAuthnService>(WEB_AUTHN_TOKEN)
