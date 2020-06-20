// https://github.com/microsoft/tsyringe#installation
import 'reflect-metadata'
import { container } from 'tsyringe'
import { SodiumInterface } from './sodium_interface'
import SodiumWorker from './sodium.worker.ts'
import './main.js'

container.register<SodiumInterface>('SodiumInterface', {
  useValue: SodiumWorker<SodiumInterface>()
})
