import { createSelector } from '@reduxjs/toolkit'
import { readonlyArray, option, function as fn } from 'fp-ts'
import groupBy from 'lodash/groupBy'
import orderBy from 'lodash/orderBy'
import sortBy from 'lodash/sortBy'
import { DeepReadonly } from 'ts-essentials'
import { Key, Password } from '@/redux/domain'
import { RootState } from '@/redux/root_reducer'

const userKeys = (state: RootState): DeepReadonly<Key[]> => state.user.keys.userKeys
export const idToClique = (state: RootState): DeepReadonly<{ [key: string]: string }> => state.user.keys.idToClique
const cliquesInOrder = (state: RootState): DeepReadonly<string[]> => state.user.keys.cliquesInOrder
const busyness = (state: RootState): DeepReadonly<{ [key: string]: number }> => state.user.keys.busyness

export interface Clique {
  name: string;
  parent: Key | null;
  // Sorted by recency.
  shadows: Key[];
  busyness: number;
}
export const createEmptyClique = (name: string): DeepReadonly<Clique> => ({
  name,
  parent: null,
  shadows: [],
  busyness: 0
})
export const createCliqueFromPassword = (
  cliqueName: string,
  keyId: string,
  password: DeepReadonly<Password>,
  creationTimeInMillis: number
): DeepReadonly<Clique> => ({
  name: cliqueName,
  parent: {
    identifier: keyId,
    attrs: {
      isShadow: false,
      parent: ''
    },
    ...password,
    creationTimeInMillis
  },
  shadows: [],
  busyness: 0
})
export const cliques = createSelector(
  userKeys, idToClique, busyness, cliquesInOrder,
  (keyList, keyToClique, cliqueToBusyness, order) => {
    const cliqueToList = groupBy(keyList, (item) => keyToClique[item.identifier])
    const result: DeepReadonly<Clique>[] = []
    for (const [clique, list] of Object.entries(cliqueToList)) {
      let parent: DeepReadonly<Key> | null = null
      const shadows: DeepReadonly<Key>[] = []
      for (const item of list) {
        if (item.attrs.isShadow) {
          shadows.push(item)
        } else {
          parent = item
        }
      }
      result.push({
        name: clique,
        parent,
        shadows: orderBy(
          shadows,
          (item) => item.creationTimeInMillis,
          'desc'
        ),
        busyness: clique in cliqueToBusyness ? cliqueToBusyness[clique] : 0
      })
    }
    return sortBy(result, (item) => order.indexOf(item.name))
  }
)

export const getCliqueRoot = (clique: DeepReadonly<Clique>): option.Option<DeepReadonly<Key>> => {
  return option.fromNullable(clique.parent)
}

export const getFrontShadow = (clique: DeepReadonly<Clique>): option.Option<DeepReadonly<Key>> => {
  return readonlyArray.head(clique.shadows)
}

export const getCliqueRepr = (clique: DeepReadonly<Clique>): option.Option<DeepReadonly<Key>> => {
  return fn.pipe(
    getCliqueRoot(clique),
    option.alt(() => getFrontShadow(clique))
  )
}

export const peelClique = (clique: DeepReadonly<Clique>): DeepReadonly<Clique> => ({
  name: clique.name,
  parent: clique.parent,
  shadows: [],
  busyness: clique.busyness
})
