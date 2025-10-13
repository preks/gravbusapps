import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { ExpenseSettingsClient } from '../../utils/ExpenseSettingsClient';
import dayjs from 'dayjs';

// Custom toast function
const toast = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`[${type.toUpperCase()}] ${message}`);
};

export interface AllowanceRegionRuleFormData {
  code: string;
  name: string;
  description?: string;
  activeFrom: string;
  activeTo?: string;
  travelRegionSetRef?: string;
}

interface AllowanceRegionRuleFormProps extends BusinessAppContextProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AllowanceRegionRuleFormData) => void;
  travelRegionSetId?: string;
  travelRegionSetName?: string;
  prefixDataTestId?: string;
}

const AllowanceRegionRuleForm: React.FC<AllowanceRegionRuleFormProps> = ({
  accessToken,
  open,
  onClose,
  onSave,
  travelRegionSetId,
  travelRegionSetName,
  prefixDataTestId = '',
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AllowanceRegionRuleFormData>({
    code: '',
    name: '',
    description: '',
    activeFrom: dayjs().format('YYYY-MM-DD'),
    activeTo: '',
    travelRegionSetRef: travelRegionSetId
  });

  const expenseSettingsClient = new ExpenseSettingsClient();

  React.useEffect(() => {
    if (accessToken) {
      expenseSettingsClient.setAccessToken(accessToken);
    }
  }, [accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      setError('Code and Name are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create the allowance region rule
      const ruleData = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        activeFrom: formData.activeFrom ? `${formData.activeFrom}T00:00:00+00:00` : null,
        activeTo: formData.activeTo ? `${formData.activeTo}T00:00:00+00:00` : null,
        travelRegionSetRef: travelRegionSetId,
        additionalProperties: {},
        businessKey: formData.code.trim()
      };

      await expenseSettingsClient.saveAllowanceRegionRule(ruleData);
      
      toast('Allowance region rule created successfully', 'success');
      onSave(formData);
      handleClose();
      
    } catch (err) {
      console.error('❌ Error creating Allowance Region Rule:', err);
      setError(err instanceof Error ? err.message : 'Failed to create Allowance Region Rule');
      toast('Failed to create Allowance Region Rule', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      activeFrom: dayjs().format('YYYY-MM-DD'),
      activeTo: '',
      travelRegionSetRef: travelRegionSetId
    });
    setError(null);
    onClose();
  };

  const handleInputChange = (field: keyof AllowanceRegionRuleFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null); // Clear error when user starts typing
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent data-testid={`${prefixDataTestId}-allowance-region-rule-form`} className="gba:max-w-2xl gba:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {getTranslationFromI18nKeyAndLabel('expense-settings:create_allowance_rule', 'Create Allowance Region Rule')}
          </DialogTitle>
          {travelRegionSetName && (
            <p className="gba:text-sm gba:text-gray-600 gba:mt-1">
              Adding to: <span className="gba:font-medium">{travelRegionSetName}</span>
            </p>
          )}
        </DialogHeader>

        <div className="gba:overflow-y-auto gba:max-h-[calc(85vh-120px)]">
          {error && (
            <Alert className="gba:mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="gba:space-y-3 gba:px-1">
            <div className="gba:space-y-2">
              <label 
                className="gba:text-sm gba:font-medium gba:text-gray-700"
                htmlFor={`${prefixDataTestId}-code-input`}
              >
                {getTranslationFromI18nKeyAndLabel('expense-settings:code', 'Code')}
                <span className="gba:text-red-500 gba:ml-1">*</span>
              </label>
              <Input
                id={`${prefixDataTestId}-code-input`}
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="Enter unique code (e.g., HOTEL_EU)"
                data-testid={`${prefixDataTestId}-code-input`}
                disabled={isSubmitting}
                className="gba:h-9 gba:text-sm"
                required
              />
            </div>

            <div className="gba:space-y-2">
              <label 
                className="gba:text-sm gba:font-medium gba:text-gray-700"
                htmlFor={`${prefixDataTestId}-name-input`}
              >
                {getTranslationFromI18nKeyAndLabel('expense-settings:name', 'Name')}
                <span className="gba:text-red-500 gba:ml-1">*</span>
              </label>
              <Input
                id={`${prefixDataTestId}-name-input`}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter display name (e.g., Hotel Allowance Europe)"
                data-testid={`${prefixDataTestId}-name-input`}
                disabled={isSubmitting}
                className="gba:h-9 gba:text-sm"
                required
              />
            </div>

            <div className="gba:space-y-2">
              <label 
                className="gba:text-sm gba:font-medium gba:text-gray-700"
                htmlFor={`${prefixDataTestId}-description-input`}
              >
                {getTranslationFromI18nKeyAndLabel('expense-settings:description', 'Description')}
              </label>
              <Input
                id={`${prefixDataTestId}-description-input`}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter optional description"
                data-testid={`${prefixDataTestId}-description-input`}
                disabled={isSubmitting}
                className="gba:h-9 gba:text-sm"
              />
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-3">
              <div className="gba:space-y-2">
                <label 
                  className="gba:text-sm gba:font-medium gba:text-gray-700"
                  htmlFor={`${prefixDataTestId}-active-from-input`}
                >
                  {getTranslationFromI18nKeyAndLabel('expense-settings:active_from', 'Active From')}
                  <span className="gba:text-red-500 gba:ml-1">*</span>
                </label>
                <Input
                  id={`${prefixDataTestId}-active-from-input`}
                  type="date"
                  value={formData.activeFrom}
                  onChange={(e) => handleInputChange('activeFrom', e.target.value)}
                  data-testid={`${prefixDataTestId}-active-from-input`}
                  disabled={isSubmitting}
                  className="gba:h-9 gba:text-sm"
                  required
                />
              </div>

              <div className="gba:space-y-2">
                <label 
                  className="gba:text-sm gba:font-medium gba:text-gray-700"
                  htmlFor={`${prefixDataTestId}-active-to-input`}
                >
                  {getTranslationFromI18nKeyAndLabel('expense-settings:active_to', 'Active To')}
                </label>
                <Input
                  id={`${prefixDataTestId}-active-to-input`}
                  type="date"
                  value={formData.activeTo}
                  onChange={(e) => handleInputChange('activeTo', e.target.value)}
                  data-testid={`${prefixDataTestId}-active-to-input`}
                  disabled={isSubmitting}
                  className="gba:h-9 gba:text-sm"
                />
              </div>
            </div>

            <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isSubmitting}
                size="sm"
                className="gba:h-9 gba:text-sm"
                data-testid={`${prefixDataTestId}-cancel-button`}
              >
                {getTranslationFromI18nKeyAndLabel('expense-settings:cancel', 'Cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.code.trim() || !formData.name.trim()}
                size="sm"
                className="gba:h-9 gba:text-sm"
                data-testid={`${prefixDataTestId}-save-button`}
              >
                {isSubmitting 
                  ? getTranslationFromI18nKeyAndLabel('expense-settings:creating', 'Creating...') 
                  : getTranslationFromI18nKeyAndLabel('expense-settings:create', 'Create')
                }
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AllowanceRegionRuleForm;
