import React from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { PiUsers, PiBuilding, PiUser, PiChartLine } from 'react-icons/pi'

interface SimpleBypassProps {
  onSelectView: (view: 'company' | 'team' | 'individual') => void
}

export const SimpleBypass: React.FC<SimpleBypassProps> = ({ onSelectView }) => {
  return (
    <div className="gba:bg-hsl(var(--background)) gba:min-h-screen gba:p-6">
      <div className="gba:max-w-4xl gba:mx-auto">
        <Card>
          <CardHeader className="gba:text-center">
            <CardTitle className="gba:text-2xl gba:mb-4">Sales Performance System - Debug Mode</CardTitle>
            <p className="gba:text-gray-600">Choose a view to test the system functionality</p>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-6 gba:mt-8">
              <Card className="gba:border gba:hover:shadow-md gba:transition-shadow">
                <CardContent className="gba:p-6 gba:text-center">
                  <PiBuilding className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-4 gba:text-blue-600" />
                  <h3 className="gba:text-lg gba:font-semibold gba:mb-2">CEO Dashboard</h3>
                  <p className="gba:text-gray-600 gba:mb-4 gba:text-sm">
                    Cross-team comparison with charts and rankings
                  </p>
                  <Button onClick={() => onSelectView('company')} className="gba:w-full">
                    <PiChartLine className="gba:w-4 gba:h-4 gba:mr-2" />
                    View Company Dashboard
                  </Button>
                </CardContent>
              </Card>

              <Card className="gba:border gba:hover:shadow-md gba:transition-shadow">
                <CardContent className="gba:p-6 gba:text-center">
                  <PiUsers className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-4 gba:text-green-600" />
                  <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Team Manager</h3>
                  <p className="gba:text-gray-600 gba:mb-4 gba:text-sm">Team performance with member management</p>
                  <Button onClick={() => onSelectView('team')} variant="secondary" className="gba:w-full">
                    <PiUsers className="gba:w-4 gba:h-4 gba:mr-2" />
                    View Team Dashboard
                  </Button>
                </CardContent>
              </Card>

              <Card className="gba:border gba:hover:shadow-md gba:transition-shadow">
                <CardContent className="gba:p-6 gba:text-center">
                  <PiUser className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-4 gba:text-purple-600" />
                  <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Individual Rep</h3>
                  <p className="gba:text-gray-600 gba:mb-4 gba:text-sm">Personal performance with benchmarks</p>
                  <Button onClick={() => onSelectView('individual')} variant="outline" className="gba:w-full">
                    <PiUser className="gba:w-4 gba:h-4 gba:mr-2" />
                    View Personal Dashboard
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="gba:mt-8 gba:p-4 gba:bg-blue-50 gba:rounded-lg gba:text-center">
              <p className="gba:text-sm gba:text-blue-700">
                <strong>Debug Mode:</strong> This bypass allows you to test each view without role detection. The system
                will automatically route users based on their permissions in production.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SimpleBypass
