import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Typography } from 'antd'
import { RiSettings4Fill, RiSearchLine } from '@remixicon/react'
import { PiUsersThreeDuotone } from 'react-icons/pi'
import { HrSettingsCard, HrSettingsCardProps } from './components/HrSettingsCard'
import { useHrSettingsCards } from './hooks/useHrSettingsCards'
import { cn } from '@/common/utils/cn'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'

export interface HrSettingsProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'HrSettings'

const HrSettings: React.FC<HrSettingsProps> = ({ 
  className, 
  prefixDataTestId 
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const allCards = useHrSettingsCards()
  const { t } = useTranslation()

  const filteredCards = useMemo(() => {
    if (!searchTerm.trim()) return allCards

    const normalizedSearchTerm = searchTerm.toLowerCase().trim()

    return allCards.filter((card: HrSettingsCardProps) => {
      // Search in card title
      if (card.title.toLowerCase().includes(normalizedSearchTerm)) return true

      // Search in card description
      if (card.description?.toLowerCase().includes(normalizedSearchTerm)) return true

      // Search in card entries
      if (card.entries?.some((entry) => entry.label.toLowerCase().includes(normalizedSearchTerm))) return true

      return false
    })
  }, [allCards, searchTerm])

  return (
    <PageLayout
      headerIcon={<PiUsersThreeDuotone color='#254469' />}
      headerLabel={t('hr.hr_settings')}
      className={className}
      pageHeaderRight={
        <Input
          prefix={<RiSearchLine style={{ color: '#9ca3af' }} />}
          placeholder={t('common.search_placeholder')}
          style={{ maxWidth: '320px' }}
          allowClear
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}-Search-Input`}
        />
      }
      contentContainer={
        <div 
          data-testid={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
          style={{ 
            background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)',
            minHeight: '100%',
            padding: '32px'
          }}
        >
          {filteredCards.length === 0 ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '256px',
              textAlign: 'center'
            }}>
              <Typography.Title level={4} style={{ color: '#6b7280', marginBottom: '8px' }}>
                {t('common.no_results_found')}
              </Typography.Title>
              <Typography.Paragraph style={{ color: '#9ca3af', margin: 0 }}>
                {t('common.try_different_search')}
              </Typography.Paragraph>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px',
              gridAutoRows: 'min-content'
            }}>
              {filteredCards.map((card: HrSettingsCardProps, idx: number) => (
                <HrSettingsCard 
                  key={`${idx}-${card.title}`} 
                  {...card} 
                  prefixDataTestId={`${prefixDataTestId || ''}-${DATA_TEST_ID}`}
                />
              ))}
            </div>
          )}
        </div>
      }
    />
  )
}

export default HrSettings
export { HrSettings } 