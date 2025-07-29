import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, Label } from '@newwork/nw-design-system';
import { PiCaretDown, PiCaretUp } from 'react-icons/pi';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useAccountFormContext } from '../context/AccountFormContext';

const prefixDataTestId = 'AccountForm';

const FinancialInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  
  const {
    formValues,
    setFormValues,
    currencies,
    timeZones,
    numberOfEmployeesOptions,
  } = useAccountFormContext();

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-6 gba:py-4 gba:border-b gba:border-gray-100 gba:bg-gradient-to-r gba:from-red-200 gba:to-pink-200 gba:hover:from-red-300 gba:hover:to-pink-300 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left"
        style={{
          background: 'linear-gradient(to right, #fecaca, #fbb6ce)',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #fca5a5, #f9a8d4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(to right, #fecaca, #fbb6ce)';
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'FinancialInfoToggle')}
      >
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:flex gba:items-center gba:gap-2">
          <div className="gba:w-2 gba:h-2 gba:bg-red-500 gba:rounded-full"></div>
          Financial Information
        </h3>
        {isExpanded ? (
          <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-500" />
        ) : (
          <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="gba:p-6 gba:space-y-6">
          
          {/* Annual Revenue and Currency - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:w-full">
              <Label htmlFor="annualRevenue" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Annual Revenue
              </Label>
              <Input
                id="annualRevenue"
                name="annualRevenue"
                value={formValues.annualRevenue}
                onChange={(e) => setFormValues({ annualRevenue: e.target.value })}
                placeholder="Please Enter..."
                className="gba:w-full"
                data-testid={formatDataTestId(prefixDataTestId, 'AnnualRevenueInput')}
              />
            </div>

            <div className="gba:w-full">
              <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Currency
              </Label>
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

          {/* Number of Employees and Time Zone - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:w-full">
              <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Number of Employees
              </Label>
              <Select
                value={formValues.numberOfEmployees}
                onValueChange={(value) => setFormValues({ numberOfEmployees: value })}
                data-testid={formatDataTestId(prefixDataTestId, 'NumberOfEmployeesSelect')}
              >
                <SelectTrigger className="gba:w-full">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent>
                  {numberOfEmployeesOptions.map((option) => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="gba:w-full">
              <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Time Zone
              </Label>
              <Select
                value={formValues.timeZone}
                onValueChange={(value) => setFormValues({ timeZone: value })}
                data-testid={formatDataTestId(prefixDataTestId, 'TimeZoneSelect')}
              >
                <SelectTrigger className="gba:w-full">
                  <SelectValue placeholder="Please Select..." />
                </SelectTrigger>
                <SelectContent>
                  {timeZones.map((option) => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Foundation Date and Ticker Symbol - Side by side */}
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
            <div className="gba:w-full">
              <Label htmlFor="foundationDate" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Foundation Date
              </Label>
              <Input
                id="foundationDate"
                name="foundationDate"
                value={formValues.foundationDate}
                onChange={(e) => setFormValues({ foundationDate: e.target.value })}
                placeholder="Please Enter..."
                className="gba:w-full"
                data-testid={formatDataTestId(prefixDataTestId, 'FoundationDateInput')}
              />
            </div>

            <div className="gba:w-full">
              <Label htmlFor="tickerSymbol" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
                Ticker Symbol
              </Label>
              <Input
                id="tickerSymbol"
                name="tickerSymbol"
                value={formValues.tickerSymbol}
                onChange={(e) => setFormValues({ tickerSymbol: e.target.value })}
                placeholder="Please Enter..."
                className="gba:w-full"
                data-testid={formatDataTestId(prefixDataTestId, 'TickerSymbolInput')}
              />
            </div>
          </div>

          {/* SIC Code */}
          <div>
            <Label htmlFor="sicCode" className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
              SIC Code
            </Label>
            <Input
              id="sicCode"
              name="sicCode"
              value={formValues.sicCode}
              onChange={(e) => setFormValues({ sicCode: e.target.value })}
              placeholder="Please Enter..."
              data-testid={formatDataTestId(prefixDataTestId, 'SicCodeInput')}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialInformationSection; 