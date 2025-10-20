import React, { useState } from 'react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface OwnerOption {
  value: string
  label: string
  pictureThumbnail?: string
  jobPosition?: string
  organizationalUnit?: string
}

export interface OwnerSelectionProps extends Pick<BusinessAppContextProps, 'accessToken'> {
  label?: string
  required?: boolean
  value?: string
  options: OwnerOption[]
  loading?: boolean
  hasMore?: boolean
  onSearch?: (q: string) => void
  onLoadMore?: () => void
  onChange?: (value?: string) => void
  ['data-testid']?: string
}

const OwnerSelection: React.FC<OwnerSelectionProps> = ({
  label = 'Owner',
  required = true,
  value,
  options,
  loading,
  hasMore,
  onSearch,
  onLoadMore,
  onChange,
  'data-testid': dataTestId = 'OwnerSelection'
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const selected = options.find(o => o.value === value)

  return (
    <div className="gba:space-y-2" data-testid={dataTestId}>
      <label className="gba:block gba:text-sm gba:font-medium">
        {label}
        {required && <span className="gba:text-red-500 gba:ml-1">*</span>}
      </label>

      <div className="gba:bg-white gba:border gba:rounded-lg gba:p-3 gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
          <div
            className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-gray-200"
            data-testid={formatDataTestId(dataTestId, 'Avatar')}
          />
          <div className="gba:min-w-0">
            <div
              className="gba:text-sm gba:font-medium gba:truncate"
              data-testid={formatDataTestId(dataTestId, 'Name')}
            >
              {selected?.label || 'No owner selected'}
            </div>
            {selected?.jobPosition && (
              <div
                className="gba:text-xs gba:text-gray-600 gba:truncate"
                data-testid={formatDataTestId(dataTestId, 'JobPosition')}
              >
                {selected.jobPosition}
              </div>
            )}
            {selected?.organizationalUnit && (
              <div
                className="gba:text-xs gba:text-gray-500 gba:truncate"
                data-testid={formatDataTestId(dataTestId, 'OrgUnit')}
              >
                {selected.organizationalUnit}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="gba:text-sm gba:px-3 gba:py-1 gba:border gba:rounded-md"
          data-testid={formatDataTestId(dataTestId, 'OpenButton')}
        >
          {selected ? 'Change' : 'Select'}
        </button>
      </div>

      {isOpen && (
        <div
          className="gba:fixed gba:inset-0 gba:bg-black/40 gba:flex gba:items-center gba:justify-center"
          data-testid={formatDataTestId(dataTestId, 'Modal')}
        >
          <div className="gba:bg-white gba:w-[560px] gba:max-w-[90vw] gba:rounded-lg gba:shadow-lg gba:p-4 gba:space-y-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:text-base gba:font-semibold">{label}</div>
              <button
                type="button"
                className="gba:text-sm"
                onClick={() => setIsOpen(false)}
                data-testid={formatDataTestId(dataTestId, 'CloseButton')}
              >
                Close
              </button>
            </div>

            <input
              type="text"
              placeholder="Search employees..."
              onChange={e => onSearch?.(e.target.value)}
              className="gba:w-full gba:border gba:rounded-md gba:px-3 gba:py-2"
              data-testid={formatDataTestId(dataTestId, 'SearchInput')}
            />

            <div className="gba:max-h-[300px] gba:overflow-auto gba:border gba:rounded-md">
              {options.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => {
                    onChange?.(opt.value)
                    setIsOpen(false)
                  }}
                  className="gba:w-full gba:text-left gba:px-3 gba:py-2 hover:gba:bg-gray-50"
                  data-testid={formatDataTestId(dataTestId, `Option-${opt.value}`)}
                >
                  {opt.label}
                </button>
              ))}
              {hasMore && (
                <button
                  type="button"
                  onClick={onLoadMore}
                  className="gba:w-full gba:px-3 gba:py-2"
                  data-testid={formatDataTestId(dataTestId, 'LoadMore')}
                >
                  Load more
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerSelection
