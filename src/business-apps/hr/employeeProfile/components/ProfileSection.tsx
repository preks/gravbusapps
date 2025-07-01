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
    <div className="gba:profile-section gba:mb-8">
      <h3 className="gba:text-lg gba:font-semibold gba:mb-4 gba:text-gray-800 gba:flex gba:items-center">
        <span className="gba:w-1 gba:h-6 gba:bg-blue-500 gba:rounded gba:mr-3"></span>
        {title}
      </h3>
      <Card className="gba:p-4 gba:hover:shadow-md gba:transition-shadow">
        <div className={`gba:grid gba:grid-cols-1 ${columns === 2 ? 'md:grid-cols-2' : ''} gba:gap-3`}>
          {data.map((item) => (
            <div key={`${item.label}-${item.value}`} className="gba:flex gba:flex-col gba:py-1 gba:px-2 gba:hover:bg-gray-50 gba:rounded-md gba:transition-colors">
              <span className="gba:text-sm gba:text-gray-500 gba:mb-0.5">{item.label}</span>
              <span className="gba:font-medium gba:text-gray-800">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
