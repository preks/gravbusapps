import React from 'react';
import { Button } from '@newwork/gravity-ui-catalog';
import { SelectField } from '@newwork/gravity-ui-catalog';
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { CostCenter } from '../../utils/types';
import { ICONS } from '@/business-apps/fin/expenses/utils/icons';
import { getDayName } from '../../utils/allowanceScreenUtils';

/**
 * Props for the AllowanceContainer component
 */
interface AllowanceContainerProps {
  item: any;
  index: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  costCenters: CostCenter[];
  defaultCostCenter?: string;
  onCostCenterChange: (index: number, value: string | undefined) => void;
  projects: any[];
  defaultProject?: string;
  onProjectChange: (index: number, value: string | undefined) => void;
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
  defaultCostCenter,
  onCostCenterChange,
  projects,
  defaultProject,
  onProjectChange
}) => {
  const dateToDisplay = item.allowanceDate || item.expenseDate;
  
  return (
    <div className="gba:allowanceContainer" data-testid={`allowance-container-${index}`}>
      <div className="gba:allowanceHeader" data-testid={`allowance-header-${index}`}>
        <div className="gba:allowanceTitleWrapper" data-testid={`allowance-title-wrapper-${index}`}>
          <img 
            src={ICONS.CALENDAR_ICON} 
            alt="Calendar" 
            style={{ width: "24px", height: "24px" }}
            data-testid={`allowance-icon-${index}`}
          />
          <span className="gba:allowanceTitle" data-testid={`allowance-title-${index}`}>
            {dateToDisplay ? `${getDayName(dateToDisplay)}, ${formatDate(dateToDisplay)}` : `Allowance ${index + 1}`}
          </span>
        </div>
        <div className="gba:allowanceActions" data-testid={`allowance-actions-${index}`}>
          <Button
            variant="text"
            className="gba:collapseButton"
            data-testid={`collapse-button-${index}`}
            onClick={onToggleCollapse}
          >
            <img 
              src={isCollapsed ? ICONS.DOWN_ARROW : ICONS.UP_ARROW} 
              alt={isCollapsed ? "Expand" : "Collapse"} 
              style={{ width: "24px", height: "24px" }}
              data-testid={`collapse-icon-${index}`}
            />
          </Button>
        </div>
      </div>
      
      {/* Only show content when not collapsed */}
      {!isCollapsed && (
        <div className="gba:allowanceContent" data-testid={`allowance-content-${index}`}>
          <SelectField
            allowClear
            label={getTranslationFromI18nKeyAndLabel('lowcoder:initiate_expense_plan.create_expense_plan.cost_center_select_label', 'Cost Center')}
            name={`allowance-cost-center-${index}`}
            data-testid={`allowance-cost-center-select-${index}`}
            data={costCenters.map((cc) => ({
              id: cc.id,
              name: cc.name
            }))}
            onChange={(value: any) => {
              // Handle clearing - if value is null/undefined, pass undefined
              const selectedValue = value && value.value ? value.value : undefined;
              onCostCenterChange(index, selectedValue);
            }}
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:initiate_expense_plan.create_expense_plan.cost_center_select_placeholder', 'Select Cost Center')}
            value={(() => {
              // Only show existing value, not defaults after clearing
              if (item.costCenterId) {
                const costCenter = costCenters.find(cc => cc.id === item.costCenterId);
                // Only return value if we have the cost center data loaded
                return costCenter ? {
                  value: item.costCenterId,
                  label: costCenter.name
                } : undefined;
              }
              return undefined;
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
              .filter((element) => {
                const costCenter = costCenters.find(cc => cc.id === item.costCenterId);
                return costCenter && element.structureId === costCenter.structureId && 
                       (!element.validTo || new Date(element.validTo) > new Date(item.expenseDate || new Date()));
              })
              .map((project) => ({
                id: project.id,
                name: project.name
              }))}
            onChange={(value: any) => {
              // Handle clearing - if value is null/undefined, pass undefined
              const selectedValue = value && value.value ? value.value : undefined;
              onProjectChange(index, selectedValue);
            }}
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:add_allowance_info_request.select_project_placeholder', 'Select Project')}
            value={(() => {
              // Only show existing value, not defaults after clearing
              if (item.projectId) {
                const project = projects.find(p => p.id === item.projectId);
                // Only return value if we have the project data loaded
                return project ? {
                  value: item.projectId,
                  label: project.name
                } : undefined;
              }
              return undefined;
            })()}
          />
        </div>
      )}
    </div>
  );
};

export default AllowanceContainer;
