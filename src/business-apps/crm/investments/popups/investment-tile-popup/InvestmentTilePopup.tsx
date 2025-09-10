import React, { useEffect } from 'react';
import { 
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
  Alert,
  Spinner
} from '@newwork/nw-design-system';
import { AppActionForm } from '@/components/app-action-form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  useInvestmentTileData
} from './queries/InvestmentTileQueries';
import { useInvestmentTileFields } from '@/business-apps/crm/investments/apps/investment-record/hooks/useInvestmentTileFields';
import { InvestmentTilePopupProps, TileFormData } from './types';

const prefixDataTestId = 'investment-tile-popup';

// Form validation schema
const tileFormSchema = z.object({
  tileValue: z.string().min(1, 'Tile value is required'),
});

export const InvestmentTilePopup: React.FC<InvestmentTilePopupProps> = ({
  onClose,
  onSave,
  accessToken,
  userInfo,
  additionalData
}) => {
  // Create business app context
  const businessAppContext = {
    accessToken,
    userInfo,
    additionalData
  };

  // Extract investmentId and tileKey from additionalData following the same pattern as investment form
  const investmentId = additionalData?.investmentId || 
    additionalData?.psi_taskPayload?.psi_initialParameters?.investmentId ||
    additionalData?.id;
  
  const tileKey = additionalData?.tileKey || 
    additionalData?.psi_taskPayload?.psi_initialParameters?.tileKey;

  // Debug logging
  console.log('InvestmentTilePopup - additionalData:', additionalData);
  console.log('InvestmentTilePopup - extracted investmentId:', investmentId);
  console.log('InvestmentTilePopup - extracted tileKey:', tileKey);

  // Validate required data
  if (!investmentId) {
    return (
      <Alert
        variant="destructive"
        data-testid={`${prefixDataTestId}-missing-investment-id`}
      >
        No investment ID found in context data
      </Alert>
    );
  }

  if (!tileKey) {
    return (
      <Alert
        variant="destructive"
        data-testid={`${prefixDataTestId}-missing-tile-key`}
      >
        No tile key found in context data
      </Alert>
    );
  }

  // Use the hook for data loading only
  const { investment, tileValue, loading, error } = useInvestmentTileData(
    businessAppContext,
    investmentId,
    tileKey
  );

  // Get tile fields definition to find the label for this tileKey
  const { processedTiles, loading: tilesLoading } = useInvestmentTileFields(
    businessAppContext, 
    investment
  );

  // Find the label for the current tileKey
  const tileLabel = React.useMemo(() => {
    if (!processedTiles.length || !tileKey) return 'Tile Value';
    
    const tileField = processedTiles.find(tile => tile.key === tileKey);
    return tileField?.label || 'Tile Value';
  }, [processedTiles, tileKey]);

  // Form setup with automatic sync to tileValue from hook
  const form = useForm<TileFormData>({
    resolver: zodResolver(tileFormSchema),
    defaultValues: {
      tileValue: ''
    }
  });

  // Sync form with loaded tile value
  useEffect(() => {
    if (tileValue !== undefined) {
      form.reset({
        tileValue: tileValue
      });
    }
  }, [tileValue, form]);

  // Handle form submission - create payload for AppActionForm
  const handleSubmit = async (formData: TileFormData) => {
    if (!investment) {
      throw new Error('Investment data not loaded');
    }

    // Get current additionalProperties
    const currentAdditionalProps = investment.additionalProperties || {};
    const currentTiles = currentAdditionalProps.tiles || {};

    // Update the specific tile using tileKey from props
    const updatedTiles = {
      ...currentTiles,
      [tileKey]: formData.tileValue
    };

    // Create updated additionalProperties
    const updatedAdditionalProps = {
      ...currentAdditionalProps,
      tiles: updatedTiles
    };

    // Determine the investment sub-type and include it in the payload
    const getInvestmentSubType = () => {
      // Check for equity investment
      if (investment.equityInvestment && Array.isArray(investment.equityInvestment) && investment.equityInvestment.length > 0) {
        return { equityInvestment: investment.equityInvestment[0] };
      }
      
      // Check for real estate investment
      if (investment.realEstateInvestment && Array.isArray(investment.realEstateInvestment) && investment.realEstateInvestment.length > 0) {
        return { realEstateInvestment: investment.realEstateInvestment[0] };
      }
      
      // Check for liquid fund investment
      if (investment.liquidFundInvestment && Array.isArray(investment.liquidFundInvestment) && investment.liquidFundInvestment.length > 0) {
        return { liquidFundInvestment: investment.liquidFundInvestment[0] };
      }
      
      // Fallback: try to determine from investment group
      const groupCode = investment.investmentGroup?.code || investment.groupRef;
      if (typeof groupCode === 'string') {
        const code = groupCode.includes(':') ? groupCode.split(':').pop() : groupCode;
        switch (code?.toUpperCase()) {
          case 'EQUITY':
            return { equityInvestment: {} };
          case 'REAL_ESTATE':
            return { realEstateInvestment: {} };
          case 'LIQUID_FUND':
            return { liquidFundInvestment: {} };
        }
      }
      
      console.warn('Could not determine investment sub-type for investment:', investment);
      return {};
    };

    const subType = getInvestmentSubType();

    // Create payload for AppActionForm in the required format
    const payload = {
      investmentRequest: {
        investment: {
          id: investmentId,
          version: investment.version,
          additionalProperties: updatedAdditionalProps
        },
        ...subType // Include the appropriate sub-type
      },
      changeMode: 'UPDATE'
    };

    console.log('InvestmentTilePopup - payload for AppActionForm:', payload);

    // Call success callback with updated values
    if (onSave) {
      onSave(tileKey, formData.tileValue);
    }

    // Return the payload for AppActionForm to handle
    return payload;
  };

  // Show loading state (investment data or tile fields)
  if (loading || tilesLoading) {
    return (
      <div 
        className="gba:flex gba:items-center gba:justify-center gba:py-8"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner size="lg" />
        <span className="gba:ml-2">Loading investment data...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <Alert
        variant="destructive"
        data-testid={`${prefixDataTestId}-error`}
      >
        {error}
      </Alert>
    );
  }

  // Show form when investment data is loaded
  if (!investment) {
    return null;
  }

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleSubmit}
      onCancel={onClose}
      formData={form.getValues()}
      form={form}
      businessAppContext={businessAppContext}
      data-testid={`${prefixDataTestId}-form`}
      submitButtonText="Save Tile"
      cancelButtonText="Cancel"
    >
      <div className="gba:space-y-4" data-testid={`${prefixDataTestId}-form-content`}>
        
        {/* Tile Value Field with Dynamic Label */}
        <FormField
          control={form.control}
          name="tileValue"
          render={({ field }) => (
            <FormItem data-testid={`${prefixDataTestId}-tile-value-field`}>
              <FormLabel>{tileLabel}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={`Enter ${tileLabel.toLowerCase()}`}
                  rows={6}
                  data-testid={`${prefixDataTestId}-tile-value-input`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

      </div>
    </AppActionForm>
  );
};
