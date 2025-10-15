import React, { useState, useEffect } from 'react'
import {
  Button,
  Input,
  Label,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { PiMagnifyingGlass, PiX, PiSpinner } from 'react-icons/pi'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { SelectOption } from '../types'

const prefixDataTestId = 'ContactEmployeeSelectionModal'

interface EmployeeSelectionModalProps {
  isVisible: boolean
  onClose: () => void
  onSelect: (employee: SelectOption) => void
  employees: SelectOption[]
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onSearch: (search: string) => void
  error: string | null
  selectedValue?: string
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
  const [searchTerm, setSearchTerm] = useState('')

  // Handle search with debouncing
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      onSearch(searchTerm)
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [searchTerm, onSearch])

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
  }

  const handleEmployeeSelect = (employee: SelectOption) => {
    onSelect(employee)
    handleClose()
  }

  const handleClose = () => {
    setSearchTerm('')
    onClose()
  }

  // Restore original visibility check
  if (!isVisible) return null

  return (
    <div className="gba:fixed gba:inset-0 gba:bg-black gba:bg-opacity-50 gba:flex gba:items-center gba:justify-center gba:z-50">
      <div
        className="gba:bg-white gba:rounded-xl gba:shadow-2xl gba:w-full gba:max-w-2xl gba:max-h-[80vh] gba:m-4 gba:flex gba:flex-col"
        data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      >
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:p-6 gba:border-b gba:border-gray-200">
          <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">Select Contact Owner</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="gba:p-2"
            data-testid={formatDataTestId(prefixDataTestId, 'CloseButton')}
          >
            <PiX size={16} />
          </Button>
        </div>

        {/* Search Section */}
        <div className="gba:p-6 gba:border-b gba:border-gray-200">
          <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">Search Employees</Label>
          <div className="gba:relative">
            <div className="gba:absolute gba:inset-y-0 gba:left-0 gba:pl-2 gba:flex gba:items-center gba:pointer-events-none gba:z-10">
              <PiMagnifyingGlass className="gba:h-5 gba:w-5 gba:text-gray-400" />
            </div>
            <Input
              name="search"
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Type to search employees..."
              className="gba:border-gray-300 gba:bg-white"
              style={{ paddingLeft: '32px' }}
              data-testid={formatDataTestId(prefixDataTestId, 'SearchInput')}
            />
          </div>
        </div>

        {/* Error Display */}
        <div className="gba:flex-1 gba:overflow-y-auto gba:p-6">
          {error && (
            <Alert variant="destructive" className="gba:mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && employees.length === 0 && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-gray-500">
                <PiSpinner className="gba:animate-spin" size={20} />
                <span>Loading employees...</span>
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && employees.length === 0 && searchTerm && (
            <div className="gba:text-center gba:py-12 gba:text-gray-500">
              <p>No employees found matching "{searchTerm}"</p>
              <p className="gba:text-sm gba:mt-2">Try adjusting your search terms</p>
            </div>
          )}

          {/* Employee List */}
          {employees.length > 0 && (
            <div className="gba:space-y-3">
              {employees.map(employee => (
                <div
                  key={employee.value}
                  onClick={() => handleEmployeeSelect(employee)}
                  className="gba:flex gba:items-center gba:gap-4 gba:p-4 gba:rounded-lg gba:border gba:border-gray-200 gba:cursor-pointer gba:transition-colors gba:hover:bg-gray-50 gba:hover:border-gray-300"
                  data-testid={formatDataTestId(prefixDataTestId, `EmployeeOption-${employee.value}`)}
                >
                  {/* Professional Avatar */}
                  <Avatar size="lg">
                    {employee.extraInfo?.pictureThumbnail ? (
                      <AvatarImage
                        src={`data:image/jpeg;base64,${employee.extraInfo.pictureThumbnail}`}
                        alt={employee.name || 'Employee'}
                      />
                    ) : null}
                    <AvatarFallback className="gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white gba:font-semibold">
                      {employee.name
                        ?.split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Employee Information */}
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:text-sm gba:font-semibold gba:text-gray-900 gba:truncate">{employee.name}</div>
                    <div className="gba:text-xs gba:text-gray-600 gba:truncate gba:mt-1">
                      {employee.extraInfo?.jobPosition || 'No Position'}
                    </div>
                    <div className="gba:text-xs gba:text-gray-500 gba:truncate">
                      {employee.extraInfo?.organizationalUnit || 'No Unit'}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {selectedValue === employee.value && (
                    <div className="gba:w-5 gba:h-5 gba:bg-blue-500 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                      <div className="gba:w-2 gba:h-2 gba:bg-white gba:rounded-full"></div>
                    </div>
                  )}
                </div>
              ))}

              {/* Restore original Load More Button behavior */}
              {hasMore && (
                <div className="gba:flex gba:justify-center gba:pt-4">
                  <Button
                    variant="secondary"
                    onClick={onLoadMore}
                    disabled={loading}
                    data-testid={formatDataTestId(prefixDataTestId, 'LoadMoreButton')}
                  >
                    {loading ? (
                      <>
                        <PiSpinner className="gba:animate-spin gba:mr-2" size={16} />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="gba:flex gba:justify-end gba:gap-3 gba:p-6 gba:border-t gba:border-gray-200 gba:bg-gray-50">
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
  )
}

export default EmployeeSelectionModal
