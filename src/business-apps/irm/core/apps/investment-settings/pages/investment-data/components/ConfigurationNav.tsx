import React from 'react'
import { TabNav, TabNavLink } from '@newwork/nw-design-system'
import { ListBulletsIcon, TableIcon, GaugeIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface ConfigurationNavProps extends BusinessAppContextProps {
  configSection: 'form' | 'prospect' | 'tile'
  formFieldsCount: number
  prospectFieldsCount: number
  tileFieldsCount: number
  onSectionChange: (section: 'form' | 'prospect' | 'tile') => void
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'configuration-nav'

export const ConfigurationNav: React.FC<ConfigurationNavProps> = ({
  configSection,
  formFieldsCount,
  prospectFieldsCount,
  tileFieldsCount,
  onSectionChange,
  prefixDataTestId
}) => {
  const safePrefix = prefixDataTestId ? `${prefixDataTestId}-` : ''

  return (
    <TabNav
      orientation="vertical"
      showBorder
      verticalIndicatorSide="left"
      className="gba:w-[200px]"
      data-testid={`${safePrefix}${DATA_TEST_ID}`}
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
        Form Fields ({formFieldsCount})
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
        Prospect Fields ({prospectFieldsCount})
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
        Tile Fields ({tileFieldsCount})
      </TabNavLink>
    </TabNav>
  )
}
