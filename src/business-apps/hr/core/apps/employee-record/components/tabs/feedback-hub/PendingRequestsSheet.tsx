'use client'

import React from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system'
import { CaretLeftIcon, CaretRightIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import { formatDate } from '@/common/utils/windowUtils'
import { startProcess } from '@/common/utils/start-process'
import { toAvatarSrc } from './avatar'
import { PendingRequestRow } from './types'

const resolveStartProcessFromEndpoint = (row: PendingRequestRow) => {
  const endpoint = row.endpoint || ''
  let domain = 'employee'
  let processName = 'giveFeedback'
  let processInstanceId: string | undefined = row.processInstanceId || undefined

  const extractFromParts = (parts: string[]) => {
    const idx = parts.indexOf('processes')
    if (idx >= 0 && parts.length > idx + 3) {
      domain = parts[idx + 1]
      processName = parts[idx + 2]
      processInstanceId = parts[idx + 3]
    }
  }

  try {
    const url = new URL(endpoint)
    extractFromParts(url.pathname.split('/').filter(Boolean))
  } catch {
    extractFromParts(endpoint.split('/').filter(Boolean))
  }

  return { domain, processName, processInstanceId }
}

interface PendingRequestsSheetProps {
  t: (key: string, options?: Record<string, unknown>) => string
  open: boolean
  onOpenChange: (open: boolean) => void
  requests: PendingRequestRow[]
  requestCount: number
  currentPage: number
  pageSize: number
  onPreviousPage: () => void
  onNextPage: () => void
  employeeId?: string
}

const PendingRequestsSheet: React.FC<PendingRequestsSheetProps> = ({
  t,
  open,
  onOpenChange,
  requests,
  requestCount,
  currentPage,
  pageSize,
  onPreviousPage,
  onNextPage,
  employeeId
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent
      side="right"
      className="gba:w-[680px] gba:max-w-[680px] gba:sm:max-w-[680px] gba:p-0 gba:flex gba:flex-col"
      data-testid="feedback-pending-requests-drawer"
    >
      <SheetHeader className="gba:px-6 gba:py-4 gba:border-b gba:border-border">
        <SheetTitle>{t('feedback-hub-pending-panel-title')}</SheetTitle>
        <p className="gba:text-muted-foreground">{t('feedback-hub-suggested-pending', { count: requestCount })}</p>
      </SheetHeader>
      <div className="gba:flex-1 gba:overflow-y-auto gba:p-6 gba:space-y-3">
        {requests.map(row => {
          const firstName = row.requesterEmployee?.firstName ?? ''
          const lastName = row.requesterEmployee?.lastName ?? ''
          const name =
            (row.requesterEmployee?.displayName ?? `${firstName} ${lastName}`.trim()) ||
            t('feedback-hub-unknown-sender')
          const dateRaw = row.requestedOn ?? row.createdAt ?? row.dueDate ?? ''
          const dateLabel = dateRaw ? (formatDate(dateRaw, 'date.short') ?? '') : ''
          const avatar = toAvatarSrc(row.requesterEmployee?.employeePosition?.employee?.pictureThumbnail)

          return (
            <div key={row.id} className="gba:border gba:border-border gba:rounded-md gba:p-3 gba:space-y-2">
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:flex-wrap">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <Avatar className="gba:h-10 gba:w-10">
                    {avatar && <AvatarImage src={avatar} alt={name} />}
                    <AvatarFallback>{`${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`}</AvatarFallback>
                  </Avatar>
                  <span className="gba:text-sm gba:font-medium">
                    {name} {dateLabel ? `• ${dateLabel}` : ''}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const { domain, processName, processInstanceId } = resolveStartProcessFromEndpoint(row)
                    startProcess({
                      domain,
                      processName,
                      payload: {
                        requestId: row.id,
                        employeeId: row.employeeId ?? employeeId,
                        // Preserve old behavior: preselect requester in Give Feedback flow.
                        receiverId: row.requesterEmployeeId ?? undefined
                      },
                      processInstanceId,
                      builderType: 'NATIVE_SCREEN'
                    })
                  }}
                >
                  <PencilSimpleIcon className="gba:mr-1 gba:h-4 gba:w-4" />
                  {t('feedback-hub-pending-give-feedback-btn')}
                </Button>
              </div>
              {row.dueDate && (
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('feedback-hub-pending-due', { date: formatDate(row.dueDate, 'date.short') ?? row.dueDate })}
                </p>
              )}
              {row.message && <p className="gba:text-sm gba:text-muted-foreground">{row.message}</p>}
            </div>
          )
        })}
      </div>
      {requestCount > pageSize && (
        <div className="gba:px-6 gba:pb-4 gba:flex gba:justify-center">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPreviousPage}
              disabled={currentPage === 1}
              aria-label="Previous"
            >
              <CaretLeftIcon className="gba:h-4 gba:w-4" />
            </Button>
            <span className="gba:px-2 gba:text-sm gba:text-muted-foreground">
              {t('feedback-hub-pagination-page-of', {
                page: currentPage,
                total: Math.ceil(requestCount / pageSize)
              })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNextPage}
              disabled={currentPage >= Math.ceil(requestCount / pageSize)}
              aria-label="Next"
            >
              <CaretRightIcon className="gba:h-4 gba:w-4" />
            </Button>
          </div>
        </div>
      )}
      <SheetFooter className="gba:px-6 gba:py-4 gba:border-t gba:border-border">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          {t('feedback-hub-ai-close')}
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
)

export default PendingRequestsSheet
