// https://github.com/microsoft/tsyringe#installation
import 'reflect-metadata'
import { container } from 'tsyringe'
import { SODIUM_INTERFACE_TOKEN, SodiumInterface } from './sodium_interface'
import SodiumWorker from './sodium.worker.ts'
import { fetchFromApi } from '@/api/fetch'
import { AdministrationApi, AuthenticationApi } from '@/api/definitions'
import { ADMINISTRATION_API_TOKEN, AUTHENTICATION_API_TOKEN } from '@/api/injections'
import './main.js'

container.register<SodiumInterface>(SODIUM_INTERFACE_TOKEN, {
  useValue: SodiumWorker<SodiumInterface>()
})

container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
  useValue: new AdministrationApi({}, '/api', fetchFromApi)
})

container.register<AuthenticationApi>(AUTHENTICATION_API_TOKEN, {
  useValue: new AuthenticationApi({}, '/api', fetchFromApi)
})
