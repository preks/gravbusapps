import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Input, 
  Label, 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Alert,
  AlertDescription,
  Spinner
} from '@newwork/nw-design-system';
import { PiPlus, PiTrash, PiWarning, PiDotsSixVertical } from 'react-icons/pi';
import { getMileageRulePeriodOptions } from '../../types/ExpenseEnums';
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

interface MileageRuleFormData {
  id?: string;
  version?: number;
  ruleName: string;
  description: string;
  rulePeriod: string;
  activeFrom: string;
  activeTo: string;
  details: MileageRuleDetailFormData[];
}

interface MileageRuleDetailFormData {
  id?: string;
  version?: number;
  limitFrom?: number;
  limitTo?: number;
  rateAmount: number;
  detailOrder: number;
  activeFrom: string;
  activeTo: string;
  tempId?: string; // For stable keys during drag operations
}

interface MileageRuleFormProps {
  initialData?: MileageRuleFormData;
  onSubmit: (data: MileageRuleFormData) => Promise<void>;
  onCancel: () => void;
  accessToken: string;
}

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
}

const SortableRow: React.FC<SortableRowProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    transition: {
      duration: 150, // Shorter transition
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition, // No transition while dragging
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell className="gba:w-10 gba:text-center gba:cursor-grab" {...listeners}>
        <PiDotsSixVertical className="gba:text-gray-400 gba:text-lg" />
      </TableCell>
      {children}
    </TableRow>
  );
};

const MileageRuleForm: React.FC<MileageRuleFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  accessToken
}) => {
  
  // Form state
  const [formData, setFormData] = useState<MileageRuleFormData>({
    ruleName: initialData?.ruleName || '',
    description: initialData?.description || '',
    rulePeriod: initialData?.rulePeriod || '',
    activeFrom: initialData?.activeFrom || '',
    activeTo: initialData?.activeTo || '',
    details: initialData?.details || []
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ensure all details have stable tempIds
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.map(detail => ({
        ...detail,
        tempId: detail.tempId || `temp-${Date.now()}-${Math.random()}`
      }))
    }));
  }, []);

  // Add new detail
  const addDetail = () => {
    const newDetail: MileageRuleDetailFormData = {
      limitFrom: undefined,
      limitTo: undefined,
      rateAmount: 0,
      detailOrder: formData.details.length + 1,
      activeFrom: '',
      activeTo: '',
      tempId: `temp-${Date.now()}-${Math.random()}` // Stable unique ID
    };
    
    setFormData(prev => ({
      ...prev,
      details: [...prev.details, newDetail]
    }));
  };

  // Remove detail
  const removeDetail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.filter((_, i) => i !== index).map((detail, i) => ({
        ...detail,
        detailOrder: i + 1
      }))
    }));
  };

  // Update detail
  const updateDetail = (index: number, field: keyof MileageRuleDetailFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      details: prev.details.map((detail, i) => 
        i === index ? { ...detail, [field]: value } : detail
      )
    }));
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (!over || active.id === over.id) return;

    const activeIndex = formData.details.findIndex(detail => detail.tempId === active.id);
    const overIndex = formData.details.findIndex(detail => detail.tempId === over.id);

    if (activeIndex === -1 || overIndex === -1) return;

    // Use a more immediate update to prevent animation issues
    const newDetails = arrayMove(formData.details, activeIndex, overIndex);
    
    // Update detail order
    newDetails.forEach((detail, index) => {
      detail.detailOrder = index + 1;
    });

    setFormData(prev => ({ ...prev, details: newDetails }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: string[] = [];

    // Basic validation
    if (!formData.ruleName.trim()) {
      errors.push('Rule name is required');
    }
    if (!formData.rulePeriod) {
      errors.push('Rule period is required');
    }
    if (!formData.activeFrom) {
      errors.push('Active from date is required');
    }
    if (formData.details.length === 0) {
      errors.push('At least one mileage detail is required');
    }

    // Detail validation
    formData.details.forEach((detail, index) => {
      if (detail.rateAmount <= 0) {
        errors.push(`Row ${index + 1}: Rate amount must be greater than 0`);
      }
      if (detail.limitFrom !== undefined && detail.limitTo !== undefined && detail.limitFrom >= detail.limitTo) {
        errors.push(`Row ${index + 1}: Limit from must be less than limit to`);
      }
      if (!detail.activeFrom) {
        errors.push(`Row ${index + 1}: Active from date is required`);
      }
      if (detail.activeFrom && detail.activeTo && detail.activeFrom >= detail.activeTo) {
        errors.push(`Row ${index + 1}: Active from must be before active to`);
      }
    });

    // Check for overlapping ranges
    const sortedDetails = [...formData.details].sort((a, b) => (a.limitFrom || 0) - (b.limitFrom || 0));
    for (let i = 0; i < sortedDetails.length - 1; i++) {
      const current = sortedDetails[i];
      const next = sortedDetails[i + 1];
      
      const currentTo = current.limitTo || Infinity;
      const nextFrom = next.limitFrom || 0;
      
      if (currentTo > nextFrom) {
        errors.push(`Overlapping ranges detected between rows`);
        break;
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Sort details by limit ranges before saving
      const sortedDetails = [...formData.details].sort((a, b) => {
        const aFrom = a.limitFrom || 0;
        const bFrom = b.limitFrom || 0;
        if (aFrom !== bFrom) {
          return aFrom - bFrom;
        }
        const aTo = a.limitTo || Infinity;
        const bTo = b.limitTo || Infinity;
        return aTo - bTo;
      });

      // Update detail order based on sorted position
      sortedDetails.forEach((detail, idx) => {
        detail.detailOrder = idx + 1;
      });

      const dataToSubmit = {
        ...formData,
        details: sortedDetails
      };

      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="gba:space-y-6" data-testid="mileage-rule-form">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4" style={{ overflow: 'visible' }}>
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <Label htmlFor="ruleName">Rule Name *</Label>
              <Input
                id="ruleName"
                value={formData.ruleName}
                onChange={(e) => setFormData(prev => ({ ...prev, ruleName: e.target.value }))}
                placeholder="Enter rule name"
                data-testid="mileage-rule-form-name"
              />
            </div>
            <div>
              <Label htmlFor="rulePeriod">Rule Period *</Label>
              <Select
                value={formData.rulePeriod || undefined}
                onValueChange={(value) => setFormData(prev => ({ ...prev, rulePeriod: value }))}
                data-testid="mileage-rule-form-rule-period"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rule period" />
                </SelectTrigger>
                <SelectContent>
                  {getMileageRulePeriodOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter description"
              data-testid="mileage-rule-form-description"
            />
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <Label htmlFor="activeFrom">Active From *</Label>
              <Input
                id="activeFrom"
                type="date"
                value={formData.activeFrom}
                onChange={(e) => setFormData(prev => ({ ...prev, activeFrom: e.target.value }))}
                data-testid="mileage-rule-form-active-from"
              />
            </div>
            <div>
              <Label htmlFor="activeTo">Active To</Label>
              <Input
                id="activeTo"
                type="date"
                value={formData.activeTo}
                onChange={(e) => setFormData(prev => ({ ...prev, activeTo: e.target.value }))}
                data-testid="mileage-rule-form-active-to"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mileage Details */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:justify-between gba:items-center">
            <span>Mileage Details</span>
            <Button
              onClick={addDetail}
              data-testid="mileage-rule-form-add-detail"
              className="gba:flex gba:items-center gba:gap-2"
            >
              <PiPlus className="gba:w-4 gba:h-4" />
              Add Detail
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formData.details.length === 0 ? (
            <Alert>
              <AlertDescription>
                No mileage details added yet. Click "Add Detail" to create your first rate.
              </AlertDescription>
            </Alert>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={formData.details.map(detail => detail.tempId!)}
                strategy={verticalListSortingStrategy}
              >
                                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="gba:w-10">Drag</TableHead>
                        <TableHead>Limit From</TableHead>
                        <TableHead>Limit To</TableHead>
                        <TableHead>Rate Amount</TableHead>
                        <TableHead>Active From</TableHead>
                        <TableHead>Active To</TableHead>
                        <TableHead className="gba:w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {formData.details.map((detail, index) => (
                      <SortableRow
                        key={detail.tempId}
                        id={detail.tempId!}
                      >
                        <TableCell>
                          <Input
                            type="number"
                            step="1"
                            value={detail.limitFrom || ''}
                            onChange={(e) => updateDetail(index, 'limitFrom', e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="0"
                            data-testid={`mileage-rule-form-detail-limit-from-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="1"
                            value={detail.limitTo || ''}
                            onChange={(e) => updateDetail(index, 'limitTo', e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="∞"
                            data-testid={`mileage-rule-form-detail-limit-to-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={detail.rateAmount.toFixed(2)}
                            onChange={(e) => updateDetail(index, 'rateAmount', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            data-testid={`mileage-rule-form-detail-rate-amount-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={detail.activeFrom}
                            onChange={(e) => updateDetail(index, 'activeFrom', e.target.value)}
                            data-testid={`mileage-rule-form-detail-active-from-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={detail.activeTo}
                            onChange={(e) => updateDetail(index, 'activeTo', e.target.value)}
                            data-testid={`mileage-rule-form-detail-active-to-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDetail(index)}
                            data-testid={`mileage-rule-form-detail-delete-${index}`}
                            className="gba:text-red-600 hover:gba:text-red-800"
                          >
                            <PiTrash className="gba:w-4 gba:h-4" />
                          </Button>
                        </TableCell>
                      </SortableRow>
                    ))}
                  </TableBody>
                                  </Table>
                </SortableContext>
                <DragOverlay>
                  {activeId ? (
                    <TableRow style={{ backgroundColor: '#f3f4f6', opacity: 0.8 }}>
                      <TableCell className="gba:w-10 gba:text-center">
                        <PiDotsSixVertical className="gba:text-gray-400 gba:text-lg" />
                      </TableCell>
                      <TableCell>Dragging...</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ) : null}
                </DragOverlay>
              </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <PiWarning className="gba:w-4 gba:h-4" />
          <AlertDescription>
            <strong>Please fix the following issues:</strong>
            <ul className="gba:list-disc gba:list-inside gba:mt-2">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Form Actions */}
      <div className="gba:flex gba:justify-end gba:gap-3">
        <Button variant="outline" onClick={onCancel} data-testid="mileage-rule-form-cancel">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          data-testid="mileage-rule-form-save"
        >
          {isSubmitting ? (
            <>
              <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </div>
    </div>
  );
};

export default MileageRuleForm; 