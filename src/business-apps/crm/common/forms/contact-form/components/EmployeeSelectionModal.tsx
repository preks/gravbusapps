import React, { useState, useEffect } from 'react';
import { Button, Input, Label, Spinner } from '@newwork/nw-design-system';
import { PiMagnifyingGlass, PiX, PiSpinner } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { SelectOption } from '../types';

const prefixDataTestId = 'ContactEmployeeSelectionModal';

interface EmployeeSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (employee: SelectOption) => void;
  employees: SelectOption[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSearch: (search: string) => void;
  error: string | null;
  selectedValue?: string;
}

const EmployeeSelectionModal: React.FC<EmployeeSelectionModalProps> = ({
  isVisible,
  onClose,
  onSelect,
  employees,
  loading,
  hasMore,
  onLoadMore,
  onSearch,
  error,
  selectedValue
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Handle search with debouncing
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      onSearch(searchTerm);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, onSearch]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleEmployeeSelect = (employee: SelectOption) => {
    onSelect(employee);
    handleClose();
  };

  const handleClose = () => {
    setSearchTerm('');
    onClose();
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

  if (!isVisible) return null;

  return (
    <div className="gba:fixed gba:inset-0 gba:bg-black gba:bg-opacity-50 gba:flex gba:items-center gba:justify-center gba:z-50">
      <div 
        className="gba:bg-white gba:rounded-xl gba:shadow-2xl gba:w-full gba:max-w-2xl gba:max-h-[80vh] gba:m-4 gba:flex gba:flex-col"
        data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      >
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-6 gba:border-b gba:border-gray-200">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">
            Select Contact Owner
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClose}
            className="gba:p-2"
            data-testid={formatDataTestId(prefixDataTestId, 'CloseButton')}
          >
            <PiX size={16} />
          </Button>
        </div>

        {/* Search */}
        <div className="gba:p-6 gba:border-b gba:border-gray-200">
          <div className="gba:relative">
            <PiMagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:text-gray-400 gba:w-4 gba:h-4" />
            <Input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="gba:pl-10"
              data-testid={formatDataTestId(prefixDataTestId, 'SearchInput')}
            />
          </div>
        </div>

        {/* Employee List */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:p-4">
          {error && (
            <div className="gba:text-center gba:text-red-600 gba:py-4">
              Error loading employees: {error}
            </div>
          )}

          {!error && employees.length === 0 && !loading && (
            <div className="gba:text-center gba:text-gray-500 gba:py-8">
              {searchTerm ? 'No employees found matching your search.' : 'No employees available.'}
            </div>
          )}

          <div className="gba:space-y-2">
            {employees.map((employee) => (
              <button
                key={employee.id}
                onClick={() => handleEmployeeSelect(employee)}
                className={`gba:w-full gba:text-left gba:p-4 gba:rounded-lg gba:border gba:transition-colors gba:flex gba:items-center gba:gap-3 ${
                  selectedValue === employee.value
                    ? 'gba:border-blue-500 gba:bg-blue-50'
                    : 'gba:border-gray-200 gba:hover:border-gray-300 gba:hover:bg-gray-50'
                }`}
                data-testid={formatDataTestId(prefixDataTestId, `Employee-${employee.id}`)}
              >
                {/* Employee Avatar */}
                <div className="gba:w-12 gba:h-12 gba:rounded-full gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:flex gba:items-center gba:justify-center gba:text-white gba:font-semibold gba:text-sm gba:flex-shrink-0 gba:shadow-md">
                  {employee.extraInfo?.pictureThumbnail ? (
                    <img 
                      src={`data:image/jpeg;base64,${employee.extraInfo.pictureThumbnail}`}
                      alt={employee.name || 'Employee'}
                      className="gba:w-full gba:h-full gba:rounded-full gba:object-cover"
                    />
                  ) : (
                    getEmployeeInitials(employee.name)
                  )}
                </div>

                {/* Employee Info */}
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:text-sm gba:font-medium gba:text-gray-900 gba:truncate">
                    {employee.name}
                  </div>
                  <div className="gba:text-xs gba:text-gray-600 gba:truncate">
                    {employee.extraInfo?.jobPosition || 'No Position'}
                  </div>
                  <div className="gba:text-xs gba:text-gray-500 gba:truncate">
                    {employee.extraInfo?.organizationalUnit || 'No Unit'}
                  </div>
                  {employee.extraInfo?.email && (
                    <div className="gba:text-xs gba:text-gray-500 gba:truncate">
                      {employee.extraInfo.email}
                    </div>
                  )}
                </div>

                {/* Selection Indicator */}
                {selectedValue === employee.value && (
                  <div className="gba:w-5 gba:h-5 gba:bg-blue-500 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                    <div className="gba:w-2 gba:h-2 gba:bg-white gba:rounded-full"></div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="gba:text-center gba:mt-4">
              <Button
                variant="secondary"
                onClick={onLoadMore}
                disabled={loading}
                className="gba:flex gba:items-center gba:gap-2"
                data-testid={formatDataTestId(prefixDataTestId, 'LoadMoreButton')}
              >
                {loading && <PiSpinner className="gba:animate-spin gba:w-4 gba:h-4" />}
                Load More
              </Button>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && employees.length === 0 && (
            <div className="gba:text-center gba:py-8">
              <Spinner size="lg" />
              <div className="gba:text-gray-500 gba:mt-2">Loading employees...</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gba:p-6 gba:border-t gba:border-gray-200 gba:flex gba:justify-end">
          <Button
            variant="secondary"
            onClick={handleClose}
            data-testid={formatDataTestId(prefixDataTestId, 'CancelButton')}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSelectionModal; 