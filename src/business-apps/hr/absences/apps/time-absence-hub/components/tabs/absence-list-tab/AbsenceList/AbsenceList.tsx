import React, { useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../../../common/utils/windowUtils'
import { AbsenceListTable } from './AbsenceListTable'
import type { EnhancedAbsence } from '../../../../types'
import { useAbsenceFilters, useAbsenceData } from '../../../../hooks'
import { cancelEmployeeAbsence } from '@/business-apps/hr/absences/utils/cancelEmployeeAbsence'

interface AbsenceListProps extends BusinessAppContextProps {
  initialFilters?: {
    startDate?: string
    endDate?: string
    status?: string
    department?: string
    departmentId?: string
  }
  headerAction?: React.ReactNode
  onDataChange?: (data: {
    absences: EnhancedAbsence[]
    total: number
    isFiltered: boolean
    appliedFilters: {
      search?: string
      selectedFilters: string[]
      dateRange?: { startDate?: string; endDate?: string }
      creationDateRange?: { startDate?: string; endDate?: string }
    }
  }) => void
  onOpenEmployeeRecord?: (employeeId: string) => void
}

export const AbsenceList: React.FC<AbsenceListProps> = props => {
  const { accessToken, initialFilters, headerAction, onDataChange, onOpenEmployeeRecord } = props

  const filters = useAbsenceFilters({ accessToken, initialFilters })
  const data = useAbsenceData({
    accessToken,
    filters,
    onDataChange
  })

  const absencesWithUpdatedGroups = useMemo(() => {
    return data.absences.map(absence => ({
      ...absence,
      groupName:
        (absence.type?.parentEntryId && filters.absenceGroups[absence.type.parentEntryId]) ||
        absence.type?.value ||
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.absence_list.unknown_group',
          'Unknown Group'
        )
    }))
  }, [data.absences, filters.absenceGroups])

  const handleRequestCancellation = useCallback(
    async (absence: EnhancedAbsence) => {
      if (!accessToken) {
        throw new Error('Access token missing')
      }

      await cancelEmployeeAbsence(accessToken, absence.cancelSnapshot)
      await data.fetchAbsences()
      globalThis.setTimeout(() => {
        data.fetchAbsences().catch(() => {})
      }, 3000)
    },
    [accessToken, data.fetchAbsences]
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="backoffice-absence-list-modern-content">
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:px-2 gba:pt-2">
        <div className="gba:flex gba:items-center gba:gap-2">
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.absences', 'Absences')}
          </h2>
          <span className="gba:text-lg gba:font-semibold gba:text-muted-foreground">({data.total})</span>
        </div>
        {headerAction}
      </div>
      <AbsenceListTable
        absences={absencesWithUpdatedGroups}
        loading={data.loading}
        error={data.error}
        total={data.total}
        currentPage={data.currentPage}
        pageSize={data.pageSize}
        sortField={data.sortField}
        sortOrder={data.sortOrder}
        onSort={data.handleSort}
        onPaginationChange={data.handlePaginationChange}
        onRequestCancellation={handleRequestCancellation}
        onOpenEmployeeRecord={onOpenEmployeeRecord}
      />
    </div>
  )
}
