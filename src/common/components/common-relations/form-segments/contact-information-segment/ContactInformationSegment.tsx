import React, { useMemo, useCallback, useState } from 'react'
import { getEmailChannel } from '@/common/data/common/utils/communicationChannelHelpers'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  useTranslation,
  AvatarUpload
} from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'
import { EmployeeSelect } from '@/components/employee-select'
import { AccountSegment } from '@/common/components/common-relations/form-segments/account-segment'
import type { AccountSegmentOption } from '@/common/components/common-relations/form-segments/account-segment'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  InlineEntityDraft,
  InlineEntityCreateRenderProps
} from '@/common/components/common-relations/popups/inline-entity-create-popup'
import translations from './_i18n'

interface ContactInformationSegmentProps {
  // Business app context for EmployeeSelect
  businessAppContext?: BusinessAppContextProps
  // Account contacts from loaded entity (with nested account) for display - same pattern as account form
  accountContacts?: any[]
  // Owner employee from contact data (to display immediately)
  ownerEmployee?: any
  // Entity ID (contact ID for edit mode)
  entityId?: string

  // Account selection hook result (optional - if not provided, accounts section won't render)
  // Raw entities and refetch function - generic types for context-agnostic component
  useAccounts?: {
    accounts: any[]
    loading: boolean
    error: string | null
    hasMore?: boolean
    search?: (searchTerm: string) => void
    loadMore?: () => void
    refetch?: (variables?: any) => Promise<void>
  }

  // Custom fields (context-specific, e.g., CRM Sales Campaign)
  customFields?: React.ReactNode

  // Ref to store current file and thumbnail (for handlePreSubmit in form component)
  avatarFileRef?: React.MutableRefObject<{ file: File; thumbnail: string } | null>

  // Render prop for the inline account create/edit popup.
  // When provided, enables the "create new account" and "edit draft account" actions on
  // the accounts field. The caller is responsible for rendering the popup with the
  // correct module and business-app context — the segment only supplies dialog state.
  inlineAccountCreate?: (props: InlineEntityCreateRenderProps) => React.ReactNode
}

const ContactInformationSegment: React.FC<ContactInformationSegmentProps> = ({
  businessAppContext,
  accountContacts,
  ownerEmployee,
  entityId,
  useAccounts,
  customFields,
  avatarFileRef,
  inlineAccountCreate
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)
  const communicationChannels = form.watch('communicationChannels')

  const emailChannelIndex = useMemo(() => {
    if (!communicationChannels?.length) return -1
    return communicationChannels.findIndex((channel: { communicationChannelRef?: string }) =>
      Boolean(getEmailChannel([channel]))
    )
  }, [communicationChannels])

  // Inline-create dialog state for nested account drafts
  const [draftDialog, setDraftDialog] = useState<{ open: boolean; editIndex: number | null }>({
    open: false,
    editIndex: null
  })

  const businessAppContextValue = businessAppContext

  const handleOpenCreateDraft = useCallback(() => {
    setDraftDialog({ open: true, editIndex: null })
  }, [])

  const handleOpenEditDraft = useCallback((index: number) => {
    setDraftDialog({ open: true, editIndex: index })
  }, [])

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (open) {
      setDraftDialog(prev => ({ ...prev, open: true }))
    } else {
      setDraftDialog({ open: false, editIndex: null })
    }
  }, [])

  const handleDraftConfirm = useCallback(
    (draft: InlineEntityDraft) => {
      // Build the draft entry: store full account payload nested + draft markers.
      const draftEntry = {
        __isDraft: true,
        __draftId: draft.__draftId,
        contactType: draft.contactType ?? null,
        ...('account' in draft ? { account: draft.account } : {})
      }

      const current: any[] = (form.getValues('accountContacts') as any[]) || []

      if (draftDialog.editIndex === null) {
        form.setValue('accountContacts', [...current, draftEntry], { shouldDirty: true, shouldValidate: true })
      } else {
        const previous = current[draftDialog.editIndex] || {}
        const nextAccountContacts = current.map((entry, index) =>
          index === draftDialog.editIndex
            ? {
                ...previous,
                ...draftEntry,
                __draftId: previous.__draftId || draft.__draftId
              }
            : entry
        )
        form.setValue('accountContacts', nextAccountContacts, { shouldDirty: true, shouldValidate: true })
      }
    },
    [draftDialog.editIndex, form]
  )

  const editDraftDefaults = useMemo(() => {
    if (draftDialog.editIndex === null) return undefined
    const entries: any[] = (form.getValues('accountContacts') as any[]) || []
    const entry = entries[draftDialog.editIndex]
    return entry?.account || undefined
  }, [draftDialog.editIndex, form])

  const editDraftId = useMemo(() => {
    if (draftDialog.editIndex === null) return undefined
    const entries: any[] = (form.getValues('accountContacts') as any[]) || []
    return entries[draftDialog.editIndex]?.__draftId
  }, [draftDialog.editIndex, form])

  // Transform accounts to AccountSegmentOption[]
  const accountOptions = useMemo<AccountSegmentOption[]>(() => {
    if (!useAccounts?.accounts) return []
    return useAccounts.accounts.map((account: any) => {
      return {
        id: account.id || '',
        value: account.id || '',
        label: account.displayName || account.name || 'Unknown Account',
        name: account.displayName || account.name || 'Unknown Account',
        pictureThumbnail: account.pictureThumbnail || undefined,
        extraInfo: {
          website: account.website || undefined,
          businessKey: account.businessKey || undefined,
          code: account.code || undefined
        }
      }
    })
  }, [useAccounts?.accounts])

  // Search function — prefers the stateful `search` fn, falls back to `refetch`
  const searchAccounts = useCallback(
    (searchTerm: string) => {
      if (useAccounts?.search) {
        useAccounts.search(searchTerm.trim())
      } else if (useAccounts?.refetch) {
        useAccounts.refetch({ search: searchTerm.trim(), limit: 20, offset: 0 })
      }
    },
    [useAccounts?.search, useAccounts?.refetch]
  )

  // Helper function to parse picture string
  const parsePictureString = (pictureStr: string): string | undefined => {
    try {
      const pictureData = JSON.parse(pictureStr)
      return pictureData?.url || pictureData?.fileUrl || undefined
    } catch {
      return pictureStr
    }
  }

  // Get avatar image from form values (pictureThumbnail or picture)
  const pictureThumbnail = form.watch('pictureThumbnail')
  const picture = form.watch('picture')
  const avatarImage = (() => {
    if (pictureThumbnail) {
      return `data:image/jpeg;base64,${pictureThumbnail}`
    }
    if (picture) {
      if (typeof picture === 'string') {
        return parsePictureString(picture)
      }
      return picture
    }
    return undefined
  })()

  return (
    <div className="gba:space-y-6 gba:w-full gba:max-w-full gba:overflow-hidden">
      {/* Owner */}
      <FormField
        control={form.control}
        name="ownerEmployeeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('contact-owner-label')}</FormLabel>
            <FormControl>
              <EmployeeSelect
                value={field.value || null}
                onValueChange={(v: string | null) => field.onChange(v || '')}
                businessAppContext={businessAppContext}
                initialEmployee={ownerEmployee}
                autoSelect={entityId ? undefined : 'current-user'}
                placeholder={t('please-select')}
                data-testid="contact-information-segment-owner"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* First Name and Last Name - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('contact-first-name-label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('contact-first-name-placeholder')}
                  data-testid="contact-information-segment-first-name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('contact-last-name-label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('contact-last-name-placeholder')}
                  data-testid="contact-information-segment-last-name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {emailChannelIndex >= 0 && (
        <FormField
          control={form.control}
          name={`communicationChannels.${emailChannelIndex}.value`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('contact-email-label')}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t('please-enter')}
                  data-testid="contact-information-segment-email"
                  value={field.value || ''}
                  onChange={e => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Job Position and Department - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        <FormField
          control={form.control}
          name="jobPosition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('contact-job-position-label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('contact-job-position-placeholder')}
                  data-testid="contact-information-segment-job-position"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('contact-department-label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('contact-department-placeholder')}
                  data-testid="contact-information-segment-department"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Avatar Upload */}
      <FormField
        control={form.control}
        name="pictureThumbnail"
        render={() => (
          <FormItem>
            <FormLabel>{t('contact-picture-label')}</FormLabel>
            <FormControl>
              <AvatarUpload
                image={avatarImage}
                variant="compact"
                onChange={value => {
                  // Store file and thumbnail in ref (no re-renders, no form state changes)
                  if (avatarFileRef) {
                    if (value?.file && value?.thumbnail) {
                      const thumbnailBase64 = value.thumbnail.includes(',')
                        ? value.thumbnail.split(',').pop() || ''
                        : value.thumbnail
                      avatarFileRef.current = {
                        file: value.file,
                        thumbnail: thumbnailBase64
                      }
                    } else {
                      avatarFileRef.current = null
                    }
                  }
                }}
                data-testid="contact-information-segment-avatar"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Custom fields slot */}
      {customFields}

      {/* Account Selection - Multiple accounts with contact types */}
      {useAccounts && (
        <FormField
          control={form.control}
          name="accountContacts"
          render={({ field }) => (
            <FormItem className="gba:w-full gba:max-w-full gba:min-w-0 gba:overflow-hidden">
              <FormLabel>{t('contact-accounts-label')}</FormLabel>
              <FormControl className="gba:w-full gba:max-w-full gba:min-w-0">
                <AccountSegment
                  fieldArrayName="accountContacts"
                  accountIdFieldName="accountId"
                  accountTypeFieldName="contactType"
                  typeMode="contactType"
                  accountContacts={accountContacts}
                  accountContactsValue={field.value || []}
                  onAccountContactsChange={field.onChange}
                  accounts={accountOptions}
                  accountsLoading={useAccounts.loading}
                  accountsError={useAccounts.error}
                  searchAccounts={searchAccounts}
                  hasMore={useAccounts.hasMore}
                  onLoadMore={useAccounts.loadMore}
                  dataTestId="contact-information-segment-accounts"
                  onCreateNew={inlineAccountCreate && businessAppContextValue ? handleOpenCreateDraft : undefined}
                  onEditDraft={inlineAccountCreate && businessAppContextValue ? handleOpenEditDraft : undefined}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}

      {inlineAccountCreate?.({
        open: draftDialog.open,
        onOpenChange: handleDialogOpenChange,
        draftId: editDraftId,
        defaultValues: editDraftDefaults,
        onConfirm: handleDraftConfirm,
        'data-testid': 'contact-information-segment-inline-create-account'
      })}
    </div>
  )
}

export default ContactInformationSegment
