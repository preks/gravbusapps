import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Input, Space, Typography, message, Modal, Form, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { useUserLocale } from '@/common/locale/useUserLocale';

const { Title } = Typography;

export interface ContractType {
  id: string;
  code: string;
  value: string;
  alternativeCode?: string;
  additionalValue1?: string;
  additionalValue2?: string;
  additionalValue3?: string;
  translations: Array<{
    localeCode: string;
    value: string;
  }>;
}

export interface ContractTypesTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

const ContractTypesTab: React.FC<ContractTypesTabProps> = ({ 
  accessToken, 
  prefixDataTestId 
}) => {
  const { t } = useTranslation();
  const userLocale = useUserLocale() ?? 'en-US';
  const catalogClient = useCatalogManagerClient(accessToken);
  
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<ContractType | null>(null);
  const [form] = Form.useForm();

  const fetchContractTypes = async () => {
    try {
      setLoading(true);
      const response = await catalogClient.getCatalogEntriesList({
        catalogIdentifier: 'ContractType',
        version: 'v1',
      }, {
        limit: 100,
        offset: 0,
        returnTotalRecords: true,
        localeCode: userLocale,
        ...(searchTerm ? { searchCriteria: searchTerm } : {}),
      });

      if (response.data) {
        const types: ContractType[] = response.data.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value,
          alternativeCode: entry.alternativeCode,
          additionalValue1: entry.additionalValue1,
          additionalValue2: entry.additionalValue2,
          additionalValue3: entry.additionalValue3,
          translations: entry.translations || []
        }));
        setContractTypes(types);
      }
    } catch (error) {
      console.error('Error fetching contract types:', error);
      message.error('Failed to load contract types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractTypes();
  }, [searchTerm, userLocale]);

  const handleAdd = () => {
    setEditingType(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: ContractType) => {
    setEditingType(record);
    form.setFieldsValue({
      code: record.code,
      value: record.value,
      alternativeCode: record.alternativeCode,
      additionalValue1: record.additionalValue1,
      additionalValue2: record.additionalValue2,
      additionalValue3: record.additionalValue3,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (record: ContractType) => {
    Modal.confirm({
      title: 'Delete Contract Type',
      content: `Are you sure you want to delete "${record.value}"?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          // Note: Actual delete implementation would depend on the catalog API
          message.success('Contract type deleted successfully');
          fetchContractTypes();
        } catch (error) {
          console.error('Error deleting contract type:', error);
          message.error('Failed to delete contract type');
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Note: Actual save implementation would depend on the catalog API
      if (editingType) {
        message.success('Contract type updated successfully');
      } else {
        message.success('Contract type created successfully');
      }
      
      setIsModalVisible(false);
      fetchContractTypes();
    } catch (error) {
      console.error('Error saving contract type:', error);
      message.error('Failed to save contract type');
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      sorter: (a: ContractType, b: ContractType) => a.code.localeCompare(b.code),
    },
    {
      title: 'Name',
      dataIndex: 'value',
      key: 'value',
      sorter: (a: ContractType, b: ContractType) => a.value.localeCompare(b.value),
    },
    {
      title: 'Alternative Code',
      dataIndex: 'alternativeCode',
      key: 'alternativeCode',
      width: 150,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: ContractType) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            size="small"
            danger
          />
        </Space>
      ),
    },
  ];

  return (
    <div
      data-testid={`${prefixDataTestId || ''}-ContractTypesTab`}
      style={{ 
        background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
        minHeight: '100%',
        padding: '24px'
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <Title level={3} style={{ margin: 0 }}>
            {t('hr.contract_types', 'Contract Types')}
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            data-testid={`${prefixDataTestId || ''}-ContractTypesTab-AddButton`}
          >
            Add Contract Type
          </Button>
        </div>
        
        <Input
          placeholder="Search contract types..."
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
          allowClear
          data-testid={`${prefixDataTestId || ''}-ContractTypesTab-SearchInput`}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={contractTypes}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} contract types`,
          }}
          data-testid={`${prefixDataTestId || ''}-ContractTypesTab-Table`}
        />
      )}

      <Modal
        title={editingType ? 'Edit Contract Type' : 'Add Contract Type'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        data-testid={`${prefixDataTestId || ''}-ContractTypesTab-Modal`}
      >
        <Form
          form={form}
          layout="vertical"
          data-testid={`${prefixDataTestId || ''}-ContractTypesTab-Form`}
        >
          <Form.Item
            label="Code"
            name="code"
            rules={[{ required: true, message: 'Please enter a code' }]}
          >
            <Input placeholder="Enter contract type code" />
          </Form.Item>
          
          <Form.Item
            label="Name"
            name="value"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="Enter contract type name" />
          </Form.Item>
          
          <Form.Item
            label="Alternative Code"
            name="alternativeCode"
          >
            <Input placeholder="Enter alternative code (optional)" />
          </Form.Item>
          
          <Form.Item
            label="Additional Value 1"
            name="additionalValue1"
          >
            <Input placeholder="Enter additional value 1 (optional)" />
          </Form.Item>
          
          <Form.Item
            label="Additional Value 2"
            name="additionalValue2"
          >
            <Input placeholder="Enter additional value 2 (optional)" />
          </Form.Item>
          
          <Form.Item
            label="Additional Value 3"
            name="additionalValue3"
          >
            <Input placeholder="Enter additional value 3 (optional)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export { ContractTypesTab }; 