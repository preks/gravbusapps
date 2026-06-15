import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea
} from '@newwork/nw-design-system'
import { useTranslation } from 'react-i18next'

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
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([])
  const [initialValuesSet, setInitialValuesSet] = useState(false)
  const [initialFormValues, setInitialFormValues] = useState<any>(null)
  const [formValues, setFormValues] = useState<any>({})
  const [activeTab, setActiveTab] = useState('basic')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Destructure props
  const { accessToken, initialValues, isEditing = false, onCancel, onOk, visible } = props

  // Reset form when visibility changes
  useEffect(() => {
    if (visible) {
      setActiveTab('basic')
      setValidationError(null)
    }
  }, [visible])

  // Handle form values change
  const handleFieldChange = (field: string, value: unknown) => {
    setFormValues((prev: any) => ({ ...prev, [field]: value }))
    setValidationError(null)
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

      const nextFormValues = {
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

      // Update selected file types state
      setSelectedFileTypes(fileTypes)

      // Store initial values for dirty checking - clone the object to avoid reference issues
      setInitialFormValues(JSON.parse(JSON.stringify(nextFormValues)))
      setInitialValuesSet(true)
      // Also set the current form values
      setFormValues(JSON.parse(JSON.stringify(nextFormValues)))
    } else {
      // Default values for new document type
      const defaultValues = {
        gdprRelevant: false,
        isActive: true,
        maxSize: 5,
        fileTypes: []
      }
      setSelectedFileTypes([])

      // Store initial values for dirty checking - clone the object to avoid reference issues
      setInitialFormValues(JSON.parse(JSON.stringify(defaultValues)))
      setInitialValuesSet(true)
      // Also set the current form values
      setFormValues(JSON.parse(JSON.stringify(defaultValues)))
    }
  }, [isEditing, initialValues])

  const handleOk = async () => {
    const values = formValues

    if (!values.name?.trim()) {
      setValidationError(t('documentType.name_required', 'Please enter document type name'))
      setActiveTab('basic')
      return
    }

    if (!values.description?.trim()) {
      setValidationError(t('documentType.description_required', 'Please enter a description'))
      setActiveTab('basic')
      return
    }

    if (!values.documentGroup) {
      setValidationError(t('documentType.module_required', 'Please select a module'))
      setActiveTab('basic')
      return
    }

    if (!values.maxSize || Number(values.maxSize) < 1) {
      setValidationError(t('documentType.max_size_required', 'Please enter maximum file size'))
      setActiveTab('file-settings')
      return
    }

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
      const nextFormValues = {
        ...values,
        gdprRelevant: Boolean(values.gdprRelevant),
        fileTypes: selectedFileTypes,
        isActive: values.isActive !== false, // Ensure isActive defaults to true
        maxSize: Number(values.maxSize),
        translations: translations
      }
      onOk(nextFormValues)
  }

  const toggleFileType = (fileType: string) => {
    const newFileTypes = selectedFileTypes.includes(fileType)
      ? selectedFileTypes.filter(type => type !== fileType)
      : [...selectedFileTypes, fileType]

    setSelectedFileTypes(newFileTypes)

    // Update form values to trigger dirty check
    handleFieldChange('fileTypes', newFileTypes)
  }

  const renderFieldLabel = (label: string, required = false) => (
    <label className="gba:text-sm gba:font-medium">
      {label}
      {required && <span className="gba:text-destructive"> *</span>}
    </label>
  )

  const renderBasicInfoTab = () => (
    <div className="gba:grid gba:grid-cols-1 gba:gap-4 md:gba:grid-cols-2">
      <div className="gba:space-y-2 md:gba:col-span-2">
        {renderFieldLabel(t('documentType.name_label', 'Document Type Name (Default: EN)'), true)}
        <Input
          value={formValues.name ?? ''}
          placeholder={t('documentType.name_placeholder', 'e.g., Employee Contract')}
          disabled={isEditing}
          onChange={event => handleFieldChange('name', event.target.value)}
        />
      </div>

      <div className="gba:space-y-2">
        {renderFieldLabel(t('documentType.name_de_label', 'Document Type Name (German - DE)'))}
        <Input
          value={formValues.name_de ?? ''}
          placeholder={t('documentType.name_de_placeholder', 'e.g., Arbeitsvertrag')}
          onChange={event => handleFieldChange('name_de', event.target.value)}
        />
      </div>

      <div className="gba:space-y-2">
        {renderFieldLabel(t('documentType.name_ro_label', 'Document Type Name (Romanian - RO)'))}
        <Input
          value={formValues.name_ro ?? ''}
          placeholder={t('documentType.name_ro_placeholder', 'e.g., Contract de muncă')}
          onChange={event => handleFieldChange('name_ro', event.target.value)}
        />
      </div>

      <div className="gba:space-y-2 md:gba:col-span-2">
        {renderFieldLabel(t('documentType.description_label', 'Description'), true)}
        <Textarea
          rows={2}
          value={formValues.description ?? ''}
          placeholder={t('documentType.description_placeholder', 'Enter a brief description')}
          onChange={event => handleFieldChange('description', event.target.value)}
        />
      </div>

      <div className="gba:space-y-2 md:gba:col-span-2">
        {renderFieldLabel(t('documentType.module_label', 'Module'), true)}
        <Select
          value={formValues.documentGroup ?? ''}
          onValueChange={value => handleFieldChange('documentGroup', value)}
          disabled={documentGroupsLoading || !!documentGroupsError}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('documentType.module_placeholder', 'Select module')} />
          </SelectTrigger>
          <SelectContent>
            {documentGroups.map((group: DocumentGroup) => (
              <SelectItem key={group.id} value={group.code}>
                {group.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="gba:flex gba:items-center gba:justify-between md:gba:col-span-2">
        <div>
          {renderFieldLabel(t('documentType.gdpr_label', 'GDPR Relevance'))}
          <div className="gba:text-xs gba:text-muted-foreground">
            {t('documentType.gdpr_help', 'This document contains personal data')}
          </div>
        </div>
        <Switch
          checked={Boolean(formValues.gdprRelevant)}
          onCheckedChange={checked => handleFieldChange('gdprRelevant', checked)}
        />
      </div>
    </div>
  )

  const renderFileSettingsTab = () => (
    <div className="gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <div>
          {renderFieldLabel(t('documentType.status_label', 'Status'))}
          <div className="gba:text-medium">{t('documentType.active_label', 'Active')}</div>
          <div className="gba:text-xs gba:text-muted-foreground">
            {t('documentType.active_help', 'Document type will be available for use')}
          </div>
        </div>
        <Switch checked={formValues.isActive !== false} onCheckedChange={checked => handleFieldChange('isActive', checked)} />
      </div>

      <div className="gba:space-y-2">
        {renderFieldLabel(t('documentType.allowed_file_types', 'Allowed File Types'), true)}
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          {fileTypes.map(type => {
            const selected = selectedFileTypes.includes(type.value)

            return (
              <button key={type.value} type="button" onClick={() => toggleFileType(type.value)}>
                <Badge variant={selected ? 'default' : 'outline'} className="gba:px-3 gba:py-1">
                  {type.label}
                </Badge>
              </button>
            )
          })}
        </div>
      </div>

      <div className="gba:space-y-2">
        {renderFieldLabel(t('documentType.max_size_label', 'Maximum File Size (MB)'), true)}
        <div className="gba:flex gba:items-center gba:gap-2">
          <Input
            type="number"
            min={1}
            max={100}
            value={formValues.maxSize ?? 5}
            onChange={event => handleFieldChange('maxSize', event.target.value)}
          />
          <span className="gba:text-sm gba:text-muted-foreground">{t('documentType.mb', 'MB')}</span>
        </div>
      </div>
    </div>
  )

  const renderPermissionsTab = () => (
    <div className="gba:py-4 gba:text-center gba:text-muted-foreground">
      {t('documentType.permissions_coming_soon', 'Permissions configuration will be available soon.')}
    </div>
  )

  return (
    <Dialog open={visible} onOpenChange={open => !open && onCancel()}>
      <DialogContent className="gba:max-w-2xl" data-testid="document-type-modal">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('documentType.edit_title', 'Edit Document Type')
              : t('documentType.add_title', 'Add New Document Type')}
          </DialogTitle>
        </DialogHeader>

        {validationError && (
          <Alert variant="destructive">
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="gba:mb-4">
            <TabsTrigger value="basic">{t('documentType.tab_basic_info', 'Basic Info')}</TabsTrigger>
            <TabsTrigger value="file-settings">{t('documentType.tab_file_settings', 'File Settings')}</TabsTrigger>
            <TabsTrigger value="permissions">{t('documentType.tab_permissions', 'Permissions')}</TabsTrigger>
          </TabsList>
          <TabsContent value="basic">{renderBasicInfoTab()}</TabsContent>
          <TabsContent value="file-settings">{renderFileSettingsTab()}</TabsContent>
          <TabsContent value="permissions">{renderPermissionsTab()}</TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="button" onClick={handleOk} disabled={isEditing && (!initialValuesSet || !isFormDirty)}>
            {isEditing ? t('common.update', 'Update') : t('common.create', 'Create')}{' '}
            {t('documentType.document_type', 'Document Type')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AddDocumentTypeModal
