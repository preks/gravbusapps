import React from 'react'
import { formatDate } from '@/common/utils/windowUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ICONS } from '../../../utils/icons'
import { PLAN_TYPE_ENUM, DEFAULT_PLAN_CURRENCY_CODE } from '../constants/constants'

interface PlanCardProps {
  plan: {
    id: string
    planType: string
    title: string
    creationDate: string
    tripStart?: string
    tripEnd?: string
    tripInterval?: string
    paymentAmount?: string | number
    paymentCurrency?: string
    planAmount: string | number
    planCurrency: string
  }
  onClick?: () => void
  selectable?: boolean
}

/**
 * PlanCard component to display expense plan information
 */
const PlanCard: React.FC<PlanCardProps> = ({ plan, onClick, selectable = true }) => {
  const { planType, title, creationDate, tripInterval, paymentAmount, paymentCurrency, planAmount, planCurrency } = plan

  const formattedCreationDate = creationDate
    ? formatDate(creationDate, 'date.long')
    : getTranslationFromI18nKeyAndLabel('lowcoder:expense_summary_request.no_creation_date', 'No creation date')

  const iconPath = planType === PLAN_TYPE_ENUM.TRIP ? ICONS.TRIP_ICON : ICONS.RECEIPT_ICON
  const iconTitle = planType === PLAN_TYPE_ENUM.TRIP ? 'Trip' : 'Expense'

  const handleClick = () => {
    if (selectable && onClick) {
      onClick()
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (selectable && onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onClick()
    }
  }

  const CardWrapper = selectable ? 'button' : 'div'

  return (
    <CardWrapper
      type={selectable ? 'button' : undefined}
      className="gba:flex gba:flex-col"
      style={{
        backgroundColor: 'background',
        padding: '16px',
        width: '100%',
        cursor: selectable ? 'pointer' : 'default',
        transition: selectable ? 'all 0.2s ease' : 'none',
        border: 'none',
        textAlign: 'left',
        ...(selectable && {
          ':hover': {
            boxShadow: '0 0 12px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(-2px)'
          },
          ':active': {
            transform: 'translateY(0)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }
        })
      }}
      data-testid={`plan-card-${plan.id}`}
      onClick={selectable ? handleClick : undefined}
      onKeyDown={selectable ? handleKeyDown : undefined}
    >
      <div className="gba:flex gba:items-center" style={{ marginBottom: '12px' }} data-testid="plan-card-header">
        <div
          className="gba:flex gba:items-center"
          style={{ marginRight: '8px' }}
          data-testid="plan-card-icon-container"
        >
          <img src={`${iconPath}`} alt={iconTitle} width="20" height="20" data-testid="plan-card-icon-image" />
        </div>
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'foreground333' }} data-testid="plan-card-type">
          {iconTitle}
        </span>
      </div>

      <div className="gba:flex gba:flex-col" data-testid="plan-card-content">
        <div
          className="gba:flex gba:flex-col"
          style={{ lineHeight: '20px', marginBottom: '16px' }}
          data-testid="plan-card-title-container"
        >
          <span style={{ fontSize: '18px', fontWeight: 500 }} data-testid="plan-card-title">
            {title || getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.no_title', 'No Title')}
          </span>
          {tripInterval && (
            <span
              style={{ fontSize: '14px', fontWeight: 400, color: 'muted-foreground' }}
              data-testid="plan-card-interval"
            >
              {tripInterval}
            </span>
          )}
        </div>

        <div
          className="gba:flex gba:flex-row gba:items-center"
          style={{ lineHeight: '20px', gap: '10px', width: '100%' }}
          data-testid="plan-card-footer"
        >
          <span
            style={{ fontSize: '14px', fontWeight: 'normal', width: '33%', textAlign: 'left', display: 'inline-block' }}
            data-testid="plan-card-creation-date"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.created', 'Created')}:{' '}
            {formattedCreationDate}
          </span>

          {paymentAmount ? (
            <div
              className="gba:flex gba:items-center"
              style={{ gap: '5px', width: '33%', textAlign: 'left' }}
              data-testid="plan-card-payment"
            >
              <div style={{ width: '16px', height: '16px' }} data-testid="plan-card-payment-icon-container">
                <div
                  style={{
                    background: `url('${ICONS.HAND_COIN_ICON}') no-repeat center`,
                    backgroundSize: 'contain',
                    width: '16px',
                    height: '16px',
                    filter:
                      'brightness(0) saturate(100%) invert(43%) sepia(17%) saturate(1570%) hue-rotate(255deg) brightness(89%) contrast(95%)'
                  }}
                  data-testid="plan-card-hand-coin-icon"
                />
              </div>
              <span
                style={{ fontSize: '14px', fontWeight: 'normal', color: 'primary' }}
                data-testid="plan-card-payment-amount"
              >
                {paymentAmount} {paymentCurrency}
              </span>
            </div>
          ) : (
            <div style={{ width: '33%' }} data-testid="plan-card-payment-empty"></div>
          )}

          <span
            style={{ fontSize: '18px', fontWeight: 500, width: '33%', textAlign: 'right', display: 'inline-block' }}
            data-testid="plan-card-amount"
          >
            {planAmount || '0'} {planCurrency || DEFAULT_PLAN_CURRENCY_CODE}
          </span>
        </div>
      </div>
    </CardWrapper>
  )
}

export default PlanCard
