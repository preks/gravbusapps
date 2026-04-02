import { createContext, useCallback, useContext, useMemo, useState } from 'react'

interface DevReportScreenKeyContextValue {
  suffix: string | null
  setSuffix: (suffix: string | null) => void
}

const DevReportScreenKeyContext = createContext<DevReportScreenKeyContextValue>({
  suffix: null,
  setSuffix: () => {}
})

export function DevReportScreenKeyProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [suffix, setSuffixState] = useState<string | null>(null)

  const setSuffix = useCallback((next: string | null) => {
    setSuffixState(next)
  }, [])

  const value = useMemo(() => ({ suffix, setSuffix }), [suffix, setSuffix])

  return <DevReportScreenKeyContext.Provider value={value}>{children}</DevReportScreenKeyContext.Provider>
}

/**
 * Allows any screen to refine its DevReportDot screenKey by setting a suffix.
 *
 * Example: a tabbed screen can call `setSuffix('everyai')` so that
 * `platform/apps/chat` becomes `platform/apps/chat/everyai`.
 */
export function useDevReportScreenKey() {
  return useContext(DevReportScreenKeyContext)
}
