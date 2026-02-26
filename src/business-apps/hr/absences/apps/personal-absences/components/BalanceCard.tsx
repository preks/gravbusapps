import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Progress, Skeleton } from '@newwork/nw-design-system'
import { SparkleIcon } from '@phosphor-icons/react'

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
  ytdAbsentDays,
  ytdTotalWorkingDays,
  wellnessInsight,
  wellnessLoading,
  wellnessDataSummary,
  wellnessRequested,
  onRequestWellnessAnalysis,
  t
}: Readonly<BalanceCardProps>) {
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
              {displayEntitlements.map(ent => (
                <div
                  key={`display-${ent.type}-${ent.used}-${ent.total}`}
                  className="gba:rounded gba:border gba:px-3 gba:py-2 gba:space-y-1.5"
                >
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <span className="gba:text-sm gba:text-muted-foreground gba:truncate gba:mr-2">{ent.type}</span>
                    <span className="gba:font-semibold gba:whitespace-nowrap">
                      {ent.used}{' '}
                      <span className="gba:text-xs gba:text-muted-foreground gba:font-normal">/ {ent.total}</span>{' '}
                      <span className="gba:text-xs gba:text-muted-foreground gba:font-normal">{t('days')}</span>
                    </span>
                  </div>
                  <Progress value={ent.total > 0 ? (ent.used / ent.total) * 100 : 0} className="gba:h-1.5" />
                </div>
              ))}
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
              <Progress
                value={ytdTotalWorkingDays > 0 ? (ytdAbsentDays / ytdTotalWorkingDays) * 100 : 0}
                className="gba:h-2"
              />
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
