import React from 'react';
import { formatDate } from '@/common/utils/windowUtils';
import { useTranslation } from 'react-i18next';
import { ICONS } from '../../../utils/icons';

interface PlanCardProps {
  plan: {
    id: string;
    planType: string;
    title: string;
    creationDate: string;
    tripStart?: string;
    tripEnd?: string;
    tripInterval?: string;
    paymentAmount?: string | number;
    paymentCurrency?: string;
    planAmount: string | number;
    planCurrency: string;
  };
  onClick?: () => void;
  selectable?: boolean;
}

/**
 * PlanCard component to display expense plan information
 */
const PlanCard: React.FC<PlanCardProps> = ({ plan, onClick, selectable = true }) => {
  const {
    planType,
    title,
    creationDate,
    tripInterval,
    paymentAmount,
    paymentCurrency,
    planAmount,
    planCurrency
  } = plan;

  const {t} = useTranslation();
  
  const formattedCreationDate = creationDate ? formatDate(creationDate, 'date.long') : t('lowcoder:expense_summary_request.no_creation_date', 'No creation date');

  const iconPath = planType === 'TRIP' ? ICONS.TRIP_ICON : ICONS.RECEIPT_ICON;
  const iconTitle = planType === 'TRIP' ? 'Trip' : 'Expense';

  const handleClick = () => {
    if (selectable && onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={`gba:planCard ${selectable ? 'gba:planCardSelectable' : ''}`} 
      data-testid={`plan-card-${plan.id}`}
      onClick={handleClick}
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
    >
      <div className="gba:planCardHeader" data-testid="plan-card-header">
        <div className="gba:planCardIcon" data-testid="plan-card-icon-container">
          <img 
            src={`${iconPath}`} 
            alt={iconTitle} 
            width="20" 
            height="20"
            data-testid="plan-card-icon-image"
          />
        </div>
        <span className="gba:planCardType" data-testid="plan-card-type">{iconTitle}</span>
      </div>
      
      <div className="gba:planCardContent" data-testid="plan-card-content">
        <div className="gba:planCardTitle" data-testid="plan-card-title-container">
          <span className="gba:planCardTitleText" data-testid="plan-card-title">{title || t('lowcoder:expense_item_request_card.no_title', 'No Title')}</span>
          {tripInterval && (
            <span className="gba:planCardInterval" data-testid="plan-card-interval">{tripInterval}</span>
          )}
        </div>
        
        <div className="gba:planCardFooter" data-testid="plan-card-footer">
          <span className="gba:planCardCreationDate" data-testid="plan-card-creation-date">
            {t('lowcoder:expense_item_request_card.created','Created')}: {formattedCreationDate}
          </span>
          
          {paymentAmount ? (
            <div className="gba:planCardPayment" data-testid="plan-card-payment">
              <div className="gba:planCardPaymentIcon" data-testid="plan-card-payment-icon-container">
                <div 
                  className="gba:handCoinIcon" 
                  style={{ 
                    background: `url('${ICONS.HAND_COIN_ICON}') no-repeat center`,
                    backgroundSize: 'contain'
                  }}
                  data-testid="plan-card-hand-coin-icon"
                />
              </div>
              <span className="gba:planCardPaymentAmount" data-testid="plan-card-payment-amount">
                {paymentAmount} {paymentCurrency}
              </span>
            </div>
          ) : (
            <div className="gba:planCardPaymentEmpty" data-testid="plan-card-payment-empty"></div>
          )}
          
          <span className="gba:planCardAmount" data-testid="plan-card-amount">
            {planAmount || '0'} {planCurrency || 'EUR'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlanCard;
