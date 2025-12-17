import React from 'react'
import { CheckIcon, XIcon } from '@phosphor-icons/react'

interface StandardIconProps {
  value?: boolean | null
  'data-testid'?: string
}

const StandardIcon: React.FC<StandardIconProps> = ({ value, 'data-testid': dataTestId }) => {
  if (value) {
    return <CheckIcon size={18} className="gba:text-green-600" data-testid={dataTestId} />
  }
  return <XIcon size={18} className="gba:text-black-500" data-testid={dataTestId} />
}

export default StandardIcon
