import { useState } from 'react';
import { AbsenceOverview } from '../components/AbsenceOverview/AbsenceOverview';
import { AppHeader } from '../components/AppHeader/AppHeader';
import { HeroBanner } from '../components/HeroBanner/HeroBanner';
import KPISection from '../components/KPISection/KPISection';
import { AbsenceReports } from '../components/AbsenceReports/AbsenceReports';
import { QuickActions } from '../components/QuickActions/QuickActions';
import { AbsenceList } from '../components/AbsenceList/AbsenceList';
import CalendarList from '../components/CalendarList/CalendarList';
import AbsenceTrends from '../components/AbsenceTrends/AbsenceTrends';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface DashboardProps extends BusinessAppContextProps {}

export const Dashboard: React.FC<DashboardProps> = ({ accessToken, userInfo }) => {
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
            <AbsenceOverview accessToken={accessToken} userInfo={userInfo}/>
            <div className="gba:mt-8">
            <AbsenceTrends accessToken={accessToken} />
            </div>
            <div className="gba:mt-8">
              <KPISection accessToken={accessToken}/>
            </div>
          </>
        )
      case "Team Calendar":
        return <CalendarList accessToken={accessToken} userInfo={userInfo}/>
      case "Absence Reports":
        return <AbsenceReports accessToken={accessToken} userInfo={userInfo} />
      default:
        return (
          <>
            <AbsenceOverview accessToken={accessToken} userInfo={userInfo}/>
            <div className="gba:mt-8">
              <KPISection accessToken={accessToken} />
            </div>
          </>
        )
    }
  }

  return (
    <div className="gba:min-h-screen gba:bg-gray-50">
      <AppHeader />
      
      <main className="gba:max-w-10xl gba:mx-auto gba:px-4 gba:sm:px-6 gba:lg:px-8 gba:py-6">
        <HeroBanner />
        
        <div className="gba:max-w-7xl gba:mx-auto gba:px-4 gba:sm:px-6 gba:lg:px-8 gba:py-6">
          <QuickActions onSectionChange={handleSectionChange} />
        </div>

        {activeSection && (
          <div className="gba:max-w-7xl gba:mx-auto gba:px-4 gba:sm:px-6 gba:lg:px-8 gba:py-6">
            {renderContent()}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
