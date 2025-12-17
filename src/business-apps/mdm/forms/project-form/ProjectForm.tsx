import React, { Dispatch, SetStateAction, useState, useEffect, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FormWrapperModal } from '@/components/form-wrapper'
import {
  Input,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Combobox,
  DateInput,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Icon
} from '@newwork/nw-design-system'
import { WarningIcon } from '@phosphor-icons/react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import type { Project } from '../../apps/project-management/types'
import { ProjectStatusBE, ProjectStatusUI } from '../../apps/project-management/types'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useTranslation } from 'react-i18next'
import { Account } from '../../apps/project-management/hooks/useProjects'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { EmployeeSelect } from '@/components/employee-select'
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch'
import { useFormContext, ControllerRenderProps } from 'react-hook-form'

const DATA_TEST_ID_PREFIX = 'ProjectForm'

// Separate component to handle status field with proper hook usage
interface StatusSelectProps {
  field: ControllerRenderProps<any, 'status'>
  dataTestId: string
  t: (key: string, options?: { defaultValue: string }) => string
  onStatusChangeRequest: (newStatus: ProjectStatusBE, previousStatus: ProjectStatusBE) => void
}

const StatusSelect: React.FC<StatusSelectProps> = ({ field, dataTestId, t, onStatusChangeRequest }) => {
  const { setValue } = useFormContext()

  const handleStatusChange = (value: string) => {
    const newStatus = value as ProjectStatusBE

    // Check if user is trying to set CANCELLED or COMPLETED
    if (newStatus === ProjectStatusBE.CANCELLED || newStatus === ProjectStatusBE.COMPLETED) {
      // Pass to parent for confirmation dialog
      onStatusChangeRequest(newStatus, field.value as ProjectStatusBE)
    } else {
      // For other statuses, update directly
      setValue('status', newStatus, { shouldValidate: true, shouldDirty: true })
    }
  }

  return (
    <Select onValueChange={handleStatusChange} value={field.value} data-testid={`${dataTestId}-status-select`}>
      <SelectTrigger>
        <SelectValue
          placeholder={t('forms.project.fields.status.placeholder', {
            defaultValue: 'Select project status'
          })}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ProjectStatusBE.PLANNED}>
          {t('forms.project.fields.status.options.planned', {
            defaultValue: 'Planned'
          })}
        </SelectItem>
        <SelectItem value={ProjectStatusBE.IN_PROGRESS}>
          {t('forms.project.fields.status.options.inProgress', {
            defaultValue: 'In Progress'
          })}
        </SelectItem>
        <SelectItem value={ProjectStatusBE.ON_HOLD}>
          {t('forms.project.fields.status.options.onHold', {
            defaultValue: 'On Hold'
          })}
        </SelectItem>
        <SelectItem value={ProjectStatusBE.CANCELLED}>
          {t('forms.project.fields.status.options.canceled', {
            defaultValue: 'Canceled'
          })}
        </SelectItem>
        <SelectItem value={ProjectStatusBE.COMPLETED}>
          {t('forms.project.fields.status.options.completed', {
            defaultValue: 'Completed'
          })}
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

// Separate component for confirmation dialog with proper hook usage
interface ConfirmStatusDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  pendingStatus: ProjectStatusBE | null
  previousStatusValue: ProjectStatusBE | null
  onClose: () => void
  dataTestId: string
  t: (key: string, options?: { defaultValue: string }) => string
}

const ConfirmStatusDialog: React.FC<ConfirmStatusDialogProps> = ({
  isOpen,
  onOpenChange,
  pendingStatus,
  previousStatusValue,
  onClose,
  dataTestId,
  t
}) => {
  const { setValue } = useFormContext()

  const handleCancel = () => {
    // Restore previous status if user cancels
    if (previousStatusValue) {
      setValue('status', previousStatusValue, { shouldValidate: true, shouldDirty: true })
    }
    onClose()
  }

  const handleConfirm = () => {
    if (pendingStatus) {
      // Update the form field with the confirmed status
      setValue('status', pendingStatus, { shouldValidate: true, shouldDirty: true })
    }
    onClose()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Restore previous status if dialog is closed without confirmation
      if (previousStatusValue) {
        setValue('status', previousStatusValue, { shouldValidate: true, shouldDirty: true })
      }
      onClose()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <style>{`
        
      `}</style>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Icon icon={WarningIcon} className="gba:text-warning" />
            {pendingStatus === ProjectStatusBE.CANCELLED
              ? t('forms.project.dialog.cancelTitle', { defaultValue: 'Cancel Project' })
              : t('forms.project.dialog.completeTitle', { defaultValue: 'Complete Project' })}
          </DialogTitle>
          <DialogDescription>
            {pendingStatus === ProjectStatusBE.CANCELLED
              ? t('forms.project.dialog.cancelMessage', {
                  defaultValue:
                    'Are you sure you want to cancel this project? Once canceled, the project cannot be modified and this action cannot be undone.'
                })
              : t('forms.project.dialog.completeMessage', {
                  defaultValue:
                    'Are you sure you want to complete this project? Once completed, the project cannot be modified and this action cannot be undone.'
                })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} data-testid={`${dataTestId}-status-confirm-cancel-button`}>
            {t('forms.project.dialog.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} data-testid={`${dataTestId}-status-confirm-button`}>
            {pendingStatus === ProjectStatusBE.CANCELLED
              ? t('forms.project.dialog.confirmCancel', { defaultValue: 'Yes, Cancel Project' })
              : t('forms.project.dialog.confirmComplete', { defaultValue: 'Yes, Complete Project' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

// Helper function to transform UI status to BE status
const transformUIStatusToBE = (uiStatus: ProjectStatusUI): ProjectStatusBE => {
  switch (uiStatus) {
    case ProjectStatusUI.Planned:
      return ProjectStatusBE.PLANNED
    case ProjectStatusUI.InProgress:
      return ProjectStatusBE.IN_PROGRESS
    case ProjectStatusUI.OnHold:
      return ProjectStatusBE.ON_HOLD
    case ProjectStatusUI.Canceled:
      return ProjectStatusBE.CANCELLED
    case ProjectStatusUI.Completed:
      return ProjectStatusBE.COMPLETED
    default:
      return ProjectStatusBE.IN_PROGRESS
  }
}

// Helper function to get closure date for statuses that require it
export const getClosureDate = (status: ProjectStatusBE): string | undefined => {
  if (status === ProjectStatusBE.CANCELLED || status === ProjectStatusBE.COMPLETED) {
    return new Date().toISOString()
  }
  return undefined
}

// Helper function to format date to ISO string with milliseconds
export const formatDateToISO = (date: Date | string | undefined): string | undefined => {
  if (!date) return undefined

  if (date instanceof Date) {
    return date.toISOString()
  }

  if (typeof date === 'string') {
    // If already in ISO format with T and Z, use as is
    if (date.includes('T') && (date.includes('Z') || date.includes('+'))) {
      return date
    }
    // If it's a date string without time, add time component
    const dateObj = new Date(date)
    if (!Number.isNaN(dateObj.getTime())) {
      return dateObj.toISOString()
    }
  }

  return undefined
}

// Zod validation schema
const projectFormSchema = z
  .object({
    name: z.string({ message: 'Project name is required' }).min(1, 'Project name is required'),
    description: z.string().optional(),
    projectType: z.enum(['INTERNAL', 'EXTERNAL'], {
      message: 'Project type is required'
    }),
    customerId: z.string().optional(),
    projectManagerId: z.string().optional(),
    hoursBudget: z.coerce.number().min(0, 'Effort must be a positive number').optional(),
    validFrom: z.string({ message: 'Valid from date is required' }).min(1, 'Valid from date is required'),
    validTo: z.string({ message: 'Valid to date is required' }).min(1, 'Valid to date is required'),
    status: z.enum(ProjectStatusBE, {
      message: 'Project status is required'
    })
  })
  .refine(
    data => {
      // If project type is EXTERNAL, customerId is required
      if (data.projectType === 'EXTERNAL') {
        return !!data.customerId && data.customerId.length > 0
      }
      return true
    },
    {
      message: 'Customer account is required for external projects',
      path: ['customerId']
    }
  )
  .refine(
    data => {
      // Validate that validFrom is before or equal to validTo
      if (data.validFrom && data.validTo) {
        const fromDate = new Date(data.validFrom)
        const toDate = new Date(data.validTo)
        return fromDate <= toDate
      }
      return true
    },
    {
      message: 'Valid from date must be before or equal to valid to date',
      path: ['validFrom']
    }
  )
  .refine(
    data => {
      // PLANNED: validFrom must be in the future
      if (data.status === ProjectStatusBE.PLANNED && data.validFrom) {
        const validFromDate = new Date(data.validFrom)
        const now = new Date()
        return validFromDate > now
      }
      return true
    },
    {
      message: 'For Planned status, Valid From date must be in the future',
      path: ['validFrom']
    }
  )
  .refine(
    data => {
      // IN_PROGRESS: validFrom cannot be in the future
      if (data.status === ProjectStatusBE.IN_PROGRESS && data.validFrom) {
        const validFromDate = new Date(data.validFrom)
        const now = new Date()
        return validFromDate <= now
      }
      return true
    },
    {
      message: 'For In Progress status, Valid From date cannot be in the future',
      path: ['validFrom']
    }
  )

export interface ProjectFormProps extends BusinessAppContextProps {
  project?: Project
  onCancel?: () => void
  prefixDataTestId?: string
  childAddButton?: React.ReactNode
  refetch: () => void
  isDrawerActive?: boolean
  structureId: string
  open?: boolean
  setOpen?: Dispatch<SetStateAction<boolean>>
  parentNodeId?: string
  accounts: Account[]
  /** Callback when project status changes to CANCELLED or COMPLETED (for cleanup: reset allocations + delete team) */
  onProjectClosed?: (matrixUnitId: string) => Promise<void>
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  project,
  onCancel,
  prefixDataTestId,
  childAddButton,
  accessToken,
  refetch,
  isDrawerActive = false,
  structureId,
  open,
  setOpen,
  accounts,
  onProjectClosed
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(ORGCHART_BASE_URL)
  const { t } = useTranslation('master-data')

  const [loading, setLoading] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [projectType, setProjectType] = useState<string>(project?.projectType || '')
  const [accountSearchTerm, setAccountSearchTerm] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<ProjectStatusBE | null>(null)
  const [previousStatusValue, setPreviousStatusValue] = useState<ProjectStatusBE | null>(null)
  const { employees, loading: searchLoading, search, hasMore, loadMore } = useEmployeeSearch(accessToken)

  // Handler for status change request (when user tries to set CANCELLED or COMPLETED)
  const handleStatusChangeRequest = useCallback((newStatus: ProjectStatusBE, previousStatus: ProjectStatusBE) => {
    setPreviousStatusValue(previousStatus)
    setPendingStatus(newStatus)
    setIsConfirmDialogOpen(true)
  }, [])

  const accountOptions = useMemo(() => {
    return accounts
      .filter(account => account.name?.toLowerCase().includes(accountSearchTerm.toLowerCase()))
      .map(account => ({
        value: account.id,
        label: account.name
      }))
  }, [accounts, accountSearchTerm])

  useEffect(() => {
    setSelectedAccountId(null)
  }, [projectType])

  useEffect(() => {
    if (project) {
      setProjectType(project.projectType || '')
      if (project.customerId) {
        const account = accounts.find(acc => acc.id === project.customerId)
        setSelectedAccountId(account?.id || null)
      }
    }
  }, [project, accounts])

  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      setLoading(true)

      // Format dates to ISO string with milliseconds (e.g., "2025-11-27T11:35:45.750Z")
      const formattedValidFrom = formatDateToISO(
        values.validFrom instanceof Date ? values.validFrom : (values.validFrom as string)
      )
      const formattedValidTo = formatDateToISO(
        values.validTo instanceof Date ? values.validTo : (values.validTo as string)
      )

      // Get status from form (already in BE format)
      const status = values.status as ProjectStatusBE

      // Get closure date if status requires it
      const closureDate = getClosureDate(status)

      // Check if we need to close the project (reset allocations + delete team)
      const isClosingProject =
        project &&
        (status === ProjectStatusBE.CANCELLED || status === ProjectStatusBE.COMPLETED) &&
        project.matrixTeam?.matrixId &&
        (project.matrixTeam?.teamMembersCount ?? 0) > 0

      // If closing project with team members, handle cleanup first
      if (isClosingProject && onProjectClosed && project.matrixTeam?.matrixId) {
        await onProjectClosed(project.matrixTeam.matrixId)
      }

      const projectData = {
        name: values.name,
        description: values.description,
        projectType: values.projectType,
        hoursBudget: values.hoursBudget,
        validFrom: formattedValidFrom,
        validTo: formattedValidTo,
        structureId: structureId,
        status: status,
        ...(values.projectType === 'EXTERNAL' && selectedAccountId ? { customerId: selectedAccountId } : {}),
        ...(selectedUserId ? { projectManagerId: selectedUserId } : {}),
        ...(closureDate ? { closureDate: closureDate } : {}),
        ...(project ? { id: project.id } : {}),
        // Remove team reference if closing project with a team
        ...(isClosingProject ? { matrixUnitId: null } : {})
      }

      if (project) {
        await restClient.put(`/projects/${project.id}`, projectData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      } else {
        await restClient.post(`/projects`, projectData, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
      }

      refetch()
    } catch (error) {
      console.error('Form validation error:', error)
    } finally {
      setSelectedUserId(null)
      setLoading(false)
      setOpen?.(false)
    }
  }

  const defaultValues = useMemo(() => {
    // Transform UI status to BE status for form
    const beStatus = project?.status ? transformUIStatusToBE(project.status) : ProjectStatusBE.IN_PROGRESS

    return {
      ...project,
      description: project?.description ?? '',
      validFrom: project?.validFrom ? new Date(project.validFrom).toISOString().slice(0, 16) : undefined,
      validTo: project?.validTo ? new Date(project.validTo).toISOString().slice(0, 16) : undefined,
      customerId: project?.customerId || undefined,
      projectManagerId: project?.projectManagerId || undefined,
      hoursBudget: project?.hoursBudget ?? 0,
      status: beStatus
    }
  }, [project])

  // Create Zod resolver
  const resolver = useMemo(() => zodResolver(projectFormSchema) as any, [])

  return (
    <FormWrapperModal
      childAddButton={childAddButton}
      title={project ? 'Edit Project' : 'Create Project'}
      description="Configure project details and information"
      onSubmit={handleSubmit}
      onCancel={() => {
        onCancel?.()
        setSelectedUserId(null)
      }}
      defaultValues={defaultValues}
      isEditing={!!project}
      loading={loading}
      dataTestId={dataTestId}
      isDrawerActive={isDrawerActive}
      open={open}
      setOpen={setOpen}
      resolver={resolver}
      validateBeforeSubmit={false}
    >
      <FormField
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('forms.project.fields.name.label', { defaultValue: 'Name' })}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('forms.project.fields.name.placeholder', {
                  defaultValue: 'Enter project name'
                })}
                {...field}
                data-testid={`${dataTestId}-name-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('forms.project.fields.description.label', { defaultValue: 'Description' })}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('forms.project.fields.description.placeholder', {
                  defaultValue: 'Enter project description (optional)'
                })}
                rows={3}
                {...field}
                data-testid={`${dataTestId}-description-textarea`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="projectManagerId"
        render={() => (
          <FormItem>
            <FormLabel>
              {t('forms.project.fields.projectManager.label', { defaultValue: 'Select Project Manager' })}
            </FormLabel>
            <FormControl>
              <EmployeeSelect
                value={selectedUserId}
                employees={employees}
                onValueChange={setSelectedUserId}
                onSearch={search}
                loading={searchLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                placeholder="Select project manager"
                searchPlaceholder="Search by name..."
                data-testid="project-manager"
              />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        name="hoursBudget"
        render={({ field }) => (
          <FormItem className="gba:w-1/2">
            <FormLabel>{t('forms.project.fields.effort.label', { defaultValue: 'Effort (Hours)' })}</FormLabel>
            <FormControl>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={8}
                placeholder={t('forms.project.fields.effort.placeholder', {
                  defaultValue: 'Enter hours budget'
                })}
                {...field}
                value={field.value ?? ''}
                onChange={e => {
                  const value = e.target.value
                  // Only allow digits, max 8 characters (up to 99,999,999 hours)
                  if (value === '' || /^\d{1,8}$/.test(value)) {
                    // Remove leading zeros and convert to number
                    const numValue = value === '' ? '' : Number.parseInt(value, 10)
                    field.onChange(numValue)
                  }
                }}
                data-testid={`${dataTestId}-hoursBudget-input`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="gba:flex gba:flex-col gba:gap-4">
        <div className="gba:flex gba:gap-4 gba:items-start">
          <FormField
            name="projectType"
            render={({ field }) => (
              <FormItem className="gba:w-1/2">
                <FormLabel>{t('forms.project.fields.projectType.label', { defaultValue: 'Project Type' })}</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={value => {
                      field.onChange(value)
                      setProjectType(value)
                    }}
                    value={field.value}
                    data-testid={`${dataTestId}-projectType-select`}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('forms.project.fields.projectType.placeholder', {
                          defaultValue: 'Select project type'
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INTERNAL">
                        {t('forms.project.fields.projectType.options.internal', {
                          defaultValue: 'Internal'
                        })}
                      </SelectItem>
                      <SelectItem value="EXTERNAL">
                        {t('forms.project.fields.projectType.options.external', {
                          defaultValue: 'External'
                        })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {projectType === 'EXTERNAL' && (
            <FormField
              name="customerId"
              render={({ field }) => (
                <FormItem className="gba:w-1/2">
                  <FormLabel>
                    {t('forms.project.fields.customer.label', { defaultValue: 'Customer Account' })}
                  </FormLabel>
                  <FormControl>
                    <Combobox
                      value={selectedAccountId || field.value || ''}
                      onValueChange={(value: string) => {
                        const account = accountOptions.find(acc => acc.value === value)
                        setSelectedAccountId(account?.value || null)
                        field.onChange(value)
                      }}
                      options={accountOptions}
                      onSearch={value => setAccountSearchTerm(value)}
                      placeholder={t('forms.project.fields.customer.placeholder', {
                        defaultValue: 'Select account'
                      })}
                      data-testid={`${dataTestId}-customer-combobox`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="gba:flex gba:gap-4 gba:items-start">
          <FormField
            name="validFrom"
            render={({ field }) => (
              <FormItem className="gba:w-1/2">
                <FormLabel>{t('forms.project.fields.validFrom.label', { defaultValue: 'Valid From' })}</FormLabel>
                <FormControl>
                  <DateInput
                    {...field}
                    mode="single"
                    data-testid={`${dataTestId}-validFrom-input`}
                    placeholder={t('forms.project.fields.validFrom.placeholder', {
                      defaultValue: 'Select start date'
                    })}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="validTo"
            render={({ field }) => (
              <FormItem className="gba:w-1/2">
                <FormLabel>{t('forms.project.fields.validTo.label', { defaultValue: 'Valid Until' })}</FormLabel>
                <FormControl>
                  <DateInput
                    {...field}
                    mode="single"
                    data-testid={`${dataTestId}-validTo-input`}
                    placeholder={t('forms.project.fields.validTo.placeholder', {
                      defaultValue: 'Select end date'
                    })}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.project.fields.status.label', { defaultValue: 'Project Status' })}</FormLabel>
              <FormControl>
                <StatusSelect
                  field={field}
                  dataTestId={dataTestId}
                  t={t}
                  onStatusChangeRequest={handleStatusChangeRequest}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Confirmation Dialog for Canceled/Completed Status */}
      <ConfirmStatusDialog
        isOpen={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        pendingStatus={pendingStatus}
        previousStatusValue={previousStatusValue}
        onClose={() => {
          setIsConfirmDialogOpen(false)
          setPendingStatus(null)
          setPreviousStatusValue(null)
        }}
        dataTestId={dataTestId}
        t={t}
      />
    </FormWrapperModal>
  )
}

export default ProjectForm
