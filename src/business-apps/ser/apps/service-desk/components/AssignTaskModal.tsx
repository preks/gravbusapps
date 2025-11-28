import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Alert,
} from '@newwork/nw-design-system';
import { UserCheckIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { EmployeeSelect, EmployeeOption } from '@/components/employee-select';
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch';

export interface AssignTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (userId: string) => Promise<void>; // Expects userId, not employeeId
  taskId: string;
  taskName: string;
  currentAssigneeId?: string; // userId of current assignee (not employeeId)
  currentAssigneeName?: string;
  accessToken: string;
  modalTitle?: string; // Optional custom modal title
  modalDescription?: string; // Optional custom modal description
  buttonText?: string; // Optional custom button text
}

/**
 * Modal for reassigning a ticket to a specific user
 * Uses employee search to find and select the target assignee
 * 
 * IMPORTANT: This component stores employeeId in selectedUserId state (for UI selection),
 * but extracts and passes the actual userId to onAssign callback
 */
export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  open,
  onOpenChange,
  onAssign,
  taskId: _taskId, // Reserved for future use (e.g., logging, analytics)
  taskName,
  currentAssigneeId,
  currentAssigneeName,
  accessToken,
  modalTitle = 'Reassign Ticket to User',
  modalDescription = 'Select a user to reassign this ticket to. The ticket will be reassigned to the selected user.',
  buttonText = 'Reassign Ticket',
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null); // Actually stores employeeId (id field from EmployeeSelect)
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    employees,
    loading: searchLoading,
    search,
    hasMore,
    loadMore,
    hydrateById,
  } = useEmployeeSearch(accessToken);

  // Hydrate current assignee when modal opens
  useEffect(() => {
    if (open && currentAssigneeId) {
      hydrateById(currentAssigneeId);
    }
  }, [open, currentAssigneeId, hydrateById]);

  // Initial search to show some employees
  useEffect(() => {
    if (open) {
      search('');
    }
  }, [open, search]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedUserId(null);
      setError(null);
      setIsAssigning(false);
    }
  }, [open]);

  const handleAssign = async () => {
    if (!selectedUserId) {
      setError('Please select a user to reassign the ticket to');
      return;
    }

    setIsAssigning(true);
    setError(null);

    try {
      // Find the selected employee to get their userId
      const selectedEmployee = employees.find((emp) => emp.id === selectedUserId);
      
      if (!selectedEmployee?.userId) {
        setError('Selected employee does not have a valid user ID');
        setIsAssigning(false);
        return;
      }

      // Check if trying to assign to the same user (compare userId with userId)
      if (selectedEmployee.userId === currentAssigneeId) {
        setError('Ticket is already assigned to this user');
        setIsAssigning(false);
        return;
      }

      // Pass the userId (not employeeId) to the assign function
      console.log(`[AssignTaskModal] Reassigning ticket to userId: ${selectedEmployee.userId} (employeeId: ${selectedUserId})`);
      await onAssign(selectedEmployee.userId);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to reassign ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to reassign ticket');
    } finally {
      setIsAssigning(false);
    }
  };

  const selectedEmployee = employees.find((emp) => emp.id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <UserCheckIcon className="gba:w-5 gba:h-5" />
            {modalTitle}
          </DialogTitle>
          <DialogDescription>
            {modalDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Ticket Info */}
          <div className="gba:rounded-lg gba:bg-muted/30 gba:p-3 gba:space-y-2">
            <div className="gba:text-sm">
              <span className="gba:font-medium gba:text-muted-foreground">Ticket:</span>{' '}
              <span className="gba:font-semibold">{taskName}</span>
            </div>
            {currentAssigneeName && (
              <div className="gba:text-sm">
                <span className="gba:font-medium gba:text-muted-foreground">Currently assigned to:</span>{' '}
                <span className="gba:font-semibold">{currentAssigneeName}</span>
              </div>
            )}
          </div>

          {/* Employee Selector */}
          <div className="gba:space-y-2">
            <label className="gba:text-sm gba:font-medium">
              Select User <span className="gba:text-destructive">*</span>
            </label>
            <EmployeeSelect
              value={selectedUserId}
              employees={employees as EmployeeOption[]}
              onValueChange={setSelectedUserId}
              onSearch={search}
              loading={searchLoading}
              hasMore={hasMore}
              onLoadMore={loadMore}
              placeholder="Select a user to assign..."
              searchPlaceholder="Search by name..."
              data-testid="assign-task-employee-select"
            />
          </div>

          {/* Selected User Preview */}
          {selectedEmployee && (
            <div className="gba:rounded-lg gba:bg-primary/5 gba:border gba:border-primary/20 gba:p-3">
              <div className="gba:text-sm gba:font-medium gba:mb-1">Assigning to:</div>
              <div className="gba:text-sm gba:font-semibold">{selectedEmployee.displayName}</div>
              {(selectedEmployee.organizationalUnitName || selectedEmployee.jobPositionName) && (
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                  {[selectedEmployee.organizationalUnitName, selectedEmployee.jobPositionName]
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <WarningCircleIcon className="gba:h-4 gba:w-4" />
              <div>
                <h4 className="gba:font-medium">Reassignment Failed</h4>
                <p className="gba:text-sm gba:mt-1">{error}</p>
              </div>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAssigning}
            data-testid="reassign-ticket-cancel-button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedUserId || isAssigning}
            className="gba:gap-2"
            data-testid="reassign-ticket-confirm-button"
          >
            <UserCheckIcon className="gba:w-4 gba:h-4" />
            {isAssigning ? `${buttonText.replace('Ticket', '')}ing...` : buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

