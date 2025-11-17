import React from 'react'
import { Alert } from '@newwork/nw-design-system'
import { InvestmentTileComponent } from './components/InvestmentTileComponent'
import { InvestmentExitComponent } from './components/InvestmentExitComponent'
import { InvestmentStatusComponent } from './components/InvestmentStatusComponent'
import { InvestmentLiquidityComponent } from './components/InvestmentLiquidityComponent'
import { InvestmentPpmForecastComponent } from './components/InvestmentPpmForecastComponent'
import { InvestmentKpiComponent } from './components/InvestmentKpiComponent'
import { InvestmentPopupProps, INVESTMENT_POPUP_SCOPES } from './types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const prefixDataTestId = 'investment-popup'

export const InvestmentPopup: React.FC<InvestmentPopupProps> = ({
  onClose,
  onSave,
  accessToken,
  userInfo,
  additionalData
}) => {
  // Extract scope from additionalData
  const scope = additionalData?.scope || additionalData?.psi_taskPayload?.psi_initialParameters?.scope

  // Validate scope
  if (!scope) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-missing-scope`}>
        {getTranslationFromI18nKeyAndLabel(
          'investment.popup.error.missingScope',
          "No scope found in context data. Please specify 'tile', 'exit', 'status', 'liquidity', 'ppmforecast', or 'kpi'."
        )}
      </Alert>
    )
  }

  if (!Object.values(INVESTMENT_POPUP_SCOPES).includes(scope as any)) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-invalid-scope`}>
        {getTranslationFromI18nKeyAndLabel(
          'investment.popup.error.invalidScope',
          `Invalid scope '${scope}'. Must be one of: tile, exit, status, liquidity, ppmforecast, kpi.`
        )}
      </Alert>
    )
  }

  // Route to appropriate component based on scope
  switch (scope) {
    case INVESTMENT_POPUP_SCOPES.TILE: {
      // Extract tileKey for tile scope
      const tileKey = additionalData?.tileKey || additionalData?.psi_taskPayload?.psi_initialParameters?.tileKey

      if (!tileKey) {
        return (
          <Alert variant="destructive" data-testid={`${prefixDataTestId}-missing-tile-key`}>
            {getTranslationFromI18nKeyAndLabel(
              'investment.popup.error.missingTileKey',
              'No tile key found for tile scope. Please specify tileKey in context data.'
            )}
          </Alert>
        )
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
      )
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
      )

    case INVESTMENT_POPUP_SCOPES.STATUS:
      return (
        <InvestmentStatusComponent
          onClose={onClose}
          onSave={statusRef => onSave?.(scope, { statusRef })}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
        />
      )

    case INVESTMENT_POPUP_SCOPES.LIQUIDITY:
      return (
        <InvestmentLiquidityComponent
          onClose={onClose}
          onSave={liquidityPreferences => onSave?.(scope, { liquidityPreferences })}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
        />
      )

    case INVESTMENT_POPUP_SCOPES.PPMFORECAST:
      return (
        <InvestmentPpmForecastComponent
          onClose={onClose}
          onSave={forecasts => onSave?.(scope, { forecasts })}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
        />
      )

    case INVESTMENT_POPUP_SCOPES.KPI: {
      // Extract kpiKey for kpi scope
      const kpiKey = additionalData?.key || additionalData?.psi_taskPayload?.psi_initialParameters?.key

      if (!kpiKey) {
        return (
          <Alert variant="destructive" data-testid={`${prefixDataTestId}-missing-kpi-key`}>
            {getTranslationFromI18nKeyAndLabel(
              'investment.popup.error.missingKpiKey',
              'No key found for kpi scope. Please specify key in context data.'
            )}
          </Alert>
        )
      }

      return (
        <InvestmentKpiComponent
          onClose={onClose}
          onSave={(kpiKey, kpiValue) => onSave?.(scope, { kpiKey, kpiValue })}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
          kpiKey={kpiKey}
        />
      )
    }

    default:
      return (
        <Alert variant="destructive" data-testid={`${prefixDataTestId}-unknown-scope`}>
          {getTranslationFromI18nKeyAndLabel('investment.popup.error.unknownScope', `Unknown scope: ${scope}`)}
        </Alert>
      )
  }
}
