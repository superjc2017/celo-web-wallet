import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from 'src/app/rootReducer'
import { Button } from 'src/components/Button'
import ArrowBackIcon from 'src/components/icons/arrow_back_white.svg'
import ExchangeIcon from 'src/components/icons/exchange_white.svg'
import QuestionIcon from 'src/components/icons/question_mark.svg'
import { Box } from 'src/components/layout/Box'
import { useModal } from 'src/components/modal/useModal'
import { MoneyValue } from 'src/components/MoneyValue'
import { Notification } from 'src/components/Notification'
import { Currency } from 'src/consts'
import { exchangeCanceled, exchangeSent } from 'src/features/exchange/exchangeSlice'
import { exchangeTokenActions } from 'src/features/exchange/exchangeToken'
import { estimateFeeActions } from 'src/features/fees/estimateFee'
import { useFee } from 'src/features/fees/utils'
import { TransactionType } from 'src/features/types'
import { Color } from 'src/styles/Color'
import { Stylesheet } from 'src/styles/types'
import { useExchangeValues } from 'src/utils/amount'
import { SagaStatus } from 'src/utils/saga'

export function ExchangeConfirmationScreen() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { transaction: tx, toCELORate, transactionError: txnError } = useSelector(
    (state: RootState) => state.exchange
  )

  useEffect(() => {
    if (!tx) {
      return
    }
    const approveType =
      tx.fromCurrency === Currency.CELO
        ? TransactionType.CeloTokenApprove
        : TransactionType.StableTokenApprove
    dispatch(
      estimateFeeActions.trigger({
        preferredCurrency: tx.fromCurrency,
        txs: [{ type: approveType }, { type: TransactionType.TokenExchange }],
      })
    )
  }, [tx])

  // TODO show totalIn as shown in new designs
  const { total: totalIn, feeAmount, feeCurrency, feeEstimates } = useFee(tx?.amountInWei, 2)

  const { from, to, rate } = useExchangeValues(tx?.amountInWei, tx?.fromCurrency, toCELORate, true)

  const { status: sagaStatus, error: sagaError } = useSelector(
    (state: RootState) => state.saga.exchangeToken
  )
  const isWorking = sagaStatus === SagaStatus.Started

  //-- need to make sure we belong on this screen
  useEffect(() => {
    if (!tx) {
      navigate('/exchange')
    }
  }, [tx])

  async function onGoBack() {
    dispatch(exchangeTokenActions.reset())
    dispatch(exchangeCanceled())
    navigate(-1)
  }

  async function onExchange() {
    if (!tx || !feeEstimates) return
    dispatch(exchangeTokenActions.trigger({ ...tx, feeEstimates }))
  }

  const { showModal, showWorkingModal, showErrorModal } = useModal()

  const confirm = async () => {
    await showModal('Exchange Succeeded', 'Your exchange has been completed successfully')
    dispatch(exchangeTokenActions.reset())
    dispatch(exchangeSent())
    navigate('/')
  }

  const failure = async (error: string | undefined) => {
    await showErrorModal('Exchange Failed', 'Your exchange could not be processed', error)
  }

  useEffect(() => {
    if (sagaStatus === SagaStatus.Started) void showWorkingModal('Making exchange...')
    else if (sagaStatus === SagaStatus.Success) void confirm()
    else if (sagaStatus === SagaStatus.Failure) void failure(sagaError?.toString())
  }, [sagaStatus, sagaError])

  if (!tx) return null

  return (
    <Box direction="column" styles={style.contentContainer}>
      {txnError && <Notification message={txnError.toString()} color={Color.borderError} />}

      <h1 css={style.title}>Review Exchange</h1>

      <Box direction="row" styles={style.inputRow} align="end">
        <label css={style.inputLabel}>Amount</label>
        <MoneyValue amountInWei={from.weiAmount} currency={from.currency} baseFontSize={1.2} />
      </Box>

      <Box direction="row" align="end" styles={style.inputRow}>
        <label css={style.inputLabel}>Current Rate</label>
        <MoneyValue amountInWei={rate.weiBasis} currency={from.currency} baseFontSize={1.2} />
        <span css={style.valueText}>to</span>
        <MoneyValue amountInWei={rate.weiRate} currency={to.currency} baseFontSize={1.2} />
      </Box>

      <Box direction="row" styles={style.inputRow} align="end">
        <label css={style.inputLabel}>Security Fee</label>
        {feeAmount && feeCurrency ? (
          <Box direction="row" align="end">
            <MoneyValue amountInWei={feeAmount} currency={feeCurrency} baseFontSize={1.2} />
            <img src={QuestionIcon} css={style.iconRight} />
          </Box>
        ) : (
          // TODO a proper loader (need to update mocks)
          <div>Loading...</div>
        )}
      </Box>

      <Box direction="row" styles={style.inputRow} align="end">
        <label css={{ ...style.inputLabel, fontWeight: 'bolder' }}>Total</label>
        <MoneyValue amountInWei={to.weiAmount} currency={to.currency} baseFontSize={1.2} />
      </Box>

      {isWorking && (
        <Box direction="row" styles={style.inputRow}>
          <label css={style.valueText}>Working...</label>
        </Box>
      )}

      <Box direction="row" justify="start">
        <Button
          type="button"
          onClick={onGoBack}
          size="m"
          icon={ArrowBackIcon}
          color={Color.primaryGrey}
          disabled={isWorking}
          margin="0 1em 0 0"
        >
          Edit Exchange
        </Button>
        <Button
          type="button"
          onClick={onExchange}
          size="m"
          icon={ExchangeIcon}
          disabled={isWorking}
        >
          Make Exchange
        </Button>
      </Box>
    </Box>
  )
}

const style: Stylesheet = {
  contentContainer: {
    height: '100%',
    paddingLeft: '4em',
    paddingTop: '2em',
    width: '100%',
  },
  title: {
    color: Color.accentBlue,
    fontWeight: 400,
    fontSize: '2em',
    marginTop: 0,
    marginBottom: '1em',
  },
  inputRow: {
    marginBottom: '2em',
  },
  inputLabel: {
    fontWeight: 300,
    fontSize: '1.1em',
    width: '6em',
    marginRight: '1em',
  },
  valueText: {
    fontSize: '1.2em',
    fontWeight: 400,
    color: Color.primaryGrey,
    margin: '0 0.5em',
  },
}
