import { useState, useCallback } from 'react'
import type { InvestmentLead } from '@/common/data/investment/types'

export interface UseLeadViewReturn {
  selectedLeads: Set<string>
  toggleLeadSelection: (leadId: string) => void
  selectAllLeads: () => void
  clearSelection: () => void
  getSelectedLeads: () => InvestmentLead[]
  hasSelection: boolean
}

export const useLeadView = (leads: InvestmentLead[]): UseLeadViewReturn => {
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())

  const toggleLeadSelection = useCallback((leadId: string) => {
    setSelectedLeads(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(leadId)) {
        newSelection.delete(leadId)
      } else {
        newSelection.add(leadId)
      }
      return newSelection
    })
  }, [])

  const selectAllLeads = useCallback(() => {
    setSelectedLeads(new Set(leads.map(lead => lead.id)))
  }, [leads])

  const clearSelection = useCallback(() => {
    setSelectedLeads(new Set())
  }, [])

  const getSelectedLeads = useCallback(() => {
    return leads.filter(lead => selectedLeads.has(lead.id))
  }, [leads, selectedLeads])

  const hasSelection = selectedLeads.size > 0

  return {
    selectedLeads,
    toggleLeadSelection,
    selectAllLeads,
    clearSelection,
    getSelectedLeads,
    hasSelection
  }
}
