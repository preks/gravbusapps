import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageLayout,
  Spinner,
  useTranslation,
  type FilterConfiguration
} from '@newwork/nw-design-system'
import { DownloadIcon, FileXlsIcon, UserIcon } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import type { EntityExportDefinition } from '../types/configTypes'
import { useEntityExportPage } from '../hooks/useEntityExportPage'
import { ExportFieldPicker } from './ExportFieldPicker'
import { ExportExternalIdsDialog } from './ExportExternalIdsDialog'
import { ExportFilterPanel } from './ExportFilterPanel'
import translations from '../_i18n'

export interface EntityExportPageProps<TEntity, TQueryVars> extends BusinessAppContextProps {
  definition: EntityExportDefinition<TEntity, TQueryVars>
  headerIcon?: Icon
  headerTitle: string
  headerDescription: string
  onBack?: () => void
  prefixDataTestId?: string
  enhanceFilterConfig?: (config: FilterConfiguration) => FilterConfiguration
  externalFilterLoading?: boolean
}

export function EntityExportPage<TEntity, TQueryVars>({
  definition,
  headerIcon: HeaderIcon = UserIcon,
  headerTitle,
  headerDescription,
  onBack,
  prefixDataTestId = 'EntityExportPage',
  enhanceFilterConfig,
  externalFilterLoading,
  ...context
}: Readonly<EntityExportPageProps<TEntity, TQueryVars>>) {
  const { t } = useTranslation(translations)
  const {
    selectedFilters,
    selectedFieldKeys,
    selectedExternalIdKeys,
    externalIdsDialogOpen,
    externalIdFields,
    totalCount,
    isCountLoading,
    dynamicFilterConfig,
    exportFields,
    filterGroupsLoading,
    handleFilterChange,
    handleFieldToggle,
    handleSelectAllFields,
    handleClearAllFields,
    handleExternalIdToggle,
    handleExternalIdsDialogOpenChange,
    handleConfirmExternalIdsExport,
    isExporting,
    handleExportCsv,
    handleExportExcel
  } = useEntityExportPage({ context, definition, enhanceFilterConfig, externalFilterLoading })

  const canExport = totalCount > 0 && selectedFieldKeys.length > 0 && !isExporting

  const countLabel = isCountLoading ? t('count-loading') : t('count-matches', { count: totalCount })

  return (
    <PageLayout
      headerIcon={HeaderIcon}
      headerTitle={headerTitle}
      headerDescription={headerDescription}
      onBack={onBack}
      data-testid={formatDataTestId(prefixDataTestId, 'page')}
    >
      <div className="gba:space-y-6">
        <Card data-testid={formatDataTestId(prefixDataTestId, 'filters-card')}>
          <CardHeader>
            <CardTitle className="gba:text-base">{t('filters-card-title')}</CardTitle>
            <CardDescription>{t('filters-card-description', { entityLabel: definition.entityLabel })}</CardDescription>
          </CardHeader>
          <CardContent>
            <ExportFilterPanel
              filterConfiguration={dynamicFilterConfig}
              values={selectedFilters}
              onChange={handleFilterChange}
              isLoading={filterGroupsLoading}
              prefixDataTestId={`${prefixDataTestId}-filters`}
            />
          </CardContent>
        </Card>

        <Card data-testid={formatDataTestId(prefixDataTestId, 'summary-card')}>
          <CardHeader className="gba:flex gba:flex-row gba:items-start gba:justify-between gba:gap-4 gba:space-y-0">
            <div className="gba:space-y-1">
              <CardTitle className="gba:text-base">{t('summary-card-title')}</CardTitle>
              {isCountLoading ? (
                <Spinner data-testid={formatDataTestId(prefixDataTestId, 'count-spinner')} />
              ) : (
                <CardDescription data-testid={formatDataTestId(prefixDataTestId, 'count')}>
                  {countLabel}
                </CardDescription>
              )}
              {selectedFieldKeys.length === 0 && (
                <p className="gba:text-sm gba:text-destructive">{t('select-column-warning')}</p>
              )}
            </div>
            <div className="gba:flex gba:shrink-0 gba:gap-2">
              <Button
                onClick={handleExportCsv}
                variant="outline"
                size="sm"
                disabled={!canExport}
                data-testid={formatDataTestId(prefixDataTestId, 'export-csv')}
              >
                <DownloadIcon className="gba:mr-2" />
                {isExporting ? t('exporting-label') : t('export-csv')}
              </Button>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                disabled={!canExport}
                data-testid={formatDataTestId(prefixDataTestId, 'export-excel')}
              >
                <FileXlsIcon className="gba:mr-2" />
                {isExporting ? t('exporting-label') : t('export-excel')}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card data-testid={formatDataTestId(prefixDataTestId, 'fields-card')}>
          <CardHeader>
            <CardTitle className="gba:text-base">{t('columns-card-title')}</CardTitle>
            <CardDescription>{t('columns-card-description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ExportFieldPicker
              fields={exportFields}
              selectedFieldKeys={selectedFieldKeys}
              onFieldToggle={handleFieldToggle}
              onSelectAll={handleSelectAllFields}
              onClearAll={handleClearAllFields}
              prefixDataTestId={`${prefixDataTestId}-fields`}
            />
          </CardContent>
        </Card>
      </div>

      <ExportExternalIdsDialog
        open={externalIdsDialogOpen}
        onOpenChange={handleExternalIdsDialogOpenChange}
        externalIdFields={externalIdFields}
        selectedExternalIdKeys={selectedExternalIdKeys}
        onExternalIdToggle={handleExternalIdToggle}
        onConfirm={handleConfirmExternalIdsExport}
        isExporting={isExporting}
        prefixDataTestId={`${prefixDataTestId}-external-ids`}
      />
    </PageLayout>
  )
}
