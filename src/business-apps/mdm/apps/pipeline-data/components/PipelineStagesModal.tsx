import React, { useState, useEffect } from 'react';
import {
  Modal,
  Card,
  Tag,
  Typography,
  Space,
  Button,
  Spin,
  Alert,
  Form,
  Input,
  Select,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  DragOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useSalesPipelineStages } from '../hooks/useSalesPipelineStages';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { SALES_PIPELINE_STAGE_CATALOG, SALES_PIPELINE_STAGE_VERSION } from '../hooks/useSalesPipelineStages';
import {
  EnhancedSalesPipeline,
  EnhancedSalesPipelineStage,
  StageType,
  STAGE_TYPE_CONFIGS,
  StageFormData,
} from '../types';
import { CatalogEntry } from '@/common/types/CatalogTypes';
import { convertToScreamingSnakeCase } from '../utils';

const { Title, Text } = Typography;
const { Option } = Select;

interface PipelineStagesModalProps extends BusinessAppContextProps {
  pipeline: EnhancedSalesPipeline | null;
  visible: boolean;
  onClose: () => void;
  prefixDataTestId?: string;
}

// Helper function to transform catalog entry to enhanced stage
const transformCatalogEntryToStage = (entry: CatalogEntry, pipeline: EnhancedSalesPipeline): EnhancedSalesPipelineStage => {
  const rank = parseInt(entry.additionalValue1 || '0') || 0;
  const stageType = entry.alternativeCode as StageType;
  const config = STAGE_TYPE_CONFIGS[stageType] || STAGE_TYPE_CONFIGS[StageType.DISCOVERY];

  return {
    id: entry.id,
    parentEntryId: entry.parentEntryId || pipeline.id,
    code: entry.code,
    alternativeCode: stageType,
    value: entry.value,
    additionalValue1: entry.additionalValue1 || '0',
    objectValue: typeof entry.objectValue === 'object' && entry.objectValue !== null ? entry.objectValue as Record<string, any> : {},
    pipeline,
    rank,
    stageTypeName: config.label,
    stageTypeColor: config.color,
    isFirst: false, // Will be calculated after sorting
    isLast: false,  // Will be calculated after sorting
  };
};

// Draggable Stage Card Component
const DraggableStageCard: React.FC<{
  stage: EnhancedSalesPipelineStage;
  prefixDataTestId?: string;
  onEdit: (stage: EnhancedSalesPipelineStage) => void;
  onDelete: (stage: EnhancedSalesPipelineStage) => void;
}> = ({ stage, prefixDataTestId, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: stage.id,
    data: {
      type: 'stage',
      stage,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`${prefixDataTestId}-DraggableStageCard-${stage.id}`}
    >
      <Card
        size="small"
        className="gba:min-w-60 gba:border-gray-200 hover:gba:border-blue-400 hover:gba:shadow-md gba:transition-all gba:cursor-pointer"
        style={{
          borderTop: `4px solid ${
            STAGE_TYPE_CONFIGS[stage.alternativeCode]?.color === 'blue' ? '#1890ff' :
            STAGE_TYPE_CONFIGS[stage.alternativeCode]?.color === 'green' ? '#52c41a' :
            STAGE_TYPE_CONFIGS[stage.alternativeCode]?.color === 'orange' ? '#fa8c16' :
            STAGE_TYPE_CONFIGS[stage.alternativeCode]?.color === 'red' ? '#ff4d4f' :
            STAGE_TYPE_CONFIGS[stage.alternativeCode]?.color === 'cyan' ? '#13c2c2' : '#1890ff'
          }`,
        }}
        bodyStyle={{ padding: '16px' }}
      >
        <div className="gba:mb-3">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <div
              {...attributes}
              {...listeners}
              className="gba:cursor-grab gba:text-gray-400 hover:gba:text-gray-600 gba:p-1 gba:mr-1"
            >
              <DragOutlined />
            </div>
            <Text strong className="gba:text-gray-800 gba:flex-1">
              {stage.value}
            </Text>
            <Tag
              color={stage.stageTypeColor}
              style={{ fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}
            >
              {stage.stageTypeName}
            </Tag>
          </div>
        </div>

        <div className="gba:flex gba:justify-end gba:gap-1">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(stage);
            }}
            className="gba:text-gray-400 hover:gba:text-blue-500"
          />
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(stage);
            }}
            className="gba:text-gray-400 hover:gba:text-red-500"
          />
        </div>
      </Card>
    </div>
  );
};

export const PipelineStagesModal: React.FC<PipelineStagesModalProps> = ({
  pipeline,
  visible,
  onClose,
  prefixDataTestId,
  ...context
}) => {
  const [stages, setStages] = useState<EnhancedSalesPipelineStage[]>([]);
  const [originalStageEntries, setOriginalStageEntries] = useState<CatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // Stage modal states
  const [isStageModalVisible, setIsStageModalVisible] = useState(false);
  const [editingStage, setEditingStage] = useState<EnhancedSalesPipelineStage | null>(null);
  const [stageForm] = Form.useForm<StageFormData>();

  // Drag and drop states
  const [activeStage, setActiveStage] = useState<EnhancedSalesPipelineStage | null>(null);

  const { fetchSalesPipelineStagesByParent } = useSalesPipelineStages(context);
  const catalogClient = useCatalogManagerClient(context.accessToken);

  // Drag and drop sensors
  const sensors = useSensors(useSensor(PointerSensor));

  // Load stages when pipeline changes
  useEffect(() => {
    if (pipeline && visible) {
      loadStages();
    }
  }, [pipeline, visible]);

  const loadStages = async () => {
    if (!pipeline) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchSalesPipelineStagesByParent(pipeline.id);
      
      // Filter stages for this specific pipeline
      const filteredEntries = response.data.filter(entry => entry.parentEntryId === pipeline.id);
      
      // Store original entries for preserving fields during updates
      setOriginalStageEntries(filteredEntries);
      
      // Transform them to enhanced stages
      const pipelineStages = filteredEntries
        .map(entry => transformCatalogEntryToStage(entry, pipeline))
        .sort((a, b) => a.rank - b.rank);

      // Mark first and last stages
      if (pipelineStages.length > 0) {
        pipelineStages[0].isFirst = true;
        pipelineStages[pipelineStages.length - 1].isLast = true;
      }

      setStages(pipelineStages);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load pipeline stages';
      setError(errorMsg);
      console.error('Error loading pipeline stages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const stage = stages.find(s => s.id === active.id);
    setActiveStage(stage || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveStage(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeIndex = stages.findIndex(stage => stage.id === active.id);
    const overIndex = stages.findIndex(stage => stage.id === over.id);

    if (activeIndex === -1 || overIndex === -1) {
      return;
    }

    // Create new array with reordered stages
    const newStages = [...stages];
    const [movedStage] = newStages.splice(activeIndex, 1);
    newStages.splice(overIndex, 0, movedStage);

    // Update local state immediately for UI responsiveness
    const updatedStages = newStages.map((stage, index) => ({
      ...stage,
      rank: index + 1,
      isFirst: index === 0,
      isLast: index === newStages.length - 1,
    }));
    setStages(updatedStages);

    // Update ranks in database
    await updateStageRanks(updatedStages);
  };

  // Shared function for updating stage catalog entries
  const updateStageEntry = async (stage: EnhancedSalesPipelineStage, updates: Partial<{
    value: string;
    alternativeCode: StageType;
    rank: number;
  }>) => {
    const originalCatalogEntry = originalStageEntries.find((entry: CatalogEntry) => entry.id === stage.id);
    
    // Build payload with required fields, filtering out null/undefined values
    const payload: any = {
      id: stage.id, // Must include the ID in the request body
      code: stage.code, // Keep existing code
      value: updates.value ?? stage.value,
      alternativeCode: updates.alternativeCode ?? stage.alternativeCode,
      parentEntryId: stage.parentEntryId,
      additionalValue1: (updates.rank ?? stage.rank).toString().padStart(2, '0'),
      objectValue: stage.objectValue || {}
    };

    // Only include fields that have values (not null/undefined)
    if (originalCatalogEntry?.additionalValue2) {
      payload.additionalValue2 = originalCatalogEntry.additionalValue2;
    }
    if (originalCatalogEntry?.additionalValue3) {
      payload.additionalValue3 = originalCatalogEntry.additionalValue3;
    }
    if (originalCatalogEntry?.localeCode) {
      payload.localeCode = originalCatalogEntry.localeCode;
    }
    if (originalCatalogEntry?.translations && originalCatalogEntry.translations.length > 0) {
      payload.translations = originalCatalogEntry.translations;
    } else {
      payload.translations = [];
    }
    
    return catalogClient.updateCatalogEntry(
      SALES_PIPELINE_STAGE_CATALOG,
      SALES_PIPELINE_STAGE_VERSION,
      stage.id,
      payload
    );
  };

  const updateStageRanks = async (updatedStages: EnhancedSalesPipelineStage[]) => {
    try {
      setOperationLoading(true);
      
      // Update all stages that had their rank changed
      const updatePromises = updatedStages.map(async (stage, index) => {
        const newRank = index + 1;
        const originalStage = stages.find(s => s.id === stage.id);
        
        // Only update if rank actually changed
        if (originalStage && originalStage.rank !== newRank) {
          return updateStageEntry(stage, { rank: newRank });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
      message.success('Stage order updated successfully');
      
      // Reload stages to ensure consistency
      await loadStages();
    } catch (error) {
      console.error('Error updating stage ranks:', error);
      message.error(`Failed to update stage order: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Reload stages to revert to original order
      await loadStages();
    } finally {
      setOperationLoading(false);
    }
  };

  const handleAddStage = () => {
    if (!pipeline) return;
    
    setEditingStage(null);
    stageForm.resetFields();
    setIsStageModalVisible(true);
  };

  const handleEditStage = (stage: EnhancedSalesPipelineStage) => {
    setEditingStage(stage);
    stageForm.setFieldsValue({
      value: stage.value,
      alternativeCode: stage.alternativeCode,
    });
    setIsStageModalVisible(true);
  };

  const handleDeleteStage = (stage: EnhancedSalesPipelineStage) => {
    Modal.confirm({
      title: 'Delete Stage',
      content: `Are you sure you want to delete stage "${stage.value}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          setOperationLoading(true);
          await catalogClient.deleteCatalogEntry(
            SALES_PIPELINE_STAGE_CATALOG,
            SALES_PIPELINE_STAGE_VERSION,
            stage.id // Use full ID, not just code
          );
          message.success(`Stage "${stage.value}" deleted successfully`);
          await loadStages(); // Refresh stages
        } catch (error) {
          console.error('Error deleting stage:', error);
          message.error(`Failed to delete stage: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
          setOperationLoading(false);
        }
      },
    });
  };

  const handleStageModalOk = async () => {
    try {
      const values = await stageForm.validateFields();
      setOperationLoading(true);

      if (editingStage) {
        // Update existing stage using shared function
        await updateStageEntry(editingStage, {
          value: values.value,
          alternativeCode: values.alternativeCode,
        });
        message.success(`Stage "${values.value}" updated successfully`);
      } else {
        // Create new stage - auto-generate code and assign as last stage
        const code = convertToScreamingSnakeCase(values.value);
        const rank = stages.length + 1; // Automatically assign as last stage
        
        const payload: any = {
          code,
          value: values.value,
          alternativeCode: values.alternativeCode,
          parentEntryId: pipeline!.id,
          additionalValue1: rank.toString().padStart(2, '0'),
          objectValue: {},
          translations: []
        };

        await catalogClient.createCatalogEntry(
          SALES_PIPELINE_STAGE_CATALOG,
          SALES_PIPELINE_STAGE_VERSION,
          payload
        );
        message.success(`Stage "${values.value}" created successfully`);
      }

      setIsStageModalVisible(false);
      await loadStages(); // Refresh stages
    } catch (error) {
      console.error('Error saving stage:', error);
      message.error(`Failed to ${editingStage ? 'update' : 'create'} stage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <>
      <Modal
        title={
          <Title level={4} className="gba:mb-0">
            {pipeline?.value} - Pipeline Stages
          </Title>
        }
        open={visible}
        onCancel={onClose}
        footer={null}
        width={1400}
        className="gba:pipeline-stages-modal"
      >
        <div data-testid={`${prefixDataTestId}-PipelineStagesModal`}>
          {/* Add Stage Button */}
          <div className="gba:mb-4 gba:flex gba:justify-between gba:items-center">
            <Text className="gba:text-gray-600">
              Configure the stages for this pipeline in the order they should appear
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddStage}
              disabled={!pipeline}
            >
              Add Stage
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
              <Spin size="large" />
              <Text className="gba:ml-3 gba:text-gray-600">Loading stages...</Text>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert
              message="Error Loading Stages"
              description={error}
              type="error"
              showIcon
              action={<Button size="small" onClick={loadStages}>Retry</Button>}
              className="gba:mb-4"
            />
          )}

          {/* Horizontal Stage Flow with Drag & Drop */}
          {!isLoading && !error && (
            <div className="gba:bg-gray-50 gba:p-6 gba:rounded-lg">
              {stages.length === 0 ? (
                <div className="gba:text-center gba:py-12">
                  <Text className="gba:text-gray-500 gba:text-lg gba:block gba:mb-4">
                    No stages configured yet
                  </Text>
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStage}>
                    Add First Stage
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={stages.map(s => s.id)} strategy={horizontalListSortingStrategy}>
                    <div className="gba:flex gba:items-center gba:gap-4 gba:overflow-x-auto gba:pb-2">
                      {stages.map((stage, index) => (
                        <React.Fragment key={stage.id}>
                          {/* Draggable Stage Card */}
                          <DraggableStageCard
                            stage={stage}
                            prefixDataTestId={prefixDataTestId}
                            onEdit={handleEditStage}
                            onDelete={handleDeleteStage}
                          />

                          {/* Arrow between stages */}
                          {index < stages.length - 1 && (
                            <ArrowRightOutlined className="gba:text-gray-400 gba:text-lg gba:flex-shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </SortableContext>
                  
                  <DragOverlay>
                    {activeStage ? (
                      <DraggableStageCard
                        stage={activeStage}
                        prefixDataTestId={prefixDataTestId}
                        onEdit={() => {}}
                        onDelete={() => {}}
                      />
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Stage Creation/Edit Modal */}
      <Modal
        title={editingStage ? 'Edit Stage' : 'Add New Stage'}
        open={isStageModalVisible}
        onOk={handleStageModalOk}
        onCancel={() => setIsStageModalVisible(false)}
        okText={editingStage ? 'Update' : 'Create'}
        confirmLoading={operationLoading}
        width={600}
      >
        <Form form={stageForm} layout="vertical">
          <Form.Item
            name="value"
            label="Stage Name"
            rules={[{ required: true, message: 'Please enter a stage name' }]}
          >
            <Input placeholder="e.g., Qualification Meeting" />
          </Form.Item>

          <Form.Item
            name="alternativeCode"
            label="Stage Type"
            rules={[{ required: true, message: 'Please select a stage type' }]}
          >
            <Select placeholder="Select Stage Type">
              {Object.values(StageType).map(type => {
                const config = STAGE_TYPE_CONFIGS[type];
                return (
                  <Option key={type} value={type}>
                    <Tag color={config.color} style={{ marginRight: '8px' }}>
                      {config.label}
                    </Tag>
                    {config.description}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}; 