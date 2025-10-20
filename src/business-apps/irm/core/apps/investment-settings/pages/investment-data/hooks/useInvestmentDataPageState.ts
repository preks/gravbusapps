import { useState } from 'react'
import { CatalogEntryWithConfig, TargetLevel } from '../types'
import { InvestmentCatalogData } from '@/business-apps/irm/investments/forms/investment-form/queries/InvestmentCatalogQueries'

export const useInvestmentDataPageState = () => {
  const [targetLevel, setTargetLevel] = useState<TargetLevel>('group')
  const [selectedGroup, setSelectedGroup] = useState<CatalogEntryWithConfig | null>(null)
  const [selectedType, setSelectedType] = useState<CatalogEntryWithConfig | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntryWithConfig | null>(null)
  const [catalogData, setCatalogData] = useState<InvestmentCatalogData | null>(null)
  const [configSection, setConfigSection] = useState<'form' | 'prospect' | 'tile'>('form')

  const getTypesForGroup = (groupId: string) => {
    if (!catalogData?.investmentTypes) return []
    return catalogData.investmentTypes.filter((type: any) => type.parentEntryId === groupId)
  }

  return {
    targetLevel,
    setTargetLevel,
    selectedGroup,
    setSelectedGroup,
    selectedType,
    setSelectedType,
    selectedEntry,
    setSelectedEntry,
    catalogData,
    setCatalogData,
    configSection,
    setConfigSection,
    getTypesForGroup
  }
}
