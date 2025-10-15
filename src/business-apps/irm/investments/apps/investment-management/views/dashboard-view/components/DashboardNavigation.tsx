import React from 'react'

interface DashboardNavigationProps {
  activeTab: string
  setActiveTab: (value: string) => void
}

const DashboardNavigation: React.FC<DashboardNavigationProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="gba:bg-white gba:border-b">
      <div className="gba:px-6">{/* Tabs removed; single breakdown content shown directly */}</div>
    </div>
  )
}

export default DashboardNavigation
