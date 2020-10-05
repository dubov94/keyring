import { container } from 'tsyringe'
import {
  AdministrationApi,
  AuthenticationApi
} from '@/api/definitions'

export const ADMINISTRATION_API_TOKEN = 'AdministrationApi'

export const getAdministrationApi = (): AdministrationApi => {
  return container.resolve<AdministrationApi>(ADMINISTRATION_API_TOKEN)
}

export const AUTHENTICATION_API_TOKEN = 'AuthenticationApi'

export const getAuthenticationApi = (): AuthenticationApi => {
  return container.resolve<AuthenticationApi>(AUTHENTICATION_API_TOKEN)
}
