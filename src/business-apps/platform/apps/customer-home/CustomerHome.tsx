import React from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import { CustomerHomeDemo } from './modes/demo/CustomerHomeDemo'
import { CustomerHomeOffice } from './modes/office/CustomerHomeOffice'

export interface CustomerHomeProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const CustomerHome: React.FC<CustomerHomeProps> = ({ 'data-testid': testId = 'customer-home', ...props }) => {
  const homeMode = useFeature(Feature.Core.HomeMode.Key)

  if (homeMode === Feature.Core.HomeMode.Values.Demo) {
    return <CustomerHomeDemo {...props} data-testid={testId} />
  }

  return <CustomerHomeOffice {...props} data-testid={testId} />
}

export default CustomerHome
