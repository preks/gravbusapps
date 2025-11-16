import React from 'react'
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
import { CatalogSelect } from '@/components/catalog-select'
import { OwnerSelect } from '@/common/components/common-relations/selects/owner-select'
import { ContactSelect } from '@/common/components/common-relations/selects/contact-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFileClient } from '@/common/network/files/useFileClient'
import type { SelectOption as ContactSelectOption } from '@/common/components/common-relations/selects/contact-select'
import translations from './_i18n'

interface AccountInformationSegmentProps {
  // Business app context for EmployeeSelect and file uploads
  businessAppContext?: BusinessAppContextProps

  // Upload configuration (provided by parent segment, from form's constants)
  uploadConfig?: {
    appName: string
    accessScope: 'public' | 'private' | 'tenant'
    getAvatarPath: (entityId: string | undefined) => string
  }

  // Owner employee from account data (to display immediately)
  ownerEmployee?: any
  // Entity ID (account ID for edit mode)
  entityId?: string
  // Avatar image for preview (from existing account data)
  avatarImage?: string

  // Contact selection props
  contacts?: ContactSelectOption[]
  contactsLoading?: boolean
  contactsError?: string | null
  searchContacts?: (search: string) => void

  // Custom fields (context-specific, e.g., CRM Sales Campaign)
  customFields?: React.ReactNode
}

const AccountInformationSegment: React.FC<AccountInformationSegmentProps> = ({
  businessAppContext,
  uploadConfig,
  ownerEmployee,
  entityId,
  avatarImage,
  contacts = [],
  contactsLoading = false,
  contactsError = null,
  searchContacts,
  customFields
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)
  const fileClient = businessAppContext ? useFileClient(businessAppContext) : null

  // Handle avatar upload (only if uploadConfig is provided)
  const handleAvatarUpload = async (file: File): Promise<{ picture: string; pictureThumbnail: string }> => {
    if (!fileClient || !uploadConfig) {
      throw new Error('File client or upload configuration not provided')
    }

    try {
      const entityId = form.getValues('id')
      const pathParams = { accessScope: uploadConfig.accessScope } as { accessScope: 'tenant' }
      const queryParams = {
        appName: uploadConfig.appName,
        folderPath: uploadConfig.getAvatarPath(entityId),
        mimeType: file.type || 'image/jpeg'
      }

      const uploadResponse = await fileClient.uploadFile(file, pathParams, queryParams)

      // Return picture and pictureThumbnail for form
      return {
        picture: JSON.stringify(uploadResponse.fileInfo),
        pictureThumbnail: '' // Will be set from AvatarUpload thumbnail
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      throw error
    }
  }

  return (
    <div className="gba:space-y-6 gba:w-full gba:max-w-full gba:overflow-hidden">
      {/* Owner */}
      <FormField
        control={form.control}
        name="ownerEmployeeId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('account-owner-label')} <span>*</span>
            </FormLabel>
            <FormControl>
              <OwnerSelect
                value={field.value || null}
                onValueChange={(v: string | null) => field.onChange(v || '')}
                businessAppContext={businessAppContext!}
                ownerEmployee={ownerEmployee}
                isNewEntity={!entityId}
                placeholder={t('please-select')}
                data-testid="account-information-segment-owner"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Account Name */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('account-name-label')} <span>*</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder={t('account-name-placeholder')}
                data-testid="account-information-segment-name"
                {...field}
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
                onChange={async value => {
                  if (value?.file) {
                    // Upload immediately if uploadConfig and fileClient are configured
                    if (uploadConfig && fileClient) {
                      try {
                        const { picture } = await handleAvatarUpload(value.file)
                        form.setValue('picture', picture)
                      } catch (error) {
                        console.error('Avatar upload failed:', error)
                        // Still store file for later retry
                        ;(form as any)._avatarFile = value.file
                      }
                    } else {
                      // Store file temporarily for handlePreSubmit in form component
                      ;(form as any)._avatarFile = value.file
                    }

                    // Extract plain base64 from thumbnail (remove data URL prefix if present)
                    const thumbnailBase64 = value.thumbnail
                      ? value.thumbnail.includes(',')
                        ? value.thumbnail.split(',').pop() || ''
                        : value.thumbnail
                      : ''
                    form.setValue('pictureThumbnail', thumbnailBase64)
                  } else {
                    ;(form as any)._avatarFile = undefined
                    form.setValue('pictureThumbnail', null)
                    form.setValue('picture', null)
                  }
                }}
                data-testid="account-information-segment-avatar"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Legal Form and Industry - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2 gba:w-full gba:max-w-full gba:overflow-hidden">
        <FormField
          control={form.control}
          name="legalFormRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('legal-form-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier="LegalForm:v1"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="account-information-segment-legal-form"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="industryClassRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('industry-label')}</FormLabel>
              <FormControl>
                <CatalogSelect
                  catalogIdentifier="IndustryClass:v1"
                  value={field.value || ''}
                  onValueChange={v => field.onChange(v)}
                  data-testid="account-information-segment-industry"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

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
      {searchContacts && (
        <FormField
          control={form.control}
          name="contacts"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('contacts-label')}</FormLabel>
              <FormControl>
                <ContactSelect
                  value={field.value || []}
                  onChange={field.onChange}
                  contacts={contacts}
                  contactsLoading={contactsLoading}
                  contactsError={contactsError}
                  searchContacts={searchContacts}
                  dataTestId="account-information-segment-contacts"
                  error={fieldState.error?.message || null}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  )
}

export default AccountInformationSegment
