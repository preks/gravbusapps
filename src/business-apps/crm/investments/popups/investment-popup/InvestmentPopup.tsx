import React from 'react';
import { Alert } from '@newwork/nw-design-system';
import { InvestmentTileComponent } from './components/InvestmentTileComponent';
import { InvestmentExitComponent } from './components/InvestmentExitComponent';
import { InvestmentStatusComponent } from './components/InvestmentStatusComponent';
import { InvestmentPopupProps, INVESTMENT_POPUP_SCOPES } from './types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

const prefixDataTestId = 'investment-popup';

export const InvestmentPopup: React.FC<InvestmentPopupProps> = ({
  onClose,
  onSave,
  accessToken,
  userInfo,
  additionalData
}) => {
  // Extract scope from additionalData
  const scope = additionalData?.scope || additionalData?.psi_taskPayload?.psi_initialParameters?.scope;

  // Validate scope
  if (!scope) {
    return (
      <Alert
        variant="destructive"
        data-testid={`${prefixDataTestId}-missing-scope`}
      >
        {getTranslationFromI18nKeyAndLabel('investment.popup.error.missingScope', 'No scope found in context data. Please specify \'tile\', \'exit\', or \'status\'.')}
      </Alert>
    );
  }

  if (!Object.values(INVESTMENT_POPUP_SCOPES).includes(scope as any)) {
    return (
      <Alert
        variant="destructive"
        data-testid={`${prefixDataTestId}-invalid-scope`}
      >
        {getTranslationFromI18nKeyAndLabel('investment.popup.error.invalidScope', `Invalid scope '${scope}'. Must be one of: tile, exit, status.`)}
      </Alert>
    );
  }

  // Route to appropriate component based on scope
  switch (scope) {
    case INVESTMENT_POPUP_SCOPES.TILE: {
      // Extract tileKey for tile scope
      const tileKey = additionalData?.tileKey || 
        additionalData?.psi_taskPayload?.psi_initialParameters?.tileKey;
      
      if (!tileKey) {
        return (
          <Alert
            variant="destructive"
            data-testid={`${prefixDataTestId}-missing-tile-key`}
          >
            {getTranslationFromI18nKeyAndLabel('investment.popup.error.missingTileKey', 'No tile key found for tile scope. Please specify tileKey in context data.')}
          </Alert>
        );
      }

      return (
        <InvestmentTileComponent
          onClose={onClose}
          onSave={(tileKey, tileValue) => onSave?.(scope, { tileKey, tileValue })}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
          tileKey={tileKey}
        />
      );
    }

    case INVESTMENT_POPUP_SCOPES.EXIT:
      return (
        <InvestmentExitComponent
          onClose={onClose}
          onSave={(plannedExit, plannedExitDate) => onSave?.(scope, { plannedExit, plannedExitDate })}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
        />
      );

    case INVESTMENT_POPUP_SCOPES.STATUS:
      return (
        <InvestmentStatusComponent
          onClose={onClose}
          onSave={(statusRef) => onSave?.(scope, { statusRef })}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
        />
      );

    default:
      return (
        <Alert
          variant="destructive"
          data-testid={`${prefixDataTestId}-unknown-scope`}
        >
          {getTranslationFromI18nKeyAndLabel('investment.popup.error.unknownScope', `Unknown scope: ${scope}`)}
        </Alert>
      );
  }
};
