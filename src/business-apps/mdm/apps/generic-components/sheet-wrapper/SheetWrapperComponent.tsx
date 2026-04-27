import React from 'react'
import {
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { VerticalTable, VerticalTableProps } from '../table/VerticalTable'
import { NavigationLinkCards, NavigationLinkCardsProps } from '../card/NavigationLinkCards'
import { LinkIcon } from '@phosphor-icons/react'

type SheetWrapperComponentProps = {
  prefixDataTestId: string
  isDrawerVisible: boolean
  onOpenChange: (openStatus: boolean) => void
  title: string
  titleIcon?: React.ElementType
  drawerItems: VerticalTableProps[]
  isFooterVisible?: boolean
  extraContent?: React.ReactNode
  footerButtons?: React.ReactNode[]
  navigationItems?: NavigationLinkCardsProps[]
  showNavigationItems?: boolean
}

const DATA_TEST_ID_PREFIX = 'SheetWrapperComponent'

const SheetWrapperComponent = ({
  prefixDataTestId,
  isDrawerVisible,
  onOpenChange,
  title,
  titleIcon,
  drawerItems,
  isFooterVisible = true,
  extraContent,
  footerButtons,
  navigationItems,
  showNavigationItems = false
}: SheetWrapperComponentProps) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const TitleIcon = titleIcon

  return (
    <Sheet open={isDrawerVisible} onOpenChange={onOpenChange}>
      <style>{`
        [data-slot='sheet-overlay'] {
          z-index: 1000 !important;
        }
        [data-slot='sheet-content'] {
          z-index: 1001 !important;
        }
        [data-slot='popover-content'] {
          z-index: 1002 !important;
        }
      `}</style>
      <SheetContent side="right" data-testid={`${dataTestId}-details-sheet`}>
        <SheetHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            {TitleIcon && <TitleIcon className="h-5 w-5" />}
            <SheetTitle>{title}</SheetTitle>
          </div>
        </SheetHeader>

        <div className="gba:flex-1 gba:overflow-auto gba:px-4 gba:pb-4">
          <div className="gba:space-y-6">
            {drawerItems.map(item => {
              return (
                <VerticalTable
                  key={item.title}
                  icon={item.icon}
                  title={item.title}
                  items={item.items}
                  verticalTable={item.verticalTable}
                />
              )
            })}
          </div>
          {navigationItems && showNavigationItems && (
            <div className="gba:mt-6">
              <div className="gba:flex gba:items-center gba:gap-2 gba:pb-4">
                <LinkIcon className="gba:h-4 gba:w-4 gba:inline gba:mr-2" />
                <span className="gba:text-base gba:font-semibold">Related Resources</span>
              </div>

              <div className="gba:grid gba:grid-cols-1 gba:gap-4">
                {navigationItems.map((item, index) => {
                  return <NavigationLinkCards key={index} {...item} />
                })}
              </div>
            </div>
          )}
          {extraContent && <div className="gba:bg-gray-50 gba:rounded-md gba:p-4 gba:mt-4">{extraContent}</div>}
        </div>
        {isFooterVisible && (
          <SheetFooter>
            <div className="gba:flex gba:justify-end gba:gap-2">
              {footerButtons?.map(footerButton => footerButton)}
              <SheetClose asChild>
                <Button variant="outline">Close</Button>
              </SheetClose>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default SheetWrapperComponent
