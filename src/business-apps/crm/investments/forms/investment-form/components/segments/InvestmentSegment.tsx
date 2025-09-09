import React from 'react';
import { 
  Input, 
  FormField,
  FormItem, 
  FormLabel,
  FormControl, 
  FormMessage 
} from '@newwork/nw-design-system';
import { useFormContext } from 'react-hook-form';
import { EmployeeSelect } from '@/components/employee-select';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useInvestmentFormContext } from '../../context/InvestmentFormContext';

const prefixDataTestId = 'InvestmentForm-InvestmentSegment';

const InvestmentSegment: React.FC = () => {
  const { control } = useFormContext(); // Get form control from react-hook-form context
  const {
    // Employee positions for owner selection
    employeePositions,
    employeePositionsLoading,
    employeePositionsHasMore,
    searchEmployeePositions,
    loadMoreEmployeePositions,
  } = useInvestmentFormContext();

  // Transform SelectOption[] to EmployeeOption[] format that EmployeeSelect expects
  const assigneeOptions = React.useMemo(() => (employeePositions || []).map((emp) => ({
    id: emp.id,
    displayName: emp.label,
    pictureThumbnail: emp.extraInfo?.pictureThumbnail,
    organizationalUnitName: emp.extraInfo?.organizationalUnit,
    jobPositionName: emp.extraInfo?.jobPosition,
  })), [employeePositions]);

  return (
    <div 
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      className="gba:space-y-6"
    >
      <div>
        <h3 style={{ 
          margin: 0, 
          color: 'var(--nw-color-text-primary)', 
          fontSize: '1.125rem', 
          fontWeight: 600,
          marginBottom: 'var(--nw-spacing-xs)'
        }}>
          Investment Information
        </h3>
        <p style={{
          margin: 0,
          color: 'var(--nw-color-text-secondary)',
          fontSize: '0.875rem'
        }}>
          Basic information about the investment
        </p>
      </div>

      <div className="gba:space-y-6">
        {/* Owner Selection */}
        <FormField
          control={control as any}
          name="ownerEmployeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Investment Owner <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
              </FormLabel>
              <FormControl>
                <EmployeeSelect
                  employees={assigneeOptions}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  onSearch={searchEmployeePositions}
                  loading={Boolean(employeePositionsLoading)}
                  onLoadMore={loadMoreEmployeePositions}
                  hasMore={Boolean(employeePositionsHasMore)}
                  placeholder="Select investment owner"
                  data-testid={formatDataTestId(prefixDataTestId, 'OwnerSelect')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Investment Name */}
        <FormField
          control={control as any}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Investment Name <span style={{ color: 'var(--nw-color-danger-500)' }}>*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ''}
                  placeholder="Enter investment name"
                  data-testid={formatDataTestId(prefixDataTestId, 'NameInput')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default InvestmentSegment;
