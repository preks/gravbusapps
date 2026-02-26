import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@newwork/nw-design-system'
import { SparkleIcon } from '@phosphor-icons/react'
import type { AbsenceRow } from '../types/personalAbsences'

type TFunction = (key: string) => string

interface EntitlementDisplay {
  type: string
  used: number
  total: number
}

interface BalanceCardProps {
  isLoading: boolean
  displayEntitlements: EntitlementDisplay[]
  otherEntitlements: EntitlementDisplay[]
  pendingRequests: AbsenceRow[]
  ytdAbsentDays: number
  ytdTotalWorkingDays: number
  wellnessInsight: string | null
  wellnessLoading: boolean
  wellnessDataSummary: unknown
  wellnessRequested: boolean
  onRequestWellnessAnalysis: () => void
  t: TFunction
}

export function BalanceCard({
  isLoading,
  displayEntitlements,
  otherEntitlements,
  pendingRequests,
  ytdAbsentDays,
  ytdTotalWorkingDays,
  wellnessInsight,
  wellnessLoading,
  wellnessDataSummary,
  wellnessRequested,
  onRequestWellnessAnalysis,
  t
}: Readonly<BalanceCardProps>) {
  const getInApprovalDays = (entType: string) =>
    pendingRequests.filter(r => r.type === entType).reduce((sum, r) => sum + (r.workingDays ?? 0), 0)

  return (
    <Card>
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:text-base gba:font-semibold">{t('my-balance')}</CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-2">
        {isLoading ? (
          <div className="gba:space-y-2">
            <Skeleton className="gba:h-6 gba:w-full" />
            <Skeleton className="gba:h-6 gba:w-full" />
          </div>
        ) : (
          <>
            <div
              className="gba:grid gba:grid-cols-2 gba:gap-2"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
            >
              {displayEntitlements.map(ent => {
                const inApprovalDays = getInApprovalDays(ent.type)
                const total = ent.total > 0 ? ent.total : 1
                const usedFlex = Math.max(0, ent.used)
                const inApprovalFlex = Math.max(0, inApprovalDays)
                const remainingFlex = Math.max(0, total - usedFlex - inApprovalFlex)
                return (
                  <div
                    key={`display-${ent.type}-${ent.used}-${ent.total}`}
                    className="gba:rounded gba:border gba:px-3 gba:py-2 gba:space-y-1.5"
                    data-testid={`balance-card-entitlement-${ent.type.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    <div className="gba:flex gba:items-center gba:justify-between">
                      <span className="gba:text-sm gba:text-muted-foreground gba:truncate gba:mr-2">{ent.type}</span>
                      <span className="gba:font-semibold gba:whitespace-nowrap">
                        {ent.used}{' '}
                        <span className="gba:text-xs gba:text-muted-foreground gba:font-normal">/ {ent.total}</span>{' '}
                        <span className="gba:text-xs gba:text-muted-foreground gba:font-normal">{t('days')}</span>
                      </span>
                    </div>
                    {inApprovalDays > 0 && (
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {t('in-approval')}: {inApprovalDays} {inApprovalDays === 1 ? t('day') : t('days')}
                      </p>
                    )}
                    <div
                      className="gba:flex gba:h-1.5 gba:w-full gba:overflow-hidden gba:rounded-full gba:bg-muted gba:gap-0"
                      role="progressbar"
                      aria-valuenow={ent.used}
                      aria-valuemin={0}
                      aria-valuemax={total}
                      aria-label={`${ent.type} balance`}
                    >
                      {usedFlex > 0 && (
                        <div
                          className="gba:h-full gba:min-w-0 gba:flex-shrink-0 gba:rounded-l-full gba:bg-info-secondary"
                          style={{ flex: usedFlex }}
                        />
                      )}
                      {inApprovalFlex > 0 && (
                        <div
                          className="gba:h-full gba:bg-warning gba:min-w-0 gba:flex-shrink-0"
                          style={{ flex: inApprovalFlex }}
                        />
                      )}
                      {remainingFlex > 0 && <div className="gba:h-full gba:min-w-0" style={{ flex: remainingFlex }} />}
                    </div>
                  </div>
                )
              })}
              {otherEntitlements.map(ent => (
                <div
                  key={`other-${ent.type}-${ent.used}`}
                  className="gba:flex gba:items-center gba:justify-between gba:rounded gba:border gba:px-3 gba:py-2"
                >
                  <span className="gba:text-sm gba:text-muted-foreground gba:truncate gba:mr-2">{ent.type}</span>
                  <span className="gba:font-semibold gba:whitespace-nowrap">
                    {ent.used}{' '}
                    <span className="gba:text-xs gba:text-muted-foreground gba:font-normal">{t('days')}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="gba:space-y-1">
              <div className="gba:flex gba:justify-between gba:text-sm">
                <span className="gba:text-muted-foreground">{t('year-to-date')}:</span>
                <span className="gba:font-medium">
                  {ytdAbsentDays} {t('absent-days')} / {ytdTotalWorkingDays} {t('working-days')}
                </span>
              </div>
              <div
                className="gba:h-2 gba:w-full gba:overflow-hidden gba:rounded-full gba:bg-muted"
                role="progressbar"
                aria-valuenow={ytdTotalWorkingDays > 0 ? (ytdAbsentDays / ytdTotalWorkingDays) * 100 : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('year-to-date')}
              >
                {ytdTotalWorkingDays > 0 && (
                  <div
                    className="gba:h-full gba:rounded-l-full gba:bg-info-secondary gba:min-w-0"
                    style={{
                      width: `${Math.min(100, (ytdAbsentDays / ytdTotalWorkingDays) * 100)}%`
                    }}
                  />
                )}
              </div>
            </div>
            <div className="gba:mt-2">
              {(() => {
                if (wellnessInsight) {
                  return (
                    <div className="gba:flex gba:gap-2 gba:rounded gba:border gba:border-primary/20 gba:bg-primary/5 gba:px-3 gba:py-2">
                      <SparkleIcon className="gba:w-4 gba:h-4 gba:text-primary gba:shrink-0 gba:mt-0.5" />
                      <p className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed">{wellnessInsight}</p>
                    </div>
                  )
                }
                if (wellnessLoading) {
                  return (
                    <div className="gba:flex gba:gap-2 gba:rounded gba:border gba:border-primary/20 gba:bg-primary/5 gba:px-3 gba:py-2">
                      <SparkleIcon className="gba:w-4 gba:h-4 gba:text-primary gba:shrink-0 gba:animate-pulse" />
                      <Skeleton className="gba:h-4 gba:w-full" />
                    </div>
                  )
                }
                if (wellnessDataSummary && !wellnessRequested) {
                  return (
                    <button
                      onClick={onRequestWellnessAnalysis}
                      className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-primary hover:gba:text-primary/80 gba:transition-colors"
                    >
                      <SparkleIcon className="gba:w-3.5 gba:h-3.5" />
                      {t('ai-wellness-insight')}
                    </button>
                  )
                }
                return null
              })()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
