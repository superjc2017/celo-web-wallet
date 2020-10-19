import { BigNumber, Contract, providers } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { getContract } from 'src/blockchain/contracts'
import { CeloContract } from 'src/config'
import { Currency, MAX_EXCHANGE_TOKEN_SIZE } from 'src/consts'
import { fetchBalancesIfStale } from 'src/features/wallet/fetchBalances'
import { Balances } from 'src/features/wallet/walletSlice'
import { isAmountValid } from 'src/utils/amount'
import { logger } from 'src/utils/logger'
import { createMonitoredSaga } from 'src/utils/saga'
import { call } from 'typed-redux-saga'

export interface ExchangeTokenParams {
  amount: number
  fromCurrency: Currency
}

function* exchangeToken(params: ExchangeTokenParams) {
  const balances = yield* call(fetchBalancesIfStale)
  yield* call(_exchangeToken, params, balances)
}

async function _exchangeToken(params: ExchangeTokenParams, balances: Balances) {
  const { amount, fromCurrency } = params
  logger.info(`Exchanging ${amount} ${fromCurrency}`)

  const amountInWei = parseEther('' + amount)
  if (!isAmountValid(amountInWei, params.fromCurrency, balances, MAX_EXCHANGE_TOKEN_SIZE)) {
    // TODO show error
    return
  }

  await approveExchange(amountInWei, fromCurrency)
  await executeExchange(amountInWei, fromCurrency)
}

async function approveExchange(amountInWei: BigNumber, fromCurrency: Currency) {
  const exchange = await getContract(CeloContract.Exchange)

  let tokenContract: Contract
  if (fromCurrency === Currency.cUSD) {
    tokenContract = await getContract(CeloContract.StableToken)
  } else if (fromCurrency === Currency.CELO) {
    tokenContract = await getContract(CeloContract.GoldToken)
  } else {
    throw new Error(`Unsupported currency: ${fromCurrency}`)
  }

  // TODO query for expected exchange rate and set minBuyAmount properly
  const txResponse: providers.TransactionResponse = await tokenContract.approve(
    exchange.address,
    amountInWei
  )
  const txReceipt = await txResponse.wait()
  logger.info(`exchange approval hash received: ${txReceipt.transactionHash}`)
}

async function executeExchange(amountInWei: BigNumber, fromCurrency: Currency) {
  const exchange = await getContract(CeloContract.Exchange)

  // TODO query for expected exchange rate and set minBuyAmount properly
  // TODO exchange method for sell once updated contract is live
  const txResponse: providers.TransactionResponse = await exchange.exchange(
    amountInWei,
    BigNumber.from(10),
    fromCurrency === Currency.CELO
  )
  const txReceipt = await txResponse.wait()
  logger.info(`exchange hash received: ${txReceipt.transactionHash}`)
}

export const {
  wrappedSaga: exchangeTokenSaga,
  reducer: exchangeTokenReducer,
  actions: exchangeTokenActions,
} = createMonitoredSaga<ExchangeTokenParams>(exchangeToken, { name: 'exchangeToken' })