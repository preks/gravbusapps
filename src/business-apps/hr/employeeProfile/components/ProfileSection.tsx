'use client';

import React from 'react';
import { Card } from '@newwork/gravity-ui-catalog';

interface ProfileSectionProps {
  title: string;
  data: Array<{
    label: string;
    value: string;
  }>;
  columns?: 1 | 2;
}

/**
 * Profile Section Component
 * Displays a section of profile information in a card with a title
 */
export const ProfileSection: React.FC<ProfileSectionProps> = ({
  title,
  data,
  columns = 2
}) => {
  return (
    <div className="profile-section mb-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
        <span className="w-1 h-6 bg-blue-500 rounded mr-3"></span>
        {title}
      </h3>
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className={`grid grid-cols-1 ${columns === 2 ? 'md:grid-cols-2' : ''} gap-3`}>
          {data.map((item) => (
            <div key={`${item.label}-${item.value}`} className="flex flex-col py-1 px-2 hover:bg-gray-50 rounded-md transition-colors">
              <span className="text-sm text-gray-500 mb-0.5">{item.label}</span>
              <span className="font-medium text-gray-800">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
