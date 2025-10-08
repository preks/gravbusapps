import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { 
  Button,
  Input,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system';
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

export interface TravelRegionSetModalProps extends BusinessAppContextProps {
  isVisible: boolean;
  onCancel: () => void;
  onSave: (data: TravelRegionSetFormData) => void;
  editingSet?: TravelRegionSetFormData | null;
  prefixDataTestId?: string;
}

const TravelRegionSetModal: React.FC<TravelRegionSetModalProps> = ({
  accessToken,
  isVisible,
  onCancel,
  onSave,
  editingSet,
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

  // Reset form when modal opens/closes or editingSet changes
  useEffect(() => {
    if (isVisible) {
      if (editingSet) {
        setFormData({
          code: editingSet.code || '',
          value: editingSet.value || '',
          description: editingSet.description || ''
        });
      } else {
        setFormData({
          code: '',
          value: '',
          description: ''
        });
      }
      setError(null);
    }
  }, [isVisible, editingSet]);

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
      
      if (editingSet) {
        // TODO: Implement update functionality when needed
        console.log('Update functionality not implemented yet');
        toast('Update functionality not implemented yet', 'error');
      } else {
        await catalogClient.createCatalogEntry('TravelRegionSet', 'v1', catalogEntry);
        toast('Travel Region Set created successfully', 'success');
      }
      
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
    onCancel();
  };

  const handleInputChange = (field: keyof TravelRegionSetFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null); // Clear error when user starts typing
  };

  const isEditMode = !!editingSet;
  const modalTitle = isEditMode 
    ? getTranslationFromI18nKeyAndLabel('expense-settings:edit_travel_region_set', 'Edit Travel Region Set')
    : getTranslationFromI18nKeyAndLabel('expense-settings:create_travel_region_set', 'Create Travel Region Set');

  // Temporary test - show a simple div instead of Dialog
  if (!isVisible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          minWidth: '400px',
          maxWidth: '500px'
        }}
        onClick={(e) => e.stopPropagation()}
        data-testid={`${prefixDataTestId}-travel-region-set-modal`}
      >
        <h2 style={{ margin: '0 0 20px 0' }}>
          {modalTitle}
        </h2>

        {error && (
          <Alert className="gba:mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="gba:space-y-4">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              {getTranslationFromI18nKeyAndLabel('expense-settings:code', 'Code')} *
            </label>
            <Input
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              placeholder="Enter unique code (e.g., EU_REGIONS)"
              data-testid={`${prefixDataTestId}-code-input`}
              disabled={isSubmitting}
              required
              style={{ marginTop: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              {getTranslationFromI18nKeyAndLabel('expense-settings:name', 'Name')} *
            </label>
            <Input
              value={formData.value}
              onChange={(e) => handleInputChange('value', e.target.value)}
              placeholder="Enter display name (e.g., European Regions)"
              data-testid={`${prefixDataTestId}-value-input`}
              disabled={isSubmitting}
              required
              style={{ marginTop: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              {getTranslationFromI18nKeyAndLabel('expense-settings:description', 'Description')}
            </label>
            <Input
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter optional description"
              data-testid={`${prefixDataTestId}-description-input`}
              disabled={isSubmitting}
              style={{ marginTop: '4px' }}
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
                ? (isEditMode 
                    ? getTranslationFromI18nKeyAndLabel('expense-settings:updating', 'Updating...') 
                    : getTranslationFromI18nKeyAndLabel('expense-settings:creating', 'Creating...')
                  )
                : (isEditMode 
                    ? getTranslationFromI18nKeyAndLabel('expense-settings:update', 'Update') 
                    : getTranslationFromI18nKeyAndLabel('expense-settings:create', 'Create')
                  )
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TravelRegionSetModal;
