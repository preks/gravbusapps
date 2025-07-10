import React, { useState } from 'react';
import {
  Button,
  Card,
  Tag,
  Typography,
  Space,
  Alert,
  Spin,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { usePipelineDataIntegration } from '../hooks/usePipelineDataIntegration';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { SALES_PIPELINE_CATALOG, SALES_PIPELINE_VERSION } from '../hooks/useSalesPipelines';
import {
  EnhancedSalesPipeline,
  PipelineFormData,
} from '../types';
import { PipelineStagesModal } from './PipelineStagesModal';
import { convertToScreamingSnakeCase } from '../utils';

const { Title, Text } = Typography;
const { Option } = Select;

// Pipeline Type Options
const PIPELINE_TYPE_OPTIONS = [
  { label: 'Customer Pipeline', value: 'CRM' },
  { label: 'Investment Pipeline', value: 'IRM' },
];

export interface PipelineOverviewProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
}

export const PipelineOverview: React.FC<PipelineOverviewProps> = (props) => {
  const { prefixDataTestId } = props;
  
  // Modal states
  const [isPipelineModalVisible, setIsPipelineModalVisible] = useState(false);
  const [isStagesModalVisible, setIsStagesModalVisible] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<EnhancedSalesPipeline | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<EnhancedSalesPipeline | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  
  const [pipelineForm] = Form.useForm<PipelineFormData>();

  const { pipelines, isLoading, error, refetch } = usePipelineDataIntegration(props);
  const catalogClient = useCatalogManagerClient(props.accessToken);

  const handleAddPipeline = () => {
    setEditingPipeline(null);
    pipelineForm.resetFields();
    pipelineForm.setFieldsValue({
      type: 'CRM' // Default to Customer Pipeline
    });
    setIsPipelineModalVisible(true);
  };

  const handleEditPipeline = (pipeline: EnhancedSalesPipeline) => {
    setEditingPipeline(pipeline);
    pipelineForm.setFieldsValue({
      value: pipeline.value,
      description: pipeline.description,
      type: pipeline.type || 'CRM', // Default to CRM if no type is set
    });
    setIsPipelineModalVisible(true);
  };

  const handleViewStages = (pipeline: EnhancedSalesPipeline) => {
    setSelectedPipeline(pipeline);
    setIsStagesModalVisible(true);
  };

  const handleDeletePipeline = (pipeline: EnhancedSalesPipeline) => {
    Modal.confirm({
      title: 'Delete Pipeline',
      content: `Are you sure you want to delete pipeline "${pipeline.value}"? This will also delete all its stages.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          setOperationLoading(true);
          await catalogClient.deleteCatalogEntry(
            SALES_PIPELINE_CATALOG,
            SALES_PIPELINE_VERSION,
            pipeline.id // Use full ID, not just code
          );
          message.success(`Pipeline "${pipeline.value}" deleted successfully`);
          await refetch(); // Refresh data
        } catch (error) {
          console.error('Error deleting pipeline:', error);
          message.error(`Failed to delete pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setOperationLoading(false);
        }
      },
    });
  };

  const handlePipelineModalOk = async () => {
    try {
      const values = await pipelineForm.validateFields();
      setOperationLoading(true);

      if (editingPipeline) {
        // Update existing pipeline - build payload with ID and filter out null values
        const payload: any = {
          id: editingPipeline.id, // Must include the ID in the request body
          code: editingPipeline.code, // Keep existing code
          value: values.value,
          type: values.type, // Pipeline type (CRM or IRM)
          objectValue: editingPipeline.objectValue || {},
          translations: []
        };

        // Only include fields that have values
        if (values.description) {
          payload.additionalValue1 = values.description;
        }

        await catalogClient.updateCatalogEntry(
          SALES_PIPELINE_CATALOG,
          SALES_PIPELINE_VERSION,
          editingPipeline.id,
          payload
        );
        message.success(`Pipeline "${values.value}" updated successfully`);
      } else {
        // Create new pipeline - auto-generate code from name
        const code = convertToScreamingSnakeCase(values.value);
        
        const payload: any = {
          code,
          value: values.value,
          type: values.type, // Pipeline type (CRM or IRM)
          objectValue: {},
          translations: []
        };

        // Only include fields that have values
        if (values.description) {
          payload.additionalValue1 = values.description;
        }

        await catalogClient.createCatalogEntry(
          SALES_PIPELINE_CATALOG,
          SALES_PIPELINE_VERSION,
          payload
        );
        message.success(`Pipeline "${values.value}" created successfully`);
      }

      setIsPipelineModalVisible(false);
      await refetch(); // Refresh data
    } catch (error) {
      console.error('Error saving pipeline:', error);
      message.error(`Failed to ${editingPipeline ? 'update' : 'create'} pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
        <Spin size="large" />
        <div className="gba:ml-4 gba:text-gray-600">
          Loading pipeline data...
          <br />
          <Text className="gba:text-sm gba:text-gray-500">
            Fetching sales pipelines from catalog
          </Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Pipeline Data"
        description={error}
        type="error"
        showIcon
        action={<Button size="small" onClick={refetch}>Retry</Button>}
      />
    );
  }

  return (
    <div
      data-testid={`${prefixDataTestId}-PipelineOverview`}
      className="gba:h-full"
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <Title level={3} className="gba:mb-1">
            Pipeline Management
          </Title>
          <Text className="gba:text-gray-600">
            Manage your sales pipelines and configure their stages
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddPipeline}
          size="large"
        >
          Add Pipeline
        </Button>
      </div>

      {/* Pipeline Grid */}
      {pipelines.length === 0 ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:w-full gba:h-96 gba:bg-gray-50 gba:rounded-lg gba:border-2 gba:border-dashed gba:border-gray-300">
          <div className="gba:text-center">
            <SettingOutlined className="gba:text-4xl gba:text-gray-400 gba:mb-4" />
            <Title level={4} className="gba:text-gray-500 gba:mb-2">
              No Pipelines Found
            </Title>
            <Text className="gba:text-gray-400 gba:mb-4">
              Create your first sales pipeline to get started
            </Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPipeline}>
              Create Pipeline
            </Button>
          </div>
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {pipelines.map((pipeline) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={pipeline.id}>
              <Card
                className="gba:border-gray-200 hover:gba:border-blue-400 hover:gba:shadow-lg gba:transition-all gba:h-full gba:relative"
                style={{
                  borderTop: '4px solid #1890ff',
                }}
                bodyStyle={{ padding: '20px' }}
                data-testid={`${prefixDataTestId}-PipelineCard-${pipeline.id}`}
              >
                {/* Pipeline Type Flag */}
                <div className="gba:absolute gba:top-2 gba:right-2 gba:z-10">
                  <Tag
                    color={pipeline.type === 'CRM' ? 'blue' : 'purple'}
                    className="gba:text-xs gba:font-medium gba:px-2 gba:py-1"
                  >
                    {pipeline.type}
                  </Tag>
                </div>

                <div className="gba:mb-4">
                  <Title level={5} className="gba:mb-2 gba:text-gray-800">
                    {pipeline.value}
                  </Title>

                  {pipeline.description && (
                    <Text className="gba:text-gray-500 gba:text-sm">
                      {pipeline.description}
                    </Text>
                  )}
                </div>

                <div className="gba:flex gba:justify-between gba:items-center">
                  <Button
                    type="primary"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewStages(pipeline)}
                    size="small"
                  >
                    View Stages
                  </Button>
                  
                  <Space size="small">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEditPipeline(pipeline)}
                      className="gba:text-gray-400 hover:gba:text-blue-500"
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeletePipeline(pipeline)}
                      className="gba:text-gray-400 hover:gba:text-red-500"
                    />
                  </Space>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Pipeline Modal */}
      <Modal
        title={editingPipeline ? 'Edit Pipeline' : 'Add New Pipeline'}
        open={isPipelineModalVisible}
        onOk={handlePipelineModalOk}
        onCancel={() => setIsPipelineModalVisible(false)}
        okText={editingPipeline ? 'Update' : 'Create'}
        confirmLoading={operationLoading}
      >
        <Form form={pipelineForm} layout="vertical">
          <Form.Item
            name="value"
            label="Pipeline Name"
            rules={[{ required: true, message: 'Please enter a pipeline name' }]}
          >
            <Input placeholder="e.g., Enterprise Sales" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true, message: 'Please select a pipeline type' }]}
          >
            <Select placeholder="Select Pipeline Type">
              {PIPELINE_TYPE_OPTIONS.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[]}
          >
            <Input.TextArea 
              placeholder="Describe the purpose and use case of this pipeline..."
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Pipeline Stages Modal */}
      <PipelineStagesModal
        pipeline={selectedPipeline}
        visible={isStagesModalVisible}
        onClose={() => {
          setIsStagesModalVisible(false);
          setSelectedPipeline(null);
          refetch(); // Refresh data when closing stages modal
        }}
        prefixDataTestId={prefixDataTestId}
        {...props}
      />
    </div>
  );
}; 