/**
 * TemplateManager - Main Application Component
 * Manages flow templates across multiple instances
 */

import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ComparisonDashboard } from './components/comparison/ComparisonDashboard'
import { Card, CardContent } from '@newwork/nw-design-system'
import { Workflow, GitCompare, ArrowLeftRight } from 'lucide-react'

export const TemplateManager: React.FC<BusinessAppContextProps> = context => {
  return (
    <div className="gba:min-h-screen gba:bg-background">
      <div className="gba:container gba:mx-auto gba:p-6 gba:max-w-7xl gba:space-y-6">
        {/* Professional Header */}
        <Card className="gba:border-primary gba:bg-gradient-to-r gba:from-primary/5 gba:to-primary/10">
          <CardContent className="gba:p-8">
            <div className="gba:flex gba:items-start gba:justify-between">
              <div className="gba:space-y-3">
                <div className="gba:flex gba:items-center gba:gap-3">
                  <div className="gba:p-3 gba:rounded-lg gba:bg-primary gba:text-primary-foreground">
                    <Workflow className="gba:h-6 gba:w-6" />
                  </div>
                  <div>
                    <h1 className="gba:text-3xl gba:font-bold gba:text-foreground">Template Manager</h1>
                    <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                      Enterprise Flow Template Synchronization
                    </p>
                  </div>
                </div>
                <p className="gba:text-muted-foreground gba:max-w-2xl">
                  Compare and synchronize flow templates across different environments with real-time comparison,
                  version tracking, and intelligent conflict detection. Ensure consistency across DEV, STAGING, and PROD
                  instances.
                </p>
              </div>

              <div className="gba:flex gba:gap-4">
                <div className="gba:text-center gba:p-4 gba:rounded-lg gba:bg-background/50">
                  <GitCompare className="gba:h-5 gba:w-5 gba:mx-auto gba:mb-2 gba:text-primary" />
                  <div className="gba:text-2xl gba:font-bold gba:text-foreground">7</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Status Types</div>
                </div>
                <div className="gba:text-center gba:p-4 gba:rounded-lg gba:bg-background/50">
                  <ArrowLeftRight className="gba:h-5 gba:w-5 gba:mx-auto gba:mb-2 gba:text-success" />
                  <div className="gba:text-2xl gba:font-bold gba:text-foreground">3</div>
                  <div className="gba:text-xs gba:text-muted-foreground">Sync Modes</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Dashboard */}
        <ComparisonDashboard context={context} />
      </div>
    </div>
  )
}
