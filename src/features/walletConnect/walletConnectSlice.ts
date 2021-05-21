import { createAction, createSlice } from '@reduxjs/toolkit'
import type { SessionTypes } from '@walletconnect/types'
import {
  SessionStatus,
  WalletConnectSession,
  WalletConnectStatus,
} from 'src/features/walletConnect/types'

export const initializeWcClient = createAction<string>('walletConnect/init')
export const proposeWcSession = createAction<SessionTypes.Proposal>('walletConnect/proposeSession')
export const approveWcSession = createAction('walletConnect/approveSession')
export const rejectWcSession = createAction('walletConnect/rejectSession')
export const createWcSession = createAction<SessionTypes.Settled>('walletConnect/createSession')
export const updateWcSession = createAction<SessionTypes.UpdateParams>(
  'walletConnect/updateSession'
)
export const deleteWcSession = createAction<SessionTypes.DeleteParams>(
  'walletConnect/deleteSession'
)
export const failWcSession = createAction<string>('walletConnect/fail')
export const requestFromWc = createAction<SessionTypes.RequestEvent>('walletConnect/requestEvent')
export const approveWcRequest = createAction('walletConnect/approveRequest')
export const rejectWcRequest = createAction('walletConnect/rejectRequest')
export const completeWcRequest = createAction('walletConnect/completeRequest')
export const failWcRequest = createAction<string>('walletConnect/failRequest')
export const disconnectWcClient = createAction('walletConnect/disconnect')
export const resetWcClient = createAction('walletConnect/reset')

// interface PeerMetadata {
//   name: string
// }

interface walletConnectState {
  status: WalletConnectStatus
  uri: string | null
  // peerMetadata: PeerMetadata | null
  session: WalletConnectSession | null
  request: SessionTypes.RequestEvent | null
  error: string | null
}

const walletConnectsInitialState: walletConnectState = {
  status: WalletConnectStatus.Disconnected,
  uri: null,
  // peerMetadata: null,
  session: null,
  request: null,
  error: null,
}

const walletConnectSlice = createSlice({
  name: 'walletConnect',
  initialState: walletConnectsInitialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(initializeWcClient, (state, action) => {
        state.status = WalletConnectStatus.Initializing
        state.uri = action.payload
      })
      .addCase(proposeWcSession, (state, action) => {
        state.status = WalletConnectStatus.SessionPending
        state.session = {
          status: SessionStatus.Pending,
          data: action.payload,
        }
      })
      .addCase(createWcSession, (state, action) => {
        state.status = WalletConnectStatus.SessionActive
        state.session = {
          status: SessionStatus.Settled,
          data: action.payload,
          startTime: Date.now(),
        }
      })
      .addCase(failWcSession, (state, action) => {
        state.status = WalletConnectStatus.Error
        state.error = action.payload
      })
      .addCase(requestFromWc, (state, action) => {
        state.status = WalletConnectStatus.RequestPending
        state.request = action.payload
      })
      .addCase(approveWcRequest, (state) => {
        state.status = WalletConnectStatus.RequestActive
      })
      .addCase(rejectWcRequest, (state) => {
        state.status = WalletConnectStatus.SessionActive
      })
      .addCase(completeWcRequest, (state) => {
        state.status = WalletConnectStatus.SessionActive
        state.request = null
      })
      .addCase(failWcRequest, (state, action) => {
        state.status = WalletConnectStatus.RequestFailed
        state.error = action.payload
      })
      .addCase(disconnectWcClient, (state) => {
        if (state.status !== WalletConnectStatus.Error) {
          return walletConnectsInitialState
        } else {
          // Preserve error for displaying to user
          return {
            ...walletConnectsInitialState,
            status: state.status,
            error: state.error,
          }
        }
      })
      .addCase(resetWcClient, () => walletConnectsInitialState)
  },
})

// export const {
//   pairWalletConnect,
//   closeWalletConnect,
//   sessionRequestReceived,
// } = walletConnectSlice.actions

export const walletConnectReducer = walletConnectSlice.reducer
