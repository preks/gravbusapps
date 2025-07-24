import React, { useState } from 'react';
import { Avatar, Button } from '@newwork/gravity-ui-catalog';
import { PiPencilSimple } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useInvestmentFormContext } from '../context/InvestmentFormContext';
import EmployeeSelectionModal from './EmployeeSelectionModal';

const prefixDataTestId = 'OwnerSelector';

interface OwnerSelectorProps {
  label?: string;
  required?: boolean;
}

const OwnerSelector: React.FC<OwnerSelectorProps> = ({
  label = "Owner",
  required = true
}) => {
  const {
    formValues,
    setFormValues,
    currentEmployee,
    currentEmployeeLoading,
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    loadMoreEmployeePositions,
    searchEmployeePositions,
    validationErrors
  } = useInvestmentFormContext();

  const [isModalVisible, setIsModalVisible] = useState(false);

  // Use current employee data if available, otherwise find in employeePositions
  const selectedEmployee = currentEmployee ? {
    id: currentEmployee.id,
    name: currentEmployee.employee.displayName,
    label: currentEmployee.employee.displayName,
    value: currentEmployee.employeeId,
    extraInfo: {
      firstName: currentEmployee.firstName,
      lastName: currentEmployee.lastName,
      displayName: currentEmployee.employee.displayName,
      picture: currentEmployee.employee.picture,
      pictureThumbnail: currentEmployee.employee.pictureThumbnail,
      jobPosition: currentEmployee.jobPosition.name,
      organizationalUnit: currentEmployee.organizationalUnit.name
    }
  } : employeePositions.find(emp => emp.value === formValues.ownerEmployeeId);

  const handleOpenModal = () => {
    setIsModalVisible(true);
  };

  const handleSelectEmployee = (employee: any) => {
    setFormValues({ ownerEmployeeId: employee.value });
    setIsModalVisible(false);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  const hasError = validationErrors.ownerEmployeeId;

  return (
    <>
      <div className="gba:space-y-2">
        <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
          {label}
          {required && <span className="gba:text-red-500 gba:ml-1">*</span>}
        </label>

        <div 
          className={`gba:bg-white gba:border gba:rounded-lg gba:p-4 gba:flex gba:items-center gba:justify-between gba:min-h-[60px] gba:transition-colors gba:hover:border-gray-400 ${
            hasError ? 'gba:border-red-300' : 'gba:border-gray-300'
          }`}
          data-testid={formatDataTestId(prefixDataTestId, 'Container')}
        >
          {selectedEmployee ? (
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <Avatar
                src={
                  selectedEmployee.extraInfo?.pictureThumbnail
                    ? `data:image/jpeg;base64,${selectedEmployee.extraInfo.pictureThumbnail}`
                    : undefined
                }
                initials={
                  selectedEmployee.extraInfo?.picture
                    ? undefined
                    : selectedEmployee.name
                        ?.split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || '??'
                }
                alt={selectedEmployee.name || 'Employee'}
                // @ts-ignore - Type compatibility issues with gravity-ui-catalog
                contentType={selectedEmployee.extraInfo?.pictureThumbnail ? 'image' : 'initials'}
                // @ts-ignore - Type compatibility issues with gravity-ui-catalog
                size="md"
                // @ts-ignore - Type compatibility issues with gravity-ui-catalog
                shape="rounded"
                // @ts-ignore - Type compatibility issues with gravity-ui-catalog
                appearance="gradient"
              />
              
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

        {/* Error Message */}
        {hasError && (
          <div className="gba:text-sm gba:text-red-600" data-testid={formatDataTestId(prefixDataTestId, 'Error')}>
            {hasError}
          </div>
        )}
      </div>

      {isModalVisible && (
        <EmployeeSelectionModal
          isVisible={isModalVisible}
          onClose={handleCloseModal}
          onSelect={handleSelectEmployee}
          employees={employeePositions}
          loading={employeePositionsLoading}
          hasMore={employeePositionsHasMore}
          onLoadMore={loadMoreEmployeePositions}
          onSearch={searchEmployeePositions}
          error={employeePositionsError}
          selectedValue={formValues.ownerEmployeeId}
        />
      )}
    </>
  );
};

export default OwnerSelector; 