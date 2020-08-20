import { ActionTree } from 'vuex'
import { RootState } from '@/store/state'
import { container } from 'tsyringe'
import { SodiumClient } from '@/sodium_client'
import { createSessionHeader } from './utilities'
import {
  ServiceAcquireMailTokenResponseError,
  ServiceReleaseMailTokenResponseError
} from '@/api/definitions'
import { getAdministrationApi } from '@/api/injections'

export enum Type {
  ACQUIRE_MAIL_TOKEN = 'acquireMailToken',
  RELEASE_MAIL_TOKEN = 'releaseMailToken',
}

export const MailActions: ActionTree<RootState, RootState> = {
  async [Type.ACQUIRE_MAIL_TOKEN] (
    { state },
    { mail, password }: { mail: string; password: string }
  ): Promise<ServiceAcquireMailTokenResponseError> {
    if (state.parametrization === null) {
      throw new Error('`RootState.parametrization` is null')
    }
    if (state.sessionKey === null) {
      throw new Error('`RootState.sessionKey` is null')
    }
    return (
      await getAdministrationApi().acquireMailToken({
        digest: (await container.resolve(SodiumClient).computeAuthDigestAndEncryptionKey(
          state.parametrization, password)).authDigest,
        mail
      }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).error!
  },
  async [Type.RELEASE_MAIL_TOKEN] ({ state }, { code }: { code: string }): Promise<ServiceReleaseMailTokenResponseError> {
    if (state.sessionKey === null) {
      throw new Error('`RootState.sessionKey` is null')
    }
    return (
      await getAdministrationApi().releaseMailToken({ code }, {
        headers: createSessionHeader(state.sessionKey)
      })
    ).error!
  }
}
