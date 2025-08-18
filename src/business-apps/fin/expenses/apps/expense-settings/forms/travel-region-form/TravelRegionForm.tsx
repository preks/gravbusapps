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
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

// Custom toast function
const toast = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`[${type.toUpperCase()}] ${message}`);
};

export interface TravelRegionFormData {
  code: string;
  value: string;
  description?: string;
  parentCatalogEntryId?: string; // For associating with a Travel Region Set
}

interface TravelRegionFormProps extends BusinessAppContextProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: TravelRegionFormData) => void;
  travelRegionSetId?: string; // The parent Travel Region Set ID
  travelRegionSetName?: string; // For display purposes
  prefixDataTestId?: string;
}

const TravelRegionForm: React.FC<TravelRegionFormProps> = ({
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
  const [formData, setFormData] = useState<TravelRegionFormData>({
    code: '',
    value: '',
    description: '',
    parentCatalogEntryId: travelRegionSetId
  });

  const catalogClient = useCatalogManagerClient(accessToken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.value.trim()) {
      setError('Code and Name are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create the catalog entry for TravelRegion
      const catalogEntry = {
        code: formData.code.trim(),
        value: formData.value.trim(),
        description: formData.description?.trim() || '',
        parentCatalogEntryId: travelRegionSetId, // Associate with parent Travel Region Set
        translations: [
          {
            localeCode: 'en',
            value: formData.value.trim()
          }
        ]
      };

      console.log('🚀 Creating Travel Region:', catalogEntry);
      
      await catalogClient.createCatalogEntry('TravelRegion', 'v1', catalogEntry);
      
      toast('Travel Region created successfully', 'success');
      onSave({ ...formData, parentCatalogEntryId: travelRegionSetId });
      handleClose();
      
    } catch (err) {
      console.error('❌ Error creating Travel Region:', err);
      setError(err instanceof Error ? err.message : 'Failed to create Travel Region');
      toast('Failed to create Travel Region', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      code: '',
      value: '',
      description: '',
      parentCatalogEntryId: travelRegionSetId
    });
    setError(null);
    onClose();
  };

  const handleInputChange = (field: keyof TravelRegionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null); // Clear error when user starts typing
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent data-testid={`${prefixDataTestId}-travel-region-form`} className="gba:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {getTranslationFromI18nKeyAndLabel('expense-settings:create_travel_region', 'Create Travel Region')}
          </DialogTitle>
          {travelRegionSetName && (
            <p className="gba:text-sm gba:text-gray-600 gba:mt-1">
              Adding to: <span className="gba:font-medium">{travelRegionSetName}</span>
            </p>
          )}
        </DialogHeader>

        {error && (
          <Alert className="gba:mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="gba:space-y-4">
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
              placeholder="Enter unique code (e.g., EU_WEST)"
              data-testid={`${prefixDataTestId}-code-input`}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="gba:space-y-2">
            <label 
              className="gba:text-sm gba:font-medium gba:text-gray-700"
              htmlFor={`${prefixDataTestId}-value-input`}
            >
              {getTranslationFromI18nKeyAndLabel('expense-settings:name', 'Name')}
              <span className="gba:text-red-500 gba:ml-1">*</span>
            </label>
            <Input
              id={`${prefixDataTestId}-value-input`}
              value={formData.value}
              onChange={(e) => handleInputChange('value', e.target.value)}
              placeholder="Enter display name (e.g., Western Europe)"
              data-testid={`${prefixDataTestId}-value-input`}
              disabled={isSubmitting}
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
            />
          </div>

          <div className="gba:flex gba:justify-end gba:gap-3 gba:pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
              data-testid={`${prefixDataTestId}-cancel-button`}
            >
              {getTranslationFromI18nKeyAndLabel('expense-settings:cancel', 'Cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.code.trim() || !formData.value.trim()}
              data-testid={`${prefixDataTestId}-save-button`}
            >
              {isSubmitting 
                ? getTranslationFromI18nKeyAndLabel('expense-settings:creating', 'Creating...') 
                : getTranslationFromI18nKeyAndLabel('expense-settings:create', 'Create')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TravelRegionForm;
