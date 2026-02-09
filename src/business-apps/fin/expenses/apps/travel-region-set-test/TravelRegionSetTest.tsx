import React, { useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PageLayout } from '@/components/layout/pageLayout/PageLayout'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { PiPlus, PiMapPin } from 'react-icons/pi'
import {
  TravelRegionSetForm as TravelRegionSetTestForm,
  TravelRegionSetFormData
} from '../expense-settings/forms/travel-region-set-form'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface TravelRegionSetTestProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const TravelRegionSetTest: React.FC<TravelRegionSetTestProps> = ({
  accessToken,
  className,
  prefixDataTestId = 'travel-region-set-test'
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [createdSets, setCreatedSets] = useState<TravelRegionSetFormData[]>([])

  const handleOpenModal = () => {
    setIsModalVisible(true)
  }

  const handleCloseModal = () => {
    setIsModalVisible(false)
  }

  const handleSave = (data: TravelRegionSetFormData) => {
    console.log('✅ Travel Region Set saved:', data)
    setCreatedSets(prev => [...prev, data])
    setIsModalVisible(false)
  }

  return (
    <PageLayout
      headerIcon={<PiMapPin className="gba:w-8 gba:h-8" />}
      headerLabel={getTranslationFromI18nKeyAndLabel('travel-region-set-test:title', 'Travel Region Set Test')}
      contentContainer={
        <div className={className} data-testid={`${prefixDataTestId}-page`}>
          <div className="gba:space-y-6">
            {/* Test Button */}
            <Card data-testid={`${prefixDataTestId}-test-card`}>
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-2">
                  <PiMapPin className="gba:w-5 gba:h-5" />
                  {getTranslationFromI18nKeyAndLabel('travel-region-set-test:test_section', 'Test Modal')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:space-y-4">
                  <p className="gba:text-gray-600">
                    {getTranslationFromI18nKeyAndLabel(
                      'travel-region-set-test:test_description',
                      'Click the button below to test the Travel Region Set modal form.'
                    )}
                  </p>
                  <Button
                    onClick={handleOpenModal}
                    data-testid={`${prefixDataTestId}-open-modal-button`}
                    className="gba:flex gba:items-center gba:gap-2"
                  >
                    <PiPlus className="gba:w-4 gba:h-4" />
                    {getTranslationFromI18nKeyAndLabel(
                      'travel-region-set-test:open_modal',
                      'Open Travel Region Set Modal'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Created Sets Display */}
            {createdSets.length > 0 && (
              <Card data-testid={`${prefixDataTestId}-results-card`}>
                <CardHeader>
                  <CardTitle>
                    {getTranslationFromI18nKeyAndLabel(
                      'travel-region-set-test:created_sets',
                      'Created Travel Region Sets'
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:space-y-3">
                    {createdSets.map((set, index) => {
                      // Use stable identifier for key and data-testid
                      const stableId = set.code || set.value || `set-${index}`
                      // Sanitize the identifier for use in data-testid (remove special chars, spaces)
                      const sanitizedId = stableId.replace(/[^a-zA-Z0-9-_]/g, '-')

                      return (
                        <div
                          key={stableId}
                          className="gba:p-3 gba:bg-gray-50 gba:rounded-lg gba:border"
                          data-testid={`${prefixDataTestId}-created-set-${sanitizedId}`}
                        >
                          <div className="gba:font-medium">{set.value}</div>
                          <div className="gba:text-sm gba:text-gray-600">Code: {set.code}</div>
                          {set.description && <div className="gba:text-sm gba:text-gray-500">{set.description}</div>}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Modal */}
          <TravelRegionSetTestForm
            accessToken={accessToken}
            isVisible={isModalVisible}
            onCancel={handleCloseModal}
            onSave={handleSave}
            prefixDataTestId={prefixDataTestId}
          />
        </div>
      }
    />
  )
}

export default TravelRegionSetTest
