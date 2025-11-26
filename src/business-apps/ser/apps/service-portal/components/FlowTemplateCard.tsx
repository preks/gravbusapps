import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Badge
} from '@newwork/nw-design-system';
import { FlowTemplate } from '../../../types/flowTemplate';
import { 
  ClockCounterClockwise, 
  Users,
  Lightning,
  Star,
  ArrowRight,
  Tree,
  CheckCircle
} from '@phosphor-icons/react';

export interface FlowTemplateCardProps {
  template: FlowTemplate;
  onRequest: () => void;
}

export const FlowTemplateCard: React.FC<FlowTemplateCardProps> = ({
  template,
  onRequest
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Get difficulty configuration
  const getDifficultyConfig = () => {
    const difficulty = template.metadata?.difficulty || 'standard';
    switch (difficulty) {
      case 'simple':
        return { 
          label: 'Simple', 
          color: 'gba:text-green-600 gba:bg-green-50 gba:border-green-200', 
          icon: Lightning 
        };
      case 'complex':
        return { 
          label: 'Complex', 
          color: 'gba:text-orange-600 gba:bg-orange-50 gba:border-orange-200', 
          icon: Star 
        };
      default:
        return { 
          label: 'Standard', 
          color: 'gba:text-blue-600 gba:bg-blue-50 gba:border-blue-200', 
          icon: ClockCounterClockwise 
        };
    }
  };

  const difficultyConfig = getDifficultyConfig();
  const DifficultyIcon = difficultyConfig.icon;

  // Format estimated time
  const estimatedTime = template.estimatedDuration || 
    template.metadata?.estimatedTime || 
    `${template.stepCount || 1}-${(template.stepCount || 1) * 2} days`;

  return (
    <Card 
      className={`gba:h-full gba:flex gba:flex-col gba:transition-all gba:duration-300 gba:cursor-pointer ${
        isHovered 
          ? 'gba:shadow-xl gba:border-primary gba:scale-[1.02] gba:bg-gradient-to-br gba:from-indigo-50 gba:to-background' 
          : 'gba:shadow-md hover:gba:shadow-lg'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onRequest}
    >
      <div className="gba:p-6 gba:flex-1 gba:flex gba:flex-col">
        {/* Header with badges */}
        <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <Tree className="gba:w-5 gba:h-5 gba:text-indigo-600" />
            <Badge 
              variant="outline" 
              className="gba:text-xs gba:font-medium gba:text-indigo-700 gba:border-indigo-300 gba:bg-indigo-50"
            >
              Live Template
            </Badge>
          </div>
          
          <div className={`gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded-full gba:border gba:text-xs gba:font-medium ${difficultyConfig.color}`}>
            <DifficultyIcon className="gba:w-3 gba:h-3" />
            {difficultyConfig.label}
          </div>
        </div>

        {/* Title and Description */}
        <div className="gba:mb-4 gba:flex-1">
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-2 gba:leading-tight gba:flex gba:items-center gba:gap-2">
            {/* Add visual indicator for template type */}
            {template.name.includes('Service Request') && (
              <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded gba:text-xs gba:font-medium gba:bg-blue-100 gba:text-blue-800 gba:border gba:border-blue-200">
                📋 Service Request
              </span>
            )}
            {template.name.includes('Onboarding') && (
              <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded gba:text-xs gba:font-medium gba:bg-green-100 gba:text-green-800 gba:border gba:border-green-200">
                👤 New Employee
              </span>
            )}
            <span className="gba:flex-1">{template.name}</span>
          </h3>
          <p className="gba:text-sm gba:text-gray-600 gba:leading-relaxed">
            {template.description || 'No description available'}
          </p>
        </div>

        {/* Metadata */}
        <div className="gba:space-y-3 gba:mb-4">
          {/* Steps and Time */}
          <div className="gba:flex gba:items-center gba:justify-between gba:text-sm">
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-600">
              <CheckCircle className="gba:w-4 gba:h-4" />
              <span>{template.stepCount || template.steps.length} steps</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-600">
              <ClockCounterClockwise className="gba:w-4 gba:h-4" />
              <span>{estimatedTime}</span>
            </div>
          </div>

          {/* Form Fields Count */}
          {template.formSchema && template.formSchema.length > 0 && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-gray-600">
              <Users className="gba:w-4 gba:h-4" />
              <span>
                {template.formSchema.length} form field{template.formSchema.length !== 1 ? 's' : ''}
                {template.formSchema.filter(f => f.required).length > 0 && (
                  <span className="gba:text-red-600 gba:ml-1">
                    ({template.formSchema.filter(f => f.required).length} required)
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Version */}
          <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-gray-500">
            <span>Version {template.version}</span>
            {template.id && (
              <span className="gba:font-mono">ID: {template.id}</span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Button 
          className={`gba:w-full gba:transition-all gba:duration-200 ${
            isHovered 
              ? 'gba:bg-primary gba:text-primary-foreground gba:shadow-lg' 
              : ''
          }`}
          variant={isHovered ? "default" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            onRequest();
          }}
        >
          <span>Start Request</span>
          <ArrowRight className={`gba:w-4 gba:h-4 gba:ml-2 gba:transition-transform gba:duration-200 ${
            isHovered ? 'gba:translate-x-1' : ''
          }`} />
        </Button>
      </div>

      {/* Hover Effect Overlay */}
      <div className={`gba:absolute gba:inset-0 gba:bg-gradient-to-br gba:from-indigo-500/5 gba:to-purple-500/5 gba:rounded-lg gba:pointer-events-none gba:transition-opacity gba:duration-300 ${
        isHovered ? 'gba:opacity-100' : 'gba:opacity-0'
      }`} />
    </Card>
  );
};
