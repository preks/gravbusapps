import { useCallback, useMemo, useReducer } from 'react'
import { CatalogEntryRaw, CatalogEntryWithConfig, TargetLevel } from '../types'
import { InvestmentCatalogData } from '@/common/data/investment/hooks/useInvestmentCatalogs'

type ConfigSection = 'form' | 'prospect' | 'tile'

interface State {
  targetLevel: TargetLevel
  selectedGroup: CatalogEntryWithConfig | null
  selectedType: CatalogEntryWithConfig | null
  selectedLiquidFundType: CatalogEntryWithConfig | null
  selectedEntry: CatalogEntryWithConfig | null
  catalogData: InvestmentCatalogData | null
  configSection: ConfigSection
}

type Action =
  | { type: 'SET_TARGET_LEVEL'; payload: TargetLevel }
  | { type: 'SET_SELECTED_GROUP'; payload: CatalogEntryWithConfig | null }
  | { type: 'SET_SELECTED_TYPE'; payload: CatalogEntryWithConfig | null }
  | { type: 'SET_SELECTED_LIQUID_FUND_TYPE'; payload: CatalogEntryWithConfig | null }
  | { type: 'SET_SELECTED_ENTRY'; payload: CatalogEntryWithConfig | null }
  | { type: 'SET_CATALOG_DATA'; payload: InvestmentCatalogData | null }
  | { type: 'SET_CONFIG_SECTION'; payload: ConfigSection }
  /** Atomic: pick a group, clear nested selections, point selectedEntry at it. */
  | { type: 'SELECT_GROUP'; payload: CatalogEntryWithConfig }
  /** Atomic: pick a type within the current group. */
  | { type: 'SELECT_TYPE'; payload: CatalogEntryWithConfig }
  /** Atomic: pick a liquid-fund type within the current type. */
  | { type: 'SELECT_LIQUID_FUND_TYPE'; payload: CatalogEntryWithConfig }
  /** Atomic: drop type+liquidFundType selections, point selectedEntry at the group. */
  | { type: 'SELECT_GENERAL_GROUP_SETTINGS' }

const initialState: State = {
  targetLevel: 'group',
  selectedGroup: null,
  selectedType: null,
  selectedLiquidFundType: null,
  selectedEntry: null,
  catalogData: null,
  configSection: 'form'
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_TARGET_LEVEL':
      return { ...state, targetLevel: action.payload }
    case 'SET_SELECTED_GROUP':
      return { ...state, selectedGroup: action.payload }
    case 'SET_SELECTED_TYPE':
      return { ...state, selectedType: action.payload }
    case 'SET_SELECTED_LIQUID_FUND_TYPE':
      return { ...state, selectedLiquidFundType: action.payload }
    case 'SET_SELECTED_ENTRY':
      return { ...state, selectedEntry: action.payload }
    case 'SET_CATALOG_DATA':
      return { ...state, catalogData: action.payload }
    case 'SET_CONFIG_SECTION':
      return { ...state, configSection: action.payload }
    case 'SELECT_GROUP':
      return {
        ...state,
        selectedGroup: action.payload,
        selectedType: null,
        selectedLiquidFundType: null,
        selectedEntry: action.payload,
        targetLevel: 'group'
      }
    case 'SELECT_TYPE':
      return {
        ...state,
        selectedType: action.payload,
        selectedLiquidFundType: null,
        selectedEntry: action.payload,
        targetLevel: 'type'
      }
    case 'SELECT_LIQUID_FUND_TYPE':
      return {
        ...state,
        selectedLiquidFundType: action.payload,
        selectedEntry: action.payload,
        targetLevel: 'liquidFundType'
      }
    case 'SELECT_GENERAL_GROUP_SETTINGS':
      return {
        ...state,
        selectedType: null,
        selectedLiquidFundType: null,
        selectedEntry: state.selectedGroup,
        targetLevel: 'group'
      }
    default:
      return state
  }
}

export const useInvestmentDataPageState = () => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setTargetLevel = useCallback((payload: TargetLevel) => dispatch({ type: 'SET_TARGET_LEVEL', payload }), [])
  const setSelectedGroup = useCallback(
    (payload: CatalogEntryWithConfig | null) => dispatch({ type: 'SET_SELECTED_GROUP', payload }),
    []
  )
  const setSelectedType = useCallback(
    (payload: CatalogEntryWithConfig | null) => dispatch({ type: 'SET_SELECTED_TYPE', payload }),
    []
  )
  const setSelectedLiquidFundType = useCallback(
    (payload: CatalogEntryWithConfig | null) => dispatch({ type: 'SET_SELECTED_LIQUID_FUND_TYPE', payload }),
    []
  )
  const setSelectedEntry = useCallback(
    (payload: CatalogEntryWithConfig | null) => dispatch({ type: 'SET_SELECTED_ENTRY', payload }),
    []
  )
  const setCatalogData = useCallback(
    (payload: InvestmentCatalogData | null) => dispatch({ type: 'SET_CATALOG_DATA', payload }),
    []
  )
  const setConfigSection = useCallback(
    (payload: ConfigSection) => dispatch({ type: 'SET_CONFIG_SECTION', payload }),
    []
  )

  const selectGroup = useCallback((payload: CatalogEntryWithConfig) => dispatch({ type: 'SELECT_GROUP', payload }), [])
  const selectType = useCallback((payload: CatalogEntryWithConfig) => dispatch({ type: 'SELECT_TYPE', payload }), [])
  const selectLiquidFundType = useCallback(
    (payload: CatalogEntryWithConfig) => dispatch({ type: 'SELECT_LIQUID_FUND_TYPE', payload }),
    []
  )
  const selectGeneralGroupSettings = useCallback(() => dispatch({ type: 'SELECT_GENERAL_GROUP_SETTINGS' }), [])

  const getTypesForGroup = useCallback(
    (groupId: string): CatalogEntryRaw[] => {
      if (!state.catalogData?.investmentTypes) return []
      return state.catalogData.investmentTypes.filter(type => type.parentEntryId === groupId)
    },
    [state.catalogData?.investmentTypes]
  )

  const getLiquidFundTypesForType = useCallback(
    (typeId: string): CatalogEntryRaw[] => {
      if (!state.catalogData?.investmentLiquidFundTypes) return []
      return state.catalogData.investmentLiquidFundTypes.filter(lft => lft.parentEntryId === typeId)
    },
    [state.catalogData?.investmentLiquidFundTypes]
  )

  return useMemo(
    () => ({
      ...state,
      setTargetLevel,
      setSelectedGroup,
      setSelectedType,
      setSelectedLiquidFundType,
      setSelectedEntry,
      setCatalogData,
      setConfigSection,
      selectGroup,
      selectType,
      selectLiquidFundType,
      selectGeneralGroupSettings,
      getTypesForGroup,
      getLiquidFundTypesForType
    }),
    [
      state,
      setTargetLevel,
      setSelectedGroup,
      setSelectedType,
      setSelectedLiquidFundType,
      setSelectedEntry,
      setCatalogData,
      setConfigSection,
      selectGroup,
      selectType,
      selectLiquidFundType,
      selectGeneralGroupSettings,
      getTypesForGroup,
      getLiquidFundTypesForType
    ]
  )
}
