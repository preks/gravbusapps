import React from 'react';
import { Card, CardContent } from '@newwork/nw-design-system';

export interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
}) => {
  return (
    <Card>
      <CardContent className="gba:p-12">
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:space-y-4">
          <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-blue-600"></div>
          <p className="gba:text-gray-600 gba:text-center">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
};
