import { useCallback, useEffect, useRef, useState } from 'react'
import type { SelectOption as ContactSelectOption } from '@/common/components/common-relations/selects/contact-select'
import type { SelectOption as AccountSelectOption } from '@/common/components/common-relations/selects/account-select'
import type { InvestmentAssociationSelectOption } from './types'

export function useActivityAssociationComboLists(
  contactSelectOptions: ContactSelectOption[],
  accountSelectOptions: AccountSelectOption[],
  investmentSelectOptions: InvestmentAssociationSelectOption[]
) {
  const fullContactsRef = useRef<ContactSelectOption[]>([])
  const [contactComboList, setContactComboList] = useState<ContactSelectOption[]>([])

  const fullAccountsRef = useRef<AccountSelectOption[]>([])
  const [accountComboList, setAccountComboList] = useState<AccountSelectOption[]>([])

  const fullInvestmentsRef = useRef<InvestmentAssociationSelectOption[]>([])
  const [investmentComboList, setInvestmentComboList] = useState<InvestmentAssociationSelectOption[]>([])

  useEffect(() => {
    fullContactsRef.current = contactSelectOptions
    setContactComboList(contactSelectOptions)
  }, [contactSelectOptions])

  useEffect(() => {
    fullAccountsRef.current = accountSelectOptions
    setAccountComboList(accountSelectOptions)
  }, [accountSelectOptions])

  useEffect(() => {
    fullInvestmentsRef.current = investmentSelectOptions
    setInvestmentComboList(investmentSelectOptions)
  }, [investmentSelectOptions])

  const searchLinkedContacts = useCallback((search: string) => {
    const q = search.trim().toLowerCase()
    const all = fullContactsRef.current
    if (!q) {
      setContactComboList(all)
      return
    }
    setContactComboList(
      all.filter(
        c =>
          (c.label || '').toLowerCase().includes(q) ||
          (c.name || '').toLowerCase().includes(q) ||
          (c.extraInfo?.email || '').toLowerCase().includes(q) ||
          (c.extraInfo?.phone || '').toLowerCase().includes(q)
      )
    )
  }, [])

  const searchLinkedAccounts = useCallback((search: string) => {
    const q = search.trim().toLowerCase()
    const all = fullAccountsRef.current
    if (!q) {
      setAccountComboList(all)
      return
    }
    setAccountComboList(
      all.filter(
        a =>
          (a.label || '').toLowerCase().includes(q) ||
          (a.name || '').toLowerCase().includes(q) ||
          (a.extraInfo?.email || '').toLowerCase().includes(q) ||
          (a.extraInfo?.phone || '').toLowerCase().includes(q) ||
          (a.extraInfo?.website || '').toLowerCase().includes(q) ||
          (a.extraInfo?.code || '').toLowerCase().includes(q)
      )
    )
  }, [])

  const searchLinkedInvestments = useCallback((search: string) => {
    const q = search.trim().toLowerCase()
    const all = fullInvestmentsRef.current
    if (!q) {
      setInvestmentComboList(all)
      return
    }
    setInvestmentComboList(
      all.filter(
        inv =>
          (inv.label || '').toLowerCase().includes(q) ||
          (inv.name || '').toLowerCase().includes(q) ||
          inv.id.toLowerCase().includes(q)
      )
    )
  }, [])

  return {
    contactComboList,
    accountComboList,
    investmentComboList,
    searchLinkedContacts,
    searchLinkedAccounts,
    searchLinkedInvestments
  }
}
