import React from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@newwork/nw-design-system'
import {
  buildPerspectiveRowData,
  formatLeafValue,
  formatRatingForDisplay,
  getDisplayNameFromRecord,
  getInitials,
  getItemTitle,
  getPerspectiveEntries,
  getPictureFromRecord,
  getReviewColumns,
  getReviewerIdentityFromEntry,
  shouldHideFieldByKey,
  toAvatarSrc,
  toLabel
} from '../../utils/detailViewData'
import { ReviewerFallbackIdentity, ReviewerIdentity } from './types'

const JsonValueBlock: React.FC<{ label: string; value: unknown; depth?: number }> = ({ label, value, depth = 0 }) => {
  if (depth > 4) {
    return (
      <div className="gba:text-sm">
        <p className="gba:text-muted-foreground">{toLabel(label)}</p>
        <p>{formatLeafValue(value)}</p>
      </div>
    )
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return (
        <div className="gba:text-sm">
          <p className="gba:text-muted-foreground">{toLabel(label)}</p>
          <p>-</p>
        </div>
      )
    }

    return (
      <div className="gba:space-y-2">
        <p className="gba:text-sm gba:font-medium">{toLabel(label)}</p>
        <div className="gba:space-y-2">
          {value.map((entry, index) => (
            <Card key={`${label}-${index}`}>
              <CardContent className="gba:p-3">
                {typeof entry === 'object' && entry !== null ? (
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3">
                    {Object.entries(entry as Record<string, unknown>)
                      .filter(([childKey]) => !shouldHideFieldByKey(childKey))
                      .map(([childKey, childValue]) => (
                        <JsonValueBlock
                          key={`${label}-${index}-${childKey}`}
                          label={childKey}
                          value={childValue}
                          depth={depth + 1}
                        />
                      ))}
                  </div>
                ) : (
                  <p className="gba:text-sm">{formatLeafValue(entry)}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([childKey]) => !shouldHideFieldByKey(childKey)
    )
    if (!entries.length) {
      return (
        <div className="gba:text-sm">
          <p className="gba:text-muted-foreground">{toLabel(label)}</p>
          <p>-</p>
        </div>
      )
    }

    return (
      <div className="gba:space-y-2">
        <p className="gba:text-sm gba:font-medium">{toLabel(label)}</p>
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3">
          {entries.map(([childKey, childValue]) => (
            <JsonValueBlock key={`${label}-${childKey}`} label={childKey} value={childValue} depth={depth + 1} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="gba:text-sm">
      <p className="gba:text-muted-foreground">{toLabel(label)}</p>
      <p>{formatLeafValue(value)}</p>
    </div>
  )
}

const ReviewerAvatarsCell: React.FC<{ label: string; reviewers: ReviewerIdentity[]; testId: string }> = ({
  label,
  reviewers,
  testId
}) => (
  <div className="gba:flex gba:items-center gba:gap-2">
    <div className="gba:flex gba:items-center gba:-space-x-1">
      {reviewers.map(reviewer => (
        <Tooltip key={reviewer.key}>
          <TooltipTrigger asChild>
            <div data-testid={`${testId}-${reviewer.key}`}>
              <Avatar className="gba:h-7 gba:w-7 gba:border gba:border-background">
                {toAvatarSrc(reviewer.pictureThumbnail) ? (
                  <AvatarImage src={toAvatarSrc(reviewer.pictureThumbnail)} alt={reviewer.tooltipLabel} />
                ) : null}
                <AvatarFallback className="gba:text-[10px] gba:font-medium">{reviewer.displayText}</AvatarFallback>
              </Avatar>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{reviewer.tooltipLabel}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
    <span className="gba:font-medium">{label}</span>
  </div>
)

interface DetailItemCardProps {
  item: Record<string, unknown>
  testId: string
  subtitle: string
  selfLabel: string
  peerLabel: string
  managerLabel: string
  reviewerColumnLabel: string
  selfReviewerFallback?: ReviewerFallbackIdentity
  managerReviewerFallback?: ReviewerFallbackIdentity
  headerControls?: React.ReactNode
}

const DetailItemCard: React.FC<DetailItemCardProps> = ({
  item,
  testId,
  subtitle,
  selfLabel,
  peerLabel,
  managerLabel,
  reviewerColumnLabel,
  selfReviewerFallback,
  managerReviewerFallback,
  headerControls
}) => {
  const selfEntries = getPerspectiveEntries(item, key => key.toLowerCase().includes('self'))
  const peerEntries = getPerspectiveEntries(item, key => key.toLowerCase().includes('peer'))
  const managerEntries = getPerspectiveEntries(item, key => key.toLowerCase().includes('manager'))
  const hasPerspectiveData = selfEntries.length > 0 || peerEntries.length > 0 || managerEntries.length > 0

  const selfFallbackRecord = selfReviewerFallback ? (selfReviewerFallback as unknown as Record<string, unknown>) : null
  const managerFallbackRecord = managerReviewerFallback
    ? (managerReviewerFallback as unknown as Record<string, unknown>)
    : null

  const selfEntryIdentity =
    selfEntries.length > 0 ? getReviewerIdentityFromEntry(selfEntries[0]) : { name: null, pictureThumbnail: null }
  const managerEntryIdentity =
    managerEntries.length > 0 ? getReviewerIdentityFromEntry(managerEntries[0]) : { name: null, pictureThumbnail: null }

  const selfDisplayName = selfEntryIdentity.name ?? getDisplayNameFromRecord(selfFallbackRecord) ?? selfLabel
  const managerDisplayName =
    managerEntryIdentity.name ?? getDisplayNameFromRecord(managerFallbackRecord) ?? managerLabel

  const selfReviewers: ReviewerIdentity[] = [
    {
      key: 'self',
      tooltipLabel: selfDisplayName,
      displayText: getInitials(selfDisplayName, selfLabel.charAt(0).toUpperCase() || 'S'),
      pictureThumbnail: selfEntryIdentity.pictureThumbnail ?? getPictureFromRecord(selfFallbackRecord)
    }
  ]

  const managerReviewers: ReviewerIdentity[] = [
    {
      key: 'manager',
      tooltipLabel: managerDisplayName,
      displayText: getInitials(managerDisplayName, managerLabel.charAt(0).toUpperCase() || 'M'),
      pictureThumbnail: managerEntryIdentity.pictureThumbnail ?? getPictureFromRecord(managerFallbackRecord)
    }
  ]

  const peerReviewers: ReviewerIdentity[] = peerEntries.map((entry, index) => {
    const identity = getReviewerIdentityFromEntry(entry)
    const peerIndex = index + 1
    const peerFallbackName = `${peerLabel} ${peerIndex}`
    return {
      key: `peer-${peerIndex}`,
      tooltipLabel: identity.name ?? peerFallbackName,
      displayText: identity.name ? getInitials(identity.name, `P${peerIndex}`) : `P${peerIndex}`,
      pictureThumbnail: identity.pictureThumbnail
    }
  })

  const selfRowData = buildPerspectiveRowData(selfEntries)
  const peerRowData = buildPerspectiveRowData(peerEntries)
  const managerRowData = buildPerspectiveRowData(managerEntries)
  const perspectiveRows = [
    { label: selfLabel, data: selfRowData, reviewers: selfReviewers },
    ...(peerEntries.length > 0 ? [{ label: peerLabel, data: peerRowData, reviewers: peerReviewers }] : []),
    { label: managerLabel, data: managerRowData, reviewers: managerReviewers }
  ]
  const reviewColumns = getReviewColumns(perspectiveRows.map(row => row.data))

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
          <div className="gba:space-y-1">
            <CardTitle>{getItemTitle(item)}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          {headerControls ? <div className="gba:flex-shrink-0">{headerControls}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {hasPerspectiveData ? (
          <div className="gba:overflow-x-auto" data-testid={`${testId}-review-table`}>
            <table className="gba:w-full gba:text-sm">
              <thead>
                <tr className="gba:border-b gba:border-border">
                  <th className="gba:text-left gba:py-2 gba:pr-3 gba:font-semibold">{reviewerColumnLabel}</th>
                  {reviewColumns.map(column => (
                    <th key={`${testId}-head-${column}`} className="gba:text-left gba:py-2 gba:px-3 gba:font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perspectiveRows.map(row => (
                  <tr key={`${testId}-row-${row.label}`} className="gba:border-b gba:border-border last:gba:border-b-0">
                    <td className="gba:py-2 gba:pr-3">
                      <ReviewerAvatarsCell label={row.label} reviewers={row.reviewers} testId={`${testId}-reviewer`} />
                    </td>
                    {reviewColumns.map(column => (
                      <td key={`${testId}-cell-${row.label}-${column}`} className="gba:py-2 gba:px-3">
                        {column === 'Rating'
                          ? formatRatingForDisplay(row.data[column] || '-')
                          : row.data[column] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3">
            {Object.entries(item)
              .filter(([key]) => !shouldHideFieldByKey(key))
              .map(([key, value]) => (
                <JsonValueBlock key={`${testId}-${key}`} label={key} value={value} />
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DetailItemCard
