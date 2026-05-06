import React, { useMemo, useCallback, useState } from 'react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Switch,
  Badge,
  useTranslation,
  AvatarUpload
} from '@newwork/nw-design-system'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { CatalogSelect } from '@/components/catalog-select'
import { EmployeeSelect } from '@/components/employee-select'
import { ContactSelect } from '@/common/components/common-relations/selects/contact-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { SelectOption as ContactSelectOption } from '@/common/components/common-relations/selects/contact-select'
import { INDUSTRY_CLASS } from '@/common/constants/commonCatalogs'
import type {
  InlineEntityDraft,
  InlineEntityCreateRenderProps
} from '@/common/components/common-relations/popups/inline-entity-create-popup'
import translations from './_i18n'

interface AccountInformationSegmentProps {
  // Business app context for EmployeeSelect
  businessAppContext?: BusinessAppContextProps

  // Account contacts from loaded entity (with nested contact) for display - same pattern as ownerEmployee
  accountContacts?: any[]

  // Owner employee from account data (to display immediately)
  ownerEmployee?: any
  // Entity ID (account ID for edit mode)
  entityId?: string

  // Contact selection hook result (optional - if not provided, contacts section won't render)
  // Raw entities and refetch function - generic types for context-agnostic component
  useContacts?: {
    contacts: any[]
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

  // Catalog identifier for account priority (context-specific)
  accountPriorityCatalogIdentifier?: string

  // Render prop for the inline contact create/edit popup.
  // When provided, enables draft-contact creation from the contacts field.
  // The caller supplies module and businessAppContext; the segment supplies dialog state.
  inlineContactCreate?: (props: InlineEntityCreateRenderProps) => React.ReactNode
}

const AccountInformationSegment: React.FC<AccountInformationSegmentProps> = ({
  businessAppContext,
  accountContacts,
  ownerEmployee,
  entityId,
  useContacts,
  customFields,
  avatarFileRef,
  accountPriorityCatalogIdentifier,
  inlineContactCreate
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)

  // useFieldArray provides typed `append`/`update` mutators for the contacts list, so the
  // inline-create flow doesn't have to round-trip through `form.setValue` (which loses RHF's
  // internal field-id bookkeeping for arrays).
  const accountContactsArray = useFieldArray({ control: form.control, name: 'accountContacts' })

  // Inline-create dialog state for nested contact drafts
  const [draftDialog, setDraftDialog] = useState<{ open: boolean; editIndex: number | null }>({
    open: false,
    editIndex: null
  })

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
      const draftEntry = {
        __isDraft: true,
        __draftId: draft.__draftId,
        contactType: draft.contactType ?? null,
        ...('contact' in draft ? { contact: draft.contact } : {})
      }

      if (draftDialog.editIndex === null) {
        accountContactsArray.append(draftEntry)
      } else {
        const current: any[] = (form.getValues('accountContacts') as any[]) || []
        const previous = current[draftDialog.editIndex] || {}
        accountContactsArray.update(draftDialog.editIndex, {
          ...previous,
          ...draftEntry,
          __draftId: previous.__draftId || draft.__draftId
        })
      }
    },
    [accountContactsArray, draftDialog.editIndex, form]
  )

  const editDraftDefaults = useMemo(() => {
    if (draftDialog.editIndex === null) return undefined
    const entries: any[] = (form.getValues('accountContacts') as any[]) || []
    return entries[draftDialog.editIndex]?.contact || undefined
  }, [draftDialog.editIndex, form])

  const editDraftId = useMemo(() => {
    if (draftDialog.editIndex === null) return undefined
    const entries: any[] = (form.getValues('accountContacts') as any[]) || []
    return entries[draftDialog.editIndex]?.__draftId
  }, [draftDialog.editIndex, form])

  // Transform contacts to SelectOption[] internally
  const contactOptions = useMemo<ContactSelectOption[]>(() => {
    if (!useContacts?.contacts) return []
    return useContacts.contacts.map((contact: any) => {
      const emailChannel = contact.communicationChannels?.find(
        (ch: any) => ch.communicationChannel?.code === 'EMAIL' || ch.communicationChannelRef?.includes(':EMAIL')
      )
      const email = emailChannel?.value || contact.email || undefined

      return {
        id: contact.id || '',
        value: contact.id || '',
        label: contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact',
        name: contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact',
        pictureThumbnail: contact.pictureThumbnail || undefined,
        extraInfo: {
          email,
          jobPosition: contact.jobPosition,
          department: contact.department,
          organizationalUnit: contact.ownerEmployee?.displayName || 'Unknown'
        }
      } as ContactSelectOption
    })
  }, [useContacts?.contacts])

  // Search function — prefers the stateful `search` fn, falls back to `refetch`
  const searchContacts = useCallback(
    (searchTerm: string) => {
      if (useContacts?.search) {
        useContacts.search(searchTerm.trim())
      } else if (useContacts?.refetch) {
        useContacts.refetch({ search: searchTerm.trim(), limit: 20, offset: 0 })
      }
    },
    [useContacts?.search, useContacts?.refetch]
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

  // Helper function to transform accountContact to ContactSelect format
  const transformAccountContactToContactSelect = (
    ac: any
  ): {
    id: string
    name: string
    contactType?: string
    pictureThumbnail?: string
    jobPosition?: string
    department?: string
    __isDraft?: boolean
    __draftId?: string
    contact?: Record<string, any>
  } => {
    // Inline-create draft entries: forward the full embedded contact payload so ContactSelect
    // can natively render the row with the same layout (avatar / name / job-position /
    // department / email / phone) as saved contacts. The `contact` blob also carries every
    // field the user filled in the dialog (custom fields, comm channels, addresses, etc.) so
    // editing round-trips losslessly.
    if (ac?.__isDraft) {
      const c = ac.contact || {}
      const displayName = c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'New Contact'
      return {
        id: ac.__draftId,
        name: displayName,
        contactType: ac.contactType || undefined,
        __isDraft: true,
        __draftId: ac.__draftId,
        contact: c
      }
    }

    const contactId = ac.contactId || ac.contact?.id || ''

    // Use nested contact from loaded entity (accountContacts prop) or from useContacts
    const contact =
      ac.contact ||
      accountContacts?.find((acEntity: any) => (acEntity.contactId || acEntity.contact?.id) === contactId)?.contact ||
      useContacts?.contacts?.find((c: any) => c.id === contactId)

    if (contact) {
      const displayName =
        contact.fullName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown Contact'

      return {
        id: contactId,
        name: displayName,
        contactType: ac.contactType || undefined,
        pictureThumbnail: contact.pictureThumbnail,
        jobPosition: contact.jobPosition,
        department: contact.department
      }
    }

    // Fallback if contact not found
    return {
      id: contactId,
      name: 'Unknown Contact',
      contactType: ac.contactType || undefined
    }
  }

  // Helper function to transform contact value to accountContact format
  const transformContactValueToAccountContact = useCallback(
    (contactValue: any, accountId: string | undefined, existingAccountContacts: any[]) => {
      // Round-trip drafts: preserve the embedded `contact` payload coming back from
      // ContactSelect so editing the contact-type (or any other field on the row) doesn't
      // wipe out the dialog state. Falls back to the existing form-state draft if the
      // incoming value somehow lost its embedded payload.
      if (typeof contactValue === 'object' && contactValue?.__isDraft) {
        const existingDraft = existingAccountContacts.find(
          (ac: any) => ac?.__isDraft && ac?.__draftId === contactValue.__draftId
        )
        const embeddedContact = contactValue.contact ?? existingDraft?.contact
        return {
          __isDraft: true,
          __draftId: contactValue.__draftId,
          contactType:
            contactValue.contactType === undefined ? (existingDraft?.contactType ?? null) : contactValue.contactType,
          ...(embeddedContact ? { contact: embeddedContact } : {})
        }
      }

      const contactId = typeof contactValue === 'object' ? contactValue.id : contactValue
      const contactType = typeof contactValue === 'object' ? contactValue.contactType : undefined

      // Find existing accountContact to preserve id and version
      const existingAc = existingAccountContacts.find((ac: any) => (ac.contactId || ac.contact?.id) === contactId)

      return {
        ...(existingAc?.id && { id: existingAc.id }),
        ...(existingAc?.version !== undefined && { version: existingAc.version }),
        accountId: accountId || undefined,
        contactId: contactId,
        contactType: contactType || null
      }
    },
    []
  )

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
            <FormLabel>{t('account-owner-label')}</FormLabel>
            <FormControl>
              <EmployeeSelect
                value={field.value || null}
                onValueChange={(v: string | null) => field.onChange(v || '')}
                businessAppContext={businessAppContext}
                initialEmployee={ownerEmployee}
                autoSelect={entityId ? undefined : 'current-user'}
                placeholder={t('please-select')}
                data-testid="account-information-segment-owner"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Prospective Toggle - Enhanced with Card-like Container */}
      <FormField
        control={form.control}
        name="prospective"
        render={({ field }) => {
          // Calculate label and description based on current field value
          const nonProspectiveLabel = t('active-account-label')
          const prospectiveDescription = t('prospect-description')
          const nonProspectiveDescription = t('active-description')

          const prospectiveLabel = field.value ? t('prospect-label') : nonProspectiveLabel
          const prospectiveDesc = field.value ? prospectiveDescription : nonProspectiveDescription

          return (
            <FormItem>
              <div className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:p-4">
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                  <div className="gba:flex-1 gba:space-y-1">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <FormLabel className="gba:text-base gba:font-semibold gba:m-0">
                        {t('account-type-label')}
                      </FormLabel>
                      <Badge variant={field.value ? 'info' : 'success'} className="gba:text-xs">
                        {prospectiveLabel}
                      </Badge>
                    </div>
                    <p className="gba:text-sm gba:text-muted-foreground gba:m-0">{prospectiveDesc}</p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={checked => {
                        field.onChange(checked)
                      }}
                      data-testid="account-information-prospective-switch"
                    />
                  </FormControl>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )
        }}
      />

      {/* Account Name */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('account-name-label')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('account-name-placeholder')}
                data-testid="account-information-segment-name"
                value={field.value || ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Avatar Upload */}
      <FormField
        control={form.control}
        name="pictureThumbnail"
        render={() => (
          <FormItem>
            <FormLabel>{t('account-picture-label')}</FormLabel>
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
                data-testid="account-information-segment-avatar"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Priority - Above Legal Form and Industry */}
      {accountPriorityCatalogIdentifier && (
        <FormField
          control={form.control}
          name="accountPriorityRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('priority-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier={accountPriorityCatalogIdentifier}
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="account-information-segment-priority"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Industry */}
      <FormField
        control={form.control}
        name="industryClassRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('industry-label')}</FormLabel>
            <FormControl>
              <CatalogSelect
                catalogIdentifier={INDUSTRY_CLASS}
                value={field.value || ''}
                onValueChange={v => field.onChange(v)}
                data-testid="account-information-segment-industry"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Website */}
      <FormField
        control={form.control}
        name="website"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('website-label')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('website-placeholder')}
                data-testid="account-information-segment-website"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Custom fields (context-specific, e.g., CRM Sales Campaign) */}
      {customFields}

      {/* Contacts Selection using ContactSelect */}
      {useContacts && (
        <FormField
          control={form.control}
          name="accountContacts"
          render={({ field, fieldState }) => {
            // Transform accountContacts to ContactSelect format
            // Contact display data is looked up from useContacts list
            const accountContacts = field.value || []
            const contactSelectValue = accountContacts.map(transformAccountContactToContactSelect)

            // Handle onChange - transform back to accountContacts format
            const handleChange = (
              contactIds:
                | Array<string | { id: string; name: string; contactType?: string }>
                | string
                | { id: string; name: string; contactType?: string }
                | null
            ) => {
              // Normalize to array: handle null, single values, and arrays
              let normalizedValue: Array<string | { id: string; name: string; contactType?: string }>
              if (contactIds === null) {
                normalizedValue = []
              } else if (Array.isArray(contactIds)) {
                normalizedValue = contactIds
              } else {
                normalizedValue = [contactIds]
              }

              const accountId = form.getValues('id')
              const existingAccountContacts = field.value || []
              const accountContacts = normalizedValue.map((contactValue: any) =>
                transformContactValueToAccountContact(contactValue, accountId, existingAccountContacts)
              )
              field.onChange(accountContacts)
            }

            return (
              <FormItem>
                <FormLabel>{t('contacts-label')}</FormLabel>
                <FormControl>
                  <ContactSelect
                    value={contactSelectValue}
                    onChange={handleChange}
                    contacts={contactOptions}
                    contactsLoading={useContacts.loading}
                    contactsError={useContacts.error}
                    searchContacts={searchContacts}
                    hasMore={useContacts.hasMore}
                    onLoadMore={useContacts.loadMore}
                    accountContacts={field.value || []}
                    dataTestId="account-information-segment-contacts"
                    error={fieldState.error?.message || null}
                    onCreateNew={inlineContactCreate && businessAppContext ? handleOpenCreateDraft : undefined}
                    onEditDraft={inlineContactCreate && businessAppContext ? handleOpenEditDraft : undefined}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
      )}

      {inlineContactCreate?.({
        open: draftDialog.open,
        onOpenChange: handleDialogOpenChange,
        draftId: editDraftId,
        defaultValues: editDraftDefaults,
        onConfirm: handleDraftConfirm,
        'data-testid': 'account-information-segment-inline-create-contact'
      })}
    </div>
  )
}

export default AccountInformationSegment
