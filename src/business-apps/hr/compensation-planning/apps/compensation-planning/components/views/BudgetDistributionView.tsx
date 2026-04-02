import React, { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useTeamCompensationData } from '../../../manager-compensation-planning/hooks/useTeamCompensationData'
import type { DistributionMethod } from '../../../../types/compensationPlanningTypes'
import translations from '../../_i18n'
import { BudgetDistributionOrgUnitTable } from './BudgetDistributionOrgUnitTable'
import { BudgetDistributionMethodSelector } from './BudgetDistributionMethodSelector'
import { useBudgetDistributionOrgUnitBudget } from '../../hooks/useBudgetDistributionOrgUnitBudget'

interface BudgetDistributionViewProps {
  accessToken: string
  companyId: string
}

interface BudgetDistributionState {
  selectedMethod: DistributionMethod
  setDistributionMethod: (method: DistributionMethod) => void
}

const useBudgetDistributionStore = create<BudgetDistributionState>(set => ({
  selectedMethod: 'proportional_headcount',
  setDistributionMethod: method => set({ selectedMethod: method })
}))

const ORG_UNIT_LIST_LIMIT = 500
const ALL_ORG_UNITS_VALUE = '__all__'

/** Set to `true` to disable changing the distribution method (previous read-only behaviour). */
const LOCK_DISTRIBUTION_METHOD_SELECTION = false

export const BudgetDistributionView: React.FC<BudgetDistributionViewProps> = ({ accessToken, companyId }) => {
  const { t } = useTranslation(translations)
  const { selectedMethod, setDistributionMethod } = useBudgetDistributionStore()
  const [selectedOrgUnitId, setSelectedOrgUnitId] = useState<string>(ALL_ORG_UNITS_VALUE)

  const { units: companyOrgUnits, loading: loadingOrgUnits } = useCompanyOrganizationalUnits(
    accessToken,
    companyId,
    ORG_UNIT_LIST_LIMIT
  )

  const sortedOrgUnits = useMemo(
    () => [...companyOrgUnits].sort((a, b) => a.name.localeCompare(b.name)),
    [companyOrgUnits]
  )

  useEffect(() => {
    setSelectedOrgUnitId(ALL_ORG_UNITS_VALUE)
  }, [companyId])

  const {
    teamMembers,
    loading: loadingTeam,
    error: teamError
  } = useTeamCompensationData({
    accessToken,
    companyId
  })

  const currentSalaryCost = useMemo(
    () => teamMembers.reduce((sum, m) => sum + (m.currentAnnualSalary ?? 0), 0),
    [teamMembers]
  )

  const currencyCode = teamMembers[0]?.currency ?? 'EUR'

  const {
    rows,
    loading: loadingOrgUnitBudgets,
    error: orgUnitBudgetError,
    selectedBudgetPlanId
  } = useBudgetDistributionOrgUnitBudget(accessToken, companyId, companyOrgUnits)

  const filteredRows = useMemo(() => {
    if (selectedOrgUnitId === ALL_ORG_UNITS_VALUE) {
      return rows
    }
    return rows.filter(r => r.organizationalUnitId === selectedOrgUnitId)
  }, [rows, selectedOrgUnitId])

  const tableLoading = loadingTeam || loadingOrgUnits || loadingOrgUnitBudgets
  const tableError = orgUnitBudgetError ?? teamError ?? null

  return (
    <div className="gba:space-y-4" data-testid="budget-distribution-view">
      <div className="gba:flex gba:flex-col gba:gap-2">
        <label
          className="gba:text-sm gba:font-medium gba:text-foreground"
          htmlFor="budget-distribution-org-unit-select"
        >
          {t('budget-distribution-org-unit-select-label')}
        </label>
        <Select value={selectedOrgUnitId} onValueChange={setSelectedOrgUnitId} disabled={loadingOrgUnits}>
          <SelectTrigger
            id="budget-distribution-org-unit-select"
            className="gba:w-full gba:max-w-md"
            data-testid="budget-distribution-org-unit-select"
          >
            <SelectValue placeholder={t('budget-distribution-org-unit-select-placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ORG_UNITS_VALUE}>{t('budget-distribution-org-unit-select-all')}</SelectItem>
            {sortedOrgUnits.map(unit => (
              <SelectItem key={unit.id} value={unit.id}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <BudgetDistributionMethodSelector
        selectedMethod={selectedMethod}
        onMethodChange={setDistributionMethod}
        disabled={LOCK_DISTRIBUTION_METHOD_SELECTION}
        sectionTitle={t('budget-distribution-method-section-title')}
        sectionDescription={t('budget-distribution-method-section-description')}
        t={t}
      />

      <BudgetDistributionOrgUnitTable
        sourceRows={filteredRows}
        teamSalaryBaseline={currentSalaryCost}
        currencyCode={currencyCode}
        loading={tableLoading}
        error={tableError}
        hasSelectedPlan={selectedBudgetPlanId != null}
      />
    </div>
  )
}
