import { Button } from 'antd'
import { RiLayoutLine, RiCalendarLine, RiFileListLine, RiBarChartLine } from '@remixicon/react'

const quickActions = [
  {
    title: "Dashboard",
    icon: <RiLayoutLine style={{ fontSize: '1.25rem' }} />,
    href: "/dashboard",
  },
  {
    title: "Calendar",
    icon: <RiCalendarLine style={{ fontSize: '1.25rem' }} />,
    href: "/calendar",
  },
  {
    title: "Reports",
    icon: <RiFileListLine style={{ fontSize: '1.25rem' }} />,
    href: "/reports",
  },
  {
    title: "Analytics",
    icon: <RiBarChartLine style={{ fontSize: '1.25rem' }} />,
    href: "/analytics",
  },
]

export const QuickActions = () => {
  return (
    <div className="grid grid-cols-4 gap-3 pt-3">
      {quickActions.map((action, index) => (
        <Button
          key={index}
          type="default"
          className="bg-gray-50 hover:bg-gray-100 rounded-lg p-3 flex items-center justify-center gap-2 transition-colors"
          icon={action.icon}
          href={action.href}
        >
          {action.title}
        </Button>
      ))}
    </div>
  );
};
