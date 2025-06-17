import React from 'react';
import '../styles/entitlementCard.css';
import type { EntitlementCardProps } from '../types/entitlementTypes';

const EntitlementCard: React.FC<EntitlementCardProps> = ({ entitlement }) => {
  const {
    type,
    color,
    used,
    total,
    pending,
    available,
    year,
    icon
  } = entitlement;

  // Card with just a used number (no total, no pending):
  if (typeof used === 'number' && total === undefined && pending === undefined) {
    return (
      <div className="gba:entitlementCard" data-testid="entitlement-card">
        <div className="gba:entitlementCardHeader">
          {icon && <span className={`gba:entitlementIcon gba:entitlementIcon--${color}`}>{icon}</span>}
          <span className="gba:entitlementTitle">{type}</span>
          <span className="gba:entitlementRightNumber">{used}</span>
        </div>
        <div className="gba:entitlementYear" style={{ marginTop: 2 }}>{year ? `days reported in ${year}` : ''}</div>
      </div>
    );
  }

  // Card with used/total/pending (progress bar):
  return (
    <div className="gba:entitlementCard" data-testid="entitlement-card">
      <div className="gba:entitlementCardHeader">
        {icon && <span className={`gba:entitlementIcon gba:entitlementIcon--${color}`}>{icon}</span>}
        <span className="gba:entitlementTitle">{type}</span>
        <span className="gba:entitlementHeaderSummary">
          <span className="gba:entitlementHeaderUsed">{used}/{total} days used</span>
          {pending !== undefined && <span className="gba:entitlementHeaderPending">{pending} days pending</span>}
        </span>
      </div>
      <div className="gba:entitlementProgressBar">
        <div className="gba:entitlementProgressBarFill" style={{ width: `${(used! / total!) * 100}%` }} />
      </div>
      <div className="gba:entitlementCardDetails">
        <span className="gba:entitlementUsedTotal">Used: {used} days</span>
        {pending !== undefined ? (
          <span className="gba:entitlementPending">Pending: {pending} days</span>
        ) : <span />}
        {typeof available === 'number' ? (
          <span className="gba:entitlementAvailable">Available: {available} days</span>
        ) : <span />}
      </div>
    </div>
  );
};

export default EntitlementCard;
