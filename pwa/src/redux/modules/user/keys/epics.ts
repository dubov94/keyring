// Extend `CLIQUE_DIGESTION_ACTIONS` and `userKeysUpdateEpic` with new mutations.

import { monoid, function as fn, option, predicate, record, readonlyArray } from 'fp-ts'
import reverse from 'lodash/reverse'
import sortBy from 'lodash/sortBy'
import { Epic } from 'redux-observable'
import { asapScheduler, concat, EMPTY, forkJoin, from, Observable, of, OperatorFunction, pipe, scheduled, throwError } from 'rxjs'
import {
  catchError,
  concatMap,
  defaultIfEmpty,
  filter,
  groupBy,
  map,
  mergeMap,
  switchMap,
  takeWhile,
  withLatestFrom
} from 'rxjs/operators'
import { DeepReadonly } from 'ts-essentials'
import { getType, isActionOf, PayloadMetaAction, PayloadMetaActionCreator, TypeConstant } from 'typesafe-actions'
import { getAdministrationApi } from '@/api/api_di'
import { ServiceCreateKeyResponse, ServiceElectShadowResponse, ServiceImportKeysResponse } from '@/api/definitions'
import { getSodiumClient } from '@/cryptography/sodium_client'
import { getUidService } from '@/cryptography/uid_service'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { Key, Password } from '@/redux/domain'
import { createDisplayExceptionsEpic } from '@/redux/exceptions'
import {
  exception,
  indicator,
  errorToMessage,
  success,
  isActionSuccess,
  mapper,
  StandardError,
  isSignalFinale,
  isSignalSuccess,
  FlowSignal,
  isSignalFailure,
  isSignalException,
  FlowSignalKind,
  cancel,
  failure
} from '@/redux/flow_signal'
import { authnViaDepotSignal, remoteAuthnComplete } from '@/redux/modules/authn/actions'
import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'
import {
  create,
  creationSignal,
  delete_,
  deletionSignal,
  OperationIndicator,
  update,
  updationSignal,
  emplace,
  userKeysUpdate,
  NIL_KEY_ID,
  commitShadow,
  integrateClique,
  electShadow,
  shadowElectionSignal,
  extractPassword,
  cliqueIntegrationSignal,
  ShadowElectionSuccess,
  cancelShadow,
  OperationMetadata,
  obliterateClique,
  cliqueObliterationSignal,
  acquireCliqueLock,
  releaseCliqueLock,
  shadowCommitmentSignal,
  newCliqueOrder,
  cliqueAddition,
  importSignal,
  import_,
  importReset,
  export_,
  exportSignal,
  ExportError,
  toggleCliquePin,
  keyPinTogglingSignal,
  toggleKeyPin,
  CLIQUE_ORDER_ITERATEES
} from './actions'
import { Clique, cliques, createEmptyClique, getCliqueRoot, getFrontShadow } from './selectors'
import { fromKeyProto } from './converters'

const importSequence = (
  sessionKey: string,
  encryptionKey: string,
  passwords: DeepReadonly<Password[]>
): Observable<RootAction> => {
  return concat(
    of(importSignal(indicator(OperationIndicator.WORKING))),
    forkJoin(passwords.map(async (password) => {
      return getSodiumClient().encryptPassword(encryptionKey, password)
    })).pipe(
      defaultIfEmpty(<Password[]>[]),
      switchMap((encryptedPasswords) => {
        return from(getAdministrationApi().administrationImportKeys({
          passwords: encryptedPasswords
        }, {
          headers: {
            [SESSION_TOKEN_HEADER_NAME]: sessionKey
          }
        })).pipe(
          switchMap((response: ServiceImportKeysResponse) => {
            return forkJoin(response.keys!.map(fromKeyProto(encryptionKey))).pipe(
              defaultIfEmpty(<Key[]>[]),
              switchMap((keys: Key[]) => {
                return of(importSignal(success(keys)))
              })
            )
          })
        )
      })
    )
  ).pipe(
    catchError((error) => of(importSignal(exception(errorToMessage(error)))))
  )
}

export const displayImportExceptionEpic = createDisplayExceptionsEpic(importSignal)

export const importEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([import_, importReset])),
  withLatestFrom(state$),
  switchMap(([action, state]) => {
    if (isActionOf(import_, action)) {
      return importSequence(
        state.user.account.sessionKey!,
        state.user.account.encryptionKey!,
        action.payload
      )
    } else if (isActionOf(importReset, action)) {
      return of(importSignal(cancel()))
    }
    return EMPTY
  })
)

export const creationEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf(create)),
  withLatestFrom(state$),
  mergeMap(([action, state]) => {
    const encryptionKey = state.user.account.encryptionKey!
    return concat(
      of(creationSignal(indicator(OperationIndicator.WORKING), action.meta)),
      from(getSodiumClient().encryptPassword(encryptionKey, action.payload)).pipe(
        switchMap((password) => {
          const { attrs } = action.payload
          return from(getAdministrationApi().administrationCreateKey({
            password,
            attrs
          }, {
            headers: {
              [SESSION_TOKEN_HEADER_NAME]: state.user.account.sessionKey!
            }
          })).pipe(
            switchMap((response: ServiceCreateKeyResponse) => {
              return of(creationSignal(success({
                identifier: response.identifier!,
                attrs,
                ...extractPassword(action.payload),
                creationTimeInMillis: Number(response.creationTimeInMillis!)
              }), action.meta))
            })
          )
        })
      )
    ).pipe(
      catchError((error) => of(creationSignal(exception(errorToMessage(error)), action.meta)))
    )
  })
)

export const updationEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf(update)),
  withLatestFrom(state$),
  mergeMap(([action, state]) => concat(
    of(updationSignal(indicator(OperationIndicator.WORKING), action.meta)),
    from(getSodiumClient().encryptPassword(state.user.account.encryptionKey!, action.payload)).pipe(
      switchMap((password) => {
        const { userKeys } = state.user.keys
        const { identifier } = action.payload
        const index = userKeys.findIndex((key) => key.identifier === identifier)
        if (index === -1) {
          throw new Error(`\`userKeys\` does not contain ${identifier}`)
        }
        const target = userKeys[index]
        return from(getAdministrationApi().administrationUpdateKey({
          key: {
            identifier: action.payload.identifier,
            password
          }
        }, {
          headers: {
            [SESSION_TOKEN_HEADER_NAME]: state.user.account.sessionKey!
          }
        })).pipe(
          switchMap(() => {
            return of(updationSignal(success({
              identifier,
              attrs: target.attrs,
              ...extractPassword(action.payload),
              creationTimeInMillis: target.creationTimeInMillis
            }), action.meta))
          })
        )
      })
    )
  ).pipe(
    catchError((error) => of(updationSignal(exception(errorToMessage(error)), action.meta)))
  ))
)

export const deletionEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf(delete_)),
  withLatestFrom(state$),
  mergeMap(([action, state]) => concat(
    of(deletionSignal(indicator(OperationIndicator.WORKING), action.meta)),
    from(getAdministrationApi().administrationDeleteKey({
      identifier: action.payload.identifier
    }, {
      headers: {
        [SESSION_TOKEN_HEADER_NAME]: state.user.account.sessionKey!
      }
    })).pipe(
      switchMap(() => {
        return of(deletionSignal(success(action.payload.identifier), action.meta))
      })
    )
  ).pipe(
    catchError((error) => of(deletionSignal(exception(errorToMessage(error)), action.meta)))
  ))
)

export const inheritKeysFromAuthnDataEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  concatMap((action) => {
    if (isActionSuccess(authnViaDepotSignal)(action)) {
      return of(emplace(action.payload.data.userKeys))
    }
    if (isActionOf(remoteAuthnComplete)(action)) {
      return of(emplace(action.payload.userKeys))
    }
    return EMPTY
  })
)

export const shadowElectionEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf(electShadow)),
  withLatestFrom(state$),
  mergeMap(([action, state]) => concat(
    of(shadowElectionSignal(indicator(OperationIndicator.WORKING), action.meta)),
    from(getAdministrationApi().administrationElectShadow({
      identifier: action.payload
    }, {
      headers: {
        [SESSION_TOKEN_HEADER_NAME]: state.user.account.sessionKey!
      }
    })).pipe(
      switchMap((response: ServiceElectShadowResponse) => {
        const { userKeys } = state.user.keys
        const identifier = action.payload
        const index = userKeys.findIndex((key) => key.identifier === identifier)
        if (index === -1) {
          throw new Error(`\`userKeys\` does not contain ${identifier}`)
        }
        return of(shadowElectionSignal(success({
          origin: identifier,
          result: {
            identifier: response.parent!,
            attrs: {
              isShadow: false,
              parent: NIL_KEY_ID,
              isPinned: userKeys[index].attrs.isPinned
            },
            ...extractPassword(userKeys[index]),
            creationTimeInMillis: userKeys[index].creationTimeInMillis
          },
          obsolete: response.deletedShadows!
        }), action.meta))
      })
    )
  ).pipe(
    catchError((error) => of(shadowElectionSignal(exception(errorToMessage(error)), action.meta)))
  ))
)

export const keyPinTogglingEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf(toggleKeyPin)),
  withLatestFrom(state$),
  mergeMap(([action, state]) => concat(
    of(keyPinTogglingSignal(indicator(OperationIndicator.WORKING), action.meta)),
    from(getAdministrationApi().administrationTogglePin({
      identifier: action.payload.identifier,
      isPinned: action.payload.isPinned
    }, {
      headers: {
        [SESSION_TOKEN_HEADER_NAME]: state.user.account.sessionKey!
      }
    })).pipe(
      switchMap(() => {
        return of(keyPinTogglingSignal(success(action.payload), action.meta))
      })
    )
  ).pipe(
    catchError((error) => of(keyPinTogglingSignal(exception(errorToMessage(error)), action.meta)))
  ))
)

export const displayKeyPinTogglingExceptionEpic = createDisplayExceptionsEpic(keyPinTogglingSignal)

export const userKeysUpdateEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(monoid.concatAll(predicate.getMonoidAny<RootAction>())([
    isActionOf(emplace),
    isActionSuccess(importSignal),
    isActionSuccess(creationSignal),
    isActionSuccess(updationSignal),
    isActionSuccess(deletionSignal),
    isActionSuccess(shadowElectionSignal),
    isActionSuccess(keyPinTogglingSignal)
  ])),
  withLatestFrom(state$),
  map(([, state]) => userKeysUpdate(state.user.keys.userKeys))
)

export const cliqueOrderOnEmplaceEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf(emplace)),
  withLatestFrom(state$),
  map(([, state]) => newCliqueOrder(
    sortBy(cliques(state), CLIQUE_ORDER_ITERATEES).map((clique) => clique.name)
  ))
)

export const cliqueAdditionEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionSuccess(creationSignal)),
  map((action) => cliqueAddition(action.meta.clique))
)

export const cliqueOrderOnPinEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionSuccess(keyPinTogglingSignal)),
  withLatestFrom(state$),
  concatMap(([action, state]) => {
    const { data } = action.payload
    const cliqueName = state.user.keys.idToClique[data.identifier]
    const cliqueList = cliques(state)
    const cliqueIndex = cliqueList.findIndex(
      (clique) => clique.name === cliqueName)
    if (cliqueIndex === -1) {
      return EMPTY
    }
    const toggledClique = cliqueList[cliqueIndex]
    const delta = data.isPinned ? -1 : 1
    let newIndex = cliqueIndex
    while (true) {
      const comparedIndex = newIndex + delta
      if (!(0 <= comparedIndex && comparedIndex < cliqueList.length)) {
        break
      }
      const comparedClique = cliqueList[comparedIndex]
      let operands = [comparedClique, toggledClique]
      if (!data.isPinned) {
        operands = reverse(operands)
      }
      // `sortedIndexBy` does not support `iteratees`.
      const [left] = sortBy(operands, CLIQUE_ORDER_ITERATEES)
      if (left === operands[0]) {
        break
      }
      newIndex = comparedIndex
    }
    const orderedCliques = [
      ...cliqueList.slice(0, cliqueIndex),
      ...cliqueList.slice(cliqueIndex + 1)
    ]
    orderedCliques.splice(newIndex, 0, toggledClique)
    return of(newCliqueOrder(orderedCliques.map((clique) => clique.name)))
  })
)

const makeUid = <T>(callback: (uid: string) => T): T => {
  return callback(getUidService().v4())
}

const filterOperation = <T extends TypeConstant, P, M extends OperationMetadata>(
  actionCreator: PayloadMetaActionCreator<T, P, M>, uid: string
) => pipe(
    filter(isActionOf(actionCreator)),
    filter((action) => action.meta.uid === uid)
  )

const switchErrorSignalToErrorInstance = <
  T extends TypeConstant, I, S, E, M extends OperationMetadata
>(): OperatorFunction<
  PayloadMetaAction<T, FlowSignal<I, S, StandardError<E>>, M>, RootAction
> => switchMap((action: PayloadMetaAction<T, FlowSignal<I, S, StandardError<E>>, M>) => {
    if (isSignalException(action.payload)) {
      return throwError(`${action.type}: ${action.payload.error.message}`)
    }
    if (isSignalFailure(action.payload)) {
      return throwError(`${action.type}: ${action.payload.error.value}`)
    }
    return EMPTY
  })

const creationStream = (
  clique: string,
  payload: Parameters<typeof create>[0],
  action$: Observable<RootAction>
): Observable<RootAction> => makeUid((uid) => concat(
  of(create(payload, { uid, clique })),
  action$.pipe(
    filterOperation(creationSignal, uid),
    filter((action) => isSignalFinale(action.payload)),
    takeWhile((action) => !isSignalSuccess(action.payload)),
    switchErrorSignalToErrorInstance()
  )
))

const updationStream = (
  payload: Parameters<typeof update>[0],
  action$: Observable<RootAction>
): Observable<RootAction> => makeUid((uid) => concat(
  of(update(payload, { uid })),
  action$.pipe(
    filterOperation(updationSignal, uid),
    filter((action) => isSignalFinale(action.payload)),
    takeWhile((action) => !isSignalSuccess(action.payload)),
    switchErrorSignalToErrorInstance()
  )
))

const deletionStream = (
  payload: Parameters<typeof delete_>[0],
  action$: Observable<RootAction>
): Observable<RootAction> => makeUid((uid) => concat(
  of(delete_(payload, { uid })),
  action$.pipe(
    filterOperation(deletionSignal, uid),
    filter((action) => isSignalFinale(action.payload)),
    takeWhile((action) => !isSignalSuccess(action.payload)),
    switchErrorSignalToErrorInstance()
  )
))

const CLIQUE_DIGESTION_ACTIONS = [
  commitShadow,
  integrateClique,
  cancelShadow,
  obliterateClique,
  toggleCliquePin
]
type ShadowDigestionActionType = ReturnType<(typeof CLIQUE_DIGESTION_ACTIONS)[number]>

export const lockCliqueEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf(CLIQUE_DIGESTION_ACTIONS)),
  map((action) => acquireCliqueLock(action.payload.clique))
)

const unlockClique = (inner: (action: ShadowDigestionActionType) => Observable<RootAction>) => (
  action: ShadowDigestionActionType
) => concat(inner(action), of(releaseCliqueLock(action.payload.clique)))

const shadowCommitmentStream = (
  action: ReturnType<typeof commitShadow>,
  clique: DeepReadonly<Clique>,
  action$: Observable<RootAction>
): Observable<RootAction> => concat(
  fn.pipe(
    getFrontShadow(clique),
    option.fold(
      () => creationStream(clique.name, {
        attrs: {
          isShadow: true,
          parent: fn.pipe(
            option.fromNullable(clique.parent),
            option.map((parent) => parent.identifier),
            option.getOrElse(() => NIL_KEY_ID)
          ),
          isPinned: false
        },
        ...extractPassword(action.payload)
      }, action$),
      (shadow) => updationStream({
        identifier: shadow.identifier,
        ...extractPassword(action.payload)
      }, action$)
    )
  ),
  of(shadowCommitmentSignal(
    success({}),
    { clique: clique.name }
  ))
).pipe(
  catchError((error) => of(shadowCommitmentSignal(
    { kind: FlowSignalKind.ERROR, error: errorToMessage(error) },
    { clique: clique.name }
  )))
)

const cliqueIntegrationStream = (
  state: RootState,
  clique: DeepReadonly<Clique>,
  action$: Observable<RootAction>
): Observable<RootAction> => fn.pipe(
  state.user.keys.cliqueToSyncError,
  record.lookup(clique.name),
  option.compact,
  option.fold(
    () => fn.pipe(
      getFrontShadow(clique),
      option.fold(
        () => of(cliqueIntegrationSignal(
          exception(`Clique ${clique.name} has no shadows`),
          { clique: clique.name }
        )),
        (shadow) => makeUid((uid) => concat(
          of(electShadow(shadow.identifier, { uid })),
          action$.pipe(
            filterOperation(shadowElectionSignal, uid),
            map((signal) => cliqueIntegrationSignal(mapper(
              (indicator: OperationIndicator) => indicator,
              (success: DeepReadonly<ShadowElectionSuccess>) => success.result.identifier,
              (error: DeepReadonly<StandardError<never>>) => error
            )(signal.payload), { clique: clique.name })),
            takeWhile((signal) => !isSignalFinale(signal.payload), true)
          )
        ))
      )
    ),
    (errorMessage) => of(cliqueIntegrationSignal(
      exception(errorMessage),
      { clique: clique.name }
    ))
  )
)

const frontShadowRemovalStream = (
  clique: DeepReadonly<Clique>,
  action$: Observable<RootAction>
): Observable<RootAction> => fn.pipe(
  getFrontShadow(clique),
  option.fold(
    () => EMPTY,
    (shadow) => deletionStream(
      { identifier: shadow.identifier },
      action$
    )
  )
)

const shadowCancellationStream = (
  clique: DeepReadonly<Clique>,
  action$: Observable<RootAction>
): Observable<RootAction> => fn.pipe(
  getCliqueRoot(clique),
  option.fold(
    () => frontShadowRemovalStream(clique, action$).pipe(
      catchError(() => EMPTY)
    ),
    (root) => makeUid((uid) => concat(
      of(electShadow(root.identifier, { uid })),
      action$.pipe(
        filterOperation(shadowElectionSignal, uid),
        takeWhile((action) => !isSignalFinale(action.payload))
      )
    ))
  )
)

const targetObliterationStream = (
  clique: string,
  identifier: string,
  action$: Observable<RootAction>
): Observable<RootAction> => makeUid((uid) => concat(
  of(delete_({ identifier }, { uid })),
  action$.pipe(
    filterOperation(deletionSignal, uid),
    map((signal) => cliqueObliterationSignal(mapper(
      (indicator: OperationIndicator) => indicator,
      (success: string) => success,
      (error: DeepReadonly<StandardError<never>>) => error
    )(signal.payload), { clique })),
    takeWhile((signal) => !isSignalFinale(signal.payload), true)
  )
))

const cliqueObliterationStream = (
  clique: DeepReadonly<Clique>,
  action$: Observable<RootAction>
): Observable<RootAction> => fn.pipe(
  getCliqueRoot(clique),
  option.fold(
    () => fn.pipe(
      getFrontShadow(clique),
      option.fold(
        () => of(cliqueObliterationSignal(
          success(NIL_KEY_ID),
          { clique: clique.name }
        )),
        (shadow) => targetObliterationStream(clique.name, shadow.identifier, action$)
      )
    ),
    (root) => targetObliterationStream(clique.name, root.identifier, action$)
  )
)

const cliquePinTogglingStream = (
  isPinned: boolean,
  clique: DeepReadonly<Clique>,
  action$: Observable<RootAction>
): Observable<RootAction> => fn.pipe(
  getCliqueRoot(clique),
  option.fold(
    () => EMPTY,
    (root) => makeUid((uid) => concat(
      of(toggleKeyPin(
        { identifier: root.identifier, isPinned },
        { uid, clique: clique.name }
      )),
      action$.pipe(
        filterOperation(keyPinTogglingSignal, uid),
        takeWhile((signal) => !isSignalFinale(signal.payload), true)
      )
    ))
  )
)

export const cliqueDigestionEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf(CLIQUE_DIGESTION_ACTIONS)),
  groupBy((action) => action.payload.clique),
  // `mergeMap` is knowingly append-only.
  mergeMap((group) => group.pipe(
    // For each clique queue up actions via `concatMap`.
    concatMap(unlockClique((action) => scheduled([action], asapScheduler).pipe(
      withLatestFrom(state$),
      switchMap(([action, state]) => {
        const clique = fn.pipe(
          cliques(state),
          readonlyArray.findFirst((clique) => clique.name === action.payload.clique),
          option.getOrElse(() => createEmptyClique(action.payload.clique))
        )
        switch (action.type) {
          case getType(commitShadow):
            return shadowCommitmentStream(action, clique, action$)
          case getType(integrateClique):
            return cliqueIntegrationStream(state, clique, action$)
          case getType(cancelShadow):
            return shadowCancellationStream(clique, action$)
          case getType(obliterateClique):
            return cliqueObliterationStream(clique, action$)
          case getType(toggleCliquePin):
            return cliquePinTogglingStream(action.payload.isPinned, clique, action$)
        }
      })
    )))
  ))
)

export const displayCliqueIntegrationExceptionEpic = createDisplayExceptionsEpic(cliqueIntegrationSignal)

export const displayCliqueObliterationExceptionEpic = createDisplayExceptionsEpic(cliqueObliterationSignal)

export const exportEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf(export_)),
  withLatestFrom(state$),
  switchMap(([action, state]) => concat(
    of(exportSignal(indicator(OperationIndicator.WORKING))),
    of(action.payload.password).pipe(
      switchMap((password) => {
        const sodiumClient = getSodiumClient()
        let salt = ''
        let targetKey = ''

        const { account } = state.user
        if (account.encryptionKey !== null) {
          salt = account.parametrization!
          targetKey = account.encryptionKey
        }

        const { depot } = state
        if (depot.depotKey !== null) {
          salt = depot.salt!
          targetKey = depot.depotKey
        }

        if (targetKey === '') {
          throw new Error('Neither remote nor local `targetKey` is available')
        }
        return from(sodiumClient.computeAuthDigestAndEncryptionKey(salt, password)).pipe(
          switchMap(({ encryptionKey }) => {
            // This by no means is a security measure -- rather preventing
            // 'accidental' exports.
            if (encryptionKey !== targetKey) {
              return of(exportSignal(failure(ExportError.INVALID_PASSWORD)))
            }
            return of(exportSignal(success(cliques(state))))
          })
        )
      })
    )
  ).pipe(
    catchError((error) => of(exportSignal(exception(errorToMessage(error)))))
  ))
)

export const displayExportExceptionEpic = createDisplayExceptionsEpic(exportSignal)
