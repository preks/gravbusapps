import React, { useState, useMemo, useEffect } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast
} from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon, PencilIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import AddDocumentModal from './modals/AddDocumentTypeModal'
import useDocumentTypes from '@/business-apps/hr/core/hooks/useDocumentTypes'
import { DocumentType } from '@/common/types/DocumentTypeObjectTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const DocumentManagementSetup: React.FC<BusinessAppContextProps> = props => {
  const { t } = useTranslation()

  const { accessToken } = props
  const [moduleFilter, setModuleFilter] = useState<string | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const {
    documentTypes = [],
    loading: hookLoading = false,
    error: hookError,
    totalDocumentTypes = 0,
    currentPage = 1,
    PAGE_SIZE = 10,
    handlePageChange = () => {},
    createDocumentType = async () => {},
    updateDocumentType = async () => {},
    deleteDocumentType = async () => {},
    allPossibleModules = []
  } = useDocumentTypes(accessToken, moduleFilter, searchTerm) || {}

  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false)
  const [editingDocType, setEditingDocType] = useState<DocumentType | null>(null)

  const showModal = (docType: DocumentType | null = null) => {
    setEditingDocType(docType)
    setIsAddModalVisible(true)
  }

  const handleAddDocument = async (values: any) => {
    try {
      // Prepare translations array including the English name as the first item
      const translations: Array<{ localeCode: string; value: string }> = [
        { localeCode: 'en-US', value: values.name || '' }
      ]

      // Add German translation if provided
      if (values.name_de) {
        translations.push({ localeCode: 'de-DE', value: values.name_de })
      }

      // Add Romanian translation if provided
      if (values.name_ro) {
        translations.push({ localeCode: 'ro-RO', value: values.name_ro })
      }

      const documentType: Omit<DocumentType, 'id'> = {
        parentEntryId: `DocumentGroup:v1:${values.documentGroup}`,
        value: values.name, // Keep the main value as is (English)
        code: values.name
          ? values.name
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '_')
              .replace(/_{2,}/g, '_')
              .replace(/^_+|_+$/g, '')
          : Math.random().toString(36).substring(7),
        objectValue: {
          description: values.description || '',
          gdprRelevant: values.gdprRelevant || false,
          fileTypes: values.fileTypes || [],
          isActive: values.isActive !== false, // Default to true if not set
          maxSize: values.maxSize || 10
        },
        catalogEntryLocalId: values.documentGroup,
        localeCode: 'en-US',
        // Only include translations if there are any
        ...(translations.length > 0 ? { translations } : {})
      }

      if (editingDocType) {
        // When updating, use the new values but ensure gdprRelevant is a boolean
        const updatedObjectValue = {
          ...editingDocType.objectValue,
          ...documentType.objectValue,
          gdprRelevant: Boolean(values.gdprRelevant) // Ensure boolean
        }

        await updateDocumentType(editingDocType.id, {
          ...editingDocType,
          ...documentType,
          objectValue: updatedObjectValue,
          // Only include translations if there are any
          ...(translations.length > 0 ? { translations } : {})
        })
      } else {
        // For new documents, we already have the correct boolean value
        await createDocumentType({
          ...documentType,
          // Only include translations if there are any
          ...(translations.length > 0 ? { translations } : {})
        })
      }

      toast.success(
        editingDocType
          ? t('documentManagement.messages.updateSuccess', 'Document type updated successfully')
          : t('documentManagement.messages.createSuccess', 'Document type created successfully')
      )
      handleCancel()
    } catch (error) {
      console.error('Error saving document type:', error)
      toast.error(
        editingDocType
          ? t('documentManagement.errors.updateFailed', 'Failed to update document type')
          : t('documentManagement.errors.createFailed', 'Failed to create document type')
      )
    }
  }

  const handleCancel = () => {
    setIsAddModalVisible(false)
  }

  const handleDelete = async (id: string) => {
    await deleteDocumentType(id)
  }

  const moduleOptions = useMemo(() => {
    return allPossibleModules.map(moduleName => ({
      value: moduleName,
      label: moduleName.charAt(0).toUpperCase() + moduleName.slice(1).toLowerCase()
    }))
  }, [allPossibleModules])

  const getModuleLabel = (parentEntryId: string) => {
    if (!parentEntryId) return t('documentManagement.unknown', 'Unknown')
    const parts = parentEntryId.split(':')
    const moduleName = (parts.length > 0 ? parts[parts.length - 1] : parentEntryId).toLowerCase()
    return moduleName.charAt(0).toUpperCase() + moduleName.slice(1)
  }

  const getFileTypes = (record: DocumentType) => {
    if (Array.isArray(record.objectValue?.fileTypes)) return record.objectValue.fileTypes
    return record.objectValue?.fileTypes ? [record.objectValue.fileTypes] : []
  }

  const totalPages = Math.max(1, Math.ceil(totalDocumentTypes / PAGE_SIZE))

  if (hookLoading) {
    return <div className="gba:p-6">{t('documentManagement.loading', 'Loading document types...')}</div>
  }

  if (hookError) {
    return (
      <div className="gba:p-6">
        {t('documentManagement.errors.loadError', 'Error loading document types: {{error}}', {
          error: hookError.message
        })}
      </div>
    )
  }

  return (
    <div className="gba:p-6 gba:document-management-container">
      <div className="gba:mb-6 gba:header-row">
        <h3 className="gba:m-0 gba:text-xl gba:font-semibold gba:page-title">
          {t('documentManagement.title', 'Document Type Management')}
        </h3>
        <p className="gba:text-sm gba:text-muted-foreground">
          {t('documentManagement.subtitle', 'Manage document types and their permissions')}
        </p>
      </div>

      {/* KPI and Search Card */}
      <Card className="gba:mb-6">
        <CardContent className="gba:flex gba:items-center gba:justify-between gba:p-6">
          <div>
            <div>
              <div className="gba:text-sm gba:text-muted-foreground">
                {moduleFilter
                  ? t('documentManagement.kpi.matching', 'Matching Document Types')
                  : t('documentManagement.kpi.total', 'Total Document Types')}
              </div>
              <div className="gba:font-bold gba:text-2xl">
                {hookLoading ? (
                  <span className="gba:font-normal gba:text-xs">{t('common.loading', 'Loading...')}</span>
                ) : (
                  totalDocumentTypes
                )}
              </div>
            </div>
          </div>
          <div>
            <Button type="button" onClick={() => showModal()} className="gba:create-button">
              <PlusIcon size={16} className="gba:mr-2" />
              {t('documentManagement.actions.addDocumentType', 'Add Document Type')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Table Card */}
      <Card>
        <CardContent className="gba:p-6">
          <div className="gba:mb-4 gba:flex gba:items-center gba:justify-between gba:gap-4">
            <Select
              value={moduleFilter ?? 'all'}
              onValueChange={value => {
                setModuleFilter(value === 'all' ? undefined : value)
                if (currentPage !== 1) {
                  handlePageChange(1)
                }
              }}
            >
              <SelectTrigger className="gba:w-56" data-testid="document-management-module-filter">
                <SelectValue placeholder={t('documentManagement.filters.module', 'Filter by Module')} />
              </SelectTrigger>
              <SelectContent>
              <SelectItem value="all">{t('documentManagement.filters.allModules', 'All Modules')}</SelectItem>
              {moduleOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
          <div className="gba:relative gba:w-80">
            <MagnifyingGlassIcon
              size={16}
              className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground"
            />
            <Input
              placeholder={t('documentManagement.search.placeholder', 'Search document types...')}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="gba:w-full gba:pl-9"
              data-testid="document-management-search-input"
            />
          </div>
        </div>

        {hookLoading ? (
          <div className="gba:flex gba:justify-center gba:p-8" data-testid="document-management-table-loading">
            <Spinner />
          </div>
        ) : (
          <div className="gba:overflow-x-auto">
            <Table data-testid="document-management-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('documentManagement.columns.name', 'Name')}</TableHead>
                  <TableHead>{t('documentManagement.columns.module', 'Module')}</TableHead>
                  <TableHead>{t('documentManagement.columns.fileTypes', 'File Types')}</TableHead>
                  <TableHead>{t('documentManagement.columns.maxSize', 'Max Size (MB)')}</TableHead>
                  <TableHead>{t('documentManagement.columns.gdpr', 'GDPR')}</TableHead>
                  <TableHead>{t('documentManagement.columns.status', 'Status')}</TableHead>
                  <TableHead>{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentTypes.map(record => {
                  const fileTypes = getFileTypes(record)
                  const isGdpr = record.objectValue?.gdprRelevant === true
                  const isActive = record.objectValue?.isActive !== false

                  return (
                    <TableRow key={record.id} data-testid={`document-management-row-${record.id}`}>
                      <TableCell>
                        <div className="gba:font-semibold">{record.value}</div>
                        {record.objectValue?.description && (
                          <div className="gba:text-muted-foreground gba:text-xs">{record.objectValue.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getModuleLabel(record.parentEntryId)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:flex-wrap gba:gap-1">
                          {fileTypes.map((type: string) => (
                            <Badge key={type} variant="outline">
                              {type.toUpperCase()}
                            </Badge>
                          ))}
                          {fileTypes.length === 0 && <span>-</span>}
                        </div>
                      </TableCell>
                      <TableCell>{record.objectValue?.maxSize || '-'}</TableCell>
                      <TableCell>{isGdpr ? <Badge variant="warning">GDPR</Badge> : <span>-</span>}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'success' : 'destructive'}>
                          {isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => showModal(record)}
                            className="gba:text-muted-foreground hover:gba:text-info"
                            data-testid={`document-management-edit-${record.id}`}
                          >
                            <PencilIcon size={16} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(record.id)}
                            className="hover:gba:text-destructive"
                            data-testid={`document-management-delete-${record.id}`}
                          >
                            <TrashIcon size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {documentTypes.length === 0 && (
              <div className="gba:p-4 gba:text-center gba:text-sm gba:text-muted-foreground">
                {t('documentManagement.empty', 'No document types found')}
              </div>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="gba:mt-4 gba:flex gba:items-center gba:justify-end gba:gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              {t('common.previous', 'Previous')}
            </Button>
            <span className="gba:text-sm gba:text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              {t('common.next', 'Next')}
            </Button>
          </div>
        )}
        </CardContent>
      </Card>

      <AddDocumentModal
        visible={isAddModalVisible}
        onCancel={handleCancel}
        onOk={handleAddDocument}
        initialValues={
          editingDocType
            ? {
                ...editingDocType,
                name: editingDocType.value,
                documentGroup: editingDocType.parentEntryId?.split(':').pop() || ''
              }
            : null
        }
        isEditing={!!editingDocType}
        accessToken={accessToken}
      />
    </div>
  )
}

export default DocumentManagementSetup
