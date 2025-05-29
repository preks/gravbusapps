'use client';

import React, { useState } from 'react';
import { ProfileLayout } from './ProfileLayout';
import { useTranslation } from 'react-i18next';

/**
 * Example component demonstrating how to use the ProfileLayout component
 * with different configurations.
 */
export const ProfileLayoutExample: React.FC = () => {
  const { t } = useTranslation();
  const [headerPlacement, setHeaderPlacement] = useState<'top' | 'left'>('top');

  // Example header content
  const headerContent = (
    <div className={`flex ${headerPlacement === 'top' ? 'flex-row items-center' : 'flex-col items-start gap-4'} w-full`}>
      {/* Profile image */}
      <div className="flex-shrink-0">
        <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold">
          JD
        </div>
      </div>
      
      {/* Profile info */}
      <div className={`${headerPlacement === 'top' ? 'ml-4' : 'mt-2'} flex-grow`}>
        <h1 className="text-2xl font-bold">John Doe</h1>
        <p className="text-gray-600">Software Engineer</p>
      </div>
      
      {/* Actions */}
      <div className={`${headerPlacement === 'top' ? '' : 'mt-auto'} flex-shrink-0`}>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          {t('common.edit')}
        </button>
      </div>
    </div>
  );

  // Example content header
  const contentHeader = (
    <div className="flex items-center justify-between">
      <div className="flex space-x-4">
        <button className="px-4 py-2 font-medium text-blue-600 border-b-2 border-blue-600">
          {t('profile.tabs.details')}
        </button>
        <button className="px-4 py-2 font-medium text-gray-600 hover:text-blue-600">
          {t('profile.tabs.documents')}
        </button>
        <button className="px-4 py-2 font-medium text-gray-600 hover:text-blue-600">
          {t('profile.tabs.activity')}
        </button>
      </div>
      <div>
        <button className="px-4 py-2 text-gray-600 hover:text-blue-600">
          {t('common.refresh')}
        </button>
      </div>
    </div>
  );

  // Example content
  const contentContainer = (
    <div className="space-y-6">
      {/* Toggle button for demo */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">{t('demo.toggle_header_placement')}</span>
          <button
            onClick={() => setHeaderPlacement(prev => prev === 'top' ? 'left' : 'top')}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
          >
            {headerPlacement === 'top' ? t('demo.switch_to_left') : t('demo.switch_to_top')}
          </button>
        </div>
      </div>
      
      {/* Sample content sections */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">{t('profile.personal_information')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.fields.email')}
            </label>
            <p>john.doe@example.com</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.fields.phone')}
            </label>
            <p>+1 (555) 123-4567</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.fields.department')}
            </label>
            <p>Engineering</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.fields.location')}
            </label>
            <p>San Francisco, CA</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">{t('profile.work_information')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.fields.position')}
            </label>
            <p>Senior Software Engineer</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.fields.start_date')}
            </label>
            <p>January 15, 2020</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.fields.manager')}
            </label>
            <p>Jane Smith</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.fields.team')}
            </label>
            <p>Frontend Development</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen p-4 bg-gray-200">
      <ProfileLayout
        headerContent={headerContent}
        contentHeader={contentHeader}
        contentContainer={contentContainer}
        headerPlacement={headerPlacement}
        className="h-full"
      />
    </div>
  );
};

export default ProfileLayoutExample;
