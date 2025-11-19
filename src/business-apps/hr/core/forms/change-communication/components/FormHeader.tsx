import React from 'react'
import flowSmall from '@/assets/icons/flowSmall.svg'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const FormHeader: React.FC = () => {
  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:px-0 gba:py-6">
      <div className="gba:flex gba:items-center gba:gap-2">
        <img src={flowSmall} alt="Flow Small" className="gba:w-6 gba:h-6" style={{ filter: 'brightness(0)' }} />
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.title', 'Change Private Communication')}
        </h2>
      </div>
    </div>
  )
}
