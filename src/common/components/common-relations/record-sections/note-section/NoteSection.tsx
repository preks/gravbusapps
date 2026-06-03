import React, { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, EmptyState, useTranslation } from '@newwork/nw-design-system'
import { PlusIcon, UserIcon, CalendarBlankIcon, BellIcon, DotsThreeVertical } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { AppActionProvider } from '@/components/app-action-provider/AppActionProvider'
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { handleDocumentClick as handleDocumentClickUtil } from '@/common/utils/documentClickHandler'
import { getDocumentIcon } from '@/common/utils/documentIconUtils'
import { FileInfo } from '@/common/types/FileTypes'
import type { Note } from '@/common/data/relations/types/noteTypes'
import translations from './_i18n'
import { NoteInput } from './NoteInput'
import { useQuickAddSubmitGuard } from '@/common/components/common-relations/record-sections/utils/quickAddSubmitGuard'

const quickNoteSchema = z.object({
  details: z.object({
    title: z.string().trim().min(1, 'Title is required'),
    text: z.string().trim().min(1, 'Note text is required')
  }),
  reminderDate: z.string().optional(),
  _pendingFiles: z.array(z.any()).optional()
})

export type NoteDocument = {
  id: string
  name: string
  mimeType?: string | null
  fileSize?: number | null
  file?: string
  fileInfo?: FileInfo
}

export type NoteItem = {
  id: string
  version?: number
  title: string
  text: string
  createdAt: string
  createdBy: string
  authorEmployee?: { id?: string; displayName?: string; firstName?: string; lastName?: string }
  assigneeEmployee?: { id?: string; displayName?: string; firstName?: string; lastName?: string }
  reminderDate?: string | null
  documents?: NoteDocument[]
}

export interface NoteSectionProps extends BusinessAppContextProps {
  notes?: Note[]
  noteActionProps?: Omit<AppActionCommonProps, 'accessToken'>
  noteEntityActionProps?: Omit<AppActionCommonProps, 'accessToken'>
  'data-testid'?: string
  /** Tab/section title in SectionWrapper (default: Notes). */
  sectionTitle?: string
  /** Empty state copy; defaults to translated notes-empty-* keys. */
  emptyStateTitle?: string
  emptyStateDescription?: string
  /** Overrides collapsed quick-add button label (default: Quick Add Note). */
  quickAddTriggerLabel?: string
  /** Optional payload builder; when set, quick-note submit passes built payload to executeAction instead of raw form shape. */
  buildNotePayload?: (note: Record<string, any>) => Record<string, any>
  accountId?: string
  contactId?: string
  opportunityId?: string
  leadId?: string
  investmentId?: string
  /** Optional pre-submit handler (e.g. uploads _pendingFiles and returns data with documents). When set, called before buildNotePayload/executeAction. */
  preSubmit?: (data: Record<string, any>) => Promise<Record<string, any>>
}

// Standard React component that can be used with SectionWrapper
const NoteSection: React.FC<NoteSectionProps> = props => {
  const { t } = useTranslation(translations)
  const {
    accessToken,
    notes: rawNotes,
    noteEntityActionProps,
    noteActionProps,
    buildNotePayload,
    accountId,
    contactId,
    opportunityId,
    leadId,
    investmentId,
    emptyStateTitle,
    emptyStateDescription,
    quickAddTriggerLabel
  } = props
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const { isSubmitting: isQuickAddSubmitting, runGuarded: runQuickAddGuarded } = useQuickAddSubmitGuard()

  const defaultReminderDate = new Date().toISOString().slice(0, 16)
  const form = useForm({
    resolver: zodResolver(quickNoteSchema),
    defaultValues: {
      details: { title: '', text: '' },
      reminderDate: defaultReminderDate,
      _pendingFiles: [] as File[]
    }
  })

  useEffect(() => {
    if (showQuickAdd) {
      form.setValue('reminderDate', new Date().toISOString().slice(0, 16))
    }
  }, [showQuickAdd, form])

  // Map raw notes to NoteItem format
  const notes = useMemo(() => {
    if (!rawNotes || rawNotes.length === 0) return []

    return rawNotes.map((note: Note) => {
      // Handle both CustomerNote (title/text) and Note (title/text) field names
      // Get author display name
      const authorEmployee = note.authorEmployee
      const createdBy = authorEmployee
        ? `${authorEmployee.firstName || ''} ${authorEmployee.lastName || ''}`.trim() ||
          authorEmployee.displayName ||
          t('common-unknown')
        : t('common-unknown')

      return {
        id: note.id,
        version: note.version,
        title: note.title || t('notes-untitled'),
        text: note.text || '',
        createdAt: note.createdAt || '',
        createdBy,
        authorEmployee: authorEmployee,
        reminderDate: note.reminderDate,
        documents: note.documents || []
      }
    })
  }, [rawNotes, t])

  // Handle document download
  const handleDocumentClick = async (document: NoteDocument, e: React.MouseEvent) => {
    e.stopPropagation()
    await handleDocumentClickUtil(document, accessToken, { showToast: true })
  }

  const getAuthorName = (authorEmployee: any) => {
    if (!authorEmployee) return null

    // Use firstName + lastName first
    const fullName = `${authorEmployee.firstName || ''} ${authorEmployee.lastName || ''}`.trim()
    if (fullName) return fullName

    // Fallback to displayName
    return authorEmployee.displayName || null
  }

  const handleEmployeeClick = (employeeId: string) => {
    navigateTo(buildPlatformUrl('/platform/employee-record', { employeeId }))
  }

  return (
    <div data-testid={props['data-testid'] || 'note-section-new-content'} className="gba:space-y-4">
      {/* Quick Add Note */}
      {noteActionProps && (
        <div className="gba:mb-4">
          <AppActionProvider
            accessToken={accessToken}
            contextsArray={noteActionProps.contextsArray}
            externalContextData={noteActionProps.externalContextData}
            prefixDataTestId={noteActionProps.prefixDataTestId}
            onSuccess={() => {
              form.reset({
                details: { title: '', text: '' },
                reminderDate: new Date().toISOString().slice(0, 16),
                _pendingFiles: []
              })
              setShowQuickAdd(false)
            }}
            onError={error => {
              console.error('Failed to create note:', error)
            }}
            transformData={
              buildNotePayload
                ? (data: any) => data
                : (data: any) => ({
                    title: data.details.title,
                    text: data.details.text,
                    reminderDate: data.reminderDate || undefined
                  })
            }
          >
            {({ executeAction, isProcessing }) => (
              <NoteInput
                form={form}
                schema={quickNoteSchema}
                quickAddTriggerLabel={quickAddTriggerLabel}
                onSubmit={async (data: any) => {
                  if (isProcessing || isQuickAddSubmitting) {
                    return
                  }
                  await runQuickAddGuarded(async () => {
                    const flat = {
                      title: data.details.title,
                      text: data.details.text,
                      reminderDate: data.reminderDate || undefined,
                      _pendingFiles: data._pendingFiles?.length ? data._pendingFiles : undefined,
                      ...(leadId && { leadId }),
                      ...(accountId && { accountId }),
                      ...(contactId && { contactId }),
                      ...(opportunityId && { opportunityId }),
                      ...(investmentId && { investmentId })
                    }
                    let toBuild: Record<string, any> = flat
                    if (props.preSubmit) {
                      toBuild = await props.preSubmit(flat)
                    }
                    const payload = buildNotePayload ? buildNotePayload(toBuild) : toBuild
                    if (payload && '_pendingFiles' in payload) {
                      delete payload._pendingFiles
                    }
                    await executeAction(payload)
                  })
                }}
                isProcessing={isProcessing}
                isSubmitting={isQuickAddSubmitting}
                showQuickAdd={showQuickAdd}
                onShowQuickAddChange={setShowQuickAdd}
              />
            )}
          </AppActionProvider>
        </div>
      )}

      {notes.length === 0 ? (
        <EmptyState
          type="no-data"
          title={emptyStateTitle ?? t('notes-empty-title')}
          description={emptyStateDescription ?? t('notes-empty-description')}
          data-testid="note-section-empty-state"
        />
      ) : (
        notes.map(note => (
          <Card key={note.id} className="gba:shadow-none gba:border gba:border-gray-200">
            <CardHeader className="gba:pb-2">
              <div className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2 gba:w-full">
                <CardTitle className="gba:text-base gba:flex-1 gba:truncate gba:min-w-0">{note.title}</CardTitle>
                {noteEntityActionProps && (
                  <AppActionMenu
                    accessToken={accessToken}
                    contextsArray={noteEntityActionProps.contextsArray}
                    externalContextData={{
                      ...noteEntityActionProps.externalContextData,
                      noteId: note.id,
                      version: note.version
                    }}
                    prefixDataTestId={`${noteEntityActionProps.prefixDataTestId}-${note.id}`}
                    deferMainContextRequestsUntilClick={true}
                    emptyStateBehavior="enable"
                  >
                    <div
                      className="gba:flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:cursor-pointer gba:rounded gba:hover:bg-gray-100 gba:transition-colors gba:shrink-0"
                      data-testid={`note-menu-${note.id}`}
                    >
                      <DotsThreeVertical size={16} />
                    </div>
                  </AppActionMenu>
                )}
              </div>
            </CardHeader>
            <CardContent className="gba:pt-0">
              <p className="gba:text-sm gba:text-gray-700 gba:mb-2">{note.text}</p>
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-4 gba:gap-y-1 gba:text-xs gba:text-muted-foreground">
                <span className="gba:flex gba:items-center gba:gap-1">
                  <UserIcon size={12} />
                  {note.authorEmployee?.id && getAuthorName(note.authorEmployee) ? (
                    <a
                      href={buildPlatformUrl('/platform/employee-record', {
                        employeeId: note.authorEmployee.id
                      })}
                      onClick={e => {
                        e.preventDefault()
                        handleEmployeeClick(note.authorEmployee!.id!)
                      }}
                      className="gba:font-medium gba:text-primary gba:hover:underline gba:cursor-pointer"
                      data-testid={`note-author-link-${note.authorEmployee.id}`}
                    >
                      {getAuthorName(note.authorEmployee)}
                    </a>
                  ) : (
                    note.createdBy
                  )}
                </span>
                <span className="gba:flex gba:items-center gba:gap-1">
                  <CalendarBlankIcon size={12} /> {dayjs(note.createdAt).format('MMM D, YYYY h:mm A')}
                </span>
                {note.reminderDate && (
                  <span className="gba:flex gba:items-center gba:gap-1 gba:text-orange-600">
                    <BellIcon size={12} /> Reminder {dayjs(note.reminderDate).format('MMM D, YYYY h:mm A')}
                  </span>
                )}
              </div>
              {note.documents && note.documents.length > 0 && (
                <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-3" data-testid={`note-documents-${note.id}`}>
                  {note.documents.map(doc => (
                    <button
                      key={doc.id}
                      onClick={e => handleDocumentClick(doc, e)}
                      className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:text-xs gba:bg-muted gba:rounded gba:hover:bg-accent gba:transition-colors"
                      data-testid={`note-document-${note.id}-${doc.id}`}
                      title={doc.name}
                    >
                      {getDocumentIcon({ name: doc.name, mimeType: doc.mimeType, size: 14 })}
                      <span className="gba:truncate gba:max-w-[150px]">{doc.name}</span>
                    </button>
                  ))}
                </div>
              )}{' '}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

// Static properties for SectionWrapper
;(NoteSection as any).sectionTitle = (noteSectionProps: NoteSectionProps) => noteSectionProps.sectionTitle ?? 'Notes'
;(NoteSection as any).getActionButtonConfig = (_pageData: any, _pageIndex: number, props: NoteSectionProps) => {
  const { accessToken, noteActionProps } = props

  if (!noteActionProps || !accessToken) {
    return null
  }

  return {
    type: 'AppAction' as const,
    config: {
      contextsArray: noteActionProps.contextsArray,
      externalContextData: noteActionProps.externalContextData,
      prefixDataTestId: noteActionProps.prefixDataTestId,
      emptyStateBehavior: noteActionProps.emptyStateBehavior || 'enable',
      children: (
        <Button data-testid="add-note-button" variant="secondary" size="icon">
          <PlusIcon />
        </Button>
      )
    }
  }
}

export default NoteSection
