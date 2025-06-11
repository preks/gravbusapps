import { Button } from 'antd'
import { RiLayoutLine, RiCalendarLine, RiFileListLine, RiBarChartLine } from '@remixicon/react'

const quickActions = [
  {
    title: "Dashboard",
    icon: <RiLayoutLine style={{ fontSize: '1.25rem' }} />,
    component: <div>Dashboard Content</div>
  },
  {
    title: "Team Calendar",
    icon: <RiCalendarLine style={{ fontSize: '1.25rem' }} />,
    component: <div>Calendar Content</div>
  },
  {
    title: "Absence List",
    icon: <RiFileListLine style={{ fontSize: '1.25rem' }} />,
    component: <div>Absence List Content</div>
  },
  {
    title: "Absence Reports",
    icon: <RiBarChartLine style={{ fontSize: '1.25rem' }} />,
    component: <div>Reports Content</div>
  },
]

export const QuickActions = ({ onSectionChange }: { onSectionChange: (section: string) => void }) => {
  const handleActionClick = (title: string) => {
    onSectionChange(title)
  }

  return (
    <div className="gba:space-y-4">
      <div className="gba:grid gba:grid-cols-4 gba:gap-3 gba:pt-3">
        {quickActions.map((action, index) => (
          <Button
            key={index}
            type="default"
            className="gba:bg-gray-50 gba:hover:bg-gray-100 gba:rounded-lg gba:p-3 gba:flex gba:items-center gba:justify-center gba:gap-2 gba:transition-colors"
            icon={action.icon}
            onClick={() => handleActionClick(action.title)}
          >
            {action.title}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default QuickActions;
