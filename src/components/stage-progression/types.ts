import { ReactNode } from 'react';

// General stage interface for the reusable component
export interface Stage {
  id: string;
  value: string; // Display name
  code: string;  // Internal code/identifier
}

// Condition data for tooltips
export interface StageCondition {
  id: string;
  title: string;
  isCompleted: boolean;
  checkedType: 'Automated' | 'User' | 'Manager' | 'Owner';
  completedBy?: string | null;
}

// Tooltip content configuration
export interface StageTooltipConfig {
  showConditions: boolean;
  maxWidth?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  mouseEnterDelay?: number;
  mouseLeaveDelay?: number;
}

// Styling configuration for the progression
export interface StageProgressionStyling {
  height?: string;
  fontSize?: string;
  fontWeight?: string;
  borderRadius?: string;
  colors?: {
    completed?: string;
    current?: {
      border?: string;
      background?: string;
      text?: string;
    };
    pending?: {
      background?: string;
      text?: string;
    };
  };
}

// Removed ActionMenu configuration - this should be handled by specific implementations

// Main props for the general stage progression component
export interface StageProgressionProps {
  // Required props
  stages: Stage[];
  currentStage: string; // Code or value of the current stage
  
  // Optional visual configuration
  styling?: StageProgressionStyling;
  
  // Optional stage completion percentage for progress visualization
  getStageCompletionPercentage?: (stageCode: string) => number;
  
  // Event handlers
  onStageClick?: (stage: Stage) => void;
  
  // Custom content
  renderStageContent?: (stage: Stage, isCurrentStage: boolean, isCompleted: boolean) => ReactNode;
  
  // Children render prop for custom stage wrapping (e.g., ActionMenu)
  children?: (stage: Stage, isCurrentStage: boolean, isCompleted: boolean, stageElement: ReactNode) => ReactNode;
  
  // Data test id prefix
  dataTestIdPrefix?: string;
}
