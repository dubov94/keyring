import { function as fn, monoid, option, predicate } from 'fp-ts'
import { Epic } from 'redux-observable'
import { EMPTY, from, Observable, of, concat } from 'rxjs'
import { filter, map, switchMap, withLatestFrom, catchError } from 'rxjs/operators'
import { isActionOf } from 'typesafe-actions'
import { getSodiumClient, MasterKeyDerivatives } from '@/cryptography/sodium_client'
import { getWebAuthn } from '@/cryptography/web_authn'
import { createDisplayExceptionsEpic } from '@/redux/exceptions'
import { cancel, errorToMessage, exception, indicator, isActionSuccess, success } from '@/redux/flow_signal'
import { AuthnInputKind, authnViaDepotSignal, registrationSignal, remoteAuthnComplete } from '@/redux/modules/authn/actions'
import { showToast } from '@/redux/modules/ui/toast/actions'
import { masterKeyChangeSignal, otpParamsAcceptanceSignal, otpResetSignal, remoteRehashSignal, usernameChangeSignal } from '@/redux/modules/user/account/actions'
import { userKeysUpdate } from '@/redux/modules/user/keys/actions'
import { data } from '@/redux/remote_data'
import { RootAction } from '@/redux/root_action'
import { RootState } from '@/redux/root_reducer'
import {
  generateDepotKeys,
  depotActivationData,
  newEncryptedOtpToken,
  newVault,
  toggleWebAuthn,
  webAuthnInterruption,
  webAuthnSignal,
  WebAuthnFlowIndicator,
  webAuthnResult,
  webAuthnRequest,
  WebAuthn,
  newWebAuthnLocalDerivatives,
  newWebAuthnRemoteDerivatives
} from './actions'

export const updateVaultEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(monoid.concatAll(predicate.getMonoidAny<RootAction>())([
    isActionOf(depotActivationData),
    isActionOf(userKeysUpdate)
  ])),
  withLatestFrom(state$),
  switchMap(([, state]) => fn.pipe(
    option.fromNullable(state.depot.depotKey),
    option.map((depotKey) => from(getSodiumClient().encryptString(
      depotKey,
      JSON.stringify(state.user.keys.userKeys.filter((userKey) => !userKey.attrs.isShadow))
    )).pipe(map((vault) => newVault(vault)))),
    option.getOrElse<Observable<RootAction>>(() => EMPTY)
  ))
)

export const updateEncryptedOtpTokenEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(monoid.concatAll(predicate.getMonoidAny<RootAction>())([
    isActionOf(depotActivationData),
    isActionOf(remoteAuthnComplete),
    isActionSuccess(otpParamsAcceptanceSignal),
    isActionSuccess(otpResetSignal)
  ])),
  withLatestFrom(state$),
  switchMap(([, state]) => fn.pipe(
    option.fromNullable(state.depot.depotKey),
    option.map((depotKey) => fn.pipe(
      option.fromNullable(state.user.account.otpToken),
      option.map((otpToken) => from(getSodiumClient().encryptString(depotKey, otpToken))),
      option.getOrElse<Observable<string | null>>(() => of(null))
    )),
    option.map((observable: Observable<string | null>) => observable.pipe(
      map((value) => newEncryptedOtpToken(value))
    )),
    option.getOrElse<Observable<RootAction>>(() => EMPTY)
  ))
)

export const generateDepotKeysEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionOf(generateDepotKeys)),
  switchMap((action) => from(getSodiumClient().generateNewParametrization()).pipe(switchMap((parametrization) => {
    return from(getSodiumClient().computeAuthDigestAndEncryptionKey(parametrization, action.payload.password)).pipe(
      switchMap(({ authDigest, encryptionKey }) => of(depotActivationData({
        username: action.payload.username,
        salt: parametrization,
        hash: authDigest,
        depotKey: encryptionKey
      })))
    )
  })))
)

export const localRehashEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionSuccess(authnViaDepotSignal)),
  withLatestFrom(state$),
  switchMap(([action, state]) => {
    const { credentials } = state.depot
    if (credentials === null) {
      return EMPTY
    }
    if (getSodiumClient().isParametrizationUpToDate(credentials.salt)) {
      return EMPTY
    }
    const { username, authnInput } = action.payload.data
    if (authnInput.kind === AuthnInputKind.PASSWORD) {
      const { password } = authnInput
      return of(generateDepotKeys({ username, password }))
    }
    if (authnInput.kind === AuthnInputKind.WEB_AUTHN) {
      return of(toggleWebAuthn(false))
    }
    const { kind } = authnInput
    return of(showToast({ message: `Unsupported \`AuthnInputKind\`: ${kind}` }))
  })
)

export const usernameChangeEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  filter(isActionSuccess(usernameChangeSignal)),
  // `PublicKeyCredential.signalCurrentUserDetails` eventually.
  map(() => toggleWebAuthn(false))
)

export const masterKeyUpdateEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionSuccess(masterKeyChangeSignal)),
  withLatestFrom(state$),
  switchMap(([action, state]) => {
    const { credentials } = state.depot
    if (credentials === null) {
      return EMPTY
    }
    return of(generateDepotKeys({
      username: credentials.username,
      password: action.payload.data.newMasterKey
    }))
  })
)

export const userCredentialsEpic: Epic<RootAction, RootAction, RootState> = (action$) => action$.pipe(
  switchMap((action) => {
    if (isActionSuccess(registrationSignal)(action)) {
      const { username, password } = action.payload.data
      return of(generateDepotKeys({ username, password }))
    }
    if (isActionOf(remoteAuthnComplete, action)) {
      const { username, authnInput } = action.payload
      if (authnInput.kind === AuthnInputKind.PASSWORD) {
        const { password } = authnInput
        return of(generateDepotKeys({ username, password }))
      }
    }
    return EMPTY
  })
)

export const webAuthnCreationEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([toggleWebAuthn, webAuthnInterruption])),
  withLatestFrom(state$),
  switchMap(([action, state]) => {
    if (isActionOf(webAuthnInterruption, action)) {
      return of(webAuthnSignal(cancel()))
    }
    if (!isActionOf(toggleWebAuthn, action)) {
      return EMPTY
    }
    if (!action.payload) {
      // Credential signalling is taken care of in `redux/index`.
      return of(webAuthnSignal(success(null)))
    }
    const { userId } = state.depot
    if (userId === null) {
      return of(webAuthnSignal(exception('User ID is missing')))
    }
    const { username } = state.session
    if (username === null) {
      return of(webAuthnSignal(exception('Username is missing')))
    }
    return concat(
      of(webAuthnSignal(indicator(WebAuthnFlowIndicator.WORKING))),
      from(getWebAuthn().createCredential(userId, username)).pipe(
        switchMap(({ credentialId, prfFirstSalt, prfFirstResult }) => concat(
          of(webAuthnSignal(success({
            credentialId,
            salt: prfFirstSalt
          }))),
          of(webAuthnResult({ result: prfFirstResult }))
        ))
      )
    ).pipe(
      catchError((error) => of(webAuthnSignal(exception(errorToMessage(error)))))
    )
  })
)

export const displayWebAuthnExceptionsEpic = createDisplayExceptionsEpic(webAuthnSignal)

export const webAuthnRetrievalEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([webAuthnRequest, webAuthnInterruption])),
  withLatestFrom(state$),
  switchMap(([action, state]) => {
    if (isActionOf(webAuthnInterruption, action)) {
      return EMPTY
    }
    if (!isActionOf(webAuthnRequest, action)) {
      return EMPTY
    }
    const { credentialId } = action.payload
    const webAuthnData = fn.pipe(data(state.depot.webAuthnData), option.getOrElse<WebAuthn | null>(() => null))
    if (webAuthnData === null) {
      return of(showToast({ message: '`webAuthnData` is not available' }))
    }
    if (webAuthnData.credentialId !== credentialId) {
      return of(showToast({ message: 'WebAuthn `credentialId` mismatch' }))
    }
    return from(getWebAuthn().readCredential(credentialId, webAuthnData.salt)).pipe(
      map(({ prfFirstResult }) => webAuthnResult({ result: prfFirstResult })),
      catchError((error) => of(showToast({ message: errorToMessage(error) })))
    )
  })
)

export const webAuthnLocalDerivativesEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(isActionOf([webAuthnResult, depotActivationData])),
  withLatestFrom(state$),
  switchMap(([, state]) => {
    const { credentials, depotKey, webAuthnResult } = state.depot
    if (webAuthnResult === null || credentials === null || depotKey === null) {
      return EMPTY
    }
    const materKeyDerivatives: MasterKeyDerivatives = {
      authDigest: credentials.hash,
      encryptionKey: depotKey
    }
    return from(getSodiumClient().encryptString(webAuthnResult, JSON.stringify(materKeyDerivatives))).pipe(
      map((encryptedWebAuthn) => newWebAuthnLocalDerivatives(encryptedWebAuthn)),
      catchError((error) => of(showToast({ message: errorToMessage(error) })))
    )
  })
)

export const webAuthnRemoteDerivativesEpic: Epic<RootAction, RootAction, RootState> = (action$, state$) => action$.pipe(
  filter(monoid.concatAll(predicate.getMonoidAny<RootAction>())([
    isActionOf(webAuthnResult),
    isActionSuccess(registrationSignal),
    isActionOf(remoteAuthnComplete),
    isActionSuccess(remoteRehashSignal),
    isActionSuccess(masterKeyChangeSignal)
  ])),
  withLatestFrom(state$),
  switchMap(([, state]) => {
    const { webAuthnResult } = state.depot
    const { authDigest, encryptionKey } = state.user.account
    if (webAuthnResult === null || authDigest === null || encryptionKey === null) {
      return EMPTY
    }
    const masterKeyDerivatives: MasterKeyDerivatives = { authDigest, encryptionKey }
    return from(getSodiumClient().encryptString(webAuthnResult, JSON.stringify(masterKeyDerivatives))).pipe(
      map((encryptedWebAuthn) => newWebAuthnRemoteDerivatives(encryptedWebAuthn)),
      catchError((error) => of(showToast({ message: errorToMessage(error) })))
    )
  })
)
