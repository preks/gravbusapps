import { CardHeader, CardTitle, CardDescription } from '@newwork/nw-design-system'
import React from 'react'

type CardTabHeaderComponentProps = {
  addButton?: React.ReactNode
  cardTitle: string | React.ReactNode
  cardDescription: string
}

const CardTabHeaderComponent = ({ addButton, cardTitle, cardDescription }: CardTabHeaderComponentProps) => {
  return (
    <CardHeader className="gba:space-y-1.5 gba:p-3 gba:border-b">
      <div className="gba:flex gba:justify-between gba:items-center gba:w-full">
        <div className="gba:flex gba:flex-col gba:gap-2 gba:h-full">
          <CardTitle className="gba:text-2xl gba:font-semibold gba:leading-none gba:tracking-tight">
            {cardTitle}
          </CardTitle>
          <CardDescription className="gba:text-sm gba:text-muted-foreground">{cardDescription}</CardDescription>
        </div>
        {addButton}
      </div>
    </CardHeader>
  )
}

export { CardTabHeaderComponent }
