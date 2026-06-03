import React from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useNotificationClient } from '@/common/network/notification'
import { NotificationsPanel } from './components'
import { useFillNotificationsPages, useNotificationsList } from './hooks'
import { NotificationsHost } from './NotificationsHost'
import type { NotificationsAdditionalData } from './types'

export interface NotificationsProps extends BusinessAppContextProps {
  className?: string
  'data-testid'?: string
}

const TEST_ID = 'notifications'

function resolveIsOpen(additionalData: BusinessAppContextProps['additionalData']): boolean {
  const data = additionalData as NotificationsAdditionalData | undefined
  if (data?.isOpen !== undefined) {
    return Boolean(data.isOpen)
  }
  return true
}

function resolveEnableHost(additionalData: BusinessAppContextProps['additionalData']): boolean {
  const data = additionalData as NotificationsAdditionalData | undefined
  return data?.enableHost !== false
}

export const Notifications: React.FC<NotificationsProps> = ({
  className,
  accessToken,
  additionalData,
  'data-testid': dataTestId = TEST_ID
}) => {
  const client = useNotificationClient(accessToken)
  const isOpen = resolveIsOpen(additionalData)
  const enableHost = resolveEnableHost(additionalData)

  const {
    notifications,
    hasMore,
    isLoadingList,
    unreadOnly,
    setUnreadOnly,
    listTotalCount,
    unreadTotalCount,
    listError,
    actionError,
    scrollContainerRef,
    handleScrollCheck,
    handleMarkAllAsRead,
    handleToggleRead,
    loadNextPage,
    retryList
  } = useNotificationsList({
    client,
    accessToken,
    isOpen
  })

  useFillNotificationsPages({
    isOpen,
    isLoadingList,
    hasMore,
    itemCount: notifications.length,
    scrollContainerRef,
    loadNextPage
  })

  return (
    <>
      {enableHost && accessToken ? <NotificationsHost accessToken={accessToken} /> : null}
      <NotificationsPanel
        className={['gba:box-border gba:w-full gba:min-w-full gba:max-w-full', className].filter(Boolean).join(' ')}
        data-testid={dataTestId}
        notifications={notifications}
        hasMore={hasMore}
        isLoadingList={isLoadingList}
        unreadOnly={unreadOnly}
        listTotalCount={listTotalCount}
        unreadTotalCount={unreadTotalCount}
        listError={listError}
        actionError={actionError}
        onUnreadOnlyChange={setUnreadOnly}
        scrollContainerRef={scrollContainerRef}
        onScroll={handleScrollCheck}
        onRetry={retryList}
        onMarkAllAsRead={() => {
          handleMarkAllAsRead().catch(() => undefined)
        }}
        onToggleRead={(id, currentlyUnread) => {
          handleToggleRead(id, currentlyUnread).catch(() => undefined)
        }}
      />
    </>
  )
}

export default Notifications
