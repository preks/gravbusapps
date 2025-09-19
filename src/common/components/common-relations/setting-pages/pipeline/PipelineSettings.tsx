import React, { useState } from 'react';
import { PageLayout, Spinner, Alert, Button, Card } from '@newwork/nw-design-system';
import { Plus, Edit, Eye, ArrowLeft } from 'lucide-react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { usePipelineSettings } from './hooks/usePipelineSettings';
import { PipelineStagesModal } from './components';
import PipelineForm from './components/PipelineForm';

export interface EnhancedPipeline {
  id: string;
  value: string;
  description?: string;
  type?: string;
  stageCount: number;
  conditionCount: number;
  objectValue?: Record<string, any>;
}

export interface PipelineSettingsProps {
  className?: string;
  prefixDataTestId?: string;
  headerPhosphorIcon?: { 
    icon: any; 
    variant?: 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'employee' | 'strategy' | 'premium'; 
    size?: 'sm' | 'md' | 'lg' | 'xl'; 
    label?: string 
  };
  headerTitle?: string;
  headerDescription?: string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onBack?: () => void;
  catalogConfig: {
    pipelineCatalog: string;
    stageCatalog: string;
    conditionCatalog?: string;
    version?: string;
  };
}

const PipelineSettings: React.FC<PipelineSettingsProps & BusinessAppContextProps> = ({
  className,
  prefixDataTestId = 'pipeline-settings',
  headerPhosphorIcon,
  headerTitle = 'Pipeline Settings',
  headerDescription = 'Manage your pipeline configurations',
  isLoading,
  error,
  onRetry,
  onBack,
  catalogConfig,
  accessToken,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStagesModalOpen, setIsStagesModalOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<EnhancedPipeline | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<EnhancedPipeline | null>(null);

  const { pipelines, refetch } = usePipelineSettings(
    { accessToken },
    catalogConfig
  );

  const handleCreatePipeline = () => {
    setEditingPipeline(null);
    setIsCreateModalOpen(true);
  };

  const handleEditPipeline = (pipeline: EnhancedPipeline) => {
    setEditingPipeline(pipeline);
    setIsEditModalOpen(true);
  };

  const handleViewStages = (pipeline: EnhancedPipeline) => {
    setSelectedPipeline(pipeline);
    setIsStagesModalOpen(true);
  };

  const handlePipelineSuccess = () => {
    refetch();
  };

  const renderPipelineCard = (pipeline: EnhancedPipeline) => (
    <Card
      key={pipeline.id}
      className="gba:relative gba:group gba:border-2 gba:border-gray-200 hover:gba:border-blue-400 gba:transition-all gba:duration-200"
      data-testid={`${prefixDataTestId}-pipeline-card-${pipeline.id}`}
    >
      {/* Action buttons in top right */}
      <div className="gba:absolute gba:top-2 gba:right-2 gba:flex gba:gap-1 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity gba:z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleEditPipeline(pipeline)}
          data-testid={`${prefixDataTestId}-edit-pipeline-${pipeline.id}`}
        >
          <Edit />
        </Button>
      </div>

      <div className="gba:p-4 gba:pr-16">
        <div className="gba:mb-3">
          <h5 className="gba:text-gray-800 gba:font-medium gba:text-lg gba:leading-tight gba:mb-1">
            {pipeline.value}
          </h5>
          {pipeline.description && (
            <p className="gba:text-gray-500 gba:text-sm gba:leading-tight">
              {pipeline.description}
            </p>
          )}
        </div>

        {/* Statistics */}
        <div className="gba:space-y-2 gba:mb-4">
          <div className="gba:flex gba:items-center gba:justify-between gba:bg-gray-50 gba:rounded-lg gba:p-2">
            <div className="gba:flex gba:items-center gba:gap-1">
              <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></div>
              <span className="gba:text-xs gba:text-gray-600">Stages</span>
            </div>
            <span
              className="gba:text-sm gba:font-semibold gba:text-blue-600"
              data-testid={`${prefixDataTestId}-pipeline-stage-count-${pipeline.id}`}
            >
              {pipeline.stageCount}
            </span>
          </div>

          <div className="gba:flex gba:items-center gba:justify-between gba:bg-gray-50 gba:rounded-lg gba:p-2">
            <div className="gba:flex gba:items-center gba:gap-1">
              <div className="gba:w-2 gba:h-2 gba:bg-orange-500 gba:rounded-full"></div>
              <span className="gba:text-xs gba:text-gray-600">Conditions</span>
            </div>
            <span
              className="gba:text-sm gba:font-semibold gba:text-orange-600"
              data-testid={`${prefixDataTestId}-pipeline-condition-count-${pipeline.id}`}
            >
              {pipeline.conditionCount}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="gba:mt-auto">
          <Button
            variant="outline"
            onClick={() => handleViewStages(pipeline)}
            className="gba:w-full"
            data-testid={`${prefixDataTestId}-view-stages-${pipeline.id}`}
          >
            <Eye className="gba:w-4 gba:h-4 gba:mr-2" />
            View Stages
          </Button>
        </div>
      </div>
    </Card>
  );

  if (isLoading) {
    return (
      <PageLayout
        className={className}
        headerPhosphorIcon={headerPhosphorIcon}
        headerTitle={headerTitle}
        headerDescription={headerDescription}
      >
        {onBack && (
          <div className="gba:py-2">
            <Button variant="ghost" onClick={onBack} data-testid={`${prefixDataTestId}-PipelineSettings-Back`}>
              <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
              Back
            </Button>
          </div>
        )}
        <div className="gba:flex gba:justify-center gba:py-8">
          <Spinner size="lg" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout
        className={className}
        headerPhosphorIcon={headerPhosphorIcon}
        headerTitle={headerTitle}
        headerDescription={headerDescription}
      >
        {onBack && (
          <div className="gba:py-2">
            <Button variant="ghost" onClick={onBack} data-testid={`${prefixDataTestId}-PipelineSettings-Back`}>
              <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
              Back
            </Button>
          </div>
        )}
        <Alert
          variant="destructive"
          className="gba:mb-4"
        >
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <h4 className="gba:font-medium">Error Loading Pipelines</h4>
              <p className="gba:text-sm gba:mt-1">{error}</p>
            </div>
            <Button size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        </Alert>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      className={className}
      headerPhosphorIcon={headerPhosphorIcon}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
    >
      {onBack && (
        <div className="gba:py-2">
          <Button variant="ghost" onClick={onBack} data-testid={`${prefixDataTestId}-PipelineSettings-Back`}>
            <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
            Back
          </Button>
        </div>
      )}
      <div className="gba:space-y-6">
        {/* Header */}
        <div className="gba:flex gba:justify-between gba:items-center">
          <div>
            <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">
              {headerTitle}
            </h2>
            <p className="gba:text-gray-600 gba:mt-1">
              {headerDescription}
            </p>
          </div>
          <Button
            onClick={handleCreatePipeline}
            data-testid={`${prefixDataTestId}-add-pipeline-button`}
          >
            <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
            Add Pipeline
          </Button>
        </div>

        {/* Pipelines Grid */}
        {pipelines.length === 0 ? (
          <div className="gba:min-h-64 gba:flex gba:items-center gba:justify-center gba:bg-gray-50 gba:rounded-lg gba:p-8">
            <div className="gba:text-center">
              <p className="gba:text-gray-500 gba:text-lg gba:mb-4">
                No pipelines configured yet
              </p>
              <p className="gba:text-gray-400 gba:text-sm gba:mb-6">
                Create your first pipeline to get started
              </p>
              <Button
                onClick={handleCreatePipeline}
                data-testid={`${prefixDataTestId}-create-first-pipeline-button`}
              >
                <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                Create First Pipeline
              </Button>
            </div>
          </div>
        ) : (
          <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-6">
            {pipelines.map(renderPipelineCard)}
          </div>
        )}
      </div>

      {/* Pipeline Form Modals */}
      <PipelineForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handlePipelineSuccess}
        catalogConfig={catalogConfig}
        prefixDataTestId={prefixDataTestId}
        accessToken={accessToken}
      />

      <PipelineForm
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handlePipelineSuccess}
        editingPipeline={editingPipeline}
        catalogConfig={catalogConfig}
        prefixDataTestId={prefixDataTestId}
        accessToken={accessToken}
      />

      {/* Pipeline Stages Modal */}
      {selectedPipeline && (
        <PipelineStagesModal
          isOpen={isStagesModalOpen}
          onClose={() => setIsStagesModalOpen(false)}
          pipeline={selectedPipeline}
          catalogConfig={catalogConfig}
          prefixDataTestId={prefixDataTestId}
          accessToken={accessToken}
        />
      )}
    </PageLayout>
  );
};

export default PipelineSettings;
export { PipelineSettings };