import { useEffect } from 'react'

export interface UseSpreadsheetNavigationLeaveInterceptParams {
  confirmLeaveIfUnsaved: () => boolean
  hasUnpersistedWork: () => boolean
  flushPendingPersistenceNow: () => void
  onUnsavedLeaveConfirmMessage: string
}

export function useSpreadsheetNavigationLeaveIntercept(params: UseSpreadsheetNavigationLeaveInterceptParams): void {
  const { confirmLeaveIfUnsaved, hasUnpersistedWork, flushPendingPersistenceNow, onUnsavedLeaveConfirmMessage } = params

  useEffect(() => {
    if (typeof globalThis === 'undefined' || typeof window === 'undefined') return

    const toPathAndSearch = (href: string): string => {
      try {
        const u = new URL(href, window.location.origin)
        return `${u.pathname}${u.search}${u.hash}`
      } catch {
        return href
      }
    }
    const samePath = (a: string, b: string): boolean => {
      try {
        const ua = new URL(a, window.location.origin)
        const ub = new URL(b, window.location.origin)
        const aAppId = ua.searchParams.get('appId')
        const bAppId = ub.searchParams.get('appId')
        const aSheetId = ua.searchParams.get('sheetId')
        const bSheetId = ub.searchParams.get('sheetId')
        return ua.pathname === ub.pathname && aAppId === bAppId && aSheetId === bSheetId
      } catch {
        return a === b
      }
    }

    let lastKnownUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`

    type NwNavigateFn = (path: string, options?: { replace?: boolean; scroll?: boolean }) => void
    const w = window as unknown as { nwNavigate?: NwNavigateFn }
    let realNwNavigate: NwNavigateFn | undefined = typeof w.nwNavigate === 'function' ? w.nwNavigate : undefined
    const guardedNwNavigate: NwNavigateFn = (path, options) => {
      if (!samePath(path, lastKnownUrl) && !confirmLeaveIfUnsaved()) return
      lastKnownUrl = toPathAndSearch(path)
      realNwNavigate?.(path, options)
    }
    try {
      Object.defineProperty(window, 'nwNavigate', {
        configurable: true,
        get: () => guardedNwNavigate,
        set: (next: NwNavigateFn) => {
          realNwNavigate = typeof next === 'function' ? next : undefined
        }
      })
    } catch {
      w.nwNavigate = guardedNwNavigate
    }

    const originalPushState = window.history.pushState.bind(window.history)
    const originalReplaceState = window.history.replaceState.bind(window.history)
    const patchedPushState: typeof window.history.pushState = (data, unused, url) => {
      if (url != null) {
        const target = typeof url === 'string' ? url : url.toString()
        if (!samePath(target, lastKnownUrl)) {
          if (!confirmLeaveIfUnsaved()) return
          lastKnownUrl = toPathAndSearch(target)
        }
      }
      return originalPushState(data, unused, url as string | URL | null | undefined)
    }
    const patchedReplaceState: typeof window.history.replaceState = (data, unused, url) => {
      if (url != null) {
        const target = typeof url === 'string' ? url : url.toString()
        if (!samePath(target, lastKnownUrl)) {
          if (!confirmLeaveIfUnsaved()) return
          lastKnownUrl = toPathAndSearch(target)
        }
      }
      return originalReplaceState(data, unused, url as string | URL | null | undefined)
    }
    window.history.pushState = patchedPushState
    window.history.replaceState = patchedReplaceState

    const handleDocumentClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented) return
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target as Element | null
      if (!target) return
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target && anchor.target !== '' && anchor.target !== '_self') return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      try {
        const resolved = new URL(href, window.location.origin)
        if (resolved.origin !== window.location.origin) return
        const targetPath = `${resolved.pathname}${resolved.search}${resolved.hash}`
        if (samePath(targetPath, lastKnownUrl)) return
        if (!confirmLeaveIfUnsaved()) {
          event.preventDefault()
          event.stopPropagation()
        }
      } catch {
        /* keep default handler for malformed href */
      }
    }
    document.addEventListener('click', handleDocumentClickCapture, true)

    const handlePopState = () => {
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (samePath(currentUrl, lastKnownUrl)) {
        lastKnownUrl = currentUrl
        return
      }
      if (!hasUnpersistedWork()) {
        lastKnownUrl = currentUrl
        return
      }
      try {
        flushPendingPersistenceNow()
      } catch {
        /* non-fatal */
      }
      const proceed = globalThis.confirm(onUnsavedLeaveConfirmMessage)
      if (proceed) {
        lastKnownUrl = currentUrl
        return
      }
      originalPushState(null, '', lastKnownUrl)
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleDocumentClickCapture, true)
      if (window.history.pushState === patchedPushState) window.history.pushState = originalPushState
      if (window.history.replaceState === patchedReplaceState) window.history.replaceState = originalReplaceState
      try {
        Object.defineProperty(window, 'nwNavigate', {
          configurable: true,
          writable: true,
          value: realNwNavigate
        })
      } catch {
        w.nwNavigate = realNwNavigate
      }
    }
  }, [confirmLeaveIfUnsaved, flushPendingPersistenceNow, hasUnpersistedWork, onUnsavedLeaveConfirmMessage])
}
