import React, { useState } from 'react'
import { Select, Spin } from 'antd'
import { useSalesTaskFormContext } from '../context/SalesTaskFormContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const prefixDataTestId = 'SalesTaskForm-CoreDetails'

const CoreDetailsSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true) // Start expanded for core details

  const {
    formValues,
    setFormValues,
    taskTypes,
    priorities,
    employees,
    taskTypesLoading,
    prioritiesLoading,
    employeesLoading,
    searchTaskTypes,
    searchPriorities,
    searchEmployees
  } = useSalesTaskFormContext()

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-blue-200 gba:to-cyan-200 gba:hover:from-blue-300 gba:hover:to-cyan-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"
        style={{
          background: 'linear-gradient(to right, #bfdbfe, #a7f3d0)',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(to right, #93c5fd, #86efac)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(to right, #bfdbfe, #a7f3d0)'
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'Toggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></div>
          {getTranslationFromI18nKeyAndLabel('crm:salesTask.coreDetails', 'Core Details')}
        </h3>
        <span className="gba:text-gray-500 gba:text-lg">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="gba:p-6 gba:space-y-6">
          {/* Task Type and Priority - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                {getTranslationFromI18nKeyAndLabel('crm:salesTask.type', 'Type')}{' '}
                <span className="gba:text-red-500">*</span>
              </label>
              <Select
                data-testid={formatDataTestId(prefixDataTestId, 'TypeSelect')}
                value={formValues.taskTypeRef || undefined}
                onChange={value => setFormValues({ taskTypeRef: value })}
                className="gba:w-full"
                showSearch
                filterOption={false}
                notFoundContent={taskTypesLoading ? <Spin size="small" /> : null}
                onSearch={searchTaskTypes}
                placeholder={getTranslationFromI18nKeyAndLabel('crm:salesTask.selectType', 'Select task type')}
                allowClear
              >
                {taskTypes.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Option>
                ))}
              </Select>
              {!formValues.taskTypeRef && (
                <div className="gba:text-red-500 gba:text-sm gba:mt-1">
                  {getTranslationFromI18nKeyAndLabel('crm:salesTask.typeRequired', 'Type is required')}
                </div>
              )}
            </div>

            <div>
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                {getTranslationFromI18nKeyAndLabel('crm:salesTask.priority', 'Priority')}{' '}
                <span className="gba:text-red-500">*</span>
              </label>
              <Select
                data-testid={formatDataTestId(prefixDataTestId, 'PrioritySelect')}
                value={formValues.priorityRef || undefined}
                onChange={value => setFormValues({ priorityRef: value })}
                className="gba:w-full"
                showSearch
                filterOption={false}
                notFoundContent={prioritiesLoading ? <Spin size="small" /> : null}
                onSearch={searchPriorities}
                placeholder={getTranslationFromI18nKeyAndLabel('crm:salesTask.selectPriority', 'Select priority')}
                allowClear
              >
                {priorities.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Option>
                ))}
              </Select>
              {!formValues.priorityRef && (
                <div className="gba:text-red-500 gba:text-sm gba:mt-1">
                  {getTranslationFromI18nKeyAndLabel('crm:salesTask.priorityRequired', 'Priority is required')}
                </div>
              )}
            </div>
          </div>

          {/* Assigned Employee */}
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('crm:salesTask.assignedTo', 'Assigned To')}
            </label>
            <Select
              data-testid={formatDataTestId(prefixDataTestId, 'AssignedEmployeeSelect')}
              value={formValues.assignedEmployeeId || undefined}
              onChange={value => setFormValues({ assignedEmployeeId: value || '' })}
              className="gba:w-full"
              showSearch
              filterOption={false}
              notFoundContent={employeesLoading ? <Spin size="small" /> : null}
              onSearch={searchEmployees}
              placeholder={getTranslationFromI18nKeyAndLabel('crm:salesTask.selectEmployee', 'Select employee')}
              allowClear
            >
              {employees.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}

export default CoreDetailsSection
