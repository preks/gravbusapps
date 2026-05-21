import React, { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { v4 as uuidv4 } from 'uuid'
import { Form, Button, Alert, AlertDescription, useTranslation } from '@newwork/nw-design-system'
// Import directly from the source file (NOT through the barrel `index.ts`) to avoid a
// runtime temporal-dead-zone error caused by a circular import:
//   ContactForm → ContactLayout → ContactInformationSegment → InlineEntityCreatePopup
//     → InlineContactCreateForm → contact-layout/index.ts → ContactLayout (in-progress)
import ContactLayout from '@/common/components/common-relations/form-layouts/contact-layout/ContactLayout'
import { CatalogSelect } from '@/components/catalog-select'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFileClient } from '@/common/network/files/useFileClient'
import { buildFilePath } from '@/common/utils/fileUtils'
import { mapToFormValues } from '@/common/utils/formMappingUtils'
import type { InlineDraftContact, InlineContactFormConfig } from './types'
import translations from './_i18n'

interface InlineContactCreateFormProps {
  /** All domain-specific details injected by the calling form — no module string needed. */
  formConfig: InlineContactFormConfig
  businessAppContext: BusinessAppContextProps
  defaultValues?: Partial<InlineDraftContact['contact']>
  draftId?: string
  onConfirm: (draft: InlineDraftContact) => void
  onCancel: () => void
  dataTestId?: string
}

const InlineContactCreateForm: React.FC<InlineContactCreateFormProps> = ({
  formConfig,
  businessAppContext,
  defaultValues,
  draftId,
  onConfirm,
  onCancel,
  dataTestId = 'inline-contact-create'
}) => {
  const { t } = useTranslation(translations)
  const fileClient = useFileClient(businessAppContext)
  const avatarFileRef = useRef<{ file: File; thumbnail: string } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const { schema, fileConfig, renderCustomFields } = formConfig

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: mapToFormValues(defaultValues || {}, schema) as any,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  })

  const customFields = renderCustomFields?.({
    defaultValues: defaultValues as Record<string, any>,
    dataTestIdPrefix: dataTestId
  })

  const handleSubmit = useCallback(
    async (data: any) => {
      setUploadError(null)

      let payload = { ...data }
      const avatarData = avatarFileRef.current

      if (avatarData?.file && avatarData?.thumbnail) {
        try {
          setIsUploading(true)
          const folderPath = buildFilePath(fileConfig.fileEntity, null, fileConfig.fileContext)
          const pathParams = { accessScope: 'tenant' } as const
          const queryParams = {
            appName: businessAppContext.additionalData?.appName as string | undefined,
            folderPath,
            mimeType: avatarData.file.type
          }
          const uploadResponse = await fileClient.uploadFile(avatarData.file, pathParams, queryParams)
          payload = {
            ...payload,
            picture: JSON.stringify(uploadResponse.fileInfo),
            pictureThumbnail: avatarData.thumbnail
          }
        } catch (err) {
          console.error('Failed to upload contact avatar:', err)
          setUploadError(t('avatar-upload-error'))
          setIsUploading(false)
          return
        } finally {
          setIsUploading(false)
        }
      }

      onConfirm({
        __draftId: draftId || uuidv4(),
        __isDraft: true,
        contact: payload
      })
    },
    [draftId, fileClient, fileConfig, onConfirm, t]
  )

  return (
    <CatalogSelect.Provider
      accessToken={businessAppContext.accessToken}
      userInfo={businessAppContext.userInfo}
      additionalData={businessAppContext.additionalData}
      form={form}
    >
      <Form {...(form as any)} schema={schema}>
        <form
          onSubmit={e => {
            // Stop the synthetic submit event from bubbling up the React tree to the
            // parent form. The Radix Dialog portals out of the parent DOM, but React
            // events still bubble through the component hierarchy — without this, the
            // parent form's onSubmit would fire and validate against its own (empty)
            // required fields. See also: InlineAccountCreateForm.tsx.
            e.stopPropagation()
            form.handleSubmit(handleSubmit)(e)
          }}
          className="gba:flex gba:flex-col gba:w-full"
          data-testid={`${dataTestId}-form`}
        >
          <div className="gba:flex-1 gba:overflow-y-auto gba:pr-1 gba:max-h-[60vh]">
            <ContactLayout
              businessAppContext={businessAppContext}
              contactInformationCustomFields={customFields}
              avatarFileRef={avatarFileRef}
              loading={false}
            />
          </div>

          {uploadError && (
            <Alert variant="destructive" className="gba:mt-3">
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4 gba:border-t gba:mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid={`${dataTestId}-cancel`}
              disabled={isUploading || form.formState.isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              data-testid={`${dataTestId}-submit`}
              disabled={isUploading || form.formState.isSubmitting}
            >
              {draftId ? t('save-draft') : t('add-draft')}
            </Button>
          </div>
        </form>
      </Form>
    </CatalogSelect.Provider>
  )
}

export default InlineContactCreateForm
export { InlineContactCreateForm }
