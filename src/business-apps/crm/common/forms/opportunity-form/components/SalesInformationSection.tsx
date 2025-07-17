import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, Label } from '@newwork/nw-design-system';
import { PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useOpportunityFormContext } from '../context/OpportunityFormContext';

const prefixDataTestId = 'OpportunityForm';

const SalesInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  
  const {
    formValues,
    setFormValues,
    currencies,
    pipelines,
    salesPipelineStages,
  } = useOpportunityFormContext();

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
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #93c5fd, #86efac)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #bfdbfe, #a7f3d0)';
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'SalesInfoToggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></div>
          Sales Information
        </h3>
        {isExpanded ? (
          <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-500" />
        ) : (
          <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="gba:p-6 gba:space-y-6">
          
          {/* Pipeline and Sales Pipeline Stage - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:w-full">
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Pipeline
              </label>
              <Select
                value={formValues.pipeline}
                onValueChange={(value) => setFormValues({ pipeline: value })}
                data-testid={formatDataTestId(prefixDataTestId, 'PipelineSelect')}
              >
                <SelectTrigger className="gba:w-full">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((option) => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="gba:w-full">
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Sales Pipeline Stage
              </label>
              <Select
                value={formValues.salesPipelineStage}
                onValueChange={(value) => setFormValues({ salesPipelineStage: value })}
                data-testid={formatDataTestId(prefixDataTestId, 'SalesPipelineStageSelect')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent>
                  {salesPipelineStages.map((option) => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stage and Status - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:w-full">
              <Label htmlFor="stage" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Stage
              </Label>
              <Input
                id="stage"
                name="stage"
                value={formValues.stage}
                onChange={(e) => setFormValues({ stage: e.target.value })}
                placeholder="Please Enter..."
                data-testid={formatDataTestId(prefixDataTestId, 'StageInput')}
              />
            </div>

            <div className="gba:w-full">
              <Label htmlFor="status" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Status
              </Label>
              <Input
                id="status"
                name="status"
                value={formValues.status}
                onChange={(e) => setFormValues({ status: e.target.value })}
                placeholder="Please Enter..."
                data-testid={formatDataTestId(prefixDataTestId, 'StatusInput')}
              />
            </div>
          </div>
          
          {/* Estimated Amount and Currency - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:w-full">
              <Label htmlFor="estimatedAmount" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Estimated Amount
              </Label>
              <Input
                id="estimatedAmount"
                name="estimatedAmount"
                type="number"
                step="0.01"
                value={formValues.estimatedAmount}
                onChange={(e) => setFormValues({ estimatedAmount: e.target.value })}
                placeholder="0.00"
                data-testid={formatDataTestId(prefixDataTestId, 'EstimatedAmountInput')}
              />
            </div>

            <div className="gba:w-full">
              <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Currency
              </label>
              <Select
                value={formValues.currency}
                onValueChange={(value) => setFormValues({ currency: value })}
                data-testid={formatDataTestId(prefixDataTestId, 'CurrencySelect')}
              >
                <SelectTrigger className="gba:w-full">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((option) => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Winning Chance and Close Date - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:w-full">
              <Label htmlFor="winningChance" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Winning Chance (%)
              </Label>
              <Input
                id="winningChance"
                name="winningChance"
                type="number"
                min="0"
                max="100"
                step="1"
                value={formValues.winningChance}
                onChange={(e) => setFormValues({ winningChance: e.target.value })}
                placeholder="0"
                data-testid={formatDataTestId(prefixDataTestId, 'WinningChanceInput')}
              />
            </div>

            <div className="gba:w-full">
              <Label htmlFor="closeDate" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Close Date
              </Label>
              <Input
                id="closeDate"
                name="closeDate"
                type="date"
                value={formValues.closeDate}
                onChange={(e) => setFormValues({ closeDate: e.target.value })}
                data-testid={formatDataTestId(prefixDataTestId, 'CloseDateInput')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesInformationSection; 