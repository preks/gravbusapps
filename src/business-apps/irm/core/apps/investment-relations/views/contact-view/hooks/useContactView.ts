import { useState, useCallback } from 'react'
import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'

export interface UseContactViewReturn {
  selectedContacts: Set<string>
  toggleContactSelection: (contactId: string) => void
  selectAllContacts: () => void
  clearSelection: () => void
  getSelectedContacts: () => InvestmentContact[]
  hasSelection: boolean
}

export const useContactView = (contacts: InvestmentContact[]): UseContactViewReturn => {
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())

  const toggleContactSelection = useCallback((contactId: string) => {
    setSelectedContacts(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(contactId)) {
        newSelection.delete(contactId)
      } else {
        newSelection.add(contactId)
      }
      return newSelection
    })
  }, [])

  const selectAllContacts = useCallback(() => {
    setSelectedContacts(new Set(contacts.map(contact => contact.id)))
  }, [contacts])

  const clearSelection = useCallback(() => {
    setSelectedContacts(new Set())
  }, [])

  const getSelectedContacts = useCallback(() => {
    return contacts.filter(contact => selectedContacts.has(contact.id))
  }, [contacts, selectedContacts])

  const hasSelection = selectedContacts.size > 0

  return {
    selectedContacts,
    toggleContactSelection,
    selectAllContacts,
    clearSelection,
    getSelectedContacts,
    hasSelection
  }
}
