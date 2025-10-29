import React from 'react'
import type { EntitlementCardProps } from '../types/entitlementTypes'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const EntitlementCard: React.FC<EntitlementCardProps> = ({ entitlement }) => {
  const { type, color, used, total, pending, available, checkEntitlement } = entitlement
  const year = dayjs().year()

  if (checkEntitlement === false) {
    return (
      <div className="gba:entitlementCard gba:entitlementCard--simple" data-testid="entitlement-card-simple">
        <span
          className="gba:entitlementSimpleTitle"
          data-testid="entitlement-title-simple"
          style={{
            borderLeft: `4px solid ${color ? (color.startsWith('#') ? color : `#${color}`) : 'var(--nw-chart-2)'}`
          }}
        >
          {type}
        </span>
        <div className="gba:entitlementSimpleRight">
          <div className="gba:entitlementSimpleValue" data-testid="entitlement-value-simple">
            {used}
          </div>

          <div className="gba:entitlementSimpleYear" data-testid="entitlement-year-simple">
            {getTranslationFromI18nKeyAndLabel(
              used === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days',
              used === 1 ? 'day' : 'days'
            )}{' '}
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.used', 'used')}{' '}
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.in_year', `in ${year}`, { year })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:entitlementCard" data-testid="entitlement-card">
      <div className="gba:entitlementCardHeader">
        <span className="gba:entitlementTitle">{type}</span>
        <span className="gba:entitlementHeaderSummary">
          <span className="gba:entitlementHeaderUsed">
            {used}/{total}{' '}
            {getTranslationFromI18nKeyAndLabel(
              used === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days',
              used === 1 ? 'day' : 'days'
            )}{' '}
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.used', 'used')}
          </span>
          {pending !== undefined && (
            <span className="gba:entitlementHeaderPending">
              {pending}{' '}
              {getTranslationFromI18nKeyAndLabel(
                pending === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days',
                pending === 1 ? 'day' : 'days'
              )}{' '}
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.pending', 'pending')}
            </span>
          )}
        </span>
      </div>
      <div className="gba:entitlementProgressBar">
        <div className="gba:entitlementProgressBarFill" style={{ width: `${(used! / total!) * 100}%` }} />
      </div>
      <div className="gba:entitlementCardDetails">
        <span
          className="gba:entitlementUsedTotal"
          style={used && used > 0 ? { color: 'var(--nw-success)' } : { color: 'var(--nw-foreground)' }}
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.used', 'used')}: {used}{' '}
          {getTranslationFromI18nKeyAndLabel(
            used === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days',
            used === 1 ? 'day' : 'days'
          )}
        </span>
        {pending !== undefined ? (
          <span className="gba:entitlementPending">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.pending', 'pending')}: {pending}{' '}
            {getTranslationFromI18nKeyAndLabel(
              pending === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days',
              pending === 1 ? 'day' : 'days'
            )}
          </span>
        ) : (
          <span />
        )}
        {typeof available === 'number' ? (
          <span className="gba:entitlementAvailable">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.available_colon', 'Available:')} {available}{' '}
            {getTranslationFromI18nKeyAndLabel(
              available === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days',
              available === 1 ? 'day' : 'days'
            )}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}

export default EntitlementCard
