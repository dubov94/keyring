import { ActionTree } from 'vuex'
import { RootState, Key } from '@/store/state'
import { container } from 'tsyringe'
import { SodiumClient } from '@/sodium_client'
import { createSessionHeader } from './utilities'
import {
  ServiceCreateKeyResponse
} from '@/api/definitions'
import { Type as RootMutation } from '../mutations'
import { ActionType as DepotAction } from '@/store/modules/depot'
import { ActionType as ThreatsAction } from '@/store/modules/threats'
import { getAdministrationApi } from '@/api/injections'

export enum Type {
  ACCEPT_USER_KEYS = 'acceptUserKeys',
  CREATE_USER_KEY = 'createUserKey',
  UPDATE_USER_KEY = 'updateUserKey',
  REMOVE_USER_KEY = 'removeUserKey'
}

export const KeysActions: ActionTree<RootState, RootState> = {
  async [Type.ACCEPT_USER_KEYS] (
    { commit, dispatch, state },
    { userKeys, updateDepot }: { userKeys: Array<Key>; updateDepot: boolean }
  ) {
    const { encryptionKey } = state
    if (encryptionKey === null) {
      throw new Error('`RootState.encryptionKey` is null')
    }
    commit(RootMutation.SET_USER_KEYS, await Promise.all(
      userKeys.map(async ({ identifier, value, tags }) =>
        Object.assign({ identifier }, await container.resolve(SodiumClient).decryptPassword(
          encryptionKey, { value, tags }))
      )
    ))
    if (updateDepot) {
      await dispatch(`depot/${DepotAction.MAYBE_UPDATE_DEPOT}`, { userKeys: state.userKeys })
    }
    await dispatch(`threats/${ThreatsAction.MAYBE_ASSESS_USER_KEYS}`, state.userKeys)
  },
  async [Type.CREATE_USER_KEY] (
    { commit, dispatch, state },
    { value, tags }: { value: string; tags: Array<string> }) {
    if (state.sessionKey === null) {
      throw new Error('`RootState.sessionKey` is null')
    }
    if (state.encryptionKey === null) {
      throw new Error('`RootState.encryptionKey` is null')
    }
    const response: ServiceCreateKeyResponse =
      await getAdministrationApi().createKey({
        password: await container.resolve(SodiumClient).encryptPassword(
          state.encryptionKey, { value, tags })
      }, { headers: createSessionHeader(state.sessionKey) })
    commit(RootMutation.UNSHIFT_USER_KEY, { identifier: response.identifier, value, tags })
    await dispatch(`depot/${DepotAction.MAYBE_UPDATE_DEPOT}`, { userKeys: state.userKeys })
    await dispatch(`threats/${ThreatsAction.MAYBE_ASSESS_USER_KEYS}`, state.userKeys)
  },
  async [Type.UPDATE_USER_KEY] (
    { commit, dispatch, state }, { identifier, value, tags }: Key) {
    if (state.sessionKey === null) {
      throw new Error('`RootState.sessionKey` is null')
    }
    if (state.encryptionKey === null) {
      throw new Error('`RootState.encryptionKey` is null')
    }
    await getAdministrationApi().updateKey({
      key: {
        identifier,
        password: await container.resolve(SodiumClient).encryptPassword(
          state.encryptionKey, { value, tags })
      }
    }, { headers: createSessionHeader(state.sessionKey) })
    commit(RootMutation.MODIFY_USER_KEY, { identifier, value, tags })
    await dispatch(`depot/${DepotAction.MAYBE_UPDATE_DEPOT}`, { userKeys: state.userKeys })
    await dispatch(`threats/${ThreatsAction.MAYBE_ASSESS_USER_KEYS}`, state.userKeys)
  },
  async [Type.REMOVE_USER_KEY] ({ commit, dispatch, state }, { identifier }: { identifier: string }) {
    if (state.sessionKey === null) {
      throw new Error('`RootState.sessionKey` is null')
    }
    await getAdministrationApi().deleteKey({ identifier }, {
      headers: createSessionHeader(state.sessionKey)
    })
    commit(RootMutation.DELETE_USER_KEY, identifier)
    await dispatch(`depot/${DepotAction.MAYBE_UPDATE_DEPOT}`, { userKeys: state.userKeys })
    await dispatch(`threats/${ThreatsAction.MAYBE_ASSESS_USER_KEYS}`, state.userKeys)
  }
}
