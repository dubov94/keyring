import { container } from 'tsyringe'

export const TURNSTILE_API_TOKEN = 'TurnstileApiToken'

export const getTurnstileApi = () => container.resolve<Turnstile.Api>(TURNSTILE_API_TOKEN)
