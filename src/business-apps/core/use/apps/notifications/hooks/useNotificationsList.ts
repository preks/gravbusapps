import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { NotificationClient } from '@/common/network/notification/NotificationClient'
import type { GetNotificationsParams } from '@/common/network/notification/types'
import type { NotificationItem } from '../types'
import translations from '../_i18n'
import {
  fetchUnreadNotificationCount,
  formatNotificationErrorMessage,
  getNotificationsRefreshDetailFromEvent,
  notifyHostRefresh
} from '../utils'

const PAGE_SIZE = 10

interface UseNotificationsListOptions {
  client: NotificationClient
  accessToken?: string
  isOpen: boolean
}

export function useNotificationsList({ client, accessToken, isOpen }: UseNotificationsListOptions) {
  const { t } = useTranslation(translations)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [listTotalCount, setListTotalCount] = useState(0)
  const [unreadTotalCount, setUnreadTotalCount] = useState(0)
  const [listError, setListError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const loadPageRef = useRef<(nextPage: number, replace?: boolean) => Promise<void>>()
  const accessTokenRef = useRef<string | undefined>()
  const pageRef = useRef(0)
  const unreadOnlyRef = useRef(false)
  const isOpenRef = useRef(isOpen)

  accessTokenRef.current = accessToken
  pageRef.current = page
  unreadOnlyRef.current = unreadOnly
  isOpenRef.current = isOpen

  const toListErrorMessage = useCallback(
    (error: unknown) => formatNotificationErrorMessage(error, t('notifications-error-load-failed')),
    [t]
  )

  const syncUnreadTotalCount = useCallback(
    async (options?: { broadcast?: boolean }) => {
      if (!accessTokenRef.current) {
        setUnreadTotalCount(0)
        const message = t('notifications-error-missing-token')
        setListError(message)
        if (options?.broadcast !== false) {
          notifyHostRefresh({ unreadCount: 0, listError: message })
        }
        return 0
      }
      try {
        const count = await fetchUnreadNotificationCount(client)
        setUnreadTotalCount(count)
        if (unreadOnlyRef.current) {
          setListTotalCount(count)
        }
        if (options?.broadcast !== false) {
          notifyHostRefresh({ unreadCount: count, listError: null })
        }
        return count
      } catch (error) {
        const message = toListErrorMessage(error)
        setListError(message)
        if (options?.broadcast !== false) {
          notifyHostRefresh({ listError: message })
        }
        return 0
      }
    },
    [client, t, toListErrorMessage]
  )

  loadPageRef.current = async (nextPage: number, replace = false) => {
    if (!accessTokenRef.current) {
      setNotifications([])
      setHasMore(false)
      setListTotalCount(0)
      setListError(t('notifications-error-missing-token'))
      return
    }
    setIsLoadingList(true)
    if (replace) {
      setListError(null)
    }
    try {
      const params: GetNotificationsParams = {
        page: nextPage,
        size: PAGE_SIZE,
        sortDirection: 'DESC'
      }
      if (unreadOnlyRef.current) {
        params.read = false
      }
      const resp = await client.getNotifications(params)
      const items = resp.notifications ?? []
      const total = resp.totalCount ?? 0
      setListTotalCount(total)
      setHasMore((nextPage + 1) * PAGE_SIZE < total)
      if (replace) {
        setNotifications(items)
      } else {
        setNotifications(previous => [...previous, ...items])
      }
      setListError(null)
    } catch (error) {
      const message = toListErrorMessage(error)
      setListError(message)
      if (replace) {
        setNotifications([])
        setHasMore(false)
        setListTotalCount(0)
      }
      console.error('Failed to load notifications list')
    } finally {
      setIsLoadingList(false)
    }
  }

  const resetAndLoadFirstPage = useCallback(() => {
    setNotifications([])
    setPage(0)
    setHasMore(true)
    setActionError(null)
    loadPageRef.current?.(0, true)?.catch(() => undefined)
  }, [])

  useEffect(() => {
    if (isOpen) {
      resetAndLoadFirstPage()
      syncUnreadTotalCount({ broadcast: false }).catch(() => undefined)
      return
    }
    setUnreadOnly(false)
  }, [isOpen, resetAndLoadFirstPage, syncUnreadTotalCount])

  useEffect(() => {
    if (!isOpenRef.current) {
      return
    }
    resetAndLoadFirstPage()
  }, [unreadOnly, resetAndLoadFirstPage])

  const reloadList = useCallback(() => {
    resetAndLoadFirstPage()
  }, [resetAndLoadFirstPage])

  const retryList = useCallback(() => {
    setListError(null)
    setActionError(null)
    resetAndLoadFirstPage()
    syncUnreadTotalCount({ broadcast: false }).catch(() => undefined)
  }, [resetAndLoadFirstPage, syncUnreadTotalCount])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleRefresh: EventListener = event => {
      const detail = getNotificationsRefreshDetailFromEvent(event)
      if (detail?.listError !== undefined) {
        setListError(detail.listError)
      }
      if (typeof detail?.unreadCount === 'number') {
        setUnreadTotalCount(detail.unreadCount)
        if (unreadOnlyRef.current) {
          setListTotalCount(detail.unreadCount)
        }
      }
      if (detail?.reloadList) {
        reloadList()
      }
    }

    globalThis.window.addEventListener('notifications:refresh', handleRefresh)
    return () => {
      globalThis.window.removeEventListener('notifications:refresh', handleRefresh)
    }
  }, [isOpen, reloadList])

  const loadNextPage = useCallback(() => {
    if (isLoadingList || !hasMore || listError) {
      return
    }
    const next = pageRef.current + 1
    setPage(next)
    loadPageRef.current?.(next)?.catch(() => undefined)
  }, [hasMore, isLoadingList, listError])

  const handleScrollCheck = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || isLoadingList || !hasMore || listError) {
      return
    }
    const scrollable = container.scrollHeight - container.clientHeight > 8
    if (!scrollable) {
      return
    }
    const nearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 8
    if (nearBottom) {
      loadNextPage()
    }
  }, [hasMore, isLoadingList, listError, loadNextPage])

  const handleMarkAllAsRead = useCallback(async () => {
    if (!accessTokenRef.current) {
      setActionError(t('notifications-error-missing-token'))
      return
    }
    setActionError(null)
    try {
      await client.markAllRead()

      if (unreadOnlyRef.current) {
        unreadOnlyRef.current = false
        setUnreadOnly(false)
        resetAndLoadFirstPage()
      } else {
        setNotifications(previous =>
          previous.map(item => ({
            ...item,
            userNotification: { ...item.userNotification, read: true }
          }))
        )
      }

      setUnreadTotalCount(0)
      notifyHostRefresh({ unreadCount: 0, listError: null })
    } catch (error) {
      setActionError(toListErrorMessage(error))
    }
  }, [client, resetAndLoadFirstPage, t, toListErrorMessage])

  const handleToggleRead = useCallback(
    async (id: string, currentlyUnread: boolean) => {
      if (!accessTokenRef.current) {
        setActionError(t('notifications-error-missing-token'))
        return
      }
      setActionError(null)
      const nextRead = currentlyUnread
      try {
        await client.setNotificationRead(id, nextRead)

        if (unreadOnlyRef.current && nextRead) {
          setNotifications(previous => previous.filter(item => item.id !== id))
        } else {
          setNotifications(previous =>
            previous.map(item =>
              item.id === id ? { ...item, userNotification: { ...item.userNotification, read: nextRead } } : item
            )
          )
        }

        await syncUnreadTotalCount()
      } catch (error) {
        setActionError(toListErrorMessage(error))
      }
    },
    [client, syncUnreadTotalCount, t, toListErrorMessage]
  )

  return {
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
  }
}
