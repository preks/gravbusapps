import React, { useState } from 'react'
import { Select, Spin, Tag } from 'antd'
import { useSalesTaskFormContext } from '../context/SalesTaskFormContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const prefixDataTestId = 'SalesTaskForm-EntitySelection'

const EntitySelectionSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed

  const {
    formValues,
    setFormValues,
    entities,
    entitiesLoading,
    searchEntities,
    selectedEntity,
    setSelectedEntity,
    showEntitySearch
  } = useSalesTaskFormContext()

  if (!showEntitySearch) {
    return null
  }

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-green-200 gba:to-emerald-200 gba:hover:from-green-300 gba:hover:to-emerald-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"
        style={{
          background: 'linear-gradient(to right, #bbf7d0, #a7f3d0)',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(to right, #86efac, #6ee7b7)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(to right, #bbf7d0, #a7f3d0)'
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'Toggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-green-500 gba:rounded-full"></div>
          {getTranslationFromI18nKeyAndLabel('crm:salesTask.relatedEntity', 'Related Entity')}
        </h3>
        <span className="gba:text-gray-500 gba:text-lg">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="gba:p-6">
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('crm:salesTask.relatedEntity', 'Related Entity')}{' '}
              <span className="gba:text-red-500">*</span>
            </label>
            <Select
              data-testid={formatDataTestId(prefixDataTestId, 'EntitySelect')}
              value={selectedEntity?.id || undefined}
              className="gba:w-full"
              showSearch
              filterOption={false}
              notFoundContent={entitiesLoading ? <Spin size="small" /> : null}
              onSearch={searchEntities}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'crm:salesTask.searchEntity',
                'Search leads, contacts, accounts, or opportunities...'
              )}
              allowClear
              onSelect={(value: string) => {
                const entity = entities.find(e => e.id === value)
                if (entity) {
                  setSelectedEntity(entity)
                  setFormValues({
                    relatedEntityType: entity.type,
                    relatedEntityId: entity.id
                  })
                }
              }}
              onClear={() => {
                setSelectedEntity(null)
                setFormValues({
                  relatedEntityType: '',
                  relatedEntityId: ''
                })
              }}
            >
              {entities.map(entity => (
                <Select.Option key={entity.id} value={entity.id}>
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      {entity.type === 'lead' && <span>🤝</span>}
                      {entity.type === 'contact' && <span>👤</span>}
                      {entity.type === 'account' && <span>🏢</span>}
                      {entity.type === 'opportunity' && <span>🎯</span>}
                      <Tag
                        color={
                          entity.type === 'lead'
                            ? 'orange'
                            : entity.type === 'contact'
                              ? 'blue'
                              : entity.type === 'account'
                                ? 'green'
                                : 'purple'
                        }
                      >
                        {entity.type.charAt(0).toUpperCase() + entity.type.slice(1)}
                      </Tag>
                    </div>
                    <div className="gba:flex-1">
                      <div className="gba:font-medium">{entity.name}</div>
                      {entity.subtitle && <div className="gba:text-sm gba:text-gray-500">{entity.subtitle}</div>}
                    </div>
                  </div>
                </Select.Option>
              ))}
            </Select>
            {!formValues.relatedEntityId && (
              <div className="gba:text-red-500 gba:text-sm gba:mt-1">
                {getTranslationFromI18nKeyAndLabel(
                  'crm:salesTask.relatedEntityRequired',
                  'Please select a related entity'
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default EntitySelectionSection
