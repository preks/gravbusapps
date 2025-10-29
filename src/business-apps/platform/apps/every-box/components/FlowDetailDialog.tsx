/**
 * FlowDetailDialog Component
 * Displays detailed flow information with step-by-step progress
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Badge,
  Button,
  Separator,
  Progress
} from '@newwork/nw-design-system';
import { Calendar, CheckCircle, Circle } from 'lucide-react';
import { Flow } from '../types';
import {
  formatDateTime,
  formatRelativeTime,
  getFlowStatusBadgeVariant,
  formatFlowStatus
} from '../utils/taskFormatters';

interface FlowDetailDialogProps {
  flow: Flow | null;
  open: boolean;
  onClose: () => void;
}

export const FlowDetailDialog: React.FC<FlowDetailDialogProps> = ({ flow, open, onClose }) => {
  if (!flow) return null;

  const progressPercentage =
    flow.totalSteps > 0 ? Math.round((flow.currentStep / flow.totalSteps) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-2xl gba:max-h-[80vh] gba:overflow-y-auto" data-testid="flow-detail-dialog">
        <DialogHeader>
          <DialogTitle data-testid="flow-detail-title">{flow.templateName}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          {/* Status Badge */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <Badge variant={getFlowStatusBadgeVariant(flow.status)}>
              {formatFlowStatus(flow.status)}
            </Badge>
            <span className="gba:text-sm gba:text-muted-foreground">ID: {flow.id}</span>
          </div>

          {/* Progress */}
          {flow.totalSteps > 0 && (
            <div>
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                <span className="gba:text-sm gba:font-medium">Overall Progress</span>
                <span className="gba:text-sm gba:text-muted-foreground">
                  {flow.currentStep} of {flow.totalSteps} steps
                </span>
              </div>
              <Progress value={progressPercentage} className="gba:h-2" />
            </div>
          )}

          <Separator />

          {/* Flow Information */}
          <div className="gba:space-y-3 gba:text-sm">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Calendar className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <div>
                <div className="gba:text-xs gba:text-muted-foreground">Started</div>
                <div className="gba:font-medium">
                  {formatDateTime(flow.startedAt)} ({formatRelativeTime(flow.startedAt)})
                </div>
              </div>
            </div>

            {flow.completedAt && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <CheckCircle className="gba:h-4 gba:w-4 gba:text-success" />
                <div>
                  <div className="gba:text-xs gba:text-muted-foreground">Completed</div>
                  <div className="gba:font-medium">
                    {formatDateTime(flow.completedAt)} ({formatRelativeTime(flow.completedAt)})
                  </div>
                </div>
              </div>
            )}

            {flow.initiatedBy && (
              <div>
                <div className="gba:text-xs gba:text-muted-foreground">Initiated By</div>
                <div className="gba:font-medium">{flow.initiatedBy}</div>
              </div>
            )}

            <div>
              <div className="gba:text-xs gba:text-muted-foreground">Template</div>
              <div className="gba:font-medium">{flow.templateId}</div>
            </div>
          </div>

          {/* Steps Timeline */}
          {flow.steps && flow.steps.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="gba:font-semibold gba:mb-3">Flow Steps</h4>
                <div className="gba:space-y-3">
                  {flow.steps.map((step, index) => (
                    <div
                      key={index}
                      className="gba:flex gba:items-start gba:gap-3"
                      data-testid={`flow-step-${index}`}
                    >
                      <div className="gba:mt-1">
                        {step.status === 'COMPLETED' ? (
                          <CheckCircle className="gba:h-5 gba:w-5 gba:text-success" />
                        ) : step.status === 'IN_PROGRESS' ? (
                          <Circle className="gba:h-5 gba:w-5 gba:text-info gba:fill-current" />
                        ) : step.status === 'FAILED' ? (
                          <Circle className="gba:h-5 gba:w-5 gba:text-destructive gba:fill-current" />
                        ) : (
                          <Circle className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
                        )}
                      </div>
                      <div className="gba:flex-1">
                        <div className="gba:font-medium gba:text-sm">
                          Step {step.stepIndex + 1}: {step.title}
                        </div>
                        <div className="gba:text-xs gba:text-muted-foreground">
                          {step.type}
                          {step.assignedTo && ` • Assigned to: ${step.assignedTo}`}
                          {step.completedBy && ` • Completed by: ${step.completedBy}`}
                        </div>
                        {step.completedAt && (
                          <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                            Completed {formatRelativeTime(step.completedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="gba:flex gba:gap-2 gba:justify-end">
            <Button variant="outline" onClick={onClose} data-testid="flow-detail-close-button">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

