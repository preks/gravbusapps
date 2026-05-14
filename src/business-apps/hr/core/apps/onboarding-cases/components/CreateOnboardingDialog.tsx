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
  Label,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { Loader2, UserPlus, User } from 'lucide-react'
import { CaseApiClient } from '@/business-apps/common/apps/case-management/services'
import { EmployeeSelect } from '@/components/employee-select'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { CreateOnboardingDialogProps, OnboardingMetadata } from '../types'

export const CreateOnboardingDialog: React.FC<CreateOnboardingDialogProps> = ({
  open,
  onOpenChange,
  onCaseCreated,
  defaultFlowTemplates,
  context,
  appTag,
  userId
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const { employees, loading: searchLoading, search, hasMore, loadMore } = useEmployeeSearch(context.accessToken)

  const selectedEmployee = useMemo(() => {
    return employees.find(employee => employee.id === selectedEmployeeId) || null
  }, [employees, selectedEmployeeId])

  const resetForm = useCallback(() => {
    setSelectedEmployeeId(null)
    setError(null)
  }, [])

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      setError('Please select an employee for onboarding')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const client = new CaseApiClient(undefined, context.accessToken)
      const employeeName =
        selectedEmployee.displayName || `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim()
      const position = selectedEmployee.jobPositionName || '-'
      const department = selectedEmployee.organizationalUnitName || '-'
      const startDate = new Date().toISOString().split('T')[0]

      // Create metadata for the onboarding case
      const metadata: OnboardingMetadata = {
        title: `Onboarding: ${employeeName}`,
        description: `${position} - ${department}`,
        priority: 'high',
        status: 'open',
        dueDate: startDate,
        linkedEntities: [
          {
            type: 'employee',
            id: selectedEmployee.id,
            name: employeeName
          }
        ],
        // Onboarding-specific fields
        employeeName,
        position,
        department,
        startDate,
        workLocation: 'office',
        onboardingStage: 'pre_arrival'
      }

      // Create the case
      const result = await client.createCase({
        initiator: userId,
        tags: { app: appTag },
        metadata
      })

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
                position,
                department,
                startDate,
                workLocation: 'office'
              }
            })
          } catch (flowError) {
            console.error(`Failed to auto-link flow template ${templateId}:`, flowError)
          }
        }
      }

      // Notify parent of successful creation
      onCaseCreated(result.caseId, metadata)
      resetForm()
    } catch (err) {
      console.error('Failed to create onboarding case:', err)
      setError(err instanceof Error ? err.message : 'Failed to create onboarding case')
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
            Start New Employee Onboarding
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
              Employee
            </h4>

            <div className="gba:space-y-2">
              <Label className="gba:text-sm gba:font-medium">
                Select employee
                <span className="gba:text-destructive gba:ml-1">*</span>
              </Label>
              <EmployeeSelect
                value={selectedEmployeeId}
                employees={employees}
                onValueChange={setSelectedEmployeeId}
                onSearch={search}
                loading={searchLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                placeholder="Select employee for onboarding"
                searchPlaceholder="Search by name..."
                data-testid="onboarding-employee-select"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />}
            Start Onboarding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateOnboardingDialog
