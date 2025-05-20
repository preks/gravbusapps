import { AbsenceOverview } from '../AbsenceOverview/AbsenceOverview';
import { AppHeader } from '../AppHeader/AppHeader';
import { HeroBanner } from '../HeroBanner/HeroBanner';
import { KPISection } from '../KPISection';
import { QuickActions } from '../QuickActions/QuickActions';

export const AbsenceManagementHub = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <HeroBanner />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <QuickActions />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AbsenceOverview />
        </div>

        <div className="mt-8">
          <KPISection />
        </div> 

        {/* <div className="mt-8">
          <InsightsSection />
        </div> */}
      </main>
    </div>
  );
};
