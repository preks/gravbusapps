import { Card, CardHeader, CardTitle, CardDescription } from '@newwork/nw-design-system'
import { CaretRightIcon } from '@phosphor-icons/react'

export type NavigationLinkCardsProps = {
  redirectLink: string
  color: string
  icon: React.ElementType
  title: string
  description: string
}

const NavigationLinkCards = ({ redirectLink, color, icon, title, description }: NavigationLinkCardsProps) => {
  const Icon = icon

  return (
    <Card className="gba:!p-3 gba:shadow-sm gba:hover:shadow-md gba:transition-shadow">
      <CardHeader className="gba:!p-0">
        <a
          href={redirectLink}
          className={`gba:flex gba:items-center gba:gap-3 gba:text-${color}-600 gba:hover:text-${color}-800`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <div
            className={`gba:flex gba:justify-center gba:items-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-${color}-100`}
          >
            <Icon className={`gba:text-lg gba:text-${color}-600`} />
          </div>
          <div className="gba:flex-grow">
            <CardTitle>{title}</CardTitle>
            <CardDescription className="gba:!text-xs">{description}</CardDescription>
          </div>
          <CaretRightIcon className="gba:!text-gray-400" />
        </a>
      </CardHeader>
    </Card>
  )
}

export { NavigationLinkCards }
