// https://github.com/microsoft/tsyringe#installation
import 'reflect-metadata'
import { container } from 'tsyringe'
import { SODIUM_TOKEN, SodiumInterface } from './sodium_interface'
import SodiumWorker from './sodium.worker.ts'
import './main.js'

container.register<SodiumInterface>(SODIUM_TOKEN, {
  useValue: SodiumWorker<SodiumInterface>()
})
