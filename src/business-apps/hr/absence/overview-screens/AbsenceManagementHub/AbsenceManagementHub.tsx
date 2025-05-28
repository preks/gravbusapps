import { useState } from 'react';
import { AbsenceOverview } from '../AbsenceOverview/AbsenceOverview';
import { AppHeader } from '../AppHeader/AppHeader';
import { HeroBanner } from '../HeroBanner/HeroBanner';
import { KPISection } from '../KPISection';
import { AbsenceReports } from '../AbsenceReports/AbsenceReports';
import { QuickActions } from '../QuickActions/QuickActions';
import { AbsenceList } from '../AbsenceList/AbsenceList';
import CalendarList from '../CalendarList/CalendarList';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface AbsenceManagementHubProps extends BusinessAppContextProps {}

export const AbsenceManagementHub: React.FC<AbsenceManagementHubProps> = ({ accessToken }) => {
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
              <KPISection />
            </div>
          </>
        )
      case "Team Calendar":
        return <CalendarList />
      case "Absence Reports":
        return <AbsenceReports />
      default:
        return (
          <>
            <AbsenceOverview />
            <div className="mt-8">
              <KPISection />
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
