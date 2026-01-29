import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { CheckIcon, ChecksIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { navigateTo } from '@/common/utils/navigationUtils'
import translations from './_i18n'

// Minimal HTML sanitizer for notification bodies.
function sanitizeNotificationHtml(html?: string) {
  if (!html) return ''
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    ;['script', 'style', 'iframe', 'object', 'embed', 'form', 'link', 'meta'].forEach(tag => {
      doc.querySelectorAll(tag).forEach(el => el.remove())
    })
    const walk = (el: Element) => {
      Array.from(el.attributes).forEach(attr => {
        const name = attr.name.toLowerCase()
        if (name.startsWith('on') || name === 'srcdoc' || name === 'style') {
          el.removeAttribute(attr.name)
          return
        }
        if (name === 'href' || name === 'src') {
          const value = (attr.value || '').trim().toLowerCase()
          const isSafe = value.startsWith('http://') || value.startsWith('https://') || value.startsWith('mailto:')
          if (!isSafe) {
            el.removeAttribute(attr.name)
          }
        }
      })
      Array.from(el.children).forEach(child => walk(child))
    }
    Array.from(doc.body.children).forEach(child => walk(child))

    const allowedHosts = (() => {
      const hosts = new Set<string>()
      try {
        hosts.add(window.location.hostname)
      } catch {}
      try {
        const api = env('NEXT_PUBLIC_API_SERVER')
        if (api) hosts.add(new URL(api).hostname)
      } catch {}
      return hosts
    })()

    doc.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href') || ''
      let url: URL | null = null
      try {
        url = new URL(href, window.location.origin)
      } catch {}
      const isExternal = !url || !allowedHosts.has(url.hostname)
      if (isExternal) {
        a.setAttribute('rel', 'noopener noreferrer')
        if (!a.getAttribute('target')) a.setAttribute('target', '_blank')
      } else {
        a.removeAttribute('rel')
        if (a.getAttribute('target') === '_blank') a.removeAttribute('target')
      }
    })
    return doc.body.innerHTML
  } catch {
    return ''
  }
}

// Extract first allowed URL (http/https) limited to allowed hostnames (same-origin and API server).
function extractFirstAllowedUrl(html?: string): string | null {
  if (!html) return null
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const anchors = Array.from(doc.querySelectorAll('a[href]')) as HTMLAnchorElement[]
    const allowedHosts = (() => {
      const hosts = new Set<string>()
      try {
        hosts.add(window.location.hostname)
      } catch {}
      try {
        const api = env('NEXT_PUBLIC_API_SERVER')
        if (api) hosts.add(new URL(api).hostname)
      } catch {}
      return hosts
    })()
    for (const a of anchors) {
      const href = (a.getAttribute('href') || '').trim()
      if (!href || href.includes('${')) continue
      try {
        const url = new URL(href, window.location.origin)
        if ((url.protocol === 'http:' || url.protocol === 'https:') && allowedHosts.has(url.hostname)) {
          return url.href
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return null
}

export interface NotificationsProps extends BusinessAppContextProps {
  className?: string
}

type NotificationsResponse = {
  notifications?: any[]
  totalCount?: number
}

export const Notifications: React.FC<NotificationsProps> = ({ className, accessToken, additionalData }) => {
  const { t } = useTranslation(translations)
  const isOpen = additionalData?.isOpen !== undefined ? Boolean(additionalData?.isOpen) : true
  const refreshKey = typeof additionalData?.refreshKey === 'number' ? additionalData.refreshKey : 0

  const notificationApiBase = useMemo(() => {
    const base =
      env('NEXT_PUBLIC_API_SERVER') ||
      env('NEXT_PUBLIC_BASE_URL') ||
      (typeof window !== 'undefined' ? window.location.origin : '')
    const normalized = base ? base.replace(/\/$/, '') : ''
    return normalized ? `${normalized}/notification/api/v1` : '/notification/api/v1'
  }, [])

  const restClient = useRestClient(notificationApiBase)

  const [notifications, setNotifications] = useState<any[]>([])
  const [page, setPage] = useState<number>(0)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [isLoadingList, setIsLoadingList] = useState<boolean>(false)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Stable function references using refs
  const loadPageRef = useRef<(nextPage: number, replace?: boolean) => Promise<void>>()
  const accessTokenRef = useRef<string | undefined>()
  const refreshKeyRef = useRef<number>(refreshKey)

  // Keep token ref up to date
  accessTokenRef.current = accessToken

  const buildAuthHeaders = (): Record<string, string> | undefined => {
    const token = accessTokenRef.current
    return token ? { Authorization: `Bearer ${token}` } : undefined
  }

  const fetchNotifications = async (queryParams: Record<string, string | number | boolean>) => {
    return restClient.get<NotificationsResponse>('/notifications', {
      params: queryParams,
      headers: buildAuthHeaders(),
      withCredentials: true
    })
  }

  const markAllRead = async () => {
    return restClient.patch('/notifications/user/read', undefined, {
      headers: buildAuthHeaders(),
      withCredentials: true
    })
  }

  const markOneRead = async (id: string) => {
    return restClient.patch(`/notifications/${id}`, undefined, {
      params: { isRead: true },
      headers: buildAuthHeaders(),
      withCredentials: true
    })
  }

  loadPageRef.current = async (nextPage: number, replace = false) => {
    if (!accessTokenRef.current) {
      setNotifications([])
      setHasMore(false)
      return
    }
    setIsLoadingList(true)
    try {
      const resp = await fetchNotifications({ page: nextPage, size: 10, sortDirection: 'DESC' })
      const items = resp?.notifications ?? []
      const total = resp?.totalCount ?? 0
      setHasMore((nextPage + 1) * 10 < total)
      if (replace) {
        setNotifications(items)
      } else {
        setNotifications(prev => [...prev, ...items])
      }
    } finally {
      setIsLoadingList(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setNotifications([])
      setPage(0)
      setHasMore(true)
      loadPageRef.current?.(0, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      refreshKeyRef.current = refreshKey
      return
    }
    if (refreshKeyRef.current !== refreshKey) {
      refreshKeyRef.current = refreshKey
      setNotifications([])
      setPage(0)
      setHasMore(true)
      loadPageRef.current?.(0, true)
    }
  }, [refreshKey, isOpen])

  const handleScrollCheck = () => {
    const container = scrollContainerRef.current
    if (!container || isLoadingList || !hasMore) return
    const scrollable = container.scrollHeight - container.clientHeight > 8
    if (!scrollable) return
    const nearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 8
    if (nearBottom) {
      const next = page + 1
      setPage(next)
      loadPageRef.current?.(next)
    }
  }

  const notifyHostRefresh = () => {
    try {
      window.dispatchEvent(new CustomEvent('notifications:refresh'))
    } catch {
      // ignore
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!accessTokenRef.current) return
    await markAllRead()
    notifyHostRefresh()
    if (isOpen) {
      setNotifications([])
      setPage(0)
      setHasMore(true)
      await loadPageRef.current?.(0, true)
    }
  }

  const handleMarkOneAsRead = async (id: string) => {
    if (!accessTokenRef.current) return
    await markOneRead(id)
    notifyHostRefresh()
    setNotifications(prev =>
      prev.map(item =>
        item.id === id ? { ...item, userNotification: { ...(item.userNotification ?? {}), read: true } } : item
      )
    )
  }

  return (
    <div className={className || ''}>
      <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-b">
        <div className="gba:text-sm gba:font-medium">{t('notifications-title')}</div>
        <Button
          variant="ghost"
          size="iconLg"
          title={t('notifications-mark-all-as-read')}
          onClick={handleMarkAllAsRead}
          className="gba:h-8 gba:w-8"
        >
          <ChecksIcon className="gba:h-4 gba:w-4" />
        </Button>
      </div>
      <div ref={scrollContainerRef} className="gba:max-h-[360px] gba:overflow-auto" onScroll={handleScrollCheck}>
        {notifications.length === 0 && !isLoadingList ? (
          <div className="gba:text-sm gba:text-muted-foreground gba:px-3 gba:py-6">{t('no_data')}</div>
        ) : (
          <ul className="gba:divide-y">
            {notifications.map((n: any) => {
              const unread = n?.userNotification?.read === false
              const targetUrl = extractFirstAllowedUrl(n?.userNotification?.body)
              return (
                <li
                  key={n.id}
                  className={`gba:px-3 gba:py-2 gba:flex gba:gap-3 gba:items-start ${
                    targetUrl ? 'gba:cursor-pointer hover:gba:bg-accent/40' : ''
                  }`}
                  onClick={e => {
                    const btn = (e.target as HTMLElement).closest('button')
                    if (btn) return
                    const anchor = (e.target as HTMLElement).closest('a')
                    if (anchor) return
                    if (targetUrl) {
                      try {
                        const url = new URL(targetUrl, window.location.origin)
                        if (url.origin === window.location.origin) {
                          navigateTo(`${url.pathname}${url.search}${url.hash}`)
                        } else {
                          window.open(url.href, '_self')
                        }
                      } catch {
                        // Fallback to same-tab navigation if URL parsing fails
                        window.open(targetUrl, '_self')
                      }
                    }
                  }}
                >
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
                        <div className="gba:text-sm gba:font-medium gba:truncate">
                          {n?.userNotification?.title ?? n?.type}
                        </div>
                      </div>
                      {unread && (
                        <button
                          title={t('notifications-mark-as-read')}
                          className="gba:text-muted-foreground hover:gba:text-foreground"
                          onClick={() => handleMarkOneAsRead(n.id)}
                        >
                          <CheckIcon className="gba:h-4 gba:w-4" />
                        </button>
                      )}
                    </div>
                    <div
                      className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: sanitizeNotificationHtml(n?.userNotification?.body) }}
                    />
                    <div className="gba:mt-1 gba:flex gba:items-center gba:justify-between gba:gap-2">
                      <div className="gba:text-[10px] gba:text-muted-foreground">
                        {n?.classification} • {new Date(n?.createdAt).toLocaleString()}
                      </div>
                      {unread && (
                        <span className="gba:inline-block gba:h-2 gba:w-2 gba:rounded-full gba:bg-[var(--nw-primary)] gba:shrink-0" />
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
            {isLoadingList && (
              <li className="gba:px-3 gba:py-2 gba:text-sm gba:text-muted-foreground">{t('notifications-loading')}</li>
            )}
            {!hasMore && notifications.length > 0 && (
              <li className="gba:px-3 gba:py-2 gba:text-xs gba:text-muted-foreground">
                {t('notifications-end-of-notifications')}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

export default Notifications
