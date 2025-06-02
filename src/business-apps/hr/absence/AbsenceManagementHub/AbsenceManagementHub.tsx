import { useState } from 'react';
import { AbsenceOverview } from '../components/AbsenceOverview/AbsenceOverview';
import { AppHeader } from '../components/AppHeader/AppHeader';
import { HeroBanner } from '../components/HeroBanner/HeroBanner';
import KPISection from '../components/KPISection/KPISection';
import { AbsenceReports } from '../components/AbsenceReports/AbsenceReports';
import { QuickActions } from '../components/QuickActions/QuickActions';
import { AbsenceList } from '../components/AbsenceList/AbsenceList';
import CalendarList from '../components/CalendarList/CalendarList';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface AbsenceManagementHubProps extends BusinessAppContextProps {}

export const AbsenceManagementHub: React.FC<AbsenceManagementHubProps> = ({ accessToken, userInfo }) => {
  const [activeSection, setActiveSection] = useState<string | null>("Dashboard")

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
  }

  const renderContent = () => {
    switch (activeSection) {
      case "Absence List":
        return <AbsenceList accessToken={accessToken} />
      case "Dashboard":
        return (
          <>
            <AbsenceOverview />
            <div className="mt-8">
              <KPISection accessToken={accessToken}/>
            </div>
          </>
        )
      case "Team Calendar":
        return <CalendarList accessToken={accessToken} userInfo={userInfo}/>
      case "Absence Reports":
        return <AbsenceReports />
      default:
        return (
          <>
            <AbsenceOverview />
            <div className="mt-8">
              <KPISection accessToken={accessToken} />
            </div>
          </>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <HeroBanner />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <QuickActions onSectionChange={handleSectionChange} />
        </div>

        {activeSection && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {renderContent()}
          </div>
        )}
      </main>
    </div>
  );
}

export default AbsenceManagementHub;
