import { Button } from '@newwork/nw-design-system'
import { RiLayoutLine, RiCalendarLine, RiFileListLine, RiBarChartLine } from '@remixicon/react'

const quickActions = [
  {
    title: "Dashboard",
    icon: <RiLayoutLine className="gba:text-xl" />,
    component: <div>Dashboard Content</div>
  },
  {
    title: "Team Calendar",
    icon: <RiCalendarLine className="gba:text-xl" />,
    component: <div>Calendar Content</div>
  },
  {
    title: "Absence List",
    icon: <RiFileListLine className="gba:text-xl" />,
    component: <div>Absence List Content</div>
  },
  {
    title: "Absence Reports",
    icon: <RiBarChartLine className="gba:text-xl" />,
    component: <div>Reports Content</div>
  },
]

export const QuickActions = ({ onSectionChange }: { onSectionChange: (section: string) => void }) => {
  const handleActionClick = (title: string) => {
    onSectionChange(title)
  }

  return (
    <div className="gba:space-y-4" data-testid="quick-actions-container">
      <div className="gba:grid gba:grid-cols-4 gba:gap-3 gba:pt-3">
        {quickActions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            className="gba:bg-gray-50 gba:hover:bg-gray-100 gba:rounded-lg gba:p-3 gba:flex gba:items-center gba:justify-center gba:gap-2 gba:transition-colors"
            onClick={() => handleActionClick(action.title)}
            data-testid={`quick-action-${action.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {action.icon}
            {action.title}
          </Button>
        ))}
      </div>
    </div>
  );
}
