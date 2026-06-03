import React from 'react'
import {
  Button,
  Form,
  FormField,
  FormFieldGroup,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  DateInput,
  FileUpload,
  Spinner,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { Clock3, CalendarClock } from 'lucide-react'
import { CatalogSelect, type CatalogSelectConfig } from '@/components/catalog-select'
import { EmployeeSelect } from '@/components/employee-select'
import { MultiEmployeeSelect } from '@/components/multi-employee-select'
import { PlusIcon, XIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { UseFormReturn } from 'react-hook-form'
import { ZodType } from 'zod'
import translations from './_i18n'

interface TaskInputProps {
  form: UseFormReturn<any>
  accessToken: string
  /** Initial employees for MultiEmployeeSelect (e.g. current user prefill). */
  employees: Array<{
    id: string
    displayName: string
    userId?: string
    pictureThumbnail?: string
    organizationalUnitName?: string
    jobPositionName?: string
  }>
  employeesLoading: boolean
  onSearch: (query: string) => void
  hasMore: boolean
  onLoadMore: () => void
  onSubmit: (data: any) => void
  isProcessing: boolean
  isSubmitting?: boolean
  showQuickAdd: boolean
  onShowQuickAddChange: (show: boolean) => void
  /** Catalog identifier for task type (e.g. from customerCatalogs.TASK_TYPE or investmentCatalogs.TASK_TYPE). */
  typeCatalog?: string
  /** Catalog identifier for task priority (e.g. from customerCatalogs.TASK_PRIORITY or investmentCatalogs.TASK_PRIORITY). */
  priorityCatalog?: string
  /** When true, type field is hidden (e.g. Approval Task tab). */
  hideTypeSelection?: boolean
  /** Filter for type catalog (e.g. omit APPROVAL in Task tab). */
  typeCatalogConfig?: CatalogSelectConfig
  /** When true, assignee is multi-select; when false, single EmployeeSelect. */
  multiAssigneeMode?: boolean
  /** Zod schema for the form (passed to DS Form for required/validation UI if supported). */
  schema?: ZodType<any>
}

const DEFAULT_TASK_TYPE_CATALOG = 'SalesTaskType:v1'
const DEFAULT_TASK_PRIORITY_CATALOG = 'SalesTaskPriority:v1'

/** Same as in task forms: omit Approval from type dropdown when showing type selection. */
const DEFAULT_TYPE_CATALOG_CONFIG: CatalogSelectConfig = {
  code: { mode: 'omit', values: ['APPROVAL'] }
}

const TASK_TIMING_OPTIONS = [
  { value: 'DEADLINE', label: 'Deadline' },
  { value: 'SCHEDULED', label: 'Scheduled' }
] as const

export const TaskInput: React.FC<TaskInputProps> = ({
  form,
  accessToken,
  employees,
  employeesLoading,
  onSearch,
  hasMore,
  onLoadMore,
  onSubmit,
  isProcessing,
  isSubmitting = false,
  showQuickAdd,
  onShowQuickAddChange,
  typeCatalog = DEFAULT_TASK_TYPE_CATALOG,
  priorityCatalog = DEFAULT_TASK_PRIORITY_CATALOG,
  hideTypeSelection = false,
  typeCatalogConfig,
  multiAssigneeMode = false,
  schema
}) => {
  const { t } = useTranslation(translations)
  const isBusy = isProcessing || isSubmitting
  if (!showQuickAdd) {
    return (
      <Button
        onClick={() => onShowQuickAddChange(true)}
        variant="outline"
        size="sm"
        className="gba:w-full gba:gap-2"
        data-testid="task-quick-add-trigger"
      >
        <PlusIcon size={16} weight="bold" />
        {t('tasks-addQuick')}
      </Button>
    )
  }

  return (
    <div className="gba:relative gba:bg-background gba:border gba:border-border gba:rounded-xl gba:p-3 gba:shadow-sm">
      <button
        onClick={() => onShowQuickAddChange(false)}
        className="gba:absolute gba:top-2 gba:right-2 gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors gba:p-1 gba:rounded hover:gba:bg-muted"
        data-testid="task-quick-add-close"
      >
        <XIcon size={14} weight="bold" />
      </button>

      <Form {...form} schema={schema}>
        <form
          onSubmit={form.handleSubmit(onSubmit, errors => {
            if (errors.task && typeof errors.task === 'object') {
              const taskKey = Object.keys(errors.task)[0]
              if (taskKey) {
                form.setFocus(`task.${taskKey}` as 'task.title')
                return
              }
            }
            const firstKey = Object.keys(errors)[0]
            if (firstKey) {
              form.setFocus(firstKey as 'taskTypeRef')
            }
          })}
          className="gba:space-y-2"
        >
          {/* Type first (hidden in Approval tab) */}
          {!hideTypeSelection && (
            <FormField
              control={form.control}
              name="taskTypeRef"
              render={({ field }) => (
                <FormItem className="gba:min-w-0">
                  <FormLabel>{t('tasks-type')}</FormLabel>
                  <FormControl>
                    <CatalogSelect.Provider accessToken={accessToken}>
                      <CatalogSelect
                        catalogIdentifier={typeCatalog}
                        value={field.value}
                        onValueChange={field.onChange}
                        prefetch={false}
                        config={typeCatalogConfig ?? DEFAULT_TYPE_CATALOG_CONFIG}
                        data-testid="task-quick-add-type"
                      />
                    </CatalogSelect.Provider>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Assignee (single or multi depending on section) */}
          <FormField
            control={form.control}
            name="assignedEmployeeIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('tasks-assignee')}</FormLabel>
                <FormControl>
                  {multiAssigneeMode ? (
                    <MultiEmployeeSelect
                      accessToken={accessToken}
                      initialEmployees={employees.filter(e => (field.value ?? []).includes(e.id))}
                      value={field.value || []}
                      onValueChange={field.onChange}
                      placeholder={t('tasks-selectAssignee')}
                      data-testid="task-quick-add-assignee"
                    />
                  ) : (
                    <EmployeeSelect
                      accessToken={accessToken}
                      value={field.value?.[0] ?? null}
                      onValueChange={id => field.onChange(id ? [id] : [])}
                      placeholder={t('tasks-selectAssignee')}
                      initialEmployee={employees.find(e => e.id === field.value?.[0]) ?? null}
                      employees={employees}
                      onSearch={onSearch}
                      loading={employeesLoading}
                      hasMore={hasMore}
                      onLoadMore={onLoadMore}
                      data-testid="task-quick-add-assignee"
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Priority | Timing | Deadline — flex-wrap prevents overlapping on narrow panels */}
          <FormFieldGroup className="gba:w-full gba:flex-wrap gba:gap-y-2">
            <FormField
              control={form.control}
              name="taskPriorityRef"
              render={({ field }) => (
                <FormItem className="gba:min-w-24 gba:flex-1">
                  <FormLabel>{t('tasks-priority')}</FormLabel>
                  <FormControl>
                    <CatalogSelect.Provider accessToken={accessToken}>
                      <CatalogSelect
                        catalogIdentifier={priorityCatalog}
                        value={field.value}
                        onValueChange={field.onChange}
                        prefetch
                        data-testid="task-quick-add-priority"
                      />
                    </CatalogSelect.Provider>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taskTiming"
              render={({ field }) => (
                <FormItem className="gba:min-w-28 gba:flex-1">
                  <FormLabel>{t('tasks-timingType')}</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="gba:w-full" data-testid="task-quick-add-timing">
                        <SelectValue placeholder={t('tasks-pleaseSelect')} />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_TIMING_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="gba:flex gba:items-center gba:gap-2">
                              {opt.value === 'DEADLINE' ? (
                                <Clock3 className="gba:h-4 gba:w-4" style={{ color: 'var(--nw-color-danger-500)' }} />
                              ) : (
                                <CalendarClock
                                  className="gba:h-4 gba:w-4"
                                  style={{ color: 'var(--nw-color-primary-500)' }}
                                />
                              )}
                              {opt.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem className="gba:min-w-36 gba:flex-1">
                  <FormLabel>{t('tasks-deadline')}</FormLabel>
                  <FormControl>
                    <div className="gba:min-w-0 gba:w-full gba:max-w-full gba:overflow-hidden">
                      <DateInput
                        type="datetime-local"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isBusy}
                        data-testid="task-quick-add-deadline"
                        className="gba:w-full gba:max-w-full gba:min-w-0"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormFieldGroup>

          {/* Title + description only — submit is in footer below attachments */}
          <FormItem>
            {/* TODO: Revisit when DS supports automatic required asterisk for group labels; remove manual asterisk if automation applies. */}
            <FormLabel>
              {t('tasks-taskDetails')}{' '}
              <span aria-hidden="true" className="gba:text-destructive">
                *
              </span>
            </FormLabel>
            <FormControl>
              <div className="gba:flex gba:flex-col gba:w-full gba:overflow-hidden gba:rounded-md gba:border gba:border-border gba:bg-background">
                <FormField
                  control={form.control}
                  name="task.title"
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder={t('tasks-quickAddPlaceholder')}
                      disabled={isBusy}
                      data-testid="task-quick-add-title"
                      className="gba:rounded-none gba:border-0 gba:border-b gba:border-border gba:shadow-none gba:focus-visible:gba:ring-0 gba:focus-visible:gba:ring-offset-0"
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="task.description"
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      placeholder={t('tasks-descriptionPlaceholder')}
                      disabled={isBusy}
                      data-testid="task-quick-add-description"
                      rows={5}
                      className="gba:min-h-24 gba:rounded-none gba:border-0 gba:shadow-none gba:text-xs gba:resize-y gba:text-muted-foreground gba:focus-visible:gba:ring-0 gba:focus-visible:gba:ring-offset-0"
                    />
                  )}
                />
              </div>
            </FormControl>
          </FormItem>

          {/* Optional documents (below content) */}
          <FormField
            control={form.control}
            name="_pendingFiles"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('tasks-documents')}</FormLabel>
                <FormControl>
                  <FileUpload
                    size="sm"
                    multiple
                    maxFiles={10}
                    maxSizeMB={10}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                    layout="list"
                    preview="icon"
                    initialFiles={(field.value || []).map((f: File) => ({
                      id: `pending-${f.name}-${f.size}-${f.lastModified}`,
                      name: f.name,
                      size: f.size,
                      type: f.type,
                      url: ''
                    }))}
                    onChange={(items: any[]) => {
                      const files = items.map(f => f?.file).filter((f): f is File => f instanceof File)
                      field.onChange(files)
                    }}
                    data-testid="task-quick-add-documents"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="gba:border-t gba:border-border gba:pt-3 gba:mt-1">
            <Button
              type="submit"
              variant="default"
              disabled={isBusy}
              className="gba:w-full gba:gap-2"
              data-testid="task-quick-add-submit"
            >
              {isBusy ? (
                <span className="gba:inline-flex gba:items-center gba:gap-2">
                  <Spinner size="sm" />
                  {t('common-creating')}
                </span>
              ) : (
                <span className="gba:inline-flex gba:items-center gba:gap-2">
                  <PaperPlaneTiltIcon size={16} weight="bold" />
                  {t('tasks-create')}
                </span>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
