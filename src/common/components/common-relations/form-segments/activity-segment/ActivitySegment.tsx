import React from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Spinner,
} from '@newwork/nw-design-system';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCatalogOptions } from '../shared/hooks/useCatalogOptions';
import EntitySelect from '../shared/components/EntitySelect';
import { EmployeeSelect } from '@/components/employee-select';

export interface ActivityTypeOption {
  value: string;
  label: string;
}

export interface EntityOption {
  id: string;
  name: string;
  type: 'account' | 'contact' | 'opportunity' | 'lead';
  subtitle?: string;
  pictureThumbnail?: string;
}

// Base Activity interface with all common fields
export interface Activity {
  id?: string;
  title: string;
  activityTypeRef: string;
  occurredAt: string;
  description: string;
  files: File[];
  account?: { id: string };
  contact?: { id: string };
  opportunity?: { id: string };
  lead?: { id: string };
  ownerEmployee?: { id: string };
  ownerEmployeeId?: string; // Added to support form field
  version?: string;
}

export interface ActivitySegmentProps {
  // Type options for the select field (or let the segment load them)
  typeOptions?: ActivityTypeOption[];
  typeLoading?: boolean;
  accessToken?: string;
  typeCatalog?: { identifier: string; version: string };
  fetchTypeOptions?: () => Promise<ActivityTypeOption[]>;
  onTypeSearch?: (searchTerm: string) => void;

  // Entity selection
  showEntitySelection?: boolean;
  entities?: EntityOption[];
  entitiesLoading?: boolean;
  onEntitySearch?: (searchTerm: string) => void;
  entitiesHasMore?: boolean;
  onEntityLoadMore?: () => void;
  initialEntityFromContext?: { accountId?: string; contactId?: string; opportunityId?: string; leadId?: string };

  // Assignees (owner employee)
  // Toggle owner/assignee selection visibility; default is true
  showOwnerSelection?: boolean;
  assignees?: Array<{
    id: string;
    displayName: string;
    userId?: string;
    pictureThumbnail?: string;
    organizationalUnitName?: string;
    jobPositionName?: string;
  }>;
  assigneesLoading?: boolean;
  onAssigneeSearch?: (q: string) => void;
  assigneesHasMore?: boolean;
  onAssigneeLoadMore?: () => void;

  // Labels
  titleLabel: React.ReactNode;
  typeLabel: React.ReactNode;
  dateLabel: React.ReactNode;
  descriptionLabel: React.ReactNode;
  uploadFileLabel?: React.ReactNode;
  entityLabel?: React.ReactNode;

  // Callbacks
  onFilesChange?: (files: File[]) => void;

  // Render props for Ant Design compatibility
  renderTextField?: (props: { name: string; label: React.ReactNode; required?: boolean; 'data-testid'?: string }) => React.ReactNode;
  renderSelectField?: (props: { name: string; label: React.ReactNode; options: ActivityTypeOption[]; loading?: boolean; onSearch?: (searchTerm: string) => void; required?: boolean; 'data-testid'?: string }) => React.ReactNode;
  renderDateField?: (props: { name: string; label: React.ReactNode; required?: boolean; 'data-testid'?: string }) => React.ReactNode;
  renderTextareaField?: (props: { name: string; label: React.ReactNode; required?: boolean; 'data-testid'?: string }) => React.ReactNode;
  renderFileField?: (props: { 'data-testid'?: string }) => React.ReactNode;

  // TestId prefix for container
  ['data-testid']?: string;
}

const ActivitySegment: React.FC<ActivitySegmentProps> = ({
  typeOptions,
  typeLoading = false,
  accessToken,
  typeCatalog,
  fetchTypeOptions,
  onTypeSearch,
  showEntitySelection = false,
  entities = [],
  entitiesLoading = false,
  onEntitySearch,
  entitiesHasMore,
  onEntityLoadMore,
  initialEntityFromContext,
  showOwnerSelection = true,
  assignees = [],
  assigneesLoading = false,
  onAssigneeSearch,
  assigneesHasMore,
  onAssigneeLoadMore,
  titleLabel,
  typeLabel,
  dateLabel,
  descriptionLabel,
  uploadFileLabel,
  entityLabel,
  onFilesChange,
  renderTextField,
  renderSelectField,
  renderDateField,
  renderTextareaField,
  renderFileField,
  'data-testid': dataTestId = 'activity-segment',
}) => {
  // Try to get form context, but don't require it if using render props
  let form: any = null;
  try {
    form = useFormContext<any>();
  } catch {
    // Form context not available, using render props mode
  }
  
  // Check if we're in render props mode (Ant Design)
  const isRenderPropsMode = Boolean(renderTextField || renderSelectField || renderDateField || renderTextareaField || renderFileField);

  const typeOptionsState = useCatalogOptions({
    accessToken,
    catalog: typeCatalog,
    providedOptions: typeOptions,
    providedLoading: typeLoading,
    fetchOptions: fetchTypeOptions,
  });



  const normalizeDateTimeLocalValue = React.useCallback((v: string | undefined | null) => {
    if (!v) return '';
    const s = v.replace('Z', '');
    return s.length >= 16 ? s.slice(0, 16) : s;
  }, []);

  // Prime entity search on mount if needed
  React.useEffect(() => {
    if (showEntitySelection && onEntitySearch && (!entities || entities.length === 0)) {
      onEntitySearch('');
    }
  }, [showEntitySelection, onEntitySearch, entities]);

  // Apply initial entity from context when none is set yet
  React.useEffect(() => {
    if (!showEntitySelection || !initialEntityFromContext || !form) return;
    const hasEntity = Boolean(
      form.getValues('account') || form.getValues('contact') || form.getValues('opportunity') || form.getValues('lead')
    );
    if (hasEntity) return;

    const { accountId, contactId, opportunityId, leadId } = initialEntityFromContext;
    const map: Array<{ key: 'account' | 'contact' | 'opportunity' | 'lead'; id?: string }> = [
      { key: 'account', id: accountId },
      { key: 'contact', id: contactId },
      { key: 'opportunity', id: opportunityId },
      { key: 'lead', id: leadId },
    ];
    const found = map.find((m) => m.id);
    if (found?.id) {
      form.setValue(found.key, { id: found.id });
      form.setValue('relatedEntityId', found.id);
    }
  }, [showEntitySelection, initialEntityFromContext, form]);

  // Prime assignee search when empty (similar to TaskSegment)
  React.useEffect(() => {
    if (showOwnerSelection && onAssigneeSearch && assignees.length === 0) {
      onAssigneeSearch('');
    }
  }, [showOwnerSelection, onAssigneeSearch, assignees.length]);

  // Render in Ant Design mode using render props
  if (isRenderPropsMode) {
    return (
      <>
        {/* Title Field */}
        {renderTextField?.({
          name: 'title',
          label: titleLabel,
          required: true,
          'data-testid': `${dataTestId}-title`
        })}

        {/* Type Field */}
        {renderSelectField?.({
          name: 'activityTypeRef',
          label: typeLabel,
          options: typeOptionsState.options,
          loading: typeOptionsState.loading,
          onSearch: onTypeSearch,
          required: true,
          'data-testid': `${dataTestId}-type`
        })}

        {/* Date Field */}
        {renderDateField?.({
          name: 'date',
          label: dateLabel,
          required: true,
          'data-testid': `${dataTestId}-date`
        })}

        {/* Description Field */}
        {renderTextareaField?.({
          name: 'description',
          label: descriptionLabel,
          required: true,
          'data-testid': `${dataTestId}-description`
        })}

        {/* File Upload Field */}
        {uploadFileLabel && renderFileField?.({
          'data-testid': `${dataTestId}-file`
        })}
      </>
    );
  }

  // Original React Hook Form mode
  if (!form?.control) {
    return <div>Error: Form context not available. Please use render props or provide form context.</div>;
  }

  return (
    <>
      {/* Title */}
      <FormField
        control={form.control as any}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {titleLabel} <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
            </FormLabel>
            <FormControl>
              <Input data-testid={`${dataTestId}-title`} maxLength={100} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Type */}
      <FormField
        control={form.control as any}
        name="activityTypeRef"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {typeLabel} <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid={`${dataTestId}-type`}>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {typeOptionsState.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {typeOptionsState.loading && <Spinner size="sm" />}
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Occurred At */}
      <FormField
        control={form.control as any}
        name="occurredAt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {dateLabel} <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
            </FormLabel>
            <FormControl>
              <Input
                type="datetime-local"
                data-testid={`${dataTestId}-date`}
                value={normalizeDateTimeLocalValue(field.value)}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Related Entity */}
      {showEntitySelection && (
        <FormField
          control={form.control as any}
          name="relatedEntityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {entityLabel || 'Related Entity'} <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
              </FormLabel>
              <FormControl>
                <EntitySelect
                  entities={entities}
                  value={field.value || ''}
                  onValueChange={(v: string | null) => {
                    field.onChange(v);
                    if (form) {
                      const id = String(v || '');
                      const e = (entities || []).find((x) => x.id === id);
                      form.setValue('account', undefined);
                      form.setValue('contact', undefined);
                      form.setValue('opportunity', undefined);
                      form.setValue('lead', undefined);
                      if (e) {
                        form.setValue(e.type, { id: e.id });
                        form.setValue('relatedEntityId', e.id);
                      }
                    }
                  }}
                  placeholder="Search leads, contacts, accounts, or opportunities..."
                  searchPlaceholder="Type to search..."
                  onSearch={onEntitySearch}
                  loading={Boolean(entitiesLoading)}
                  hasMore={Boolean(entitiesHasMore)}
                  onLoadMore={onEntityLoadMore}
                  data-testid={`${dataTestId}-entity`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Description */}
      <FormField
        control={form.control as any}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {descriptionLabel} <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
            </FormLabel>
            <FormControl>
              <Textarea data-testid={`${dataTestId}-description`} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Owner Employee */}
      {showOwnerSelection !== false && (
        <FormField
          control={form.control as any}
          name="ownerEmployeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner</FormLabel>
              <FormControl>
                <EmployeeSelect
                  className="gba:w-full gba:h-auto"
                  employees={assignees as any}
                  value={field.value || ''}
                  onValueChange={(v: string | null) => {
                    field.onChange(v);
                    // Optionally set owner user id if provided later
                  }}
                  onSearch={onAssigneeSearch}
                  loading={Boolean(assigneesLoading)}
                  onLoadMore={onAssigneeLoadMore}
                  hasMore={Boolean(assigneesHasMore)}
                  data-testid={`${dataTestId}-owner`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* TODO: File upload field is intentionally hidden for now; review its necessity and integration. */}
      {false && uploadFileLabel && onFilesChange && <div />}
    </>
  );
};

export default ActivitySegment;

// Zod schema colocated with ActivitySegment for convenient reuse/override
export const activitySegmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  activityTypeRef: z.string().min(1, 'Activity type is required'),
  occurredAt: z.preprocess((val) => (val == null ? '' : val), z.string().min(1, 'Date is required')),
  description: z.string().min(1, 'Description is required'),
  files: z.any().optional(),
  relatedEntityId: z.string().optional(),
  ownerEmployeeId: z.string().optional(), // Added to support owner selection
});

export type ActivitySegmentSchema = z.infer<typeof activitySegmentSchema>;

export const createActivitySegmentResolver = () => zodResolver(activitySegmentSchema);

