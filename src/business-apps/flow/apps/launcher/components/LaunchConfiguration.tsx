import React from 'react';
import { Card, CardHeader, CardContent, Button, Spinner, Separator } from '@newwork/nw-design-system';
import { Play, Settings, Users } from 'lucide-react';
import { AssignmentConfiguration } from './AssignmentConfiguration';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { FlowTemplate, ExecutionAssignment } from '../types';

interface LaunchConfigurationProps {
  selectedTemplate: FlowTemplate | null;
  templateMetadata: any;
  executionAssignments: ExecutionAssignment[];
  isLaunching: boolean;
  canLaunch: boolean;
  onAssignmentsChange: (assignments: ExecutionAssignment[]) => void;
  onDirectLaunch: () => void;
  onLaunchWithWizard?: () => void;
  'data-testid'?: string;
}

export const LaunchConfiguration: React.FC<LaunchConfigurationProps> = ({
  selectedTemplate,
  templateMetadata,
  executionAssignments,
  isLaunching,
  canLaunch,
  onAssignmentsChange,
  onDirectLaunch,
  onLaunchWithWizard,
  'data-testid': testId
}) => {
  if (!selectedTemplate) {
    return (
      <Card className="gba:shadow-sm gba:border gba:border-gray-200 gba:bg-white" data-testid={`${testId}-select-template-prompt`}>
        <CardContent className="gba:p-8 gba:text-center">
          <div className="gba:mb-6">
            <div className="gba:w-16 gba:h-16 gba:mx-auto gba:bg-gray-100 gba:rounded-full gba:flex gba:items-center gba:justify-center">
              <Settings className="gba:h-8 gba:w-8 gba:text-gray-400" />
            </div>
          </div>
          <h3 className="gba:text-xl gba:font-semibold gba:text-gray-900 gba:mb-3">
            Select a Template
          </h3>
          <p className="gba:text-gray-600 gba:leading-relaxed">
            Please select a template from the left to configure its launch parameters.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!templateMetadata) {
    return (
      <Card className="gba:shadow-sm gba:border gba:border-gray-200 gba:bg-white" data-testid={`${testId}-loading`}>
        <CardContent className="gba:p-8 gba:text-center">
          <Spinner size="lg" />
          <p className="gba:text-gray-600 gba:mt-4">Loading template configuration...</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Top summary panel with description and compact assignments */}
      <Card className="gba:bg-white gba:border gba:border-gray-100 gba:shadow-sm">
        <CardContent className="gba:p-5">
          <div className="gba:flex gba:flex-col gba:gap-4">
            {selectedTemplate.description && (
              <p className="gba:text-sm gba:text-gray-700 gba:leading-relaxed">
                {selectedTemplate.description}
              </p>
            )}
            <div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                <div className="gba:p-2 gba:bg-blue-50 gba:rounded-md"><Users className="gba:w-4 gba:h-4 gba:text-blue-600" /></div>
                <h3 className="gba:text-sm gba:font-medium gba:text-gray-900">Task Assignments</h3>
              </div>
              <AssignmentConfiguration
                assignments={executionAssignments}
                onChange={onAssignmentsChange}
                compact
                data-testid={`${testId}-assignments`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions area - more prominent buttons, less border noise */}
      <div className="gba:space-y-3">
        {onLaunchWithWizard && (
          <Button
            variant="outline"
            size="lg"
            onClick={onLaunchWithWizard}
            className="gba:w-full gba:justify-center gba:gap-2"
            data-testid={`${testId}-launch-wizard-button`}
          >
            <Settings className="gba:h-5 gba:w-5" />
            {getTranslationFromI18nKeyAndLabel('flow.launcher.launchWithWizard', 'Launch with Simulation Wizard')}
          </Button>
        )}

        <Button
          variant="default"
          size="lg"
          onClick={onDirectLaunch}
          disabled={!canLaunch}
          className="gba:w-full gba:justify-center gba:gap-2"
          data-testid={`${testId}-direct-launch-button`}
        >
          {isLaunching ? (
            <>
              <Spinner size="sm" />
              {getTranslationFromI18nKeyAndLabel('flow.launcher.launching', 'Launching...')}
            </>
          ) : (
            <>
              <Play className="gba:h-5 gba:w-5" />
              {getTranslationFromI18nKeyAndLabel('flow.launcher.quickLaunch', 'Quick Launch')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};