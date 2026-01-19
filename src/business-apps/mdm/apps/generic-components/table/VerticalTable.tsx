import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  cn
} from '@newwork/nw-design-system'
import React, { useCallback } from 'react'

export type VerticalTableProps = {
  title: string
  icon: React.ReactNode
  verticalTable?: boolean
  items: {
    label: string
    value: string | number | React.ReactNode
    textColor?: string
  }[]
}

const VerticalTable = ({ icon, title, items, verticalTable = true }: VerticalTableProps) => {
  const verticalTableRender = useCallback(
    (
      items: {
        label: string
        value: string | number | React.ReactNode
        textColor?: string
      }[]
    ) => (
      <div className="gba:w-full gba:h-full gba:flex gba:flex-col gba:gap-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="gba:w-full gba:px-3 gba:py-2 gba:flex gba:gap-2 gba:flex-col gba:text-sm gba:text-start gba:rounded-lg gba:border gba:border-border"
          >
            <p className="gba:font-medium">{item.label}</p>
            <div className="gba:text-sm">{item.value}</div>
          </div>
        ))}
      </div>
    ),
    []
  )

  const itemsTableRender = useCallback(
    (
      items: {
        label: string
        value: string | number | React.ReactNode
        textColor?: string
        verticalTable?: boolean
      }[]
    ) => (
      <div className="gba:w-full gba:flex gba:flex-col gba:justify-center gba:items-center gba:border gba:border-border  gba:rounded-lg">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn('gba:flex gba:items-center gba:justify-between gba:w-full', {
              'gba:border-b gba:border-gray-200': items.length - 1 !== index
            })}
          >
            <div
              className={cn(
                'gba:w-1/2 gba:!h-full gba:bg-gray-50 gba:py-2 gba:px-3 border-r border-border gba:text-sm gba:font-medium gba:text-start',
                {
                  'gba:rounded-tl-lg': index === 0,
                  'gba:rounded-bl-lg': items.length - 1 === index
                }
              )}
            >
              {item.label}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn('gba:!h-full gba:w-1/2 gba:py-2 gba:px-3 gba:text-sm', {
                    [`gba:text-${item.textColor}`]: item.textColor,
                    'gba:truncate': typeof item.value === 'string'
                  })}
                >
                  {item.value}
                </div>
              </TooltipTrigger>
              <TooltipContent className="gba:!z-[1002]" hidden={String(item.value).trim().length <= 15}>
                {item.value}
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
      </div>
    ),
    []
  )

  return (
    <Card className="gba:shadow-sm">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{verticalTable ? verticalTableRender(items) : itemsTableRender(items)}</CardContent>
    </Card>
  )
}

export { VerticalTable }
