import React, { useState, useMemo, useEffect } from 'react';
import { 
  Button, 
  Card, 
  Col,
  Input,
  message,
  Row,
  Select, 
  Table, 
  Tag,
  Typography
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined,
  EditOutlined,
  SearchOutlined
} from '@ant-design/icons';
import AddDocumentModal from './modals/AddDocumentTypeModal';
import useDocumentTypes from '../hooks/useDocumentTypes';
import { DocumentType as HrDocumentType } from '../document-management/types'; // Aliased import
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const { Title, Text } = Typography;

interface Module {
  id: string;
  name: string;
  color: string;
}

const modules: Module[] = [
  { id: 'hr', name: 'Human Resources', color: 'blue' },
  { id: 'crm', name: 'Customer Relations', color: 'green' },
  { id: 'finance', name: 'Finance', color: 'gold' },
];

const DocumentManagementSetup: React.FC<BusinessAppContextProps> = (props) => {
  const { accessToken } = props;
  const [moduleFilter, setModuleFilter] = useState<string | undefined>(undefined); 
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchInput]);

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
    allPossibleModules = [], 
  } = useDocumentTypes(accessToken, moduleFilter, searchTerm) || {}; 

  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
  const [editingDocType, setEditingDocType] = useState<HrDocumentType | null>(null); 

  const showModal = (docType: HrDocumentType | null = null) => { 
    setEditingDocType(docType); 
    setIsAddModalVisible(true);
  };

  const handleAddDocument = async (values: any) => {
    try {
      // Prepare translations array with only non-English translations
      const translations: Array<{ localeCode: string; value: string }> = [];
      
      // Add German translation if provided
      if (values.name_de) {
        translations.push({ localeCode: 'de-DE', value: values.name_de });
      }
      
      // Add Romanian translation if provided
      if (values.name_ro) {
        translations.push({ localeCode: 'ro-RO', value: values.name_ro });
      }

      const documentType: Omit<HrDocumentType, 'id'> = {
        parentEntryId: `DocumentGroup:v1:${values.documentGroup}`,
        value: values.name, // Keep the main value as is (English)
        code: values.name ? 
          values.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_{2,}/g, '_').replace(/^_+|_+$/g, '') : 
          Math.random().toString(36).substring(7),
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
      };

      if (editingDocType) {
        // When updating, use the new values but ensure gdprRelevant is a boolean
        const updatedObjectValue = {
          ...editingDocType.objectValue,
          ...documentType.objectValue,
          gdprRelevant: Boolean(values.gdprRelevant) // Ensure boolean
        };
        
        await updateDocumentType(editingDocType.id, {
          ...editingDocType,
          ...documentType,
          objectValue: updatedObjectValue,
          // Only include translations if there are any
          ...(translations.length > 0 ? { translations } : {})
        });
      } else {
        // For new documents, we already have the correct boolean value
        await createDocumentType({
          ...documentType,
          // Only include translations if there are any
          ...(translations.length > 0 ? { translations } : {})
        });
      }
      
      message.success(`Document type ${editingDocType ? 'updated' : 'created'} successfully`);
      handleCancel();
    } catch (error) {
      console.error('Error saving document type:', error);
      message.error(`Failed to ${editingDocType ? 'update' : 'create'} document type`);
    }
  };

  const handleCancel = () => {
    setIsAddModalVisible(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDocumentType(id);
  };

  const moduleOptions = useMemo(() => {
    return allPossibleModules.map(moduleName => ({
      value: moduleName,
      label: moduleName.charAt(0).toUpperCase() + moduleName.slice(1).toLowerCase(), 
    }));
  }, [allPossibleModules]);

  // Use server-side filtering with the search term and module filter
  // The actual filtering is done in the useDocumentTypes hook

  const columns = [
    {
      title: 'Name',
      dataIndex: 'value', 
      key: 'value', 
      render: (text: string, record: HrDocumentType) => ( 
        <div>
          <div style={{ fontWeight: 600}}>{text}</div>
          {record.objectValue?.description && (
            <div className="text-gray-500 text-xs">{record.objectValue.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Module',
      dataIndex: 'parentEntryId', 
      key: 'module',
      render: (parentEntryId: string) => {
        if (!parentEntryId) return <Tag>Unknown</Tag>;
        const parts = parentEntryId.split(':');
        let moduleName = parts.length > 0 ? parts[parts.length -1] : parentEntryId;
        moduleName = moduleName.toLowerCase(); 
        const moduleData = modules.find(m => m.id.toLowerCase() === moduleName || m.name.toLowerCase() === moduleName);
        return moduleData ? (
          <Tag color={moduleData.color}>
            {moduleData.name} 
          </Tag>
        ) : <Tag>{moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}</Tag>; 
      },
    },
    {
      title: 'File Types',
      key: 'fileTypes',
      render: (_: any, record: HrDocumentType) => {
        const fileTypes = Array.isArray(record.objectValue?.fileTypes) 
          ? record.objectValue.fileTypes 
          : (record.objectValue?.fileTypes ? [record.objectValue.fileTypes] : []);
        return (
          <div className="flex flex-wrap gap-1">
            {fileTypes.map((type: string, index: number) => (
              <Tag key={index} 
              color="white"
              style={{ 
                borderColor: '#f2f2f2',
                color: '#222222',
                fontWeight: 500
              }}
              >{type.toUpperCase()}</Tag>
            ))}
            {fileTypes.length === 0 && <span>-</span>}
          </div>
        );
      },
    },
    {
      title: 'Max Size (MB)',
      key: 'maxSize',
      render: (_: any, record: HrDocumentType) => (
        <span>{record.objectValue?.maxSize || '-'}</span>
      ),
    },
    {
      title: 'GDPR',
      key: 'gdpr',
      render: (_: any, record: HrDocumentType) => {
        const isGdpr = record.objectValue?.gdprRelevant === true;
        return isGdpr ? (
          <Tag 
            color="gold" 
            style={{ 
              backgroundColor: '#fffbe6', 
              borderColor: '#faad14',
              color: '#d48806',
              fontWeight: 500
            }}
          >
            GDPR
          </Tag>
        ) : (
          <span>-</span>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: HrDocumentType) => {
        const isActive = record.objectValue?.isActive !== false; // Default to true if not set
        return (
          <Tag color={isActive ? 'green' : 'red'}>
            {isActive ? 'Active' : 'Inactive'}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right' as const,
      width: 120,
      render: (_: any, record: HrDocumentType) => ( 
        <div className="flex gap-2">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showModal(record)}
            className="text-gray-500 hover:text-blue-500"
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)}
            className="hover:text-red-500"
          />
        </div>
      ),
    },
  ];

  if (hookLoading) {
    return <div className="p-6">Loading document types...</div>;
  }

  if (hookError) {
    return <div className="p-6">Error loading document types: {hookError.message}</div>;
  }

  return (
    <div style={{ padding: '24px' }} className="gba-document-management-container">
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }} className="gba-header-row">
        <Col>
          <Title level={3} style={{ margin: 0 }} className="gba-page-title">Document Type Management</Title>
          <Text type="secondary">Manage document types and their permissions</Text>
        </Col>
      </Row>

      {/* KPI and Search Card */}
      <Card style={{ marginBottom: '20px' }}>
        <Row gutter={16} align="middle" justify="space-between">
          <Col span={10}>
            <div>
              <div className="text-sm text-gray-500">
                {moduleFilter ? "Matching Document Types" : "Total Document Types"}
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '24px' }}>
                {hookLoading ? <span style={{ fontWeight: 'normal', fontSize: '12px' }}>Loading...</span> : totalDocumentTypes}
              </div>
            </div>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => showModal()}
              className="gba-create-button"
            >
              Add Document Type
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Filter and Table Card */}
      <Card>
        <Row gutter={16} justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
          <Col span={5}>
            <Select
              placeholder="Filter by Module"
              className="w-full"
              value={moduleFilter}
              onChange={(value) => {
                setModuleFilter(value);
                if (currentPage !== 1) {
                  handlePageChange(1);
                }
              }}
              allowClear
              style={{ width: '100%' }}
            >
              <Select.Option value={undefined}>All Modules</Select.Option>
              {moduleOptions.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Input
              placeholder="Search document types..."
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              allowClear
              className="w-full"
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
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
          }}
        />
      </Card>

      <AddDocumentModal
        visible={isAddModalVisible}
        onCancel={handleCancel}
        onOk={handleAddDocument}
        initialValues={editingDocType ? {
          ...editingDocType,
          name: editingDocType.value,
          documentGroup: editingDocType.parentEntryId?.split(':').pop() || '',
        } : null}
        isEditing={!!editingDocType}
        accessToken={accessToken}
      />
    </div>
  );
};

export default DocumentManagementSetup;
