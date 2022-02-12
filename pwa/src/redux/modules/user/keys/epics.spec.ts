import { createStore, Store } from '@reduxjs/toolkit'
import { assert, expect } from 'chai'
import { deepEqual, instance, mock, objectContaining, when } from 'ts-mockito'
import { container } from 'tsyringe'
import { ADMINISTRATION_API_TOKEN } from '@/api/api_di'
import {
  AdministrationApi,
  ServiceCreateKeyResponse,
  ServiceUpdateKeyResponse,
  ServiceDeleteKeyResponse,
  ServiceElectShadowResponse
} from '@/api/definitions'
import { SodiumClient } from '@/cryptography/sodium_client'
import { UidService, UID_SERVICE_TOKEN } from '@/cryptography/uid_service'
import { SESSION_TOKEN_HEADER_NAME } from '@/headers'
import { Key } from '@/redux/domain'
import { indicator, success } from '@/redux/flow_signal'
import {
  authnViaDepotSignal,
  registrationSignal,
  remoteAuthnComplete
} from '@/redux/modules/authn/actions'
import { RootAction } from '@/redux/root_action'
import { reducer, RootState } from '@/redux/root_reducer'
import { drainEpicActions, EpicTracker, setUpEpicChannels } from '@/redux/testing'
import { createRegistrationFlowResult, createUserKey } from '@/redux/testing/domain'
import { SequentialFakeUidService } from '@/redux/testing/services'
import {
  cancelShadow,
  cliqueAdjunction,
  cliqueIntegrationSignal,
  cliqueObliterationSignal,
  cliqueOrder,
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
  userKeysUpdate
} from './actions'
import {
  cliqueAdjunctionEpic,
  cliqueOrderEpic,
  creationEpic,
  deletionEpic,
  inheritKeysFromAuthnDataEpic,
  shadowDigestionEpic,
  shadowElectionEpic,
  updationEpic,
  userKeysUpdateEpic
} from './epics'

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
    when(mockAdministrationApi.createKey(
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
    when(mockAdministrationApi.updateKey(
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
    when(mockAdministrationApi.deleteKey(
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
    remoteAuthnComplete({
      username: 'username',
      password: 'password',
      parametrization: 'parametrization',
      encryptionKey: 'encryptionKey',
      sessionKey: 'sessionKey',
      featurePrompts: [],
      mailVerificationRequired: false,
      mail: 'mail@example.com',
      userKeys,
      isOtpEnabled: false,
      otpToken: null
    }),
    authnViaDepotSignal(success({
      username: 'username',
      password: 'password',
      userKeys,
      depotKey: 'depotKey'
    }))
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
    when(mockAdministrationApi.electShadow(
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

describe('cliqueOrderEpic', () => {
  it('sorts on `emplace`', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const shadow = createUserKey({
      identifier: 'shadow',
      attrs: { isShadow: true },
      tags: ['a', 'a']
    })
    const sample = createUserKey({
      identifier: 'sample',
      tags: ['b', 'a']
    })
    store.dispatch(creationSignal(
      success(shadow), { uid: 'create-shadow', clique: 'x' }
    ))
    store.dispatch(creationSignal(
      success(sample), { uid: 'create-sample', clique: 'y' }
    ))
    assert.deepEqual(
      store.getState().user.keys.userKeys.map((key) => key.identifier),
      [sample.identifier, shadow.identifier]
    )
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(cliqueOrderEpic(action$, state$, {}))
    actionSubject.next(emplace([sample, shadow]))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      cliqueOrder(['x', 'y'])
    ])
  })
})

describe('cliqueAdjunctionEpic', () => {
  it('emits on successful creation', async () => {
    const store: Store<RootState, RootAction> = createStore(reducer)
    const { action$, actionSubject, state$ } = setUpEpicChannels(store)

    const epicTracker = new EpicTracker(cliqueAdjunctionEpic(action$, state$, {}))
    actionSubject.next(creationSignal(
      success(createUserKey({ identifier: 'id' })),
      { uid: 'random', clique: 'clique' }
    ))
    actionSubject.complete()
    await epicTracker.waitForCompletion()

    expect(await drainEpicActions(epicTracker)).to.deep.equal([
      cliqueAdjunction('clique')
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
