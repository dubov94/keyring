import { createStore, Store } from '@reduxjs/toolkit'
import { assert, expect } from 'chai'
import { deepEqual, instance, mock, objectContaining, when } from 'ts-mockito'
import { container } from 'tsyringe'
import { ADMINISTRATION_API_TOKEN } from '@/api/api_di'
import {
  AdministrationApi,
  ServiceImportKeysResponse,
  ServiceCreateKeyResponse,
  ServiceUpdateKeyResponse,
  ServiceDeleteKeyResponse,
  ServiceElectShadowResponse
} from '@/api/definitions'
import { SodiumClient } from '@/cryptography/sodium_client'
import { UidService, UID_SERVICE_TOKEN } from '@/cryptography/uid_service'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { Key } from '@/redux/domain'
import { exception, failure, indicator, success } from '@/redux/flow_signal'
import {
  authnViaDepotSignal,
  registrationSignal,
  remoteAuthnComplete
} from '@/redux/modules/authn/actions'
import { depotActivationData } from '@/redux/modules/depot/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { drainEpicActions, EpicTracker, setUpEpicChannels } from '@/redux/testing'
import {
  createAuthnViaDepotFlowResult,
  createDepotActivationData,
  createRegistrationFlowResult,
  createRemoteAuthnCompleteResult,
  createUserKey
} from '@/redux/testing/domain'
import { SequentialFakeUidService } from '@/redux/testing/services'
import {
  cancelShadow,
  cliqueAddition,
  cliqueIntegrationSignal,
  cliqueObliterationSignal,
  initialCliqueOrder,
  commitShadow,
  create,
  creationSignal,
  delete_,
  deletionSignal,
  electShadow,
  emplace,
  integrateClique,
  obliterateClique,
  OperationIndicator,
  releaseCliqueLock,
  shadowCommitmentSignal,
  shadowElectionSignal,
  update,
  updationSignal,
  userKeysUpdate,
  importSignal,
  import_,
  export_,
  exportSignal,
  ExportError
} from './actions'
import {
  cliqueAdditionEpic,
  initialCliqueOrderEpic,
  creationEpic,
  deletionEpic,
  inheritKeysFromAuthnDataEpic,
  shadowDigestionEpic,
  shadowElectionEpic,
  updationEpic,
  userKeysUpdateEpic,
  importEpic,
  exportEpic
} from './epics'

describe('importEpic', () => {
  it('emits import sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success(createRegistrationFlowResult({}))))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.encryptPassword('encryptionKey', deepEqual({
      value: 'value',
      tags: ['tag']
    }))).thenResolve({
      value: '$value',
      tags: ['$tag']
    })
    when(mockSodiumClient.decryptPassword('encryptionKey', deepEqual({
      value: '$value',
      tags: ['$tag']
    }))).thenResolve({
      value: 'value',
      tags: ['tag']
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.administrationImportKeys(
      deepEqual({
        passwords: [{
          value: '$value',
          tags: ['$tag']
        }]
      }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceImportKeysResponse>{
      keys: [{
        identifier: 'identifier',
        attrs: { isShadow: false, parent: '' },
        password: {
          value: '$value',
          tags: ['$tag']
        },
        creationTimeInMillis: '1'
      }]
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(importEpic(action$, state$, {}))
    actionSubject.next(import_([{
      value: 'value',
      tags: ['tag']
    }]))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      importSignal(indicator(OperationIndicator.WORKING)),
      importSignal(success([{
        identifier: 'identifier',
        attrs: { isShadow: false, parent: '' },
        value: 'value',
        tags: ['tag'],
        creationTimeInMillis: 1
      }]))
    ])
  })

  it('does not get stuck on an empty set of passwords', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success(createRegistrationFlowResult({}))))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.administrationImportKeys(
      deepEqual({ passwords: [] }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceImportKeysResponse>{ keys: [] })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(importEpic(action$, state$, {}))
    actionSubject.next(import_([]))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      importSignal(indicator(OperationIndicator.WORKING)),
      importSignal(success([]))
    ])
  })
})

describe('creationEpic', () => {
  it('emits creation sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success(createRegistrationFlowResult({}))))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.encryptPassword('encryptionKey', objectContaining({
      value: 'value',
      tags: ['tag']
    }))).thenResolve({
      value: '$value',
      tags: ['$tag']
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.administrationCreateKey(
      deepEqual({
        attrs: { isShadow: true, parent: 'parent' },
        password: {
          value: '$value',
          tags: ['$tag']
        }
      }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceCreateKeyResponse>{
      identifier: 'identifier',
      creationTimeInMillis: '1'
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(creationEpic(action$, state$, {}))
    actionSubject.next(create({
      attrs: { isShadow: true, parent: 'parent' },
      value: 'value',
      tags: ['tag']
    }, { uid: 'random', clique: 'clique' }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      creationSignal(
        indicator(OperationIndicator.WORKING),
        { uid: 'random', clique: 'clique' }
      ),
      creationSignal(success({
        identifier: 'identifier',
        attrs: { isShadow: true, parent: 'parent' },
        value: 'value',
        tags: ['tag'],
        creationTimeInMillis: 1
      }), { uid: 'random', clique: 'clique' })
    ])
  })
})

describe('updationEpic', () => {
  it('emits updation sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success(createRegistrationFlowResult({}))))
    store.dispatch(creationSignal(success(createUserKey({
      identifier: 'identifier',
      creationTimeInMillis: 1
    })), { uid: 'create-identifier', clique: 'clique' }))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockSodiumClient = mock(SodiumClient)
    when(mockSodiumClient.encryptPassword('encryptionKey', objectContaining({
      value: 'value',
      tags: ['tag']
    }))).thenResolve({
      value: '$value',
      tags: ['$tag']
    })
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.administrationUpdateKey(
      deepEqual({
        key: {
          identifier: 'identifier',
          password: {
            value: '$value',
            tags: ['$tag']
          }
        }
      }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceUpdateKeyResponse>{})
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(updationEpic(action$, state$, {}))
    actionSubject.next(update({
      identifier: 'identifier',
      value: 'value',
      tags: ['tag']
    }, { uid: 'random' }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      updationSignal(indicator(OperationIndicator.WORKING), { uid: 'random' }),
      updationSignal(success(createUserKey({
        identifier: 'identifier',
        value: 'value',
        tags: ['tag'],
        creationTimeInMillis: 1
      })), { uid: 'random' })
    ])
  })
})

describe('deletionEpic', () => {
  it('emits deletion sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success(createRegistrationFlowResult({}))))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.administrationDeleteKey(
      deepEqual({ identifier: 'identifier' }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceDeleteKeyResponse>{})
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(deletionEpic(action$, state$, {}))
    actionSubject.next(delete_({ identifier: 'identifier' }, { uid: 'random' }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      deletionSignal(indicator(OperationIndicator.WORKING), { uid: 'random' }),
      deletionSignal(success('identifier'), { uid: 'random' })
    ])
  })
})

describe('inheritKeysFromAuthnDataEpic', () => {
  const userKeys: Key[] = [createUserKey({
    identifier: 'identifier',
    value: 'value',
    tags: ['tag']
  })]

  ;[
    remoteAuthnComplete(createRemoteAuthnCompleteResult({
      userKeys
    })),
    authnViaDepotSignal(success(createAuthnViaDepotFlowResult({})))
  ].forEach((trigger) => {
    it(`emits \`emplace\` on ${trigger.type}`, async () => {
      const store: Store<RootState, RootAction> = createStore(reducer)
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)

      const epicTracker = new EpicTracker(inheritKeysFromAuthnDataEpic(action$, state$, {}))
      actionSubject.next(trigger)
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(await drainEpicActions(epicTracker)).to.deep.equal([
        emplace(userKeys)
      ])
    })
  })
})

describe('userKeysUpdateEpic', () => {
  ;[
    emplace([createUserKey({
      identifier: '1',
      value: 'value'
    })]),
    importSignal(success([
      createUserKey({
        identifier: '1',
        value: 'value'
      })
    ])),
    creationSignal(success(createUserKey({
      identifier: '1',
      value: 'value'
    })), { uid: 'random', clique: 'clique' }),
    updationSignal(success(createUserKey({
      identifier: '1',
      value: 'value'
    })), { uid: 'random' }),
    deletionSignal(success('2'), { uid: 'random' }),
    shadowElectionSignal(success({
      origin: 'shadow',
      result: createUserKey({ identifier: 'parent' }),
      obsolete: ['shadow']
    }), { uid: 'random' })
  ].forEach((trigger) => {
    it(`emits an update on ${trigger.type}`, async () => {
      const userKeys: Key[] = [createUserKey({
        identifier: '1',
        value: 'value'
      })]
      const store: Store<RootState, RootAction> = createStore(reducer)
      store.dispatch(emplace(userKeys))
      const { action$, actionSubject, state$ } = setUpEpicChannels(store)

      const epicTracker = new EpicTracker(userKeysUpdateEpic(action$, state$, {}))
      actionSubject.next(trigger)
      actionSubject.complete()
      await epicTracker.waitForCompletion()

      expect(await drainEpicActions(epicTracker)).to.deep.equal([userKeysUpdate(userKeys)])
    })
  })
})

describe('shadowElectionEpic', () => {
  it('emits election sequence', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(registrationSignal(success(createRegistrationFlowResult({}))))
    store.dispatch(creationSignal(
      success(createUserKey({
        identifier: 'shadow',
        attrs: { isShadow: true },
        value: 'value'
      })),
      { uid: 'create-shadow', clique: 'clique' }
    ))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)
    const mockAdministrationApi: AdministrationApi = mock(AdministrationApi)
    when(mockAdministrationApi.administrationElectShadow(
      deepEqual({ identifier: 'shadow' }),
      deepEqual({ headers: { [SESSION_TOKEN_HEADER_NAME]: 'sessionKey' } })
    )).thenResolve(<ServiceElectShadowResponse>{
      parent: 'parent',
      deletedShadows: ['shadow']
    })
    container.register<AdministrationApi>(ADMINISTRATION_API_TOKEN, {
      useValue: instance(mockAdministrationApi)
    })

    const epicTracker = new EpicTracker(shadowElectionEpic(action$, state$, {}))
    actionSubject.next(electShadow('shadow', { uid: 'random' }))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      shadowElectionSignal(indicator(OperationIndicator.WORKING), { uid: 'random' }),
      shadowElectionSignal(success({
        origin: 'shadow',
        result: createUserKey({
          identifier: 'parent',
          attrs: { isShadow: false },
          value: 'value'
        }),
        obsolete: ['shadow']
      }), { uid: 'random' })
    ])
  })
})

describe('initialCliqueOrderEpic', () => {
  it('lowers & sorts on `emplace`', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const shadow = createUserKey({ identifier: 'shadow', attrs: { isShadow: true }, tags: ['a', 'a'] })
    const sample = createUserKey({ identifier: 'sample', tags: ['c', 'a'] })
    const upper = createUserKey({ identifier: 'upper', tags: ['B'] })
    store.dispatch(creationSignal(success(shadow), { uid: 'create-shadow', clique: 'x' }))
    store.dispatch(creationSignal(success(sample), { uid: 'create-sample', clique: 'y' }))
    store.dispatch(creationSignal(success(upper), { uid: 'create-upper', clique: 'z' }))
    assert.deepEqual(
      store.getState().user.keys.userKeys.map((key) => key.identifier),
      [upper.identifier, sample.identifier, shadow.identifier]
    )
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(initialCliqueOrderEpic(action$, state$, {}))
    actionSubject.next(emplace([upper, sample, shadow]))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      initialCliqueOrder(['x', 'z', 'y'])
    ])
  })
})

describe('cliqueAdditionEpic', () => {
  it('emits on successful creation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(cliqueAdditionEpic(action$, state$, {}))
    actionSubject.next(creationSignal(
      success(createUserKey({ identifier: 'id' })),
      { uid: 'random', clique: 'clique' }
    ))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      cliqueAddition('clique')
    ])
  })
})

describe('shadowDigestionEpic', () => {
  beforeEach(() => {
    container.register<UidService>(UID_SERVICE_TOKEN, {
      useValue: new SequentialFakeUidService()
    })
  })

  it('commits a shadow by creation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(creationSignal(
      success(createUserKey({ identifier: '1' })),
      { uid: 'create-1', clique: 'parent-only' }
    ))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(shadowDigestionEpic(action$, state$, {}))
    actionSubject.next(commitShadow({
      clique: 'parent-only',
      value: 'value',
      tags: ['tag']
    }))
    expect(await epicTracker.nextEmission()).to.deep.equal(create(
      { attrs: { isShadow: true, parent: '1' }, value: 'value', tags: ['tag'] },
      { uid: 'uid-1', clique: 'parent-only' }
    ))
    actionSubject.next(creationSignal(
      success(createUserKey({ identifier: '2', value: 'value', tags: ['tags'] })),
      { uid: 'uid-1', clique: 'parent-only' }
    ))
    expect(await epicTracker.nextEmission()).to.deep.equal(shadowCommitmentSignal(
      success({}), { clique: 'parent-only' }
    ))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      releaseCliqueLock('parent-only')
    )
  })

  it('commits a shadow by updation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(creationSignal(
      success(createUserKey({ identifier: '1', attrs: { isShadow: true } })),
      { uid: 'create-1', clique: 'shadow-only' }
    ))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(shadowDigestionEpic(action$, state$, {}))
    actionSubject.next(commitShadow({
      clique: 'shadow-only',
      value: 'value',
      tags: ['tag']
    }))
    expect(await epicTracker.nextEmission()).to.deep.equal(update(
      { identifier: '1', value: 'value', tags: ['tag'] }, { uid: 'uid-1' }
    ))
    actionSubject.next(updationSignal(
      success(createUserKey({ identifier: '1', value: 'value', tags: ['tag'] })),
      { uid: 'uid-1' }
    ))
    expect(await epicTracker.nextEmission()).to.deep.equal(shadowCommitmentSignal(
      success({}), { clique: 'shadow-only' }
    ))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      releaseCliqueLock('shadow-only')
    )
  })

  it('integrates a clique', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(creationSignal(
      success(createUserKey({ identifier: '1' })),
      { uid: 'create-1', clique: 'parent-with-shadow' }
    ))
    store.dispatch(creationSignal(
      success(createUserKey({
        identifier: '2',
        attrs: { isShadow: true, parent: '1' },
        value: 'value'
      })),
      { uid: 'create-2', clique: 'parent-with-shadow' }
    ))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(shadowDigestionEpic(action$, state$, {}))
    actionSubject.next(integrateClique({ clique: 'parent-with-shadow' }))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      electShadow('2', { uid: 'uid-1' })
    )
    actionSubject.next(shadowElectionSignal(
      success({
        origin: '2',
        result: createUserKey({ identifier: '1', value: 'value' }),
        obsolete: ['2']
      }),
      { uid: 'uid-1' }
    ))
    expect(await epicTracker.nextEmission()).to.deep.equal(cliqueIntegrationSignal(
      success('1'), { clique: 'parent-with-shadow' }
    ))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      releaseCliqueLock('parent-with-shadow')
    )
  })

  it('cancels a shadow when there is no root', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(creationSignal(
      success(createUserKey({ identifier: '1', attrs: { isShadow: true } })),
      { uid: 'create-1', clique: 'shadow-only' }
    ))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(shadowDigestionEpic(action$, state$, {}))
    actionSubject.next(cancelShadow({ clique: 'shadow-only' }))
    expect(await epicTracker.nextEmission()).to.deep.equal(delete_(
      { identifier: '1' }, { uid: 'uid-1' }
    ))
    actionSubject.next(deletionSignal(success('1'), { uid: 'uid-1' }))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      releaseCliqueLock('shadow-only')
    )
  })

  it('cancels shadows when there is a root', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(creationSignal(
      success(createUserKey({ identifier: '1' })),
      { uid: 'create-1', clique: 'parent-with-shadow' }
    ))
    store.dispatch(creationSignal(
      success(createUserKey({
        identifier: '2',
        attrs: { isShadow: true, parent: '1' },
        value: 'value'
      })),
      { uid: 'create-2', clique: 'parent-with-shadow' }
    ))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(shadowDigestionEpic(action$, state$, {}))
    actionSubject.next(cancelShadow({ clique: 'parent-with-shadow' }))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      electShadow('1', { uid: 'uid-1' })
    )
    actionSubject.next(shadowElectionSignal(
      success({
        origin: '1',
        result: createUserKey({ identifier: '1' }),
        obsolete: ['2']
      }),
      { uid: 'uid-1' }
    ))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      releaseCliqueLock('parent-with-shadow')
    )
  })

  it('obliterates a clique', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    store.dispatch(creationSignal(
      success(createUserKey({ identifier: '1' })),
      { uid: 'create-1', clique: 'parent-only' }
    ))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(shadowDigestionEpic(action$, state$, {}))
    actionSubject.next(obliterateClique({ clique: 'parent-only' }))
    expect(await epicTracker.nextEmission()).to.deep.equal(delete_(
      { identifier: '1' }, { uid: 'uid-1' }
    ))
    actionSubject.next(deletionSignal(success('1'), { uid: 'uid-1' }))
    expect(await epicTracker.nextEmission()).to.deep.equal(cliqueObliterationSignal(
      success('1'), { clique: 'parent-only' }
    ))
    expect(await epicTracker.nextEmission()).to.deep.equal(
      releaseCliqueLock('parent-only')
    )
  })
})

describe('exportEpic', () => {
  const configureSodiumClient = (callback: (mock: SodiumClient) => void) => {
    const mockSodiumClient = mock(SodiumClient)
    callback(mockSodiumClient)
    container.register(SodiumClient, {
      useValue: instance(mockSodiumClient)
    })
  }

  const testEpic = async (
    arrangement: RootAction[],
    action: ReturnType<typeof export_>
  ) => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    arrangement.forEach(action => store.dispatch(action))
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(exportEpic(action$, state$, {}))
    actionSubject.next(action)
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    return await drainEpicActions(epicTracker)
  }

  it('fails if remote `targetKey` does not match', async () => {
    configureSodiumClient((mockSodiumClient) => {
      when(mockSodiumClient.computeAuthDigestAndEncryptionKey(
        'parametrization', 'abc'
      )).thenResolve({
        authDigest: 'notAuthDigest',
        encryptionKey: 'notEncryptionKey'
      })
    })

    const emission = await testEpic([
      registrationSignal(success(createRegistrationFlowResult({})))
    ], export_({ password: 'abc' }))

    expect(emission).to.deep.equal([
      exportSignal(indicator(OperationIndicator.WORKING)),
      exportSignal(failure(ExportError.INVALID_PASSWORD))
    ])
  })

  it('succeeds if remote `targetKey` matches', async () => {
    configureSodiumClient((mockSodiumClient) => {
      when(mockSodiumClient.computeAuthDigestAndEncryptionKey(
        'parametrization', 'password'
      )).thenResolve({
        authDigest: 'authDigest',
        encryptionKey: 'encryptionKey'
      })
    })

    const emission = await testEpic([
      registrationSignal(success(createRegistrationFlowResult({})))
    ], export_({ password: 'password' }))

    expect(emission).to.deep.equal([
      exportSignal(indicator(OperationIndicator.WORKING)),
      exportSignal(success([]))
    ])
  })

  it('fails if local `targetKey` does not match', async () => {
    configureSodiumClient((mockSodiumClient) => {
      when(mockSodiumClient.computeAuthDigestAndEncryptionKey(
        'salt', 'abc'
      )).thenResolve({
        authDigest: 'notHash',
        encryptionKey: 'notDepotKey'
      })
    })

    const emission = await testEpic([
      depotActivationData(createDepotActivationData({}))
    ], export_({ password: 'abc' }))

    expect(emission).to.deep.equal([
      exportSignal(indicator(OperationIndicator.WORKING)),
      exportSignal(failure(ExportError.INVALID_PASSWORD))
    ])
  })

  it('succeeds if local `targetKey` matches', async () => {
    configureSodiumClient((mockSodiumClient) => {
      when(mockSodiumClient.computeAuthDigestAndEncryptionKey(
        'salt', 'password'
      )).thenResolve({
        authDigest: 'hash',
        encryptionKey: 'depotKey'
      })
    })

    const emission = await testEpic([
      depotActivationData(createDepotActivationData({}))
    ], export_({ password: 'password' }))

    expect(emission).to.deep.equal([
      exportSignal(indicator(OperationIndicator.WORKING)),
      exportSignal(success([]))
    ])
  })

  it('throws if no `targetKey` is available', async () => {
    const emission = await testEpic([], export_({ password: 'password' }))

    expect(emission).to.deep.equal([
      exportSignal(indicator(OperationIndicator.WORKING)),
      exportSignal(exception('Error: Neither remote nor local `targetKey` is available'))
    ])
  })
})
