import { useState } from 'react'
import { CatalogEntryWithConfig, TargetLevel } from '../types'
import { InvestmentCatalogData } from '@/common/data/investment/hooks/useInvestmentCatalogs'

export const useInvestmentDataPageState = () => {
  const [targetLevel, setTargetLevel] = useState<TargetLevel>('group')
  const [selectedGroup, setSelectedGroup] = useState<CatalogEntryWithConfig | null>(null)
  const [selectedType, setSelectedType] = useState<CatalogEntryWithConfig | null>(null)
  const [selectedLiquidFundType, setSelectedLiquidFundType] = useState<CatalogEntryWithConfig | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntryWithConfig | null>(null)
  const [catalogData, setCatalogData] = useState<InvestmentCatalogData | null>(null)
  const [configSection, setConfigSection] = useState<'form' | 'prospect' | 'tile'>('form')

  const getTypesForGroup = (groupId: string) => {
    if (!catalogData?.investmentTypes) return []
    return catalogData.investmentTypes.filter((type: any) => type.parentEntryId === groupId)
  }

  const getLiquidFundTypesForType = (typeId: string) => {
    if (!catalogData?.investmentLiquidFundTypes) return []
    return catalogData.investmentLiquidFundTypes.filter((lft: any) => lft.parentEntryId === typeId)
  }

  return {
    targetLevel,
    setTargetLevel,
    selectedGroup,
    setSelectedGroup,
    selectedType,
    setSelectedType,
    selectedLiquidFundType,
    setSelectedLiquidFundType,
    selectedEntry,
    setSelectedEntry,
    catalogData,
    setCatalogData,
    configSection,
    setConfigSection,
    getTypesForGroup,
    getLiquidFundTypesForType
  }
}
