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
  InputGroup,
  InputGroupInput,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton,
  DateInput,
  FileUpload,
  useTranslation
} from '@newwork/nw-design-system'
import { CatalogSelect } from '@/components/catalog-select'
import { EmployeeSelect } from '@/components/employee-select'
import { PlusIcon, XIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { UseFormReturn } from 'react-hook-form'
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
}

const DEFAULT_ACTIVITY_TYPE_CATALOG = 'SalesActivityType:v1'

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
  showQuickAdd,
  onShowQuickAddChange,
  activityTypeCatalog = DEFAULT_ACTIVITY_TYPE_CATALOG,
  schema
}) => {
  const { t } = useTranslation(translations)
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

      <Form {...form} schema={schema}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="gba:space-y-2">
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
                        disabled={isProcessing}
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

          {/* Title + Description + Submit in InputGroup */}
          <FormItem>
            {/* TODO: Revisit when DS supports automatic required asterisk for group labels; remove manual asterisk if automation applies. */}
            <FormLabel>
              {t('activities-details')}{' '}
              <span aria-hidden="true" className="gba:text-destructive">
                *
              </span>
            </FormLabel>
            <FormControl>
              <InputGroup>
                <FormField
                  control={form.control}
                  name="details.title"
                  render={({ field }) => (
                    <InputGroupInput
                      {...field}
                      placeholder={t('activities-titlePlaceholder')}
                      disabled={isProcessing}
                      data-testid="activity-quick-add-title"
                      className="gba:border-b gba:border-border"
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="details.description"
                  render={({ field }) => (
                    <InputGroupTextarea
                      {...field}
                      placeholder={t('activities-descriptionPlaceholder')}
                      disabled={isProcessing}
                      data-testid="activity-quick-add-description"
                      rows={2}
                      className="gba:text-xs gba:resize-none gba:text-muted-foreground"
                    />
                  )}
                />
                <InputGroupAddon align="block-end">
                  <InputGroupButton
                    type="submit"
                    disabled={isProcessing}
                    size="sm"
                    data-testid="activity-quick-add-submit"
                    className="gba:ml-auto"
                  >
                    <PaperPlaneTiltIcon size={14} weight="bold" />
                    {isProcessing ? t('activities-creating') : t('activities-create')}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
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
        </form>
      </Form>
    </div>
  )
}
