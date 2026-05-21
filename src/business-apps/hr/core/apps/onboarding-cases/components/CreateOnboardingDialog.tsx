/**
 * Create Onboarding Dialog
 *
 * Custom create dialog for onboarding cases with employee-specific fields.
 * Replaces the default CreateCaseDialog when used with CaseManagement.
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  DateInput,
  Label,
  Alert,
  AlertDescription,
  useTranslation
} from '@newwork/nw-design-system'
import { Loader2, UserPlus, User } from 'lucide-react'
import { CaseApiClient } from '@/business-apps/common/apps/case-management/services'
import { EmployeeSelect } from '@/components/employee-select'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { CreateOnboardingDialogProps, OnboardingMetadata } from '../types'
import translations from '../_i18n'

const getTodayDateInputValue = () => new Date().toISOString().split('T')[0]
const terminalOnboardingStatuses = new Set(['completed', 'cancelled', 'closed', 'resolved'])

const isActiveOnboardingCaseForEmployee = (
  metadata: Partial<OnboardingMetadata> | undefined,
  employeeId: string,
  employeeUserId?: string
) => {
  const status = String(metadata?.status || 'open').toLowerCase()
  if (terminalOnboardingStatuses.has(status)) return false

  const linkedToEmployee = metadata?.linkedEntities?.some(
    entity => entity.type === 'employee' && entity.id === employeeId
  )

  return (
    metadata?.employeeId === employeeId ||
    Boolean(employeeUserId && metadata?.employeeUserId === employeeUserId) ||
    linkedToEmployee
  )
}

const getNativeCaseStatus = (metadata: Partial<OnboardingMetadata> | undefined) =>
  String(metadata?.status || 'open').toLowerCase()

export const CreateOnboardingDialog: React.FC<CreateOnboardingDialogProps> = ({
  open,
  onOpenChange,
  onCaseCreated,
  defaultFlowTemplates,
  context,
  appTag,
  userId
}) => {
  const { t } = useTranslation(translations)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(getTodayDateInputValue)
  const { employees, loading: searchLoading, search, hasMore, loadMore } = useEmployeeSearch(context.accessToken)

  const selectedEmployee = useMemo(() => {
    return employees.find(employee => employee.id === selectedEmployeeId) || null
  }, [employees, selectedEmployeeId])

  const resetForm = useCallback(() => {
    setSelectedEmployeeId(null)
    setStartDate(getTodayDateInputValue())
    setError(null)
  }, [])

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      setError(t('hr-onboarding-validation-employee-required'))
      return
    }
    if (!startDate) {
      setError(t('hr-onboarding-validation-first-working-day-required'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const client = new CaseApiClient(undefined, context.accessToken)
      const employeeName =
        selectedEmployee.displayName || `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim()
      const jobPositionName = selectedEmployee.jobPositionName || '-'
      const organizationName = selectedEmployee.organizationalUnitName || '-'
      const existingCases = await client.getCasesList({
        tags: { app: appTag }
      })
      const activeCases = existingCases.cases.filter(caseItem => {
        const metadata = caseItem.state.metadata as Partial<OnboardingMetadata> | undefined
        return !terminalOnboardingStatuses.has(getNativeCaseStatus(metadata))
      })
      const existingActiveCase = (
        await Promise.all(
          activeCases.map(async caseItem => {
            const metadata = caseItem.state.metadata as Partial<OnboardingMetadata> | undefined
            if (isActiveOnboardingCaseForEmployee(metadata, selectedEmployee.id, selectedEmployee.userId)) {
              return caseItem
            }

            try {
              const linkedEntities = await client.getLinkedEntities(caseItem.caseId)
              return linkedEntities.some(entity => entity.type === 'employee' && entity.id === selectedEmployee.id)
                ? caseItem
                : null
            } catch (entityError) {
              console.error('Failed to check linked entities for onboarding duplicate:', entityError)
              return null
            }
          })
        )
      ).find(Boolean)

      if (existingActiveCase) {
        setError(t('hr-onboarding-validation-duplicate-active-case', { employeeName }))
        return
      }

      const caseMetadata = {
        title: `Onboarding: ${employeeName}`,
        description: `${jobPositionName} - ${organizationName}`,
        priority: 'high',
        status: 'open',
        dueDate: startDate
      } as const

      const result = await client.createCase({
        initiator: userId,
        tags: { app: appTag },
        metadata: caseMetadata
      })

      await client.linkEntity(
        result.caseId,
        {
          type: 'employee',
          id: selectedEmployee.id,
          name: employeeName,
          metadata: {
            employeeUserId: selectedEmployee.userId,
            jobPositionName,
            organizationalUnitId: selectedEmployee.organizationalUnitId,
            organizationName,
            startDate
          }
        },
        userId
      )

      // Auto-link flow templates if specified
      if (defaultFlowTemplates && defaultFlowTemplates.length > 0) {
        for (const templateId of defaultFlowTemplates) {
          try {
            await client.addFlowToCase(result.caseId, {
              templateId,
              initiator: userId,
              inputValues: {
                employeeId: selectedEmployee.id,
                employeeUserId: selectedEmployee.userId,
                employeeName,
                position: jobPositionName,
                department: organizationName,
                jobPositionName,
                organizationalUnitId: selectedEmployee.organizationalUnitId,
                organizationName,
                startDate,
                workLocation: 'office'
              }
            })
          } catch (flowError) {
            console.error(`Failed to auto-link flow template ${templateId}:`, flowError)
          }
        }
      }

      onCaseCreated(result.caseId)
      resetForm()
    } catch (err) {
      console.error('Failed to create onboarding case:', err)
      setError(err instanceof Error ? err.message : t('hr-onboarding-validation-create-failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gba:max-w-xl">
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <UserPlus className="gba:h-5 gba:w-5 gba:text-primary" />
            {t('hr-onboarding-create-title')}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="gba:space-y-4">
            <h4 className="gba:font-medium gba:text-sm gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground">
              <User className="gba:h-4 gba:w-4" />
              {t('hr-onboarding-common-employee')}
            </h4>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium">
                {t('hr-onboarding-common-select-employee')}
                <span className="gba:text-destructive gba:ml-1">*</span>
              </Label>
              <EmployeeSelect
                value={selectedEmployeeId}
                employees={employees}
                onValueChange={setSelectedEmployeeId}
                onSearch={search}
                accessToken={context.accessToken}
                loading={searchLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                placeholder={t('hr-onboarding-create-employee-select-placeholder')}
                searchPlaceholder={t('hr-onboarding-create-employee-search-placeholder')}
                data-testid="onboarding-employee-select"
              />
            </div>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium">
                {t('hr-onboarding-common-first-working-day')}
                <span className="gba:text-destructive gba:ml-1">*</span>
              </Label>
              <DateInput
                type="date"
                value={startDate}
                onChange={value => setStartDate(typeof value === 'string' ? value : '')}
                data-testid="onboarding-start-date-input"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            {t('hr-onboarding-create-cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />}
            {t('hr-onboarding-create-submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateOnboardingDialog
