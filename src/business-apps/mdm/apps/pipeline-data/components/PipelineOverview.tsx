import React, { useState } from 'react';
import {
  Button,
  Card,
  Badge,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Spinner,
  Alert,
  AlertDescription,
} from '@newwork/nw-design-system';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Settings,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
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

// Pipeline Type Options
const PIPELINE_TYPE_OPTIONS = [
  { label: 'Customer Pipeline', value: 'CRM' },
  { label: 'Investment Pipeline', value: 'IRM' },
];

export interface PipelineOverviewProps extends BusinessAppContextProps {
  prefixDataTestId?: string;
  sourceApp?: 'CRM' | 'IRM'; // Add sourceApp parameter for filtering
}

export const PipelineOverview: React.FC<PipelineOverviewProps> = (props) => {
  const { prefixDataTestId, sourceApp = 'CRM' } = props;
  
  // Modal states
  const [isPipelineModalVisible, setIsPipelineModalVisible] = useState(false);
  const [isStagesModalVisible, setIsStagesModalVisible] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<EnhancedSalesPipeline | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<EnhancedSalesPipeline | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pipelineToDelete, setPipelineToDelete] = useState<EnhancedSalesPipeline | null>(null);
  
  const pipelineForm = useForm<PipelineFormData>({
    defaultValues: {
      value: '',
      description: '',
      type: sourceApp // Default to current sourceApp
    }
  });

  const { pipelines, isLoading, error, refetch } = usePipelineDataIntegration(props, { sourceApp });
  const catalogClient = useCatalogManagerClient(props.accessToken);

  // Pipelines are already filtered by sourceApp in the hook

  const handleAddPipeline = () => {
    setEditingPipeline(null);
    pipelineForm.reset({
      value: '',
      description: '',
      type: sourceApp // Default to current sourceApp
    });
    setIsPipelineModalVisible(true);
  };

  const handleEditPipeline = (pipeline: EnhancedSalesPipeline) => {
    setEditingPipeline(pipeline);
    pipelineForm.reset({
      value: pipeline.value,
      description: pipeline.description,
      type: pipeline.type || sourceApp,
    });
    setIsPipelineModalVisible(true);
  };

  const handleViewStages = (pipeline: EnhancedSalesPipeline) => {
    setSelectedPipeline(pipeline);
    setIsStagesModalVisible(true);
  };

  const handleDeletePipeline = (pipeline: EnhancedSalesPipeline) => {
    setPipelineToDelete(pipeline);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!pipelineToDelete) return;
    
    try {
      setOperationLoading(true);
      await catalogClient.deleteCatalogEntry(
        SALES_PIPELINE_CATALOG,
        SALES_PIPELINE_VERSION,
        pipelineToDelete.id
      );
      console.log(`Pipeline "${pipelineToDelete.value}" deleted successfully`);
      await refetch();
    } catch (error) {
      console.error('Error deleting pipeline:', error);
    } finally {
      setOperationLoading(false);
      setDeleteDialogOpen(false);
      setPipelineToDelete(null);
    }
  };

  const handlePipelineModalSubmit = async (values: PipelineFormData) => {
    try {
      setOperationLoading(true);

      if (editingPipeline) {
        // Update existing pipeline
        const payload: any = {
          id: editingPipeline.id,
          code: editingPipeline.code,
          value: values.value,
          type: values.type,
          objectValue: editingPipeline.objectValue || {},
          translations: []
        };

        if (values.description) {
          payload.additionalValue1 = values.description;
        }

        await catalogClient.updateCatalogEntry(
          SALES_PIPELINE_CATALOG,
          SALES_PIPELINE_VERSION,
          editingPipeline.id,
          payload
        );
        console.log(`Pipeline "${values.value}" updated successfully`);
      } else {
        // Create new pipeline
        const code = convertToScreamingSnakeCase(values.value);
        
        const payload: any = {
          code,
          value: values.value,
          type: values.type,
          objectValue: {},
          translations: []
        };

        if (values.description) {
          payload.additionalValue1 = values.description;
        }

        await catalogClient.createCatalogEntry(
          SALES_PIPELINE_CATALOG,
          SALES_PIPELINE_VERSION,
          payload
        );
        console.log(`Pipeline "${values.value}" created successfully`);
      }

      setIsPipelineModalVisible(false);
      await refetch();
    } catch (error) {
      console.error('Error saving pipeline:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  const getPipelineTypeColor = (type: string) => {
    switch (type) {
      case 'CRM':
        return 'default';
      case 'IRM':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPipelineTypeLabel = (type: string) => {
    switch (type) {
      case 'CRM':
        return 'Customer';
      case 'IRM':
        return 'Investment';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
        <Spinner className="gba:w-8 gba:h-8" />
        <div className="gba:ml-4 gba:text-gray-600">
          Loading pipeline data...
          <br />
          <span className="gba:text-sm gba:text-gray-500">
            Fetching {sourceApp === 'CRM' ? 'sales' : 'investment'} pipelines from catalog
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error-alert`}>
        <AlertDescription>
          Error Loading Pipeline Data: {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refetch}
            className="gba:ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
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
          <h3 className="gba:text-2xl gba:font-semibold gba:mb-1">
            {sourceApp === 'CRM' ? 'Sales' : 'Investment'} Pipeline Management
          </h3>
          <p className="gba:text-gray-600">
            Manage your {sourceApp === 'CRM' ? 'sales' : 'investment'} pipelines and configure their stages
          </p>
        </div>
        <Button
          onClick={handleAddPipeline}
          data-testid={`${prefixDataTestId}-add-pipeline-button`}
          className="gba:flex gba:items-center gba:gap-2"
        >
          <Plus className="gba:w-4 gba:h-4" />
          Add Pipeline
        </Button>
      </div>

      {/* Pipeline Grid */}
      {pipelines.length === 0 ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:w-full gba:h-96 gba:bg-gray-50 gba:rounded-lg gba:border-2 gba:border-dashed gba:border-gray-300">
          <div className="gba:text-center">
            <Settings className="gba:w-16 gba:h-16 gba:text-gray-400 gba:mb-4 gba:mx-auto" />
            <h4 className="gba:text-xl gba:font-medium gba:text-gray-500 gba:mb-2">
              No {sourceApp === 'CRM' ? 'Sales' : 'Investment'} Pipelines Found
            </h4>
            <p className="gba:text-gray-400 gba:mb-4">
              Create your first {sourceApp === 'CRM' ? 'sales' : 'investment'} pipeline to get started
            </p>
            <Button onClick={handleAddPipeline} className="gba:flex gba:items-center gba:gap-2">
              <Plus className="gba:w-4 gba:h-4" />
              Create Pipeline
            </Button>
          </div>
        </div>
      ) : (
        <div className="gba:flex gba:flex-wrap gba:gap-6 gba:justify-start">
          {pipelines.map((pipeline) => (
            <Card
              key={pipeline.id}
              className="gba:max-w-96 gba:flex-1 gba:min-w-80 gba:border-gray-200 hover:gba:border-blue-400 hover:gba:shadow-lg gba:transition-all gba:relative gba:border-t-4 gba:border-t-blue-500 gba:shadow-md gba:duration-200 gba:rounded-xl gba:overflow-hidden"
              data-testid={`${prefixDataTestId}-pipeline-card-${pipeline.id}`}
            >
              {/* Pipeline Type Flag */}
              <div className="gba:absolute gba:top-4 gba:right-4 gba:z-10">
                <Badge
                  variant={getPipelineTypeColor(pipeline.type)}
                  className="gba:text-xs gba:font-medium gba:px-2 gba:py-1"
                >
                  {getPipelineTypeLabel(pipeline.type)}
                </Badge>
              </div>

              <div className="gba:p-5">
                <div className="gba:mb-4">
                  <h5 className="gba:text-lg gba:font-semibold gba:mb-2 gba:text-gray-800 gba:pr-16">
                    {pipeline.value}
                  </h5>

                  {pipeline.description && (
                    <p className="gba:text-gray-500 gba:text-sm">
                      {pipeline.description}
                    </p>
                  )}
                </div>

                <div className="gba:flex gba:justify-between gba:items-center">
                  <Button
                    onClick={() => handleViewStages(pipeline)}
                    className="gba:flex gba:items-center gba:gap-2"
                    size="sm"
                  >
                    <Eye className="gba:w-4 gba:h-4" />
                    View Stages
                  </Button>
                  
                  <div className="gba:flex gba:gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPipeline(pipeline)}
                      className="gba:text-gray-400 hover:gba:text-blue-500"
                      data-testid={`${prefixDataTestId}-edit-pipeline-${pipeline.id}`}
                    >
                      <Edit className="gba:w-4 gba:h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePipeline(pipeline)}
                      className="gba:text-gray-400 hover:gba:text-red-500"
                      data-testid={`${prefixDataTestId}-delete-pipeline-${pipeline.id}`}
                    >
                      <Trash2 className="gba:w-4 gba:h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pipeline Modal */}
      <Dialog open={isPipelineModalVisible} onOpenChange={setIsPipelineModalVisible}>
        <DialogContent data-testid={`${prefixDataTestId}-pipeline-modal`}>
          <DialogHeader>
            <DialogTitle>
              {editingPipeline ? 'Edit Pipeline' : 'Add New Pipeline'}
            </DialogTitle>
          </DialogHeader>

          <Form {...pipelineForm}>
            <form onSubmit={pipelineForm.handleSubmit(handlePipelineModalSubmit)} className="gba:space-y-4">
              <FormField
                control={pipelineForm.control}
                name="value"
                rules={{ required: 'Please enter a pipeline name' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Enterprise Sales"
                        data-testid={`${prefixDataTestId}-pipeline-name-input`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={pipelineForm.control}
                name="type"
                rules={{ required: 'Please select a pipeline type' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid={`${prefixDataTestId}-pipeline-type-select`}>
                          <SelectValue placeholder="Select Pipeline Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PIPELINE_TYPE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={pipelineForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Describe the purpose and use case of this pipeline..."
                        rows={3}
                        data-testid={`${prefixDataTestId}-pipeline-description-input`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gba:flex gba:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPipelineModalVisible(false)}
                  data-testid={`${prefixDataTestId}-pipeline-modal-cancel`}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={operationLoading}
                  data-testid={`${prefixDataTestId}-pipeline-modal-submit`}
                >
                  {operationLoading && <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />}
                  {editingPipeline ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid={`${prefixDataTestId}-delete-confirmation-modal`}>
          <DialogHeader>
            <DialogTitle>Delete Pipeline</DialogTitle>
          </DialogHeader>
          
          <div className="gba:py-4">
            <p>
              Are you sure you want to delete pipeline "{pipelineToDelete?.value}"? 
              This will also delete all its stages.
            </p>
          </div>

          <DialogFooter className="gba:flex gba:gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              data-testid={`${prefixDataTestId}-delete-cancel-button`}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={operationLoading}
              data-testid={`${prefixDataTestId}-delete-confirm-button`}
            >
              {operationLoading && <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pipeline Stages Modal */}
      <PipelineStagesModal
        pipeline={selectedPipeline}
        visible={isStagesModalVisible}
        onClose={() => {
          setIsStagesModalVisible(false);
          setSelectedPipeline(null);
          refetch();
        }}
        prefixDataTestId={prefixDataTestId}
        {...props}
      />
    </div>
  );
}; 