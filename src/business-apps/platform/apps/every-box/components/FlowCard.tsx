/**
 * FlowCard Component
 * Individual flow card with status and progress indicators
 */

import React, { memo } from 'react';
import {
  Card,
  CardContent,
  Badge,
  Button,
  Progress
} from '@newwork/nw-design-system';
import { Eye, Calendar } from 'lucide-react';
import { Flow } from '../types';
import {
  formatRelativeTime,
  formatDateTime,
  getFlowStatusBadgeVariant,
  formatFlowStatus
} from '../utils/taskFormatters';

interface FlowCardProps {
  flow: Flow;
  onView: (flow: Flow) => void;
}

export const FlowCard: React.FC<FlowCardProps> = memo(({ flow, onView }) => {
  const progressPercentage =
    flow.totalSteps > 0 ? Math.round((flow.currentStep / flow.totalSteps) * 100) : 0;

  return (
    <Card
      className="gba:cursor-pointer gba:hover:shadow-md gba:transition-shadow"
      onClick={() => onView(flow)}
      data-testid={`flow-card-${flow.id}`}
    >
      <CardContent className="gba:p-4">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <Badge variant={getFlowStatusBadgeVariant(flow.status)} data-testid="flow-status-badge">
                {formatFlowStatus(flow.status)}
              </Badge>
            </div>

            <h3
              className="gba:font-semibold gba:text-base gba:mb-1 gba:truncate"
              data-testid="flow-title"
            >
              {flow.templateName}
            </h3>

            {flow.totalSteps > 0 && (
              <div className="gba:mb-2">
                <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground gba:mb-1">
                  <span>Progress</span>
                  <span data-testid="flow-progress-text">
                    {flow.currentStep} of {flow.totalSteps} steps
                  </span>
                </div>
                <Progress value={progressPercentage} className="gba:h-2" data-testid="flow-progress-bar" />
              </div>
            )}

            <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-muted-foreground">
              <div className="gba:flex gba:items-center gba:gap-1">
                <Calendar className="gba:h-3 gba:w-3" />
                <span data-testid="flow-started-at">
                  Started {formatRelativeTime(flow.startedAt)}
                </span>
              </div>
              {flow.completedAt && (
                <span data-testid="flow-completed-at">
                  Completed {formatDateTime(flow.completedAt)}
                </span>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onView(flow);
            }}
            data-testid={`flow-view-button-${flow.id}`}
          >
            <Eye className="gba:h-4 gba:w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

