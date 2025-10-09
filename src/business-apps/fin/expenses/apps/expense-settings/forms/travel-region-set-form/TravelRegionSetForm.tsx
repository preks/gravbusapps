import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
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

export interface TravelRegionSetFormData {
  code: string;
  value: string;
  description?: string;
}

interface TravelRegionSetFormProps extends BusinessAppContextProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: TravelRegionSetFormData) => void;
  prefixDataTestId?: string;
}

const TravelRegionSetForm: React.FC<TravelRegionSetFormProps> = ({
  accessToken,
  open,
  onClose,
  onSave,
  prefixDataTestId = '',
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TravelRegionSetFormData>({
    code: '',
    value: '',
    description: ''
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
      // Create the catalog entry for TravelRegionSet
      const catalogEntry = {
        code: formData.code.trim(),
        value: formData.value.trim(),
        description: formData.description?.trim() || '',
        translations: [
          {
            localeCode: 'en',
            value: formData.value.trim()
          }
        ]
      };

      console.log('🚀 Creating Travel Region Set:', catalogEntry);
      
      await catalogClient.createCatalogEntry('TravelRegionSet', 'v1', catalogEntry);
      
      toast('Travel Region Set created successfully', 'success');
      onSave(formData);
      handleClose();
      
    } catch (err) {
      console.error('❌ Error creating Travel Region Set:', err);
      setError(err instanceof Error ? err.message : 'Failed to create Travel Region Set');
      toast('Failed to create Travel Region Set', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      code: '',
      value: '',
      description: ''
    });
    setError(null);
    onClose();
  };

  const handleInputChange = (field: keyof TravelRegionSetFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null); // Clear error when user starts typing
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent data-testid={`${prefixDataTestId}-travel-region-set-form`} className="gba:max-w-2xl gba:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {getTranslationFromI18nKeyAndLabel('expense-settings:create_travel_region_set', 'Create Travel Region Set')}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:overflow-y-auto gba:max-h-[calc(85vh-120px)]">
          {error && (
            <Alert className="gba:mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="gba:space-y-3 gba:px-1">
            <FormItem>
              <FormLabel className="gba:required gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('expense-settings:code', 'Code')}
              </FormLabel>
              <FormControl>
                <Input
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  placeholder="Enter unique code (e.g., EU_REGIONS)"
                  data-testid={`${prefixDataTestId}-code-input`}
                  disabled={isSubmitting}
                  className="gba:h-9 gba:text-sm"
                  required
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            <FormItem>
              <FormLabel className="gba:required gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('expense-settings:name', 'Name')}
              </FormLabel>
              <FormControl>
                <Input
                  value={formData.value}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                  placeholder="Enter display name (e.g., European Regions)"
                  data-testid={`${prefixDataTestId}-value-input`}
                  disabled={isSubmitting}
                  className="gba:h-9 gba:text-sm"
                  required
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            <FormItem>
              <FormLabel className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('expense-settings:description', 'Description')}
              </FormLabel>
              <FormControl>
                <Input
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter optional description"
                  data-testid={`${prefixDataTestId}-description-input`}
                  disabled={isSubmitting}
                  className="gba:h-9 gba:text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>

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
                disabled={isSubmitting || !formData.code.trim() || !formData.value.trim()}
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

export default TravelRegionSetForm;
