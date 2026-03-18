import React from 'react'
import {
  Button,
  Form,
  FormField,
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
import { PlusIcon, XIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { UseFormReturn } from 'react-hook-form'
import { ZodType } from 'zod'
import translations from './_i18n'

interface NoteInputProps {
  form: UseFormReturn<any>
  onSubmit: (data: any) => void
  isProcessing: boolean
  showQuickAdd: boolean
  onShowQuickAddChange: (show: boolean) => void
  /** Zod schema for the form (passed to DS Form for required/validation UI if supported). */
  schema?: ZodType<any>
}

export const NoteInput: React.FC<NoteInputProps> = ({
  form,
  onSubmit,
  isProcessing,
  showQuickAdd,
  onShowQuickAddChange,
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
        data-testid="note-quick-add-trigger"
      >
        <PlusIcon size={16} weight="bold" />
        {t('notes-addQuick')}
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="gba:space-y-2">
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
                    disabled={isProcessing}
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
              <InputGroup>
                <FormField
                  control={form.control}
                  name="details.title"
                  render={({ field }) => (
                    <InputGroupInput
                      placeholder={t('notes-titlePlaceholder')}
                      value={field.value}
                      onChange={e => field.onChange(e.target.value)}
                      disabled={isProcessing}
                      data-testid="note-quick-add-title"
                      className="gba:border-b gba:border-border"
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="details.text"
                  render={({ field }) => (
                    <InputGroupTextarea
                      placeholder={t('notes-textPlaceholder')}
                      value={field.value}
                      onChange={e => field.onChange(e.target.value)}
                      disabled={isProcessing}
                      data-testid="note-quick-add-text"
                      rows={3}
                      className="gba:text-xs gba:resize-none gba:text-muted-foreground"
                    />
                  )}
                />
                <InputGroupAddon align="block-end">
                  <InputGroupButton
                    type="submit"
                    disabled={isProcessing}
                    size="sm"
                    data-testid="note-quick-add-submit"
                    className="gba:ml-auto"
                  >
                    <PaperPlaneTiltIcon size={14} weight="bold" />
                    {isProcessing ? t('notes-creating') : t('notes-create')}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
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
        </form>
      </Form>
    </div>
  )
}
