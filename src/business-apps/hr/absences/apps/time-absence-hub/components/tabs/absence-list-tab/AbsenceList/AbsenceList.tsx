import React, { useMemo, useState } from 'react'
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../../../common/utils/windowUtils'
import { toast } from 'sonner'
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
    departmentIds?: string[]
    locationIds?: string[]
    legalEntityIds?: string[]
    managerIds?: string[]
    employeeQuery?: string
    absenceTypeIds?: string[]
    statusIds?: string[]
  }
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
  const { accessToken, initialFilters, onDataChange, onOpenEmployeeRecord } = props
  const [cancellingAbsenceId, setCancellingAbsenceId] = useState<string | null>(null)
  const [locallyCancelledAbsenceIds, setLocallyCancelledAbsenceIds] = useState<Set<string>>(() => new Set())

  const filters = useAbsenceFilters({ accessToken, initialFilters })
  const data = useAbsenceData({
    accessToken,
    filters,
    onDataChange
  })

  const tt = (key: string, fallback: string) =>
    getTranslationFromI18nKeyAndLabel(`lowcoder:time_absence_hub.absences.${key}`, fallback)

  const handleCancelAbsence = async (absence: EnhancedAbsence) => {
    setCancellingAbsenceId(absence.id)

    try {
      await cancelEmployeeAbsence(accessToken, absence.cancelSnapshot)
      setLocallyCancelledAbsenceIds(previousIds => new Set(previousIds).add(absence.id))
      toast.success(tt('cancel_request_success', 'Absence request cancelled'))
      void data.fetchAbsences()
      globalThis.setTimeout(() => {
        void data.fetchAbsences()
      }, 3000)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : tt('cancel_request_error', 'Failed to cancel absence request')
      toast.error(message)
    } finally {
      setCancellingAbsenceId(null)
    }
  }

  const absencesWithUpdatedGroups = useMemo(() => {
    return data.absences.map(absence => ({
      ...absence,
      status: locallyCancelledAbsenceIds.has(absence.id) ? 'CANCELLED' : absence.status,
      cancelSnapshot: locallyCancelledAbsenceIds.has(absence.id)
        ? { ...absence.cancelSnapshot, status: 'CANCELLED' }
        : absence.cancelSnapshot,
      groupName:
        (absence.type?.parentEntryId && filters.absenceGroups[absence.type.parentEntryId]) ||
        absence.type?.value ||
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.absence_list.unknown_group',
          'Unknown Group'
        )
    }))
  }, [data.absences, filters.absenceGroups, locallyCancelledAbsenceIds])

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="backoffice-absence-list-modern-content">
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
        cancellingAbsenceId={cancellingAbsenceId}
        onCancelAbsence={handleCancelAbsence}
        onOpenEmployeeRecord={onOpenEmployeeRecord}
      />
    </div>
  )
}
