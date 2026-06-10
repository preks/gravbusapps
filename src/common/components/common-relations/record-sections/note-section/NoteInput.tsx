import React from 'react'
import {
  Button,
  Form,
  FormField,
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
import { PlusIcon, XIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { UseFormReturn } from 'react-hook-form'
import { ZodType } from 'zod'
import translations from './_i18n'

interface NoteInputProps {
  form: UseFormReturn<any>
  onSubmit: (data: any) => void
  isProcessing: boolean
  isSubmitting?: boolean
  showQuickAdd: boolean
  onShowQuickAddChange: (show: boolean) => void
  /** Zod schema for the form (passed to DS Form for required/validation UI if supported). */
  schema?: ZodType<any>
  /** Overrides the default “Quick Add Note” trigger label. */
  quickAddTriggerLabel?: string
}

export const NoteInput: React.FC<NoteInputProps> = ({
  form,
  onSubmit,
  isProcessing,
  isSubmitting = false,
  showQuickAdd,
  onShowQuickAddChange,
  schema,
  quickAddTriggerLabel
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
        data-testid="note-quick-add-trigger"
      >
        <PlusIcon size={16} weight="bold" />
        {quickAddTriggerLabel ?? t('notes-addQuick')}
      </Button>
    )
  }

  return (
    <div className="gba:relative gba:bg-background gba:border gba:border-border gba:rounded-xl gba:p-3 gba:shadow-sm">
      <button
        onClick={() => onShowQuickAddChange(false)}
        className="gba:absolute gba:top-2 gba:right-2 gba:text-muted-foreground hover:gba:text-foreground gba:transition-colors gba:p-1 gba:rounded hover:gba:bg-muted"
        data-testid="note-quick-add-close"
      >
        <XIcon size={14} weight="bold" />
      </button>

      <Form {...form} schema={schema}>
        <form
          onSubmit={form.handleSubmit(onSubmit, errors => {
            if (errors.details && typeof errors.details === 'object') {
              const detailKey = Object.keys(errors.details)[0]
              if (detailKey) {
                form.setFocus(`details.${detailKey}` as 'details.title')
                return
              }
            }
            const firstKey = Object.keys(errors)[0]
            if (firstKey) {
              form.setFocus(firstKey as 'reminderDate')
            }
          })}
          className="gba:space-y-2"
        >
          <FormField
            control={form.control}
            name="reminderDate"
            render={({ field }) => (
              <FormItem className="gba:w-full">
                <FormLabel>{t('notes-reminder')}</FormLabel>
                <FormControl>
                  <DateInput
                    type="datetime-local"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isBusy}
                    data-testid="note-quick-add-reminder"
                    className="gba:w-full gba:max-w-full gba:min-w-0"
                    placeholder={t('notes-reminderPlaceholder')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            {/* TODO: Revisit when DS supports automatic required asterisk for group labels; remove manual asterisk if automation applies. */}
            <FormLabel>
              {t('notes-details')}{' '}
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
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value)}
                      placeholder={t('notes-titlePlaceholder')}
                      disabled={isBusy}
                      data-testid="note-quick-add-title"
                      className="gba:rounded-none gba:border-0 gba:border-b gba:border-border gba:shadow-none gba:focus-visible:gba:ring-0 gba:focus-visible:gba:ring-offset-0"
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="details.text"
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value)}
                      placeholder={t('notes-textPlaceholder')}
                      disabled={isBusy}
                      data-testid="note-quick-add-text"
                      rows={5}
                      className="gba:min-h-24 gba:rounded-none gba:border-0 gba:shadow-none gba:text-xs gba:resize-y gba:text-muted-foreground gba:focus-visible:gba:ring-0 gba:focus-visible:gba:ring-offset-0"
                    />
                  )}
                />
              </div>
            </FormControl>
          </FormItem>

          <FormField
            control={form.control}
            name="_pendingFiles"
            render={({ field }) => (
              <FormItem className="gba:w-full">
                <FormLabel>{t('notes-documents')}</FormLabel>
                <FormControl>
                  <FileUpload
                    size="sm"
                    multiple
                    maxFiles={10}
                    maxSizeMB={10}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                    layout="list"
                    preview="icon"
                    initialFiles={(field.value ?? []).map((f: File) => ({
                      id: `pending-${f.name}-${f.size}-${f.lastModified}`,
                      name: f.name,
                      size: f.size,
                      type: f.type,
                      url: ''
                    }))}
                    onChange={(items: any[]) => {
                      const files = items.map((i: any) => i?.file).filter((f): f is File => f instanceof File)
                      field.onChange(files)
                    }}
                    data-testid="note-quick-add-documents"
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
              data-testid="note-quick-add-submit"
            >
              {isBusy ? (
                <span className="gba:inline-flex gba:items-center gba:gap-2">
                  <Spinner size="sm" />
                  {t('notes-creating')}
                </span>
              ) : (
                <span className="gba:inline-flex gba:items-center gba:gap-2">
                  <PaperPlaneTiltIcon size={16} weight="bold" />
                  {t('notes-create')}
                </span>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
