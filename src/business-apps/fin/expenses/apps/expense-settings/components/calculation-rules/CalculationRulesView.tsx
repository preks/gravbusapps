import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FileTextIcon, UsersIcon } from '@phosphor-icons/react'
import ExpenseCalculationRules from './rules-list/ExpenseCalculationRules'
import CalculationRuleAssignmentList from './CalculationRuleAssignmentList'
import CalculationRuleRecord from '../calculation-rule-record/CalculationRuleRecord'
import { useExpenseSettingsIntegration } from '../../hooks/useExpenseSettingsIntegration'

export interface CalculationRulesViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const CalculationRulesView: React.FC<CalculationRulesViewProps> = context => {
  const { prefixDataTestId = '' } = context

  // Get tab and ruleId from URL query parameters
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('tab')
    return tabFromUrl === 'assignments' ? 'assignments' : 'rules'
  }

  const getInitialRuleId = () => {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('ruleId') || null
  }

  const [activeTab, setActiveTab] = useState<string>(getInitialTab())
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(getInitialRuleId())

  // Track if assignments data has been loaded
  const assignmentsLoadedRef = useRef(false)

  // Data integration hook (for assignments tab) - with lazy loading
  const {
    assignments,
    totalAssignments,
    rules,
    isLoading,
    refetch,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    searchAssignments
  } = useExpenseSettingsIntegration(context, {
    // Only auto-load data when on assignments tab or when previously loaded
    skipInitialLoad: activeTab !== 'assignments' && !assignmentsLoadedRef.current
  })

  // Update URL when tab or ruleId changes
  const updateUrl = useCallback((tab: string, ruleId?: string | null) => {
    const urlParams = new URLSearchParams(window.location.search)
    urlParams.set('tab', tab)

    if (ruleId) {
      urlParams.set('ruleId', ruleId)
    } else {
      urlParams.delete('ruleId')
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.pushState({}, '', newUrl)
  }, [])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setSelectedRuleId(null) // Clear selected rule when changing tabs
    updateUrl(tab, null)

    // Load assignments data when switching to assignments tab for the first time
    if (tab === 'assignments' && !assignmentsLoadedRef.current) {
      assignmentsLoadedRef.current = true
      refetch()
    }
  }

  // Handle rule selection from the list
  const handleRuleSelect = useCallback(
    (ruleId: string) => {
      setSelectedRuleId(ruleId)
      updateUrl(activeTab, ruleId)
    },
    [activeTab, updateUrl]
  )

  // Handle navigating back to the list
  const handleNavigateBack = useCallback(() => {
    setSelectedRuleId(null)
    updateUrl(activeTab, null)
  }, [activeTab, updateUrl])

  // Ensure URL always has tab parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('tab')) {
      updateUrl(activeTab, selectedRuleId)
    }
  }, [activeTab, selectedRuleId, updateUrl])

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialTab()
      const newRuleId = getInitialRuleId()
      setActiveTab(newTab)
      setSelectedRuleId(newRuleId)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // If a rule is selected, show the detail view
  if (selectedRuleId) {
    return (
      <CalculationRuleRecord {...context} ruleId={selectedRuleId} page="Rules" onNavigateBack={handleNavigateBack} />
    )
  }

  return (
    <div data-testid={`${prefixDataTestId}-calculation-rules-view`} className="gba:p-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-2 gba:max-w-md">
          <TabsTrigger value="rules" startIcon={<FileTextIcon />} data-testid="calculation-rules-rules-tab">
            {getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.rules.title', 'Rules')}
          </TabsTrigger>
          <TabsTrigger value="assignments" startIcon={<UsersIcon />} data-testid="calculation-rules-assignments-tab">
            {getTranslationFromI18nKeyAndLabel('expenseSettings.calculationRules.assignments.title', 'Assignments')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="gba:mt-6">
          <ExpenseCalculationRules {...context} onRuleSelect={handleRuleSelect} />
        </TabsContent>

        <TabsContent value="assignments" className="gba:mt-6">
          <CalculationRuleAssignmentList
            {...context}
            assignments={assignments}
            totalAssignments={totalAssignments}
            rules={rules}
            isLoading={isLoading}
            onCreate={createAssignment}
            onUpdate={updateAssignment}
            onDelete={deleteAssignment}
            onSearch={searchAssignments}
            onRefresh={refetch}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CalculationRulesView
