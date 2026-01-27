import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  DateInput,
  Textarea,
  Combobox,
  FileUpload,
  Button,
  Input
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import FormHeader from '../components/FormHeader'
import flowIconUrl from '@/assets/icons/flowSmall.svg'
import type { UploadFile } from 'antd'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useUploadDocumentLookups } from './queries/UploadDocumentQueries'
import { useFileClient } from '@/common/network/files/useFileClient'
import { useDocumentClassification } from '@/common/hooks/useDocumentClassification'

// Extracted submit logic for re-use and testing
export async function submitUploadDocument(
  values: {
    documentName: string
    documentGroupId: string | null
    documentTypeId: string | null
    expiryDate?: string
    description?: string
  },
  deps: { employeeId?: string; files: UploadFile[]; fileClient: ReturnType<typeof useFileClient> }
) {
  const { employeeId, files, fileClient } = deps
  if (!employeeId) {
    throw new Error('Employee ID is required')
  }

  if (!files.length || !files[0].originFileObj) {
    throw new Error('File is required')
  }

  try {
    const file = files[0].originFileObj as File

    // 1. Upload file to Azure
    const uploadResp = await fileClient.uploadFile(
      file,
      { accessScope: 'tenant' },
      {
        appName: 'employee-profile',
        folderPath: `/documents/${employeeId}`,
        mimeType: file.type || 'application/octet-stream'
      },
      'fileContent'
    )

    // 2. Validate upload response before building payload
    if (!uploadResp || !uploadResp.fileInfo || !uploadResp.fileInfo.fileId) {
      throw new Error('File upload failed: missing file ID in response')
    }

    // 3. Build payload for Kogito process (no separate API call!)
    return {
      employeeId,
      employeeDocument: {
        employeeId,
        name: values.documentName,
        file: uploadResp.fileInfo.fileId,
        mimeType: uploadResp.fileInfo.fileMetadata?.mimeType || file.type || 'application/octet-stream',
        fileSize: file.size,
        documentGroup: values.documentGroupId || null,
        type: values.documentTypeId || null,
        description: values.description || null,
        validFrom: new Date().toISOString(),
        validTo: values.expiryDate ? new Date(values.expiryDate).toISOString() : null,
        mandatory: false
      },
      event: 'pse_submit',
      pso_exitStrategy: 'complete'
    }
  } catch (e) {
    console.error('Error uploading document:', e)
    throw new Error('Failed to upload document')
  }
}

export interface UploadDocumentFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

interface UploadDocumentValues {
  documentName: string
  documentGroupId: string | null
  documentTypeId: string | null
  expiryDate?: string
  description?: string
}

const DATA_TEST_ID_PREFIX = 'UploadDocumentForm'

const UploadDocument: React.FC<UploadDocumentFormProps> = context => {
  const { prefixDataTestId } = context as any
  const dataTestId = useMemo(() => formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX), [prefixDataTestId])
  const APP_FORM_TID = 'upload-document-form'

  const form = useForm<UploadDocumentValues>({
    defaultValues: {
      documentName: '',
      documentGroupId: null,
      documentTypeId: null,
      expiryDate: '',
      description: ''
    },
    mode: 'onChange'
  })

  const [, setFileList] = useState<UploadFile[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pendingTypeValue, setPendingTypeValue] = useState<string | null>(null)
  const initialDefaultsRef = useRef(form.getValues())

  const title = useMemo(
    () => getTranslationFromI18nKeyAndLabel('lowcoder:upload_document_form.title', 'Upload Document'),
    []
  )

  const isSubmitDisabled = useMemo(() => {
    const hasValidationErrors = Object.keys((form.formState as any)?.errors ?? {}).length > 0
    const hasFile = Boolean(selectedFile)
    const vals = form.getValues()
    const requiredMissing = !vals.documentName?.trim()
    return hasValidationErrors || !hasFile || requiredMissing
  }, [form.formState, selectedFile])

  // GraphQL lookups -> directly populate dropdowns
  const { groups, types, employee } = useUploadDocumentLookups(context)
  const selectedGroupId = form.watch('documentGroupId')
  const filteredTypes = useMemo(
    () => (types || []).filter(t => !selectedGroupId || t.parentEntryId === selectedGroupId),
    [types, selectedGroupId]
  )

  const fileClient = useFileClient({ accessToken: context.accessToken } as any)
  const flowEmployeeId = (context as any)?.additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId
  const employeeId = flowEmployeeId || context.userInfo?.employeeDetails?.employeeId

  const {
    suggestion: aiSuggestion,
    loading: aiLoading,
    error: aiError
  } = useDocumentClassification({
    accessToken: context.accessToken,
    entity: 'hr',
    groupCatalogIdentifier: 'DocumentGroup',
    typeCatalogIdentifier: 'DocumentType',
    file: selectedFile || undefined,
    endpoint: '/flowbot/document-autoclassify/classify',
    enabled: Boolean(selectedFile)
  })

  // Reset AI application flags when file changes
  useEffect(() => {
    setPendingTypeValue(null)
  }, [selectedFile])

  // Apply pending type suggestion after group change (when types become filtered)
  useEffect(() => {
    if (!pendingTypeValue || !selectedGroupId || !types || types.length === 0) return

    const normalizedType = pendingTypeValue.toString().trim().toLowerCase()
    const eligibleTypes = types.filter(t => t.parentEntryId === selectedGroupId)

    const match = eligibleTypes.find(t => {
      const byLabel = (t.label || '').toString().trim().toLowerCase() === normalizedType
      const byValue = (t.value || '').toString().trim().toLowerCase() === normalizedType
      return byLabel || byValue
    })

    if (match?.id) {
      form.setValue('documentTypeId', match.id, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true
      })
      setPendingTypeValue(null)
    }
  }, [pendingTypeValue, selectedGroupId, types, form])

  const normalize = (value: unknown): string => (value ?? '').toString().trim().toLowerCase()

  const buildCandidates = (raw: unknown): string[] => {
    const base = normalize(raw)
    if (!base) return []
    const parts = (raw ?? '').toString().split(':')
    const last = parts[parts.length - 1]
    const set = new Set<string>()
    set.add(base)
    if (last) {
      set.add(normalize(last))
    }
    return Array.from(set)
  }

  const matchesSuggestion = (entryLabel: unknown, entryValue: unknown, suggestion: string): boolean => {
    const suggestionCandidates = buildCandidates(suggestion)
    if (suggestionCandidates.length === 0) return false

    const labelNorm = normalize(entryLabel)
    const valueCandidates = buildCandidates(entryValue)

    return suggestionCandidates.some(s => {
      if (!s) return false
      if (labelNorm && labelNorm === s) return true
      return valueCandidates.some(v => v === s)
    })
  }

  const handleApplyAiSuggestion = useCallback(() => {
    if (!aiSuggestion) return

    let currentGroupId = form.getValues('documentGroupId')

    // 1) Try to apply group directly from AI suggestion
    if (aiSuggestion.group && groups && groups.length > 0) {
      const matchGroup = groups.find(g => matchesSuggestion(g.label, g.value, aiSuggestion.group as string))

      if (matchGroup?.id && matchGroup.id !== currentGroupId) {
        currentGroupId = matchGroup.id
        form.setValue('documentGroupId', matchGroup.id, {
          shouldDirty: true,
          shouldValidate: true,
          shouldTouch: true
        })
      }
    }

    // 2) Apply type suggestion and, if needed, derive group from the type parentEntryId
    if (aiSuggestion.type) {
      const availableTypes = filteredTypes && filteredTypes.length > 0 ? filteredTypes : types || []

      const matchType = availableTypes.find(t => matchesSuggestion(t.label, t.value, aiSuggestion.type as string))

      if (matchType?.id) {
        form.setValue('documentTypeId', matchType.id, {
          shouldDirty: true,
          shouldValidate: true,
          shouldTouch: true
        })
        setPendingTypeValue(null)

        // If group could not be matched from AI text but the type has parentEntryId,
        // set the group based on that parentEntryId (linked pair).
        const parentGroupId = (matchType as any)?.parentEntryId as string | null | undefined
        if (!currentGroupId && parentGroupId) {
          const groupFromType = (groups || []).find(g => g.id === parentGroupId)
          const resolvedGroupId = groupFromType?.id || parentGroupId
          if (resolvedGroupId) {
            form.setValue('documentGroupId', resolvedGroupId, {
              shouldDirty: true,
              shouldValidate: true,
              shouldTouch: true
            })
          }
        }
      } else {
        setPendingTypeValue(aiSuggestion.type)
      }
    }
  }, [aiSuggestion, groups, types, filteredTypes, form])

  return (
    <div
      className="gba:mx-auto gba:font-primary gba:flex gba:flex-col gba:w-[100%] gba:max-w-[800px] gba:gap-4 gba:[&>div[data-testid='upload-document-form']]:!p-0 gba:[&>div[data-testid='upload-document-form']>form]:!max-w-full gba:[&>div[data-testid='upload-document-form']>form]:!w-full"
      data-testid={formatDataTestId(dataTestId, 'Container')}
    >
      <FormHeader
        title={title}
        flowIconUrl={flowIconUrl}
        employee={
          employee
            ? {
                firstName: employee.firstName,
                lastName: employee.lastName,
                pictureThumbnail: employee.pictureThumbnail,
                jobTitle: Array.isArray(employee.employeePosition)
                  ? employee.employeePosition?.[0]?.jobPosition?.name
                  : (employee.employeePosition as any)?.jobPosition?.name
              }
            : undefined
        }
      />

      <AppActionForm
        processType="create"
        form={form as any}
        formData={initialDefaultsRef.current}
        submitEventType="pse_submit"
        cancelEventType="pse_abort"
        submitButtonText={getTranslationFromI18nKeyAndLabel('crm:common.submit', 'Submit')}
        cancelButtonText={getTranslationFromI18nKeyAndLabel('crm:common.cancel', 'Cancel')}
        submitButtonTestId="flw_documentModule_btnSave"
        cancelButtonTestId="flw_documentModule_btnCancel"
        isSubmitDisabled={isSubmitDisabled}
        handlePreSubmit={async (values: UploadDocumentValues) => {
          return await submitUploadDocument(values, {
            employeeId,
            // Provide a minimal UploadFile-like object carrying the actual File
            files: selectedFile
              ? ([
                  {
                    uid: 'selected-file',
                    name: selectedFile.name,
                    type: selectedFile.type,
                    originFileObj: selectedFile
                  } as any
                ] as UploadFile[])
              : ([] as UploadFile[]),
            fileClient
          })
        }}
        onSubmit={enhancedData => enhancedData}
        data-testid={APP_FORM_TID}
      >
        <div className="gba:flex-1 gba:space-y-4" data-testid={formatDataTestId(dataTestId, 'FormContent')}>
          {/* Upload field */}
          <div>
            <FormLabel>
              {getTranslationFromI18nKeyAndLabel('lowcoder:upload_document_form.upload_document', 'Upload Document')}
            </FormLabel>
            <div className="gba:mt-2" data-testid="flw_documentModule_uploadFile">
              <FileUpload
                multiple={false}
                maxFiles={1}
                accept={'.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'}
                layout="list"
                preview="icon"
                onFilesChange={(files: any[]) => {
                  // minimal UploadFile mapping without originFileObj to satisfy type
                  const mapped = (files || []).map((f: any) => ({
                    uid: f.id,
                    name: f.file?.name || 'file',
                    status: 'done' as const,
                    type: (f.file as File)?.type
                  })) as UploadFile[]
                  setFileList(mapped)
                  const first = (files || [])[0]
                  setSelectedFile(first && first.file instanceof File ? (first.file as File) : null)
                }}
              />
            </div>
            {/* AI classification status */}
            {selectedFile && (
              <div className="gba:mt-2 gba:text-sm gba:text-muted-foreground" data-testid="upload-document-ai-status">
                {aiLoading && (
                  <span data-testid="upload-document-ai-status-loading">
                    {getTranslationFromI18nKeyAndLabel('document.ai.detecting', 'Detecting document group and type…')}
                  </span>
                )}
                {!aiLoading && aiError && <span data-testid="upload-document-ai-status-error">{aiError}</span>}
                {!aiLoading && !aiError && aiSuggestion && (
                  <div className="gba:flex gba:flex-col gba:gap-1" data-testid="upload-document-ai-status-suggestion">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        'document.ai.suggestion',
                        `AI suggestion: Group = ${aiSuggestion.group || '—'}, Type = ${aiSuggestion.type || '—'}`
                      )}
                    </span>
                    <div className="gba:flex gba:gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleApplyAiSuggestion}
                        data-testid="upload-document-ai-apply-button"
                      >
                        {getTranslationFromI18nKeyAndLabel('document.ai.apply', 'Apply suggestion')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document Name */}
          <FormField
            control={form.control as any}
            name="documentName"
            rules={{
              required: getTranslationFromI18nKeyAndLabel(
                'lowcoder:upload_document_form.document_name_required',
                'Document name is required'
              )
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:upload_document_form.document_name', 'Document Name')}{' '}
                  <span className="gba:text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    className="gba:w-full"
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:upload_document_form.document_name_placeholder',
                      'e.g., Employment Contract, ID Card, Resume'
                    )}
                    data-testid="flw_documentModule_fld_documentName"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Document Group */}
          <FormField
            control={form.control as any}
            name="documentGroupId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:upload_document_form.document_group', 'Document Group')}
                </FormLabel>
                <FormControl>
                  <Combobox
                    className="gba:w-full"
                    options={(groups || []).map(g => ({ value: g.id, label: g.label }))}
                    value={field.value || ''}
                    onValueChange={v => {
                      field.onChange(v)
                      form.setValue('documentTypeId', null as any, { shouldValidate: true } as any)
                    }}
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:upload_document_form.select_document_group',
                      'Select Document Group'
                    )}
                    data-testid="flw_documentModule_fld_documentGroup"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Document Type */}
          <FormField
            control={form.control as any}
            name="documentTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:upload_document_form.document_type', 'Document Type')}
                </FormLabel>
                <FormControl>
                  <Combobox
                    className="gba:w-full"
                    options={(filteredTypes || []).map(t => ({ value: t.id, label: t.label }))}
                    value={field.value || ''}
                    onValueChange={v => field.onChange(v)}
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      'lowcoder:upload_document_form.select_document_type',
                      'Select Document Type'
                    )}
                    data-testid="flw_documentModule_fld_documentType"
                    disabled={!selectedGroupId}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Expiry Date */}
          <FormField
            control={form.control as any}
            name="expiryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:upload_document_form.expiry_date', 'Expiry Date')}
                </FormLabel>
                <FormControl>
                  <div data-testid="flw_uploadDocument_fld_expiryDate">
                    <DateInput
                      type="date"
                      value={field.value || ''}
                      onChange={(v: string | [string | null, string | null] | null) => {
                        const single = Array.isArray(v) ? v?.[0] : v
                        field.onChange(single || '')
                      }}
                      className="gba:w-full"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control as any}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:upload_document_form.description', 'Description')}
                </FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    className="gba:w-full"
                    data-testid="flw_uploadDocument_fld_documentDescription"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </AppActionForm>
    </div>
  )
}

export default UploadDocument
