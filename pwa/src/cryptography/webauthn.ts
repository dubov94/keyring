import { container } from 'tsyringe'

export const WEB_AUTHN_TOKEN = 'WebAuthn'

export interface WebAuthn {
}

export const getWebAuthn = () => container.resolve<WebAuthn>(WEB_AUTHN_TOKEN)
