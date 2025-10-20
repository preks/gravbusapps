import React, { useEffect, useState, useMemo } from 'react'
import { Modal, Form, Input, Select, Switch, Button, Tag, Row, Col, Tabs } from 'antd'
import type { TabsProps } from 'antd'
import { useTranslation } from 'react-i18next'

const { Option } = Select
const { TextArea } = Input

import useDocumentGroups, { DocumentGroup } from '@/business-apps/hr/core/hooks/useDocumentGroups' // Import the new hook

interface AddDocumentTypeModalProps {
  visible: boolean
  onCancel: () => void
  onOk: (values: any) => void
  initialValues?: any
  isEditing?: boolean
  accessToken: string // Added prop for accessToken
}

// File types don't need translation as they are technical terms
const fileTypes = [
  { label: 'PDF', value: 'pdf' },
  { label: 'DOC', value: 'doc' },
  { label: 'DOCX', value: 'docx' },
  { label: 'XLS', value: 'xls' },
  { label: 'XLSX', value: 'xlsx' },
  { label: 'JPG', value: 'jpg' },
  { label: 'PNG', value: 'png' }
]

const AddDocumentTypeModal: React.FC<AddDocumentTypeModalProps> = props => {
  const { t } = useTranslation()
  const [form] = Form.useForm()
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([])
  const [initialValuesSet, setInitialValuesSet] = useState(false)
  const [initialFormValues, setInitialFormValues] = useState<any>(null)
  const [formValues, setFormValues] = useState<any>({})

  // Destructure props
  const { accessToken, initialValues, isEditing = false, onCancel, onOk, visible } = props

  // Reset form when visibility changes
  useEffect(() => {
    if (visible) {
      form.resetFields()
    }
  }, [visible, form])

  // Handle form values change
  const handleValuesChange = (_: any, allValues: any) => {
    setFormValues((prev: any) => ({
      ...prev,
      ...allValues
    }))
  }

  // Check if form has been modified
  const isFormDirty = useMemo(() => {
    if (!initialFormValues || Object.keys(initialFormValues).length === 0) return false

    const currentValues = {
      ...initialFormValues,
      ...formValues
    }

    return Object.keys(initialFormValues).some(key => {
      const initial = initialFormValues[key]
      const current = currentValues[key]

      // Special handling for arrays (like fileTypes)
      if (Array.isArray(initial) || Array.isArray(current)) {
        return JSON.stringify(initial || []) !== JSON.stringify(current || [])
      }

      // For other types, use strict equality
      return initial !== current
    })
  }, [formValues, initialFormValues])
  const { documentGroups, loading: documentGroupsLoading, error: documentGroupsError } = useDocumentGroups(accessToken)

  useEffect(() => {
    if (isEditing && initialValues) {
      // Get file types from the new structure
      const fileTypes = Array.isArray(initialValues.objectValue?.fileTypes)
        ? initialValues.objectValue.fileTypes
        : initialValues.objectValue?.fileTypes
          ? [initialValues.objectValue.fileTypes]
          : []

      // Get GDPR value from the new structure (should be boolean)
      const gdprValue = initialValues.objectValue?.gdprRelevant || false

      // Get description from the new structure
      const description = initialValues.objectValue?.description || ''

      // Get maxSize with fallback to 5 if not set
      const maxSize = initialValues.objectValue?.maxSize || 5

      // Get isActive with default to true if not set
      const isActive = initialValues.objectValue?.isActive !== false

      // Find the English name from translations or fall back to value
      const enName =
        initialValues.translations?.find((t: any) => t.localeCode === 'en-US')?.value || initialValues.value || ''
      const deName = initialValues.translations?.find((t: any) => t.localeCode === 'de-DE')?.value || ''
      const roName = initialValues.translations?.find((t: any) => t.localeCode === 'ro-RO')?.value || ''

      const formValues = {
        name: enName,
        name_de: deName,
        name_ro: roName,
        description: description,
        documentGroup: initialValues.parentEntryId ? initialValues.parentEntryId.split(':').pop() : '',
        isActive: isActive,
        gdprRelevant: gdprValue,
        maxSize: maxSize,
        fileTypes: fileTypes
      }

      form.setFieldsValue(formValues)
      // Update selected file types state
      setSelectedFileTypes(fileTypes)

      // Store initial values for dirty checking - clone the object to avoid reference issues
      setInitialFormValues(JSON.parse(JSON.stringify(formValues)))
      setInitialValuesSet(true)
      // Also set the current form values
      setFormValues(JSON.parse(JSON.stringify(formValues)))
    } else {
      // Default values for new document type
      const defaultValues = {
        gdprRelevant: false,
        isActive: true,
        maxSize: 5,
        fileTypes: []
      }
      form.setFieldsValue(defaultValues)
      setSelectedFileTypes([])

      // Store initial values for dirty checking - clone the object to avoid reference issues
      setInitialFormValues(JSON.parse(JSON.stringify(defaultValues)))
      setInitialValuesSet(true)
      // Also set the current form values
      setFormValues(JSON.parse(JSON.stringify(defaultValues)))
    }
  }, [isEditing, initialValues, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()

      // Prepare translations array for document type name
      // Always include English as the first item
      const translations = [{ localeCode: 'en-US', value: values.name || '' }]

      // Add German translation if provided
      if (values.name_de) {
        translations.push({ localeCode: 'de-DE', value: values.name_de })
      }

      // Add Romanian translation if provided
      if (values.name_ro) {
        translations.push({ localeCode: 'ro-RO', value: values.name_ro })
      }

      // Convert GDPR relevance to string 'true'/'false' if it's a boolean
      const formValues = {
        ...values,
        gdprRelevant: values.gdprRelevant ? 'true' : 'false',
        fileTypes: selectedFileTypes,
        isActive: values.isActive !== false, // Ensure isActive defaults to true
        translations: translations
      }
      onOk(formValues)
    } catch (info) {
      console.log('Validate Failed:', info)
    }
  }

  const toggleFileType = (fileType: string) => {
    const newFileTypes = selectedFileTypes.includes(fileType)
      ? selectedFileTypes.filter(type => type !== fileType)
      : [...selectedFileTypes, fileType]

    setSelectedFileTypes(newFileTypes)

    // Update form values to trigger dirty check
    form.setFieldsValue({ fileTypes: newFileTypes })
    handleValuesChange({}, { ...form.getFieldsValue(), fileTypes: newFileTypes })
  }

  const renderBasicInfoTab = () => (
    <Row gutter={[16, 6]}>
      <Col span={24}>
        <Form.Item
          name="name"
          label={t('documentType.name_label', 'Document Type Name (Default: EN)')}
          rules={[{ required: true, message: t('documentType.name_required', 'Please enter document type name') }]}
        >
          <Input placeholder={t('documentType.name_placeholder', 'e.g., Employee Contract')} disabled={isEditing} />
        </Form.Item>
      </Col>

      <Col span={12}>
        <Form.Item name="name_de" label={t('documentType.name_de_label', 'Document Type Name (German - DE)')}>
          <Input placeholder={t('documentType.name_de_placeholder', 'e.g., Arbeitsvertrag')} />
        </Form.Item>
      </Col>

      <Col span={12}>
        <Form.Item name="name_ro" label={t('documentType.name_ro_label', 'Document Type Name (Romanian - RO)')}>
          <Input placeholder={t('documentType.name_ro_placeholder', 'e.g., Contract de muncă')} />
        </Form.Item>
      </Col>

      <Col span={24}>
        <Form.Item
          name="description"
          label={t('documentType.description_label', 'Description')}
          rules={[{ required: true, message: t('documentType.description_required', 'Please enter a description') }]}
        >
          <TextArea rows={2} placeholder={t('documentType.description_placeholder', 'Enter a brief description')} />
        </Form.Item>
      </Col>

      <Col span={24}>
        <Form.Item
          name="documentGroup"
          label={t('documentType.module_label', 'Module')}
          rules={[{ required: true, message: t('documentType.module_required', 'Please select a module') }]}
        >
          <Select
            placeholder={t('documentType.module_placeholder', 'Select module')}
            loading={documentGroupsLoading}
            disabled={documentGroupsLoading || !!documentGroupsError}
          >
            {documentGroups.map((group: DocumentGroup) => (
              <Option key={group.id} value={group.code}>
                {group.value}
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Col>

      <Col span={24}>
        <Form.Item
          name="gdprRelevant"
          label={t('documentType.gdpr_label', 'GDPR Relevance')}
          valuePropName="checked"
          className="gba:mb-0"
        >
          <div className="gba:flex items-center gba:justify-between">
            <div>
              <div className="gba:text-xs gba:text-muted-foreground">
                {t('documentType.gdpr_help', 'This document contains personal data')}
              </div>
            </div>
            <Form.Item name="gdprRelevant" valuePropName="checked" noStyle>
              <Switch
                checked={form.getFieldValue('gdprRelevant') || false}
                onChange={checked => {
                  form.setFieldsValue({ gdprRelevant: checked })
                  handleValuesChange({}, { ...form.getFieldsValue(), gdprRelevant: checked })
                }}
                className={form.getFieldValue('gdprRelevant') ? 'gba:bg-info' : 'gba:bg-muted'}
              />
            </Form.Item>
          </div>
        </Form.Item>
      </Col>
    </Row>
  )

  const renderFileSettingsTab = () => (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Form.Item
          name="isActive"
          label={t('documentType.status_label', 'Status')}
          valuePropName="checked"
          className="gba:mb-0"
        >
          <div className="gba:flex items-center gba:justify-between">
            <div>
              <div className="gba:text-medium">{t('documentType.active_label', 'Active')}</div>
              <div className="gba:text-xs gba:text-muted-foreground">
                {t('documentType.active_help', 'Document type will be available for use')}
              </div>
            </div>
            <Form.Item name="isActive" valuePropName="checked" noStyle>
              <Switch
                checked={form.getFieldValue('isActive')}
                onChange={checked => {
                  form.setFieldsValue({ isActive: checked })
                  handleValuesChange({}, { ...form.getFieldsValue(), isActive: checked })
                }}
                className={form.getFieldValue('isActive') ? 'gba:bg-info' : 'gba:bg-muted'}
              />
            </Form.Item>
          </div>
        </Form.Item>
      </Col>

      <Col span={24}>
        <Form.Item label={t('documentType.allowed_file_types', 'Allowed File Types')} required>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {fileTypes.map(type => (
              <Tag.CheckableTag
                key={type.value}
                checked={selectedFileTypes.includes(type.value)}
                onChange={() => toggleFileType(type.value)}
                className="gba:px-3 gba:py-1 gba:border gba:rounded-md"
              >
                {type.label}
              </Tag.CheckableTag>
            ))}
          </div>
        </Form.Item>
      </Col>

      <Col span={24}>
        <Form.Item
          name="maxSize"
          label={t('documentType.max_size_label', 'Maximum File Size (MB)')}
          rules={[{ required: true, message: t('documentType.max_size_required', 'Please enter maximum file size') }]}
        >
          <Input type="number" min={1} max={100} addonAfter={t('documentType.mb', 'MB')} />
        </Form.Item>
      </Col>
    </Row>
  )

  const renderPermissionsTab = () => (
    <div className="gba:py-4 gba:text-center gba:text-muted-foreground">
      {t('documentType.permissions_coming_soon', 'Permissions configuration will be available soon.')}
    </div>
  )

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: t('documentType.tab_basic_info', 'Basic Info'),
      children: renderBasicInfoTab()
    },
    {
      key: '2',
      label: t('documentType.tab_file_settings', 'File Settings'),
      children: renderFileSettingsTab()
    },
    {
      key: '3',
      label: t('documentType.tab_permissions', 'Permissions'),
      children: renderPermissionsTab()
    }
  ]

  return (
    <Modal
      title={
        isEditing
          ? t('documentType.edit_title', 'Edit Document Type')
          : t('documentType.add_title', 'Add New Document Type')
      }
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button key="back" onClick={onCancel}>
          {t('common.cancel', 'Cancel')}
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleOk}
          disabled={isEditing && (!initialValuesSet || !isFormDirty)}
        >
          {isEditing ? t('common.update', 'Update') : t('common.create', 'Create')}{' '}
          {t('documentType.document_type', 'Document Type')}
        </Button>
      ]}
    >
      <Form form={form} layout="vertical" className="gba:document-type-form" onValuesChange={handleValuesChange}>
        <Tabs defaultActiveKey="1" items={items} />
      </Form>
    </Modal>
  )
}

export default AddDocumentTypeModal
