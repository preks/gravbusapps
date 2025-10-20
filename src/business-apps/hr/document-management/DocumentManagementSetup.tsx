import React, { useState, useMemo, useEffect } from 'react'
import { Button, Card, Col, Input, message, Row, Select, Table, Tag, Typography } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import AddDocumentModal from './modals/AddDocumentTypeModal'
import useDocumentTypes from '@/business-apps/hr/core/hooks/useDocumentTypes'
import { DocumentType } from '@/common/types/DocumentTypeObjectTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const { Title, Text } = Typography

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

      message.success(
        editingDocType
          ? t('documentManagement.messages.updateSuccess', 'Document type updated successfully')
          : t('documentManagement.messages.createSuccess', 'Document type created successfully')
      )
      handleCancel()
    } catch (error) {
      console.error('Error saving document type:', error)
      message.error(
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

  // Use server-side filtering with the search term and module filter
  // The actual filtering is done in the useDocumentTypes hook
  const columns = [
    {
      title: t('documentManagement.columns.name', 'Name'),
      dataIndex: 'value',
      key: 'value',
      render: (text: string, record: DocumentType) => (
        <div>
          <div className="gba:font-semibold">{text}</div>
          {record.objectValue?.description && (
            <div className="gba:text-muted-foreground gba:text-xs">{record.objectValue.description}</div>
          )}
        </div>
      )
    },
    {
      title: t('documentManagement.columns.module', 'Module'),
      dataIndex: 'parentEntryId',
      key: 'module',
      render: (parentEntryId: string) => {
        if (!parentEntryId) return <Tag>{t('documentManagement.unknown', 'Unknown')}</Tag>
        const parts = parentEntryId.split(':')
        let moduleName = parts.length > 0 ? parts[parts.length - 1] : parentEntryId
        moduleName = moduleName.toLowerCase()
        return <Tag>{moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}</Tag>
      }
    },
    {
      title: t('documentManagement.columns.fileTypes', 'File Types'),
      key: 'fileTypes',
      render: (_: any, record: DocumentType) => {
        const fileTypes = Array.isArray(record.objectValue?.fileTypes)
          ? record.objectValue.fileTypes
          : record.objectValue?.fileTypes
            ? [record.objectValue.fileTypes]
            : []
        return (
          <div className="gba:flex gba:flex-wrap gba:gap-1">
            {fileTypes.map((type: string, index: number) => (
              <Tag
                key={index}
                color="var(--nw-primary-foreground)"
                style={{
                  borderColor: 'var(--nw-border)',
                  color: 'var(--nw-foreground)',
                  fontWeight: 500
                }}
              >
                {type.toUpperCase()}
              </Tag>
            ))}
            {fileTypes.length === 0 && <span>-</span>}
          </div>
        )
      }
    },
    {
      title: t('documentManagement.columns.maxSize', 'Max Size (MB)'),
      key: 'maxSize',
      render: (_: any, record: DocumentType) => <span>{record.objectValue?.maxSize || '-'}</span>
    },
    {
      title: t('documentManagement.columns.gdpr', 'GDPR'),
      key: 'gdpr',
      render: (_: any, record: DocumentType) => {
        const isGdpr = record.objectValue?.gdprRelevant === true
        return isGdpr ? (
          <Tag
            color="var(--nw-warning-secondary)"
            style={{
              backgroundColor: 'var(--nw-warning-secondary)',
              borderColor: 'var(--nw-warning)',
              color: 'var(--nw-warning-on-card)',
              fontWeight: 500
            }}
          >
            GDPR
          </Tag>
        ) : (
          <span>-</span>
        )
      }
    },
    {
      title: t('documentManagement.columns.status', 'Status'),
      key: 'status',
      render: (_: any, record: DocumentType) => {
        const isActive = record.objectValue?.isActive !== false // Default to true if not set
        return (
          <Tag color={isActive ? 'green' : 'red'}>
            {isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
          </Tag>
        )
      }
    },
    {
      title: t('common.actions', 'Actions'),
      key: 'actions',
      fixed: 'right' as const,
      width: 120,
      render: (_: any, record: DocumentType) => (
        <div className="gba:flex gba:gap-2">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
            className="gba:text-muted-foreground gba:hover:text-info"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            className="gba:hover:text-destructive"
          />
        </div>
      )
    }
  ]

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
      <Row justify="space-between" align="middle" className="gba:mb-6 gba:header-row">
        <Col>
          <Title level={3} className="gba:m-0 gba:page-title">
            {t('documentManagement.title', 'Document Type Management')}
          </Title>
          <Text type="secondary">
            {t('documentManagement.subtitle', 'Manage document types and their permissions')}
          </Text>
        </Col>
      </Row>

      {/* KPI and Search Card */}
      <Card className="gba:mb-6">
        <Row gutter={16} align="middle" justify="space-between">
          <Col span={10}>
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
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()} className="gba:create-button">
              {t('documentManagement.actions.addDocumentType', 'Add Document Type')}
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Filter and Table Card */}
      <Card>
        <Row gutter={16} justify="space-between" align="middle" className="gba:mb-2">
          <Col span={5}>
            <Select
              placeholder={t('documentManagement.filters.module', 'Filter by Module')}
              className="gba:w-full"
              value={moduleFilter}
              onChange={value => {
                setModuleFilter(value)
                if (currentPage !== 1) {
                  handlePageChange(1)
                }
              }}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value={undefined}>
                {t('documentManagement.filters.allModules', 'All Modules')}
              </Select.Option>
              {moduleOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Input
              placeholder={t('documentManagement.search.placeholder', 'Search document types...')}
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              allowClear
              className="gba:w-full"
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={documentTypes}
          loading={hookLoading}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: PAGE_SIZE,
            total: totalDocumentTypes,
            onChange: handlePageChange,
            showSizeChanger: false,
            showTotal: undefined
          }}
        />
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
