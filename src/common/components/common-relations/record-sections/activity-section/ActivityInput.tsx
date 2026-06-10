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
  useTranslation
} from '@newwork/nw-design-system'
import { CatalogSelect } from '@/components/catalog-select'
import { EmployeeSelect } from '@/components/employee-select'
import { PlusIcon, XIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { FieldErrors, FormProvider, UseFormReturn } from 'react-hook-form'
import { ZodType } from 'zod'
import translations from './_i18n'

interface ActivityInputProps {
  form: UseFormReturn<any>
  accessToken: string
  employees: Array<{
    id: string
    displayName: string
    userId?: string
    pictureThumbnail?: string
    organizationalUnitName?: string
    jobPositionName?: string
  }>
  employeesLoading: boolean
  onEmployeeSearch: (query: string) => void
  employeesHasMore: boolean
  onEmployeeLoadMore: () => void
  onSubmit: (data: any) => void
  isProcessing: boolean
  showQuickAdd: boolean
  onShowQuickAddChange: (show: boolean) => void
  /** Catalog identifier for activity type (e.g. from customerCatalogs.ACTIVITY_TYPE or investmentCatalogs.ACTIVITY_TYPE). */
  activityTypeCatalog?: string
  /** Zod schema for the form (passed to DS Form for required/validation UI if supported). */
  schema?: ZodType<any>
  /** Optional secondary account/contact/investment pickers (same as full activity form). */
  associationFields?: React.ReactNode
  /** Local submit lock (in addition to process isProcessing). */
  isSubmitting?: boolean
}

const DEFAULT_ACTIVITY_TYPE_CATALOG = 'SalesActivityType:v1'

const focusFirstActivityFormError = (form: UseFormReturn<any>, errors: FieldErrors) => {
  if (errors.details && typeof errors.details === 'object') {
    const detailKey = Object.keys(errors.details)[0]
    if (detailKey) {
      form.setFocus(`details.${detailKey}` as 'details.title')
      return
    }
  }
  const topLevelKey = Object.keys(errors)[0]
  if (topLevelKey) {
    form.setFocus(topLevelKey as 'ownerEmployeeId')
  }
}

export const ActivityInput: React.FC<ActivityInputProps> = ({
  form,
  accessToken,
  employees,
  employeesLoading,
  onEmployeeSearch,
  employeesHasMore,
  onEmployeeLoadMore,
  onSubmit,
  isProcessing,
  isSubmitting = false,
  showQuickAdd,
  onShowQuickAddChange,
  activityTypeCatalog = DEFAULT_ACTIVITY_TYPE_CATALOG,
  schema,
  associationFields
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
        data-testid="activity-quick-add-trigger"
      >
        <PlusIcon size={16} weight="bold" />
        {t('activities-addQuick')}
      </Button>
    )
  }

  return (
    <div className="gba:relative gba:bg-background gba:border gba:border-border gba:rounded-xl gba:p-3 gba:shadow-sm">
      <button
        onClick={() => onShowQuickAddChange(false)}
        className="gba:absolute gba:top-2 gba:right-2 gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors gba:p-1 gba:rounded hover:gba:bg-muted"
        data-testid="activity-quick-add-close"
      >
        <XIcon size={14} weight="bold" />
      </button>

      <FormProvider {...form}>
        <Form {...form} schema={schema}>
          <form
            onSubmit={form.handleSubmit(onSubmit, errors => focusFirstActivityFormError(form, errors))}
            className="gba:space-y-2"
          >
            {/* Row 1: Owner */}
            <FormField
              control={form.control}
              name="ownerEmployeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('activities-owner')}</FormLabel>
                  <FormControl>
                    <EmployeeSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      employees={employees}
                      loading={employeesLoading}
                      onSearch={onEmployeeSearch}
                      hasMore={employeesHasMore}
                      onLoadMore={onEmployeeLoadMore}
                      placeholder={t('activities-selectOwner')}
                      data-testid="activity-quick-add-owner"
                      className="gba:w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Row 2: Type + Date */}
            <FormFieldGroup className="gba:w-full">
              <FormField
                control={form.control}
                name="activityTypeRef"
                render={({ field }) => (
                  <FormItem className="gba:min-w-0 gba:flex-[0.8]">
                    <FormLabel>{t('activities-type')}</FormLabel>
                    <FormControl>
                      <CatalogSelect.Provider accessToken={accessToken}>
                        <CatalogSelect
                          catalogIdentifier={activityTypeCatalog}
                          value={field.value}
                          onValueChange={field.onChange}
                          prefetch
                          data-testid="activity-quick-add-type"
                        />
                      </CatalogSelect.Provider>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occurredAt"
                render={({ field }) => (
                  <FormItem className="gba:min-w-0 gba:flex-[1.2]">
                    <FormLabel>{t('activities-occurredAt')}</FormLabel>
                    <FormControl>
                      <div className="gba:min-w-0 gba:w-full gba:max-w-full gba:overflow-hidden">
                        <DateInput
                          type="datetime-local"
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isBusy}
                          data-testid="activity-quick-add-occurred-at"
                          className="gba:w-full gba:max-w-full gba:min-w-0"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormFieldGroup>

            {associationFields ? <div className="gba:space-y-2">{associationFields}</div> : null}

            {/* Title + description only — submit is in footer below attachments */}
            <FormItem>
              {/* TODO: Revisit when DS supports automatic required asterisk for group labels; remove manual asterisk if automation applies. */}
              <FormLabel>
                {t('activities-details')}{' '}
                <span aria-hidden="true" className="gba:text-destructive">
                  *
                </span>
              </FormLabel>
              <FormControl>
                <div className="gba:flex gba:flex-col gba:w-full gba:overflow-hidden gba:rounded-md gba:border gba:border-border gba:bg-background">
                  <FormField
                    control={form.control}
                    name="details.title"
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder={t('activities-titlePlaceholder')}
                        disabled={isBusy}
                        data-testid="activity-quick-add-title"
                        className="gba:rounded-none gba:border-0 gba:border-b gba:border-border gba:shadow-none gba:focus-visible:gba:ring-0 gba:focus-visible:gba:ring-offset-0"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="details.description"
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder={t('activities-descriptionPlaceholder')}
                        disabled={isBusy}
                        data-testid="activity-quick-add-description"
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
                  <FormLabel>{t('activities-documents')}</FormLabel>
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
                      data-testid="activity-quick-add-documents"
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
                data-testid="activity-quick-add-submit"
              >
                {isBusy ? (
                  <span className="gba:inline-flex gba:items-center gba:gap-2">
                    <Spinner size="sm" />
                    {t('activities-creating')}
                  </span>
                ) : (
                  <span className="gba:inline-flex gba:items-center gba:gap-2">
                    <PaperPlaneTiltIcon size={16} weight="bold" />
                    {t('activities-create')}
                  </span>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </FormProvider>
    </div>
  )
}
