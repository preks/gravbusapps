import React, { useState } from 'react';
import { Button } from '@newwork/nw-design-system';
import { PiPencilSimple } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { SelectOption } from '../types';
import EmployeeSelectionModal from './EmployeeSelectionModal';

const prefixDataTestId = 'OwnerSelector';

interface OwnerSelectorProps {
  value: string;
  onChange: (value: string) => void;
  employees: SelectOption[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSearch: (search: string) => void;
  error: string | null;
  dataTestId?: string;
}

const OwnerSelector: React.FC<OwnerSelectorProps> = ({
  value,
  onChange,
  employees,
  loading,
  hasMore,
  onLoadMore,
  onSearch,
  error,
  dataTestId
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Find selected employee
  const selectedEmployee = employees.find(emp => emp.value === value);

  const handleOpenModal = () => {
    setIsModalVisible(true);
  };

  const handleSelectEmployee = (employee: SelectOption) => {
    onChange(employee.value as string);
    setIsModalVisible(false);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  // Helper function to get employee initials
  const getEmployeeInitials = (name?: string) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';
  };

  return (
    <>
      <div 
        className="gba:bg-white gba:border gba:border-gray-300 gba:rounded-lg gba:p-4 gba:flex gba:items-center gba:justify-between gba:min-h-[60px] gba:transition-colors gba:hover:border-gray-400"
        data-testid={dataTestId || formatDataTestId(prefixDataTestId, 'Container')}
      >
        {selectedEmployee ? (
          <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
            {/* Employee Avatar with Image or Initials */}
            <div className="gba:w-12 gba:h-12 gba:rounded-full gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:flex gba:items-center gba:justify-center gba:text-white gba:font-semibold gba:text-sm gba:flex-shrink-0 gba:shadow-md">
              {selectedEmployee.extraInfo?.pictureThumbnail ? (
                <img 
                  src={`data:image/jpeg;base64,${selectedEmployee.extraInfo.pictureThumbnail}`}
                  alt={selectedEmployee.name || 'Employee'}
                  className="gba:w-full gba:h-full gba:rounded-full gba:object-cover"
                />
              ) : (
                getEmployeeInitials(selectedEmployee.name)
              )}
            </div>
            
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:text-sm gba:font-medium gba:text-gray-900 gba:truncate">
                {selectedEmployee.name}
              </div>
              <div className="gba:text-xs gba:text-gray-600 gba:truncate">
                {selectedEmployee.extraInfo?.jobPosition || 'No Position'}
              </div>
              <div className="gba:text-xs gba:text-gray-500 gba:truncate">
                {selectedEmployee.extraInfo?.organizationalUnit || 'No Unit'}
              </div>
            </div>
          </div>
        ) : (
          <div className="gba:flex-1 gba:text-gray-500 gba:text-sm">
            No owner selected
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={handleOpenModal}
          className="gba:ml-3 gba:flex gba:items-center gba:gap-1"
          data-testid={formatDataTestId(prefixDataTestId, 'EditButton')}
        >
          <PiPencilSimple size={14} />
          {selectedEmployee ? 'Change' : 'Select'}
        </Button>
      </div>

      {isModalVisible && (
        <EmployeeSelectionModal
          isVisible={isModalVisible}
          onClose={handleCloseModal}
          onSelect={handleSelectEmployee}
          employees={employees}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          onSearch={onSearch}
          error={error}
          selectedValue={value}
        />
      )}
    </>
  );
};

export default OwnerSelector; 