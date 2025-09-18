import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,

  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Separator
} from '@newwork/nw-design-system';
import {
  Play,
  SkipForward,
  SkipBack,
  Eye,
  User,
  PlayCircle,
  CheckCircle,
  Settings,
  Workflow
} from 'lucide-react';
import { FlowVisualization } from './FlowVisualization';
import { AssignmentTargetCounter } from './AssignmentTargetCounter';
import { StepSimulationForm } from './StepSimulationForm';
import { SimulationPreview } from './SimulationPreview';
import { FlowTemplate, ExecutionAssignment } from '../types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface SimulationData {
  stepIndex: number;
  formData: { [key: string]: any };
  completedBy: string;
  completedAt: string;
  result: 'APPROVED' | 'REJECTED' | 'COMPLETED';
}

interface SimulationWizardProps {
  template: FlowTemplate;
  accessToken: string;
  userInfo?: any;
  onExecute: (executionConfig: any) => Promise<void>;
  onCancel: () => void;
  'data-testid'?: string;
}

export const SimulationWizard: React.FC<SimulationWizardProps> = ({
  template,
  accessToken,
  userInfo,
  onExecute,
  onCancel,
  'data-testid': testId = 'simulation-wizard'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const simulationMode = true; // Always in simulation mode
  const [simulationData, setSimulationData] = useState<{ [stepIndex: number]: SimulationData }>({});
  const [executionAssignments, setExecutionAssignments] = useState<ExecutionAssignment[]>([]);
  const [assignmentCounts, setAssignmentCounts] = useState<{ [stepIndex: number]: number }>({});
  const [userPerspective, setUserPerspective] = useState<string>('current-user');
  const [showPreview, setShowPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Available users for perspective simulation (mock data)
  const availableUsers = [
    { id: 'current-user', name: userInfo?.userName || 'Current User', role: 'Initiator' },
    { id: 'user1', name: 'John Smith', role: 'Senior Developer' },
    { id: 'user2', name: 'Sarah Johnson', role: 'Engineering Manager' },
    { id: 'user3', name: 'Mike Chen', role: 'QA Lead' },
    { id: 'user4', name: 'Emma Wilson', role: 'Product Manager' }
  ];

  // Initialize execution assignments for steps that need them
  useEffect(() => {
    const assignments: ExecutionAssignment[] = template.steps
      .map((step, index) => {
        const assignment = step.assignment;
        const needsAssignment = assignment && (
          assignment.targets === null || 
          assignment.targets === undefined ||
          Object.keys(assignment.targets || {}).length === 0
        );
        
        if (needsAssignment) {
          return {
            stepIndex: index,
            stepTitle: step.title || `Step ${index + 1}`,
            assignmentMode: assignment.assignmentMode || 'CLAIM',
            assignedUsers: []
          };
        }
        return null;
      })
      .filter(Boolean) as ExecutionAssignment[];
    
    setExecutionAssignments(assignments);
  }, [template]);

  const handleStepComplete = useCallback((stepIndex: number, data: SimulationData) => {
    setSimulationData(prev => ({
      ...prev,
      [stepIndex]: data
    }));
  }, []);

  const handleNext = () => {
    if (currentStep < template.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleExecute = async () => {
    try {
      setIsExecuting(true);
      
      // Build execution configuration
      const runtimeAssignments: any = {};
      executionAssignments.forEach(assignment => {
        const stepId = `step_${assignment.stepIndex}`;
        runtimeAssignments[stepId] = {
          assignmentMode: assignment.assignmentMode,
          targets: {
            users: assignment.assignedUsers
          },
          allowReassignment: true
        };
      });

      // Include simulation data as initial input values
      const inputValues: any = {};
      Object.entries(simulationData).forEach(([stepIndex, data]) => {
        inputValues[`step_${stepIndex}`] = data.formData;
      });

      const executionConfig = {
        runtimeParameters: {},
        initiator: userInfo?.id || userInfo?.employeeDetails?.employeeId || 'unknown',
        context: {
          flowInstanceId: `flow_instance_${Date.now()}`,
          launchedBy: userInfo?.userName || userInfo?.id || 'unknown',
          launchedAt: new Date().toISOString(),
          templateTitle: template.name,
          simulationMode: true,
          simulationData: Object.values(simulationData)
        },
        inputValues,
        runtimeAssignments
      };

      await onExecute(executionConfig);
    } catch (error) {
      console.error('Execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const currentStepData = template.steps[currentStep];
  const canExecute = executionAssignments.every(assignment => assignment.assignedUsers.length > 0);
  const hasSimulationData = Object.keys(simulationData).length > 0;

  return (
    <div 
      className="gba:min-h-full gba:w-full gba:flex gba:flex-col"
      style={{
        gap: 'var(--spacing-lg)',
        padding: 'var(--spacing-lg)',
        backgroundColor: 'var(--color-surface-secondary)'
      }}
      data-testid={testId}
    >
      {/* Main Content */}
      <div 
        className="gba:flex-1 gba:flex gba:flex-col gba:overflow-auto"
        style={{ gap: 'var(--spacing-lg)' }}
      >
        {/* Header */}
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div 
            className="gba:flex gba:items-center"
            style={{ 
              gap: 'var(--spacing-xl)', 
              marginBottom: 'var(--spacing-lg)' 
            }}
          >
            <div 
              className="gba:bg-gradient-to-r gba:from-green-600 gba:to-blue-600 gba:rounded-xl"
              style={{
                padding: 'var(--spacing-lg)',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <PlayCircle 
                className="gba:text-white" 
                style={{ 
                  height: '2rem', 
                  width: '2rem' 
                }} 
              />
            </div>
            <div>
              <h1 
                style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  lineHeight: '2.25rem',
                  marginBottom: 'var(--spacing-xs)',
                  color: 'var(--color-text-primary)'
                }}
              >
                {template.name}
              </h1>
              <p 
                style={{
                  fontSize: '1.125rem',
                  lineHeight: '1.75rem',
                  color: 'var(--color-text-secondary)'
                }}
              >
                {template.description}
              </p>
            </div>
          </div>

          {/* Controls Card */}
          <Card 
            style={{
              boxShadow: 'var(--shadow-sm)',
              border: `1px solid var(--color-border-default)`,
              backgroundColor: 'var(--color-surface-primary)'
            }}
          >
            <div style={{ padding: 'var(--spacing-xl)' }}>
              <div 
                className="gba:flex gba:items-center gba:justify-between"
                style={{ marginBottom: 'var(--spacing-xl)' }}
              >
                <div 
                  className="gba:flex gba:items-center"
                  style={{ gap: 'var(--spacing-2xl)' }}
                >
                  {/* User Perspective Selector - Always shown since we're always in simulation mode */}
                  <div 
                    className="gba:flex gba:items-center"
                    style={{ gap: 'var(--spacing-sm)' }}
                  >
                    <User 
                      style={{ 
                        width: '1rem', 
                        height: '1rem',
                        color: 'var(--color-success-500)' 
                      }} 
                    />
                    <Select value={userPerspective} onValueChange={setUserPerspective}>
                      <SelectTrigger style={{ width: '12rem' }}>
                        <SelectValue placeholder="Select user perspective" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Progress Indicator */}
                <div 
                  className="gba:flex gba:items-center"
                  style={{ gap: 'var(--spacing-sm)' }}
                >
                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: 'var(--color-success-50)',
                      color: 'var(--color-success-700)',
                      borderColor: 'var(--color-success-300)'
                    }}
                  >
                    Simulation Mode
                  </Badge>
                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: 'var(--color-primary-50)',
                      color: 'var(--color-primary-700)',
                      borderColor: 'var(--color-primary-300)'
                    }}
                  >
                    Step {currentStep + 1} of {template.steps.length}
                  </Badge>
                  
                  {hasSimulationData && (
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: 'var(--color-info-50)',
                        color: 'var(--color-info-700)',
                        borderColor: 'var(--color-info-300)'
                      }}
                    >
                      {Object.keys(simulationData).length} steps simulated
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Step Configuration Content */}
        <div 
          className="gba:flex-1 gba:grid gba:grid-cols-1 gba:lg:grid-cols-2"
          style={{ gap: 'var(--spacing-lg)' }}
        >
          {/* Left Column - Step Configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {/* Current Step */}
            {currentStepData && (
              <Card 
                className="gba:transition-all gba:duration-200"
                style={{
                  boxShadow: 'var(--shadow-sm)',
                  border: `1px solid var(--color-border-default)`,
                  backgroundColor: 'var(--color-surface-primary)',
                  '--hover-shadow': 'var(--shadow-md)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
              >
                <div style={{ padding: 'var(--spacing-lg)' }}>
                  <h3 
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      lineHeight: '1.75rem',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-lg)'
                    }}
                  >
                    {currentStepData.title}
                  </h3>

                  <StepSimulationForm
                    step={currentStepData}
                    stepIndex={currentStep}
                    simulationMode={simulationMode}
                    userPerspective={userPerspective}
                    onStepComplete={handleStepComplete}
                    data-testid={`${testId}-step-form`}
                  />
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Assignment Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <Card 
              className="gba:transition-all gba:duration-200"
              style={{
                boxShadow: 'var(--shadow-sm)',
                border: `1px solid var(--color-border-default)`,
                backgroundColor: 'var(--color-surface-primary)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
            >
              <div style={{ padding: 'var(--spacing-lg)' }}>
                <AssignmentTargetCounter
                  template={template}
                  assignments={executionAssignments}
                  accessToken={accessToken}
                  onTargetCountsChange={setAssignmentCounts}
                  data-testid={`${testId}-assignment-counter`}
                />
              </div>
            </Card>

            {/* Flow Preview */}
            <Card 
              className="gba:transition-all gba:duration-200"
              style={{
                boxShadow: 'var(--shadow-sm)',
                border: `1px solid var(--color-border-default)`,
                backgroundColor: 'var(--color-surface-primary)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
            >
              <div style={{ padding: 'var(--spacing-lg)' }}>
                <h3 
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    lineHeight: '1.75rem',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--spacing-lg)'
                  }}
                >
                  Flow Preview
                </h3>
                <div style={{ height: '16rem' }}>
                  <FlowVisualization
                    template={template}
                    currentStep={currentStep}
                    simulationData={simulationData}
                    assignmentCounts={assignmentCounts}
                    data-testid={`${testId}-visualization`}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Navigation Footer */}
        <Card 
          style={{
            boxShadow: 'var(--shadow-sm)',
            border: `1px solid var(--color-border-default)`,
            backgroundColor: 'var(--color-surface-primary)'
          }}
        >
          <div style={{ padding: 'var(--spacing-xl)' }}>
            <div className="gba:flex gba:justify-between gba:items-center">
              <Button
                variant="outline"
                onClick={onCancel}
                data-testid={`${testId}-cancel-button`}
              >
                {getTranslationFromI18nKeyAndLabel('flow.execution.cancel', 'Cancel')}
              </Button>
              
              <div 
                className="gba:flex"
                style={{ gap: 'var(--spacing-md)' }}
              >
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="gba:gap-2"
                  data-testid={`${testId}-previous-button`}
                >
                  <SkipBack className="gba:w-4 gba:h-4" />
                  {getTranslationFromI18nKeyAndLabel('flow.execution.previous', 'Previous')}
                </Button>
                
                {currentStep < template.steps.length - 1 ? (
                  <Button
                    variant="default"
                    onClick={handleNext}
                    className="gba:gap-2"
                    data-testid={`${testId}-next-button`}
                  >
                    {getTranslationFromI18nKeyAndLabel('flow.execution.next', 'Next')}
                    <SkipForward className="gba:w-4 gba:h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={handleExecute}
                    disabled={!canExecute}
                    className="gba:gap-2"
                    style={{
                      backgroundColor: isExecuting 
                        ? 'var(--color-primary-400)' 
                        : canExecute 
                          ? 'var(--color-primary-500)' 
                          : 'var(--color-surface-disabled)',
                      color: canExecute 
                        ? 'var(--color-on-primary)' 
                        : 'var(--color-text-disabled)'
                    }}
                    data-testid={`${testId}-execute-button`}
                  >
                    <PlayCircle className="gba:w-4 gba:h-4" />
                    {isExecuting 
                      ? getTranslationFromI18nKeyAndLabel('flow.execution.launching', 'Launching...') 
                      : getTranslationFromI18nKeyAndLabel('flow.execution.execute', 'Execute Flow')
                    }
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Preview Modal */}
      {showPreview && currentStepData && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-auto">
            <DialogHeader>
              <DialogTitle className="gba:flex gba:items-center gba:gap-2">
                <Eye className="gba:w-5 gba:h-5" />
                {getTranslationFromI18nKeyAndLabel('flow.execution.stepPreview', 'Step Preview')}
              </DialogTitle>
            </DialogHeader>
            
            <SimulationPreview
              step={currentStepData}
              stepIndex={currentStep}
              simulationData={simulationData[currentStep]}
              userPerspective={userPerspective}
              availableUsers={availableUsers}
              onClose={() => setShowPreview(false)}
              data-testid={`${testId}-preview`}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};