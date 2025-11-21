import React from 'react'
import { Alert } from '@newwork/nw-design-system'
import { InvestmentTileComponent } from './components/InvestmentTileComponent'
import { InvestmentExitComponent } from './components/InvestmentExitComponent'
import { InvestmentStatusComponent } from './components/InvestmentStatusComponent'
import { InvestmentLiquidityComponent } from './components/InvestmentLiquidityComponent'
import { InvestmentPpmForecastComponent } from './components/InvestmentPpmForecastComponent'
import { RealEstateLiquidityForecastComponent } from './components/RealEstateLiquidityForecastComponent'
import { InvestmentKpiComponent } from './components/InvestmentKpiComponent'
import { InvestmentTextTileComponent } from './components/InvestmentTextTileComponent'
import { InvestmentKpiTileComponent } from './components/InvestmentKpiTileComponent'
import { InvestmentTableTileComponent } from './components/InvestmentTableTileComponent'
import { InvestmentChartTileComponent } from './components/InvestmentChartTileComponent'
import { InvestmentTileDeleteComponent } from './components/InvestmentTileDeleteComponent'
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
          "No scope found in context data. Please specify 'tile', 'exit', 'status', 'liquidity', 'ppmforecast', 'liquidityForecast', 'kpi', or 'delete'."
        )}
      </Alert>
    )
  }

  if (!Object.values(INVESTMENT_POPUP_SCOPES).includes(scope as any)) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-invalid-scope`}>
        {getTranslationFromI18nKeyAndLabel(
          'investment.popup.error.invalidScope',
          `Invalid scope '${scope}'. Must be one of: tile, exit, status, liquidity, ppmforecast, liquidityForecast, kpi, delete.`
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

    case INVESTMENT_POPUP_SCOPES.LIQUIDITY_FORECAST:
      return (
        <RealEstateLiquidityForecastComponent
          onClose={onClose}
          onSave={forecastData => onSave?.(scope, { liquidityForecast: forecastData })}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
        />
      )

    case INVESTMENT_POPUP_SCOPES.TEXT: {
      // Extract tileId for text tile scope (optional - undefined for new tiles)
      const tileId = additionalData?.tileId || additionalData?.psi_taskPayload?.psi_initialParameters?.tileId

      return (
        <InvestmentTextTileComponent
          onClose={onClose}
          onSave={tileData => onSave?.(scope, { tileData })}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
          tileId={tileId}
        />
      )
    }

    case INVESTMENT_POPUP_SCOPES.KPI: {
      // Extract tileId for KPI tile scope (optional - undefined for new tiles)
      const tileId = additionalData?.tileId || additionalData?.psi_taskPayload?.psi_initialParameters?.tileId

      return (
        <InvestmentKpiTileComponent
          onClose={onClose}
          onSave={tileData => onSave?.(scope, { tileData })}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
          tileId={tileId}
        />
      )
    }

    case INVESTMENT_POPUP_SCOPES.TABLE: {
      // Extract tileId for table tile scope (optional - undefined for new tiles)
      const tileId = additionalData?.tileId || additionalData?.psi_taskPayload?.psi_initialParameters?.tileId

      return (
        <InvestmentTableTileComponent
          onClose={onClose}
          onSave={tileData => onSave?.(scope, { tileData })}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
          tileId={tileId}
        />
      )
    }

    case INVESTMENT_POPUP_SCOPES.CHART: {
      // Extract tileId for chart tile scope (optional - undefined for new tiles)
      const tileId = additionalData?.tileId || additionalData?.psi_taskPayload?.psi_initialParameters?.tileId

      return (
        <InvestmentChartTileComponent
          onClose={onClose}
          onSave={tileData => onSave?.(scope, { tileData })}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
          tileId={tileId}
        />
      )
    }

    case INVESTMENT_POPUP_SCOPES.KPI_FORECAST: {
      // Extract kpiKey for kpi forecast scope (MOIC/IRR)
      const kpiKey = additionalData?.key || additionalData?.psi_taskPayload?.psi_initialParameters?.key

      if (!kpiKey) {
        return (
          <Alert variant="destructive" data-testid={`${prefixDataTestId}-missing-kpi-key`}>
            {getTranslationFromI18nKeyAndLabel(
              'investment.popup.error.missingKpiKey',
              'No key found for kpi forecast scope. Please specify key in context data.'
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

    case INVESTMENT_POPUP_SCOPES.DELETE:
      return (
        <InvestmentTileDeleteComponent
          onClose={onClose}
          onSave={() => onSave?.(scope, {})}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
        />
      )

    default:
      return (
        <Alert variant="destructive" data-testid={`${prefixDataTestId}-unknown-scope`}>
          {getTranslationFromI18nKeyAndLabel('investment.popup.error.unknownScope', `Unknown scope: ${scope}`)}
        </Alert>
      )
  }
}
