import React from 'react'
import { TabNav, TabNavLink } from '@newwork/nw-design-system'
import { ListBulletsIcon, TableIcon, GaugeIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from 'react-i18next'
import { ConfigurationInfoPopover } from './ConfigurationInfoPopover'

interface ConfigurationNavProps extends BusinessAppContextProps {
  configSection: 'form' | 'prospect' | 'tile'
  formFieldsCount: number
  prospectFieldsCount: number
  tileFieldsCount: number
  isFormInherited: boolean
  isProspectInherited: boolean
  isTileInherited: boolean
  onSectionChange: (section: 'form' | 'prospect' | 'tile') => void
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'configuration-nav'

export const ConfigurationNav: React.FC<ConfigurationNavProps> = ({
  configSection,
  formFieldsCount,
  prospectFieldsCount,
  tileFieldsCount,
  isFormInherited,
  isProspectInherited,
  isTileInherited,
  onSectionChange,
  prefixDataTestId
}) => {
  const { t } = useTranslation()
  const safePrefix = prefixDataTestId ? `${prefixDataTestId}-` : ''
  const formatCount = (count: number, isInherited: boolean) =>
    isInherited ? `${count} ${t('crm.investment_data.nav.inherited_label', 'inherited')}` : String(count)

  return (
    <div className="gba:w-56 gba:space-y-2" data-testid={`${safePrefix}${DATA_TEST_ID}`}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-3">
        <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
          {t('crm.investment_data.nav.sections_label', 'Sections')}
        </span>
        <ConfigurationInfoPopover
          title={t('crm.investment_data.info.sections.title', 'Field configuration sections')}
          description={t(
            'crm.investment_data.info.sections.description',
            'Use these sections to decide where investment fields appear across forms, records, reports, and compact related-record views.'
          )}
          items={[
            t(
              'crm.investment_data.info.sections.item_form_fields',
              'Form Fields control investment forms, views, records, and report layout availability.'
            ),
            t(
              'crm.investment_data.info.sections.item_prospect_fields',
              'Prospect Fields control compact investment context in account, contact, and opportunity records.'
            ),
            t(
              'crm.investment_data.info.sections.item_tile_fields',
              'Tile Fields control tiles shown on investment records.'
            )
          ]}
          ariaLabel={t('crm.investment_data.info.sections.aria', 'Learn about field configuration sections')}
          prefixDataTestId={`${safePrefix}${DATA_TEST_ID}-sections-info`}
        />
      </div>
      <TabNav
        orientation="vertical"
        showBorder
        verticalIndicatorSide="left"
        data-testid={`${safePrefix}${DATA_TEST_ID}-links`}
      >
        <TabNavLink
          href="#form"
          active={configSection === 'form'}
          startIcon={<ListBulletsIcon className="gba:w-4 gba:h-4" />}
          onClick={e => {
            e.preventDefault()
            onSectionChange('form')
          }}
          data-testid={`${safePrefix}${DATA_TEST_ID}-form`}
        >
          {t('crm.investment_data.nav.form_fields', 'Form Fields')} ({formatCount(formFieldsCount, isFormInherited)})
        </TabNavLink>
        <TabNavLink
          href="#prospect"
          active={configSection === 'prospect'}
          startIcon={<TableIcon className="gba:w-4 gba:h-4" />}
          onClick={e => {
            e.preventDefault()
            onSectionChange('prospect')
          }}
          data-testid={`${safePrefix}${DATA_TEST_ID}-prospect`}
        >
          {t('crm.investment_data.nav.prospect_fields', 'Prospect Fields')} (
          {formatCount(prospectFieldsCount, isProspectInherited)})
        </TabNavLink>
        <TabNavLink
          href="#tile"
          active={configSection === 'tile'}
          startIcon={<GaugeIcon className="gba:w-4 gba:h-4" />}
          onClick={e => {
            e.preventDefault()
            onSectionChange('tile')
          }}
          data-testid={`${safePrefix}${DATA_TEST_ID}-tile`}
        >
          {t('crm.investment_data.nav.tile_fields', 'Tile Fields')} ({formatCount(tileFieldsCount, isTileInherited)})
        </TabNavLink>
      </TabNav>
    </div>
  )
}
