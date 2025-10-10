import React from 'react'
import { useCatalogOptions } from '../shared/hooks/useCatalogOptions'
import { EmployeeSelect } from '@/components/employee-select'
import { EntitySelect } from '../shared/components'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { Clock3, CalendarClock } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'

export interface TaskOption {
  value: string
  label: string
}

export interface TaskSegmentProps {
  // Labels
  titleLabel: string
  descriptionLabel: string
  deadlineLabel: string
  typeLabel: string
  priorityLabel: string
  statusLabel?: string
  assigneeLabel?: string
  timingTypeLabel?: string
  entityLabel?: string
  uploadFileLabel?: string

  // Option sources
  typeOptions?: TaskOption[]
  priorityOptions?: TaskOption[]
  statusOptions?: TaskOption[]
  accessToken?: string
  typeCatalog?: { identifier: string; version: string }
  priorityCatalog?: { identifier: string; version: string }
  statusCatalog?: { identifier: string; version: string }
  fetchTypeOptions?: (q?: string) => Promise<TaskOption[]>
  fetchPriorityOptions?: (q?: string) => Promise<TaskOption[]>
  fetchStatusOptions?: (q?: string) => Promise<TaskOption[]>

  // Entity selection
  showEntitySelection?: boolean
  entities?: Array<{
    id: string
    name: string
    type: 'account' | 'contact' | 'opportunity' | 'lead' | 'investment'
    subtitle?: string
  }>
  entitiesLoading?: boolean
  onEntitySearch?: (q: string) => void
  entitiesHasMore?: boolean
  onEntityLoadMore?: () => void
  entitiesError?: boolean

  // Pre-populate related entity from context (when selection is hidden)
  initialEntityFromContext?: {
    accountId?: string
    contactId?: string
    opportunityId?: string
    leadId?: string
  }

  // Assignees
  showAssigneeSelection?: boolean
  assignees?: Array<{
    id: string
    displayName: string
    userId?: string
    pictureThumbnail?: string
    organizationalUnitName?: string
    jobPositionName?: string
  }>
  assigneesLoading?: boolean
  onAssigneeSearch?: (q: string) => void
  assigneesHasMore?: boolean
  onAssigneeLoadMore?: () => void

  // File upload callback (optional convenience)
  onFilesChange?: (files: File[]) => void

  // New behavior controls
  showType?: boolean
  staticDefaults?: Partial<Record<string, any>>

  ['data-testid']?: string
}

const TaskSegment: React.FC<TaskSegmentProps> = ({
  titleLabel,
  descriptionLabel,
  deadlineLabel,
  typeLabel,
  priorityLabel,
  statusLabel,
  assigneeLabel,
  timingTypeLabel,
  entityLabel,
  uploadFileLabel,
  typeOptions,
  priorityOptions,
  statusOptions,
  accessToken,
  typeCatalog,
  priorityCatalog,
  statusCatalog,
  fetchTypeOptions,
  fetchPriorityOptions,
  fetchStatusOptions,
  showEntitySelection = false,
  entities = [],
  entitiesLoading = false,
  onEntitySearch,
  showAssigneeSelection = true,
  assignees = [],
  assigneesLoading = false,
  onAssigneeSearch,
  assigneesHasMore = false,
  onAssigneeLoadMore,
  onFilesChange,
  entitiesHasMore = false,
  onEntityLoadMore,
  initialEntityFromContext,
  showType = true,
  staticDefaults,
  'data-testid': dataTestId = 'task-segment'
}) => {
  const form = useFormContext<any>()

  // Apply static defaults once
  React.useEffect(() => {
    if (!staticDefaults) return
    Object.entries(staticDefaults).forEach(([key, value]) => {
      if (value !== undefined && (form.getValues(key) === undefined || form.getValues(key) === '')) {
        form.setValue(key as any, value, { shouldValidate: true })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const typeState = useCatalogOptions({
    accessToken,
    catalog: typeCatalog,
    providedOptions: typeOptions,
    fetchOptions: fetchTypeOptions
  })
  const priorityState = useCatalogOptions({
    accessToken,
    catalog: priorityCatalog,
    providedOptions: priorityOptions,
    fetchOptions: fetchPriorityOptions
  })
  const statusState = useCatalogOptions({
    accessToken,
    catalog: statusCatalog,
    providedOptions: statusOptions,
    fetchOptions: fetchStatusOptions
  })

  const timingTypeOptions: TaskOption[] = [
    { value: 'DEADLINE', label: 'Deadline' },
    { value: 'SCHEDULED', label: 'Scheduled' }
  ]

  // Preselect defaults when options arrive
  React.useEffect(() => {
    if (!form.getValues('timingType')) {
      form.setValue('timingType', 'DEADLINE', { shouldValidate: true })
    }
    if (typeState.options.length && !form.getValues('taskTypeRef')) {
      form.setValue('taskTypeRef', typeState.options[0].value, {
        shouldValidate: true
      })
    }
    if (priorityState.options.length && !form.getValues('taskPriorityRef')) {
      form.setValue('taskPriorityRef', priorityState.options[0].value, {
        shouldValidate: true
      })
    }
    if (statusState.options.length && !form.getValues('taskStatusRef')) {
      form.setValue('taskStatusRef', statusState.options[0].value, {
        shouldValidate: true
      })
    }
  }, [form, typeState.options, priorityState.options, statusState.options])

  const entitySelectOptions = React.useMemo(
    () =>
      (entities || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        subtitle: e.subtitle,
        pictureThumbnail: e.pictureThumbnail
      })),
    [entities]
  )
  const assigneeOptions = React.useMemo(
    () =>
      (assignees || []).map(a => ({
        id: a.id,
        displayName: a.displayName,
        pictureThumbnail: a.pictureThumbnail,
        organizationalUnitName: a.organizationalUnitName,
        jobPositionName: a.jobPositionName
      })),
    [assignees]
  )
  const assigneeUserMap = React.useMemo(() => {
    const map = new Map<string, string | undefined>()
    ;(assignees || []).forEach(a => map.set(a.id, a.userId))
    return map
  }, [assignees])

  // Keep assignedUserId in sync with the selected assignedEmployeeId (covers initial load and subsequent changes)
  const assignedEmployeeId = (form as any)?.watch?.('assignedEmployeeId')
  React.useEffect(() => {
    const uid = assignedEmployeeId ? assigneeUserMap.get(String(assignedEmployeeId)) : undefined
    const current = (form as any)?.getValues?.('assignedUserId')
    if (uid !== current) {
      ;(form as any)?.setValue?.('assignedUserId', uid)
    }
  }, [assignedEmployeeId, assigneeUserMap, form])

  const normalizeDateTimeLocalValue = React.useCallback((v: string | undefined | null) => {
    if (!v) return ''
    const s = v.replace('Z', '')
    return s.length >= 16 ? s.slice(0, 16) : s
  }, [])

  // Prime searches when provided but lists are empty
  React.useEffect(() => {
    if (showEntitySelection && onEntitySearch && (entities?.length || 0) === 0) {
      onEntitySearch('')
    }
  }, [showEntitySelection, onEntitySearch, entities?.length])

  // Apply initial entity from context if selection is hidden and no entity set yet
  React.useEffect(() => {
    if (!initialEntityFromContext) return
    const hasEntity = Boolean(
      form.getValues('account') || form.getValues('contact') || form.getValues('opportunity') || form.getValues('lead')
    )
    if (hasEntity) return
    const { accountId, contactId, opportunityId, leadId } = initialEntityFromContext
    const map: Array<{ key: 'account' | 'contact' | 'opportunity' | 'lead'; id?: string }> = [
      { key: 'account', id: accountId },
      { key: 'contact', id: contactId },
      { key: 'opportunity', id: opportunityId },
      { key: 'lead', id: leadId }
    ]
    const found = map.find(m => m.id)
    if (found?.id) {
      form.setValue(found.key, { id: found.id })
      form.setValue('relatedEntityId', found.id)
    }
  }, [initialEntityFromContext, form])

  React.useEffect(() => {
    if (onAssigneeSearch && assigneeOptions.length === 0) {
      onAssigneeSearch('')
    }
  }, [onAssigneeSearch, assigneeOptions.length])

  return (
    <>
      {/* Title */}
      <FormField
        control={form.control as any}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {titleLabel}
              <span className="gba:text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input placeholder="Please Enter..." data-testid={`${dataTestId}-title`} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Deadline and Timing */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        {/* Deadline */}
        <FormField
          control={form.control as any}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{deadlineLabel}</FormLabel>
              <FormControl>
                <Input
                  className="gba:w-full"
                  type="datetime-local"
                  placeholder="Please Enter..."
                  data-testid={`${dataTestId}-deadline`}
                  value={normalizeDateTimeLocalValue(field.value)}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Timing Type */}
        <FormField
          control={form.control as any}
          name="timingType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{timingTypeLabel || 'Timing'}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="gba:w-full" data-testid={`${dataTestId}-timing`}>
                    <SelectValue placeholder="Please Select..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {timingTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="gba:flex gba:items-center gba:gap-2">
                        {opt.value === 'DEADLINE' ? (
                          <Clock3 className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-color-danger-500)' }} />
                        ) : (
                          <CalendarClock className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-color-primary-500)' }} />
                        )}
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Type and Priority*/}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        {showType && (
          <FormField
            control={form.control as any}
            name="taskTypeRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{typeLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger
                      className="gba:w-full"
                      data-testid={`${dataTestId}-type`}
                      aria-invalid={!!(form.formState?.errors as any)?.taskTypeRef}
                    >
                      <SelectValue placeholder="Please Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {typeState.options.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Priority */}
        <FormField
          control={form.control as any}
          name="taskPriorityRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{priorityLabel}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger
                    className="gba:w-full"
                    data-testid={`${dataTestId}-priority`}
                    aria-invalid={!!(form.formState?.errors as any)?.taskPriorityRef}
                  >
                    <SelectValue placeholder="Please Select..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {priorityState.options.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {/* Status */}
      <FormField
        control={form.control as any}
        name="taskStatusRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{statusLabel || 'Status'}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger
                  className="gba:w-full"
                  data-testid={`${dataTestId}-status`}
                  aria-invalid={!!(form.formState?.errors as any)?.taskStatusRef}
                >
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {statusState.options.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Assigned To */}
      {showAssigneeSelection !== false && (
        <FormField
          control={form.control as any}
          name="assignedEmployeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{assigneeLabel || 'Assigned To'}</FormLabel>
              <FormControl>
                <EmployeeSelect
                  employees={assigneeOptions as any}
                  value={field.value || ''}
                  onValueChange={(v: string | null) => {
                    field.onChange(v)
                    const uid = assigneeUserMap.get(String(v || ''))
                    if (uid) {
                      form.setValue('assignedUserId', uid)
                    }
                  }}
                  onSearch={onAssigneeSearch}
                  loading={Boolean(assigneesLoading)}
                  onLoadMore={onAssigneeLoadMore}
                  hasMore={Boolean(assigneesHasMore)}
                  data-testid={`${dataTestId}-assignee`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Related Entity */}
      {showEntitySelection && (
        <FormField
          control={form.control as any}
          name="relatedEntityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{entityLabel || 'Related Entity'}</FormLabel>
              <FormControl>
                <EntitySelect
                  entities={entitySelectOptions as any}
                  value={field.value || ''}
                  onValueChange={(v: string | null) => {
                    field.onChange(v)
                    const id = String(v || '')
                    const e = (entities || []).find(x => x.id === id)
                    form.setValue('account', undefined)
                    form.setValue('contact', undefined)
                    form.setValue('opportunity', undefined)
                    form.setValue('lead', undefined)
                    form.setValue('investment', undefined)
                    if (e) {
                      form.setValue(e.type, { id: e.id })
                    }
                  }}
                  onSearch={onEntitySearch}
                  loading={Boolean(entitiesLoading)}
                  onLoadMore={onEntityLoadMore}
                  hasMore={Boolean(entitiesHasMore)}
                  data-testid={`${dataTestId}-entity`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Description */}
      <FormField
        control={form.control as any}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{descriptionLabel}</FormLabel>
            <FormControl>
              <Textarea placeholder="Please Enter..." data-testid={`${dataTestId}-description`} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Attach Documents */}
      {uploadFileLabel && onFilesChange && (
        <FormField
          control={form.control as any}
          name="files"
          render={() => (
            <FormItem>
              <FormLabel>{uploadFileLabel}</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  multiple
                  className="gba:w-full"
                  data-testid={`${dataTestId}-attachments`}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const files = Array.from(e.target.files || [])
                    onFilesChange(files as any)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  )
}

export default TaskSegment

// Zod schema colocated with TaskSegment for convenient reuse/override
const buildTaskSegmentSchema = (options?: {
  requireAssignee?: boolean
  requireEntity?: boolean
  requireType?: boolean
}) => {
  const requireAssignee = options?.requireAssignee !== false
  const requireEntity = options?.requireEntity !== false
  const requireType = options?.requireType !== false
  return z.object({
    title: z.string().min(1, 'Title is required'),
    timingType: z.enum(['DEADLINE', 'SCHEDULED']).refine(v => !!v, {
      message: 'Timing is required'
    }),
    taskTypeRef: requireType ? z.string().min(1, 'Type is required') : z.string().optional(),
    taskPriorityRef: z.string().min(1, 'Priority is required'),
    taskStatusRef: z.string().min(1, 'Status is required'),
    assignedEmployeeId: requireAssignee ? z.string().min(1, 'Assigned employee is required') : z.string().optional(),
    relatedEntityId: requireEntity ? z.string().min(1, 'Related entity is required') : z.string().optional(),
    description: z.string().optional(),
    dueDate: z.preprocess(val => (val == null ? '' : val), z.string().min(1, 'Deadline is required')),
    files: z.any().optional()
  })
}

export type TaskSegmentSchema = z.infer<ReturnType<typeof buildTaskSegmentSchema>>

// Default schema export for convenience
export const taskSegmentSchema = buildTaskSegmentSchema()

export const createTaskSegmentResolver = (options?: {
  requireAssignee?: boolean
  requireEntity?: boolean
  requireType?: boolean
}) => zodResolver(buildTaskSegmentSchema(options))
