import React from 'react'
import { Button } from '@newwork/gravity-ui-catalog'
import { SelectField } from '@newwork/gravity-ui-catalog'
import { formatDate, getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { CostCenter } from '../../utils/types'
import { DEDUCTION_KEYS } from '../../constants/constants'
import { ICONS } from '@/business-apps/fin/expenses/utils/icons'
import { getDayName } from '../../utils/allowanceScreenUtils'

/**
 * Props for the AllowanceContainer component
 */
interface AllowanceContainerProps {
  item: any
  index: number
  isCollapsed: boolean
  onToggleCollapse: () => void
  costCenters: CostCenter[]
  onCostCenterChange: (index: number, value: string | undefined) => void
  projects: any[]
  onProjectChange: (index: number, value: string | undefined) => void
  onDeductionsChange?: (index: number, deductions: string[]) => void
  hasDeductions?: boolean
  visibleDeductionKeys?: string[]
}

/**
 * AllowanceContainer component for collapsible allowance sections
 */
const AllowanceContainer: React.FC<AllowanceContainerProps> = ({
  item,
  index,
  isCollapsed,
  onToggleCollapse,
  costCenters,
  onCostCenterChange,
  projects,
  onProjectChange,
  onDeductionsChange,
  hasDeductions,
  visibleDeductionKeys
}) => {
  const locale = getCurrentActiveUserLocale()
  const dateToDisplay = item.allowanceDate || item.expenseDate
  const selectedDeductions: string[] = Array.isArray(item?.deductions) ? item.deductions : []

  const deductionOptions = [
    {
      key: DEDUCTION_KEYS.BREAKFAST,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_deduction.expense_deduction_modal.breakfast_title',
        'Breakfast'
      ),
      icon: ICONS.BREAKFAST_DEDUCTION_ICON
    },
    {
      key: DEDUCTION_KEYS.LUNCH,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_deduction.expense_deduction_modal.lunch_title',
        'Lunch'
      ),
      icon: ICONS.LUNCH_DEDUCTION_ICON
    },
    {
      key: DEDUCTION_KEYS.DINNER,
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_deduction.expense_deduction_modal.dinner_title',
        'Dinner'
      ),
      icon: ICONS.DINNER_DEDUCTION_ICON
    },
    {
      key: DEDUCTION_KEYS.OVERNIGHT,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_deduction.overnight_allowance', 'Overnight Allowance'),
      icon: ICONS.OVERNIGHT_DEDUCTION_ICON
    }
  ]

  const optionsToShow =
    Array.isArray(visibleDeductionKeys) && visibleDeductionKeys.length > 0
      ? deductionOptions.filter(opt => visibleDeductionKeys.includes(opt.key))
      : deductionOptions

  const toggleDeduction = (deductionKey: string) => {
    const current = new Set<string>(selectedDeductions)
    if (current.has(deductionKey)) {
      current.delete(deductionKey)
    } else {
      current.add(deductionKey)
    }
    onDeductionsChange?.(index, Array.from(current))
  }

  return (
    <div className="gba:flex gba:flex-col gba:w-[100%]" data-testid={`allowance-container-${index}`}>
      <div
        className="gba:flex gba:justify-between gba:items-center gba:px-4 gba:py-3"
        data-testid={`allowance-header-${index}`}
      >
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`allowance-title-wrapper-${index}`}>
          <img
            src={ICONS.CALENDAR_ICON}
            alt="Calendar"
            style={{ width: '24px', height: '24px' }}
            data-testid={`allowance-icon-${index}`}
          />
          <span
            className="gba:text-foreground"
            style={{ fontSize: '16px', fontWeight: 500 }}
            data-testid={`allowance-title-${index}`}
          >
            {dateToDisplay ? `${getDayName(dateToDisplay)}, ${formatDate(dateToDisplay)}` : `Allowance ${index + 1}`}
          </span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`allowance-actions-${index}`}>
          <Button
            variant="text"
            className="gba:flex gba:items-center gba:justify-center"
            style={{
              padding: '4px',
              minWidth: 'auto',
              height: 'auto',
              marginLeft: '4px',
              background: 'transparent',
              border: 'none'
            }}
            data-testid={`collapse-button-${index}`}
            onClick={onToggleCollapse}
          >
            <img
              src={isCollapsed ? ICONS.DOWN_ARROW : ICONS.UP_ARROW}
              alt={isCollapsed ? 'Expand' : 'Collapse'}
              style={{ width: '24px', height: '24px' }}
              data-testid={`collapse-icon-${index}`}
            />
          </Button>
        </div>
      </div>

      {/* Only show content when not collapsed */}
      {!isCollapsed && (
        <div
          className="gba:flex gba:flex-col gba:gap-4"
          style={{ padding: '16px' }}
          data-testid={`allowance-content-${index}`}
        >
          <SelectField
            allowClear
            label={getTranslationFromI18nKeyAndLabel(
              'lowcoder:initiate_expense_plan.create_expense_plan.cost_center_select_label',
              'Cost Center'
            )}
            name={`allowance-cost-center-${index}`}
            data-testid={`allowance-cost-center-select-${index}`}
            data={costCenters.map(cc => ({
              id: cc.id,
              name: cc.name
            }))}
            onChange={(value: any) => {
              // Handle clearing - if value is null/undefined, pass undefined
              const selectedValue = value && value.value ? value.value : undefined
              onCostCenterChange(index, selectedValue)
            }}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:initiate_expense_plan.create_expense_plan.cost_center_select_placeholder',
              'Select Cost Center'
            )}
            value={(() => {
              // Only show existing value, not defaults after clearing
              if (item.costCenterId) {
                const costCenter = costCenters.find(cc => cc.id === item.costCenterId)
                // Only return value if we have the cost center data loaded
                return costCenter
                  ? {
                      value: item.costCenterId,
                      label: costCenter.name
                    }
                  : undefined
              }
              return undefined
            })()}
            required={true}
          />

          {/* Project SelectField */}
          <SelectField
            allowClear
            className="gba:mt-4"
            label={getTranslationFromI18nKeyAndLabel('lowcoder:add_allowance_info_request.select_project', 'Project')}
            name={`allowance-project-${index}`}
            data-testid={`allowance-project-select-${index}`}
            data={projects
              .filter(element => {
                const costCenter = costCenters.find(cc => cc.id === item.costCenterId)
                return (
                  costCenter &&
                  element.structureId === costCenter.structureId &&
                  (!element.validTo || new Date(element.validTo) > new Date(item.expenseDate || new Date()))
                )
              })
              .map(project => ({
                id: project.id,
                name: project.name
              }))}
            onChange={(value: any) => {
              // Handle clearing - if value is null/undefined, pass undefined
              const selectedValue = value && value.value ? value.value : undefined
              onProjectChange(index, selectedValue)
            }}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:add_allowance_info_request.select_project_placeholder',
              'Select Project'
            )}
            value={(() => {
              // Only show existing value, not defaults after clearing
              if (item.projectId) {
                const project = projects.find(p => p.id === item.projectId)
                // Only return value if we have the project data loaded
                return project
                  ? {
                      value: item.projectId,
                      label: project.name
                    }
                  : undefined
              }
              return undefined
            })()}
          />

          {/* Deductions Section */}
          {hasDeductions && optionsToShow.length > 0 ? (
            <div className="gba:flex gba:flex-col" data-testid={`allowance-deductions-section-${index}`}>
              <span
                className="gba:font-semibold gba:text-black gba:text-base gba:py-3"
                data-testid={`allowance-deductions-title-${index}`}
              >
                {getTranslationFromI18nKeyAndLabel('lowcoder:expense_deduction.deductions_modal', 'Deductions')}
              </span>

              <div
                className="gba:grid gba:mt-4"
                style={{
                  gridTemplateColumns: 'repeat(4, minmax(0, 100px))',
                  gap: '20px',
                  justifyContent: 'space-between',
                  alignItems: 'stretch'
                }}
                data-testid={`allowance-deductions-buttons-${index}`}
              >
                {optionsToShow.map(option => {
                  const isSelected = selectedDeductions.includes(option.key)
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => toggleDeduction(option.key)}
                      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-center gba:bg-muted gba:text-black gba:text-base gba:p-2 gba:rounded-none gba:box-border gba:font-bold"
                      style={{
                        border: isSelected ? '2px solid black' : '2px solid transparent',
                        width: '100%',
                        height: 'auto',
                        maxWidth: '100px',
                        maxHeight: '100px',
                        aspectRatio: '1 / 1'
                      }}
                      data-testid={`allowance-deduction-button-${option.key}-${index}`}
                    >
                      <img
                        src={option.icon}
                        alt={option.label}
                        className="gba:w-6 gba:h-6 gba:mb-1"
                        data-testid={`allowance-deduction-icon-${option.key}-${index}`}
                      />
                      <span
                        className="gba:block gba:whitespace-normal gba:break-words gba:hyphens-auto gba:text-sm gba:leading-snug"
                        title={option.label}
                        lang={locale}
                        data-testid={`allowance-deduction-label-${option.key}-${index}`}
                      >
                        {option.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export default AllowanceContainer
