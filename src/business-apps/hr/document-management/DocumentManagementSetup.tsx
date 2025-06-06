import React, { useState, useMemo } from 'react';
import { 
  Button, 
  Card, 
  Select, 
  Table, 
  Space,
  Typography,
  Tag,
  Badge,
  Statistic // Added Statistic for KPI display
  // Badge removed as it's no longer used
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined
} from '@ant-design/icons';
import AddDocumentModal from './modals/AddDocumentTypeModal';
import useDocumentTypes from '../hooks/useDocumentTypes';
import { DocumentType as HrDocumentType } from '../document-management/types'; // Aliased import
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

const { Title, Text } = Typography;

// Removed local DocumentType interface, will use imported one from ../document-management/types

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


const DocumentManagementSetup: React.FC<BusinessAppContextProps> = (props: BusinessAppContextProps) => {
  // TODO: Replace 'YOUR_ACCESS_TOKEN' with the actual access token from your auth context or props
  const { accessToken } = props;
  const [moduleFilter, setModuleFilter] = useState<string | undefined>(undefined); // For module filter, undefined means 'All'

  const { 
    documentTypes,
    loading: hookLoading,
    error: hookError,
    totalDocumentTypes, // This will now be the FILTERED total if a moduleFilter is active
    currentPage,
    PAGE_SIZE,
    handlePageChange,
    createDocumentType,
    updateDocumentType,
    deleteDocumentType,
    // filteredModuleTotalCount, // Removed from useDocumentTypes
    allPossibleModules, // Destructure the new list of all module names
  } = useDocumentTypes(accessToken, moduleFilter); // Pass moduleFilter to the hook
  // End of original local state for documentTypes

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingDocType, setEditingDocType] = useState<HrDocumentType | null>(null); // Use HrDocumentType

  const showModal = (docType: HrDocumentType | null = null) => { // Use HrDocumentType
    setEditingDocType(docType); // Keep original docType for reference if needed elsewhere
    setIsAddModalVisible(true);
  };

  const handleAddDocument = async (values: any) => {
    // Temporary adjustment to satisfy new DocumentType structure for CUD ops
    // TODO: Fully update AddDocumentModal and this handler for the new DocumentType structure
    // Determine the parentEntryId based on the selected document group
    const newParentEntryId = values.documentGroup ? `DocumentGroup:v1:${values.documentGroup}` : (editingDocType?.parentEntryId || 'DefaultModule');

    if (editingDocType && editingDocType.id) {
      const updatedData: Partial<HrDocumentType> = { // Use HrDocumentType
        value: values.name, // 'name' from modal form maps to 'value' in HrDocumentType
        parentEntryId: newParentEntryId, // Use the selected documentGroup
        // Map other form values to HrDocumentType fields as needed
        // e.g., additionalValue1: values.description,
        // objectValue: { ...editingDocType.objectValue, gdpr: values.gdprRelevant, status: values.isActive ? 'active' : 'inactive' }
      };
      await updateDocumentType(editingDocType.id, updatedData);
    } else {
      const newDocData: Omit<HrDocumentType, 'id'> = { // Use HrDocumentType
        value: values.name || 'Default Name',
        code: Math.random().toString(36).substring(7), // Placeholder, consider a more robust generation
        parentEntryId: newParentEntryId,
        additionalValue1: values.description || '', // Example mapping for description
        objectValue: { 
          // gdpr: values.gdprRelevant, 
          // status: values.isActive ? 'active' : 'inactive' 
        },
        catalogEntryLocalId: Math.random().toString(36).substring(7), // Placeholder
        localeCode: 'ro-RO', // Placeholder
      };
      await createDocumentType(newDocData);
    }
    setIsAddModalVisible(false);
  };

  const handleCancel = () => {
    setIsAddModalVisible(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDocumentType(id);
    // message success/error is handled within the hook, but you can add more here if needed
  };

  // Generate module options for the filter dropdown from allPossibleModules
  // This provides a stable list of all unique modules available in the system.
  const moduleOptions = useMemo(() => {
    return allPossibleModules.map(moduleName => ({
      value: moduleName,
      // Simple capitalization for display, adjust as needed
      label: moduleName.charAt(0).toUpperCase() + moduleName.slice(1).toLowerCase(), 
    }));
    // The dependency is now allPossibleModules, which is fetched once.
  }, [allPossibleModules]);

  const filteredDocumentTypes = useMemo(() => {
    if (!moduleFilter) {
      return documentTypes;
    }
    return documentTypes.filter(doc => {
      if (!doc.parentEntryId) return false;
      const parts = doc.parentEntryId.split(':');
      const docModule = parts.length > 0 ? parts[parts.length - 1] : '';
      return docModule.toUpperCase() === moduleFilter.toUpperCase();
    });
  }, [documentTypes, moduleFilter]);


  const columns = [
    {
      title: 'Name',
      dataIndex: 'value', 
      key: 'value', // Changed key to 'value' for consistency
      render: (text: string, record: HrDocumentType) => ( // Use HrDocumentType
        <div>
          <div className="font-medium">{text}</div>
          {/* Processing and displaying additionalValue1 similar to module */}
          {record.additionalValue1 && (() => {
            const parts = record.additionalValue1.split(':');
            let detail = parts.length > 0 ? parts[parts.length - 1] : record.additionalValue1;
            detail = detail.toLowerCase();
            return <div className="text-gray-500 text-xs">{detail.charAt(0).toUpperCase() + detail.slice(1)}</div>;
          })()}
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
        moduleName = moduleName.toLowerCase(); // Convert to lowercase for camelCase of single word
        const moduleData = modules.find(m => m.id.toLowerCase() === moduleName || m.name.toLowerCase() === moduleName);
        return moduleData ? (
          <Tag color={moduleData.color}>
            {moduleData.name} {/* Display the full module name from modules array if found */}
          </Tag>
        ) : <Tag>{moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}</Tag>; // Display formatted if not in modules array 
      },
    },
    // {
    //   title: 'Status',
    //   dataIndex: 'isActive', // isActive is not in the new DocumentType
    //   key: 'status',
    //   render: (isActive: boolean) => (
    //     <Badge
    //       status={isActive ? 'success' : 'error'}
    //       text={isActive ? 'Active' : 'Inactive'}
    //     />
    //   ),
    // },
    // {
    //   title: 'GDPR',
    //   dataIndex: 'gdprRelevant', // gdprRelevant is not in the new DocumentType
    //   key: 'gdpr',
    //   render: (gdprRelevant: boolean) => (
    //     <Tag color={gdprRelevant ? 'red' : 'green'}>
    //       {gdprRelevant ? 'GDPR Relevant' : 'Not GDPR'}
    //     </Tag>
    //   ),
    // },
    // Security and File Types columns were previously commented out by the user and are kept that way.
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: HrDocumentType) => ( // Use HrDocumentType
        <Space size="middle">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showModal(record)}
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.id)}
          />
        </Space>
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} className="mb-1">Document Type Management</Title>
          <Text type="secondary">Manage document types and their permissions</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => showModal()}
        >
          Add Document Type
        </Button>
      </div>

      <div className="mb-4">
        <Statistic 
          title={moduleFilter ? "Matching Document Types" : "Total Document Types"} 
          value={totalDocumentTypes} // totalDocumentTypes now reflects filtered count when moduleFilter is active
          loading={hookLoading}
        />
      </div>

      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <Select
            placeholder="Filter by Module"
            style={{ width: 200 }} // Adjusted width for potentially longer module names
            value={moduleFilter}
            onChange={(value) => {
              setModuleFilter(value);
              // If the filter changes, reset to the first page to show relevant results
              // handlePageChange is from useDocumentTypes hook
              if (currentPage !== 1) { // Only reset if not already on page 1
                handlePageChange(1);
              }
            }}
            allowClear
          >
            <Select.Option value={undefined}>All Modules</Select.Option>
            {moduleOptions.map(opt => (
              <Select.Option key={opt.value} value={opt.value}>
                {opt.label}
              </Select.Option>
            ))}
          </Select>
        </div>

        <Table 
          columns={columns} 
          dataSource={filteredDocumentTypes} 
          loading={hookLoading} 
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: PAGE_SIZE,
            total: totalDocumentTypes, // totalDocumentTypes now reflects the filtered count directly
            onChange: handlePageChange,
            showSizeChanger: false, // Set to true if you want to allow changing page size
            // Consider adding showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
          }}
          // Add other Table props as needed, e.g., scroll
        />
      </Card>

      <AddDocumentModal
        visible={isAddModalVisible}
        onCancel={handleCancel}
        onOk={handleAddDocument}
        initialValues={editingDocType ? {
          ...editingDocType, // Spread other potential fields from docType
          name: editingDocType.value, // Map 'value' to 'name' for the form
          documentGroup: editingDocType.parentEntryId?.split(':').pop() || '', // Extract group from parentEntryId
          // description: editingDocType.additionalValue1, // Example: if additionalValue1 is description
          // gdprRelevant: editingDocType.objectValue?.gdpr, // Example if gdpr is in objectValue
          // isActive: editingDocType.objectValue?.status === 'active' // Example for isActive
        } : null}
        isEditing={!!editingDocType}
        // accessToken={accessToken} // accessToken is now from context in modal
      />
    </div>
  );
};

export default DocumentManagementSetup;
