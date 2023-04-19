import { ServiceKeyProto } from '@/api/definitions'
import { getSodiumClient } from '@/cryptography/sodium_client'
import { Key } from '@/redux/domain'

export const fromKeyProto = (encryptionKey: string) => {
  return async (item: ServiceKeyProto): Promise<Key> => ({
    identifier: item.identifier!,
    attrs: {
      isShadow: item.attrs!.isShadow!,
      parent: item.attrs!.parent!,
      isPinned: item.attrs!.isPinned!
    },
    ...(await getSodiumClient().decryptPassword(encryptionKey, {
      value: item.password!.value!,
      tags: item.password!.tags!
    })),
    creationTimeInMillis: Number(item.creationTimeInMillis!)
  })
}
