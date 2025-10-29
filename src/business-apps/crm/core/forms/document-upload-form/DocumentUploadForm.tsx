import React, { useState, useEffect } from 'react'
import { Button, Form, Input, Upload, message, Select } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFileClient } from '@/common/network/files/useFileClient'
import { useDocumentCatalogs } from './hooks/useDocumentCatalogs'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export type DocumentUploadFormProps = BusinessAppContextProps

const { TextArea } = Input

const initialValues = {
  name: '',
  description: '',
  documentGroup: '',
  documentType: '',
  format: 'FILE',
  parentDocument: '',
  file: null
}

export const DocumentUploadForm: React.FC<DocumentUploadFormProps> = props => {
  const { accessToken, additionalData } = props
  const isCreateFolder =
    // direct flags
    additionalData?.createFolder === true ||
    additionalData?.createFolder === 'true' ||
    // platform payload variants
    additionalData?.psi_taskPayload?.psi_initialParameters?.createFolder === true ||
    additionalData?.psi_taskPayload?.psi_initialParameters?.createFolder === 'true' ||
    // some environments use `initialParameters` (without psi_ prefix)
    additionalData?.psi_taskPayload?.initialParameters?.createFolder === true ||
    additionalData?.psi_taskPayload?.initialParameters?.createFolder === 'true' ||
    // sometimes payload is nested under `payload`
    (additionalData as any)?.payload?.createFolder === true ||
    (additionalData as any)?.payload?.createFolder === 'true'
  // Be resilient to different payload shapes coming from process engine
  const passedCrmDoc =
    // direct
    (additionalData as any)?.crmDocument ||
    // common platform shapes
    (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.crmDocument ||
    (additionalData as any)?.psi_taskPayload?.initialParameters?.crmDocument ||
    // sometimes payload is nested under `payload`
    (additionalData as any)?.payload?.crmDocument ||
    (additionalData as any)?.psi_taskPayload?.psi_initialParameters?.payload?.crmDocument
  const isUpdateMode = !!passedCrmDoc?.id
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState<any[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [parentFolders, setParentFolders] = useState<{ id: string; name: string }[]>([])
  const [parentFoldersLoading, setParentFoldersLoading] = useState(false)
  const fileClient = useFileClient({ accessToken } as any)
  const graphQLClient = useGraphQLClient(accessToken)

  // Fetch document catalogs
  const { documentGroups, filteredDocumentTypes } = useDocumentCatalogs(accessToken, selectedGroupId)

  // Load parent folders (format: FOLDER) for the current entity
  useEffect(() => {
    const entityId =
      additionalData?.leadId || additionalData?.opportunityId || additionalData?.contactId || additionalData?.accountId
    const entityKey = additionalData?.leadId
      ? 'leadId'
      : additionalData?.opportunityId
        ? 'opportunityId'
        : additionalData?.contactId
          ? 'contactId'
          : 'accountId'

    const fetchParentFolders = async () => {
      if (!accessToken || !entityId) {
        setParentFolders([])
        return
      }
      setParentFoldersLoading(true)
      setParentFoldersError(null)
      try {
        const query = `
          query GetParentFolders($id: uuid!) {
            CrmDocument(
              where: { ${entityKey}: { _eq: $id }, isDeleted: { _eq: false }, format: { _eq: "FOLDER" } }
              orderBy: { name: ASC }
            ) {
              id
              name
            }
          }
        `
        const result = await graphQLClient.request<{ CrmDocument: { id: string; name: string }[] }>(query, {
          id: entityId
        })
        setParentFolders(result?.CrmDocument || [])
      } catch (err: any) {
        console.error('Error loading parent folders:', err)
        setParentFoldersError(err?.message || 'Failed to load parent folders')
        setParentFolders([])
      } finally {
        setParentFoldersLoading(false)
      }
    }

    fetchParentFolders()
  }, [
    accessToken,
    additionalData?.leadId,
    additionalData?.opportunityId,
    additionalData?.contactId,
    additionalData?.accountId
  ])

  // Prefill parentDocument if provided
  useEffect(() => {
    const prefillParent =
      additionalData?.parentDocument || additionalData?.psi_taskPayload?.psi_initialParameters?.parentDocument
    if (prefillParent) {
      form.setFieldsValue({ parentDocument: prefillParent })
    }
    // Prefill from crmDocument for update mode
    if (passedCrmDoc) {
      form.setFieldsValue({
        name: passedCrmDoc.name || '',
        documentGroup: passedCrmDoc.documentGroupRef || '',
        documentType: passedCrmDoc.documentTypeRef || '',
        parentDocument: passedCrmDoc.parentDocument || form.getFieldValue('parentDocument') || ''
      })
      if (passedCrmDoc.documentGroupRef) {
        setSelectedGroupId(passedCrmDoc.documentGroupRef)
      }
    }
  }, [
    additionalData?.parentDocument,
    additionalData?.psi_taskPayload?.psi_initialParameters?.parentDocument,
    additionalData?.psi_taskPayload?.initialParameters?.parentDocument,
    passedCrmDoc?.id
  ])

  useEffect(() => {
    const handler = async (event: any) => {
      try {
        const response = event.detail?.response
        const crmDocument = response?.crmDocument
        if (!crmDocument) return

        window.removeEventListener('com.newwork.process.taskCompletion', handler as EventListener)

        setLoading(false)
        message.success('Document saved successfully')

        if (window.parent !== window) {
          window.parent.postMessage(
            {
              type: 'CRM_DOCUMENT_UPLOADED',
              leadId: additionalData?.leadId,
              opportunityId: additionalData?.opportunityId,
              contactId: additionalData?.contactId,
              accountId: additionalData?.accountId,
              document: crmDocument
            },
            '*'
          )
        }

        setTimeout(() => {
          if (window.parent !== window) {
            window.parent.focus()
          }
        }, 1000)
      } catch (err: any) {
        console.error('Process completion error:', err)
        message.error(err?.message || 'Failed to complete document upload process')
        setLoading(false)
      }
    }

    window.addEventListener('com.newwork.process.taskCompletion', handler as EventListener)

    return () => {
      window.removeEventListener('com.newwork.process.taskCompletion', handler as EventListener)
    }
  }, [additionalData?.leadId, additionalData?.opportunityId])

  const handleSubmit = async (values: any) => {
    if (!isCreateFolder && !isUpdateMode) {
      if (!fileList.length || !fileList[0]?.originFileObj) {
        message.error('Please select a file to upload')
        return
      }
    }

    setLoading(true)

    try {
      let file: any = null
      if (!isCreateFolder && fileList.length > 0 && fileList[0]?.originFileObj) {
        file = fileList[0].originFileObj
      }
      const pathParams = { accessScope: 'public' }

      const entityType = additionalData?.leadId
        ? 'leads'
        : additionalData?.opportunityId
          ? 'opportunities'
          : additionalData?.contactId
            ? 'contacts'
            : 'accounts'
      const entityId =
        additionalData?.leadId ||
        additionalData?.opportunityId ||
        additionalData?.contactId ||
        additionalData?.accountId

      const queryParams = {
        appName: 'crm',
        folderPath: `/${entityType}/${entityId}/documents`
      }

      const uploadResponse =
        !isCreateFolder && file
          ? await fileClient.uploadFile(file, pathParams, queryParams)
          : ({ fileInfo: { fileId: null } } as any)

      const payload = {
        employeeId: additionalData?.employeeId,
        managerId: additionalData?.managerId,
        structureId: additionalData?.structureId,
        locationId: additionalData?.locationId,
        organizationalUnitId: additionalData?.organizationalUnitId,
        ...(additionalData?.contactId && { contactId: additionalData.contactId }),
        ...(additionalData?.accountId && { accountId: additionalData.accountId }),
        changeMode: isUpdateMode ? 'UPDATE' : 'INSERT',
        crmDocument: {
          ...(isUpdateMode ? { id: passedCrmDoc.id, version: passedCrmDoc.version } : {}),
          name: values.name || file?.name || '',
          description: values.description || '',
          ...(values.documentGroup && { documentGroupRef: values.documentGroup }),
          ...(values.documentType && { documentTypeRef: values.documentType }),
          format: isCreateFolder ? 'FOLDER' : 'FILE',
          ...(values.parentDocument && { parentDocument: values.parentDocument }),
          ...(additionalData?.leadId && { lead: additionalData.leadId }),
          ...(additionalData?.opportunityId && { opportunity: additionalData.opportunityId }),
          ...(additionalData?.contactId && { contact: additionalData.contactId }),
          ...(additionalData?.accountId && { account: additionalData.accountId }),
          ...(isUpdateMode ? {} : { version: 0 }),
          ...(isCreateFolder
            ? {}
            : file
              ? {
                  file: uploadResponse.fileInfo.fileId,
                  fileSize: file.size,
                  mimeType: file.type,
                  verified: true,
                  verificationDate: new Date().toISOString()
                }
              : {})
        }
      }

      dispatchProcessContinueEvent('pse_submit', payload)
    } catch (err: any) {
      console.error('File upload error:', err)
      message.error(err?.message || 'Failed to upload file')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    dispatchProcessContinueEvent('pse_pause', {})
  }

  const handleFileChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList)

    if (newFileList.length > 0 && newFileList[0].originFileObj) {
      const fileName = newFileList[0].originFileObj.name
      if (!form.getFieldValue('name')) {
        form.setFieldValue('name', fileName)
      }
    }
  }

  const beforeUpload = () => {
    return false
  }

  const handleGroupChange = (value: string) => {
    setSelectedGroupId(value)
    // Clear document type when group changes
    form.setFieldValue('documentType', '')
  }

  return (
    <div
      className="gba:p-6 gba:bg-hsl(var(--background)) gba:rounded-lg gba:shadow-md"
      data-testid="document-upload-form-container"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
        data-testid="document-upload-form"
      >
        <h2 className="gba:text-xl gba:!font-bold gba:mb-4 gba:text-center gba:!text-[20px]" data-testid="form-title">
          {isCreateFolder
            ? getTranslationFromI18nKeyAndLabel('crm:documents.createFolder', 'Create Folder')
            : isUpdateMode
              ? getTranslationFromI18nKeyAndLabel('crm:documents.updateDocument', 'Update Document')
              : getTranslationFromI18nKeyAndLabel('crm:documents.uploadDocument', 'Upload Document')}
        </h2>

        {!isCreateFolder ? (
          <>
            <Form.Item
              label={getTranslationFromI18nKeyAndLabel('crm:documents.file', 'File')}
              name="file"
              rules={
                isUpdateMode
                  ? []
                  : [
                      {
                        required: true,
                        message: getTranslationFromI18nKeyAndLabel('crm:documents.fileRequired', 'Please select a file')
                      }
                    ]
              }
            >
              <Upload
                fileList={fileList}
                onChange={handleFileChange}
                beforeUpload={beforeUpload}
                maxCount={1}
                data-testid="file-upload"
              >
                <Button icon={<UploadOutlined />}>
                  {getTranslationFromI18nKeyAndLabel('crm:documents.selectFile', 'Select File')}
                </Button>
              </Upload>
            </Form.Item>

            <Form.Item
              label={getTranslationFromI18nKeyAndLabel('crm:documents.documentGroup', 'Document Group')}
              name="documentGroup"
              rules={[
                {
                  required: true,
                  message: getTranslationFromI18nKeyAndLabel(
                    'crm:documents.documentGroupRequired',
                    'Document group is required'
                  )
                }
              ]}
            >
              <Select
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'crm:documents.selectDocumentGroup',
                  'Select document group...'
                )}
                data-testid="document-group-select"
                className="gba:w-full"
                onChange={handleGroupChange}
                showSearch
                optionFilterProp="children"
              >
                {documentGroups.map(group => (
                  <Select.Option key={group.id} value={group.id}>
                    {group.value}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label={getTranslationFromI18nKeyAndLabel('crm:documents.documentType', 'Document Type')}
              name="documentType"
              rules={[
                {
                  required: true,
                  message: getTranslationFromI18nKeyAndLabel(
                    'crm:documents.documentTypeRequired',
                    'Document type is required'
                  )
                }
              ]}
            >
              <Select
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'crm:documents.selectDocumentType',
                  'Select document type...'
                )}
                data-testid="document-type-select"
                className="gba:w-full"
                disabled={!selectedGroupId || filteredDocumentTypes.length === 0}
                showSearch
                optionFilterProp="children"
              >
                {filteredDocumentTypes.map(type => (
                  <Select.Option key={type.id} value={type.id}>
                    {type.value}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </>
        ) : null}

        {/* Parent Document (optional) */}
        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:documents.parentDocument', 'Parent Folder (optional)')}
          name="parentDocument"
        >
          <Select
            placeholder={getTranslationFromI18nKeyAndLabel(
              'crm:documents.selectParentDocument',
              'Select parent folder...'
            )}
            data-testid="parent-document-select"
            className="gba:w-full"
            allowClear
            loading={parentFoldersLoading}
            notFoundContent={
              parentFoldersLoading
                ? getTranslationFromI18nKeyAndLabel('crm:documents.loading', 'Loading...')
                : undefined
            }
          >
            {parentFolders.map(doc => (
              <Select.Option key={doc.id} value={doc.id}>
                {doc.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label={getTranslationFromI18nKeyAndLabel('crm:documents.name', 'Document Name')}
          name="name"
          rules={[
            {
              required: true,
              message: getTranslationFromI18nKeyAndLabel('crm:documents.nameRequired', 'Document name is required')
            }
          ]}
        >
          <Input
            placeholder={getTranslationFromI18nKeyAndLabel('crm:documents.namePlaceholder', 'Enter document name...')}
            data-testid="name-input"
            className="gba:w-full"
            maxLength={255}
          />
        </Form.Item>

        {!isCreateFolder && (
          <Form.Item
            label={getTranslationFromI18nKeyAndLabel('crm:documents.description', 'Description (Optional)')}
            name="description"
          >
            <TextArea
              rows={3}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'crm:documents.descriptionPlaceholder',
                'Enter document description...'
              )}
              data-testid="description-textarea"
              className="gba:w-full"
              maxLength={500}
            />
          </Form.Item>
        )}

        <div className="gba:flex gba:justify-end gba:gap-3 gba:mt-6">
          <Button onClick={handleCancel} data-testid="cancel-button" disabled={loading}>
            {getTranslationFromI18nKeyAndLabel('common:cancel', 'Cancel')}
          </Button>
          <Button type="primary" htmlType="submit" loading={loading} data-testid="submit-button">
            {isCreateFolder
              ? getTranslationFromI18nKeyAndLabel('crm:documents.createFolder', 'Create Folder')
              : isUpdateMode
                ? getTranslationFromI18nKeyAndLabel('crm:documents.updateDocument', 'Update Document')
                : getTranslationFromI18nKeyAndLabel('crm:documents.uploadDocument', 'Upload Document')}
          </Button>
        </div>
      </Form>
    </div>
  )
}
