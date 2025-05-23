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
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3 pt-3">
        {quickActions.map((action, index) => (
          <Button
            key={index}
            type="default"
            className="bg-gray-50 hover:bg-gray-100 rounded-lg p-3 flex items-center justify-center gap-2 transition-colors"
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
