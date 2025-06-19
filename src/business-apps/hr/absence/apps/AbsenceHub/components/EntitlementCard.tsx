import React from "react";
import type { EntitlementCardProps } from "../types/entitlementTypes";
import dayjs from "dayjs";

const EntitlementCard: React.FC<EntitlementCardProps> = ({ entitlement }) => {
  const { type, color, used, total, pending, available, checkEntitlement } = entitlement;

  if (checkEntitlement === false) {
    return (
      <div
        className="gba:entitlementCard gba:entitlementCard--simple"
        data-testid="entitlement-card-simple"
        
      >
        <span
          className="gba:entitlementSimpleTitle"
          data-testid="entitlement-title-simple"
          style={{
            borderLeft: `4px solid ${
              color ? (color.startsWith("#") ? color : `#${color}`) : "#a78bfa"
            }`,
          }}
        >
          {type}
        </span>
        <div className="gba:entitlementSimpleRight">
          <div
            className="gba:entitlementSimpleValue"
            data-testid="entitlement-value-simple"
          >
            {used}
          </div>

          <div
            className="gba:entitlementSimpleYear"
            data-testid="entitlement-year-simple"
          >
            {used === 1 ? "day" : "days"} reported in {dayjs().year()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gba:entitlementCard" data-testid="entitlement-card">
      <div className="gba:entitlementCardHeader">
        <span className="gba:entitlementTitle">{type}</span>
        <span className="gba:entitlementHeaderSummary">
          <span className="gba:entitlementHeaderUsed">
            {used}/{total} {used === 1 ? "day" : "days"} used
          </span>
          {pending !== undefined && (
            <span className="gba:entitlementHeaderPending">
              {pending} {pending === 1 ? "day" : "days"} pending
            </span>
          )}
        </span>
      </div>
      <div className="gba:entitlementProgressBar">
        <div
          className="gba:entitlementProgressBarFill"
          style={{ width: `${(used! / total!) * 100}%` }}
        />
      </div>
      <div className="gba:entitlementCardDetails">
        <span className="gba:entitlementUsedTotal">
          Used: {used} {used === 1 ? "day" : "days"}
        </span>
        {pending !== undefined ? (
          <span className="gba:entitlementPending">
            Pending: {pending} {pending === 1 ? "day" : "days"}
          </span>
        ) : (
          <span />
        )}
        {typeof available === "number" ? (
          <span className="gba:entitlementAvailable">
            Available: {available} {available === 1 ? "day" : "days"}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
};

export default EntitlementCard;
