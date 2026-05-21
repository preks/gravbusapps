import { useState, useCallback } from 'react'

export type LeadFilterType = 'source' | 'status'

export interface LeadDrillDownSelection {
  label: string
  ref: string
  filterType: LeadFilterType
}

export interface LeadDrillDownState {
  selectedLeadFilter: LeadDrillDownSelection | null
  handleSourceClick: (label: string, ref: string) => void
  handleStatusClick: (label: string, ref: string) => void
  handleLeadFilterClose: () => void
}

export const useLeadDrillDownState = (): LeadDrillDownState => {
  const [selectedLeadFilter, setSelectedLeadFilter] = useState<LeadDrillDownSelection | null>(null)

  const handleSourceClick = useCallback((label: string, ref: string) => {
    setSelectedLeadFilter({ label, ref, filterType: 'source' })
  }, [])

  const handleStatusClick = useCallback((label: string, ref: string) => {
    setSelectedLeadFilter({ label, ref, filterType: 'status' })
  }, [])

  const handleLeadFilterClose = useCallback(() => {
    setSelectedLeadFilter(null)
  }, [])

  return { selectedLeadFilter, handleSourceClick, handleStatusClick, handleLeadFilterClose }
}
