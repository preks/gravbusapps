'use client'

import React, { useState } from 'react'
import { ProfileLayout } from './ProfileLayout'
import { useTranslation } from 'react-i18next'

/**
 * Example component demonstrating how to use the ProfileLayout component
 * with different configurations.
 */
export const ProfileLayoutExample: React.FC = () => {
  const { t } = useTranslation()
  const [headerPlacement, setHeaderPlacement] = useState<'top' | 'left'>('top')

  // Example header content
  const headerContent = (
    <div
      className={`gba:flex ${headerPlacement === 'top' ? 'gba:flex-row gba:items-center' : 'gba:flex-col gba:items-start gba:gap-4'} gba:w-full`}
    >
      {/* Profile image */}
      <div className="gba:shrink-0">
        <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-blue-500 gba:flex gba:items-center gba:justify-center gba:text-white gba:text-xl gba:font-bold">
          JD
        </div>
      </div>

      {/* Profile info */}
      <div className={`${headerPlacement === 'top' ? 'gba:ml-4' : 'gba:mt-2'} gba:grow`}>
        <h1 className="gba:text-2xl gba:font-bold">John Doe</h1>
        <p className="gba:text-gray-600">Software Engineer</p>
      </div>

      {/* Actions */}
      <div className={`${headerPlacement === 'top' ? 'gba:ml-4' : 'gba:mt-2'} gba:shrink-0`}>
        <button className="gba:px-4 gba:py-2 gba:bg-blue-600 gba:text-white gba:rounded gba:hover:bg-blue-700 gba:transition-colors">
          {t('common.edit')}
        </button>
      </div>
    </div>
  )

  // Example content header
  const contentHeader = (
    <div className="gba:flex gba:items-center gba:justify-between">
      <div className="gba:flex gba:space-x-4">
        <button className="gba:px-4 gba:py-2 gba:font-medium gba:text-blue-600 gba:border-b-2 gba:border-blue-600">
          {t('profile.tabs.details')}
        </button>
        <button className="gba:px-4 gba:py-2 gba:font-medium gba:text-gray-600 gba:hover:text-blue-600">
          {t('profile.tabs.documents')}
        </button>
        <button className="gba:px-4 gba:py-2 gba:font-medium gba:text-gray-600 gba:hover:text-blue-600">
          {t('profile.tabs.activity')}
        </button>
      </div>
      <div>
        <button className="gba:px-4 gba:py-2 gba:text-gray-600 gba:hover:text-blue-600">{t('common.refresh')}</button>
      </div>
    </div>
  )

  // Example content
  const contentContainer = (
    <div className="gba:space-y-6">
      {/* Toggle button for demo */}
      <div className="gba:bg-white gba:p-4 gba:rounded-lg gba:shadow gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:font-medium">{t('demo.toggle_header_placement')}</span>
          <button
            onClick={() => setHeaderPlacement(prev => (prev === 'top' ? 'left' : 'top'))}
            className="gba:px-4 gba:py-2 gba:bg-gray-200 gba:rounded gba:hover:bg-gray-300 gba:transition-colors"
          >
            {headerPlacement === 'top' ? t('demo.switch_to_left') : t('demo.switch_to_top')}
          </button>
        </div>
      </div>

      {/* Sample content sections */}
      <div className="gba:bg-white gba:p-6 gba:rounded-lg gba:shadow">
        <h2 className="gba:text-xl gba:font-semibold gba:mb-4">{t('profile.personal_information')}</h2>
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
              {t('profile.fields.email')}
            </label>
            <p>john.doe@example.com</p>
          </div>
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
              {t('profile.fields.phone')}
            </label>
            <p>+1 (555) 123-4567</p>
          </div>
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
              {t('profile.fields.department')}
            </label>
            <p>Engineering</p>
          </div>
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
              {t('profile.fields.location')}
            </label>
            <p>San Francisco, CA</p>
          </div>
        </div>
      </div>

      <div className="gba:bg-white gba:p-6 gba:rounded-lg gba:shadow">
        <h2 className="gba:text-xl gba:font-semibold gba:mb-4">{t('profile.work_information')}</h2>
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
              {t('profile.fields.position')}
            </label>
            <p>Senior Software Engineer</p>
          </div>
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
              {t('profile.fields.start_date')}
            </label>
            <p>January 15, 2020</p>
          </div>
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
              {t('profile.fields.manager')}
            </label>
            <p>Jane Smith</p>
          </div>
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-1">
              {t('profile.fields.team')}
            </label>
            <p>Frontend Development</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="gba:w-full gba:h-screen gba:p-4 gba:bg-gray-200">
      <ProfileLayout
        headerContent={headerContent}
        contentHeader={contentHeader}
        contentContainer={contentContainer}
        headerPlacement={headerPlacement}
        className="gba:h-full"
      />
    </div>
  )
}

export default ProfileLayoutExample
