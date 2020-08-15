import { ActionTree } from 'vuex'
import { RootState } from '@/store/root/state'
import { container } from 'tsyringe'
import { SodiumClient } from '@/sodium_client'
import { createSessionHeader } from './utilities'
import {
  AdministrationApi,
  ServiceAcquireMailTokenResponseError,
  ServiceReleaseMailTokenResponseError
} from '@/api/definitions'

export const MailActions: ActionTree<RootState, RootState> = {
  async acquireMailToken ({ state }, { mail, password }): Promise<ServiceAcquireMailTokenResponseError> {
    if (state.parametrization === null) {
      throw new Error('`RootState.parametrization` is null')
    }
    if (state.sessionKey === null) {
      throw new Error('`RootState.sessionKey` is null')
    }
    return (
      await container.resolve(AdministrationApi).acquireMailToken({
        digest: (await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          state.parametrization, password)).authDigest,
        mail
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).error!
  },
  async releaseMailToken ({ state }, { code }): Promise<ServiceReleaseMailTokenResponseError> {
    if (state.sessionKey === null) {
      throw new Error('`RootState.sessionKey` is null')
    }
    return (
      await container.resolve(AdministrationApi).releaseMailToken({ code }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).error!
  }
}
