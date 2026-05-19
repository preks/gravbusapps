import { useCallback, useState } from 'react'

export type JaDrawerKind = 'profiles' | 'descriptions' | 'skills' | null
export type DetailsPreFilter = Record<string, string[]> | null

export function useDataQualityDashboardModel() {
  const [activeTab, setActiveTab] = useState('overview')
  const [issuesPreFilter, setIssuesPreFilter] = useState<DetailsPreFilter>(null)
  const [jaDrawerKind, setJaDrawerKind] = useState<JaDrawerKind>(null)
  const [jaSelectedIdx, setJaSelectedIdx] = useState<number | null>(null)

  const navigateToIssues = useCallback((preFilter: DetailsPreFilter) => {
    setIssuesPreFilter(preFilter)
    setActiveTab('issues')
  }, [])

  const openJaDrawer = useCallback((kind: Exclude<JaDrawerKind, null>) => {
    setJaSelectedIdx(0)
    setJaDrawerKind(kind)
  }, [])

  const handleTabChange = useCallback((value: string) => {
    if (value !== 'issues') {
      setIssuesPreFilter(null)
    }
    setActiveTab(value)
  }, [])

  return {
    activeTab,
    issuesPreFilter,
    jaDrawerKind,
    jaSelectedIdx,
    setJaDrawerKind,
    setJaSelectedIdx,
    navigateToIssues,
    openJaDrawer,
    handleTabChange
  }
}
