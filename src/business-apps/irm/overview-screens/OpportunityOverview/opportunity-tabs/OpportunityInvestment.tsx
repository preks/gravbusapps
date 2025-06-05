import { Card, CardContent, CardHeader, CardTitle } from "../common/ui/card"
import { Badge } from "../common/ui/badge"
import { Button } from "../common/ui/button"
import { Progress } from "../common/ui/progress"
import { ArrowUpRight, Plus } from "lucide-react"
import { Link } from "react-router-dom"
import { useState } from "react"
import OpportunityCreateModal from "../OpportunityCreateModal"
import type { InvestmentWithRelations } from "../../../../../common/lib/db-actions"

interface OpportunityInvestmentProps {
  investment: InvestmentWithRelations
  opportunityId: string
}

export function OpportunityInvestment({ investment, opportunityId }: OpportunityInvestmentProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  // Get stage badge color
  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case "Pipeline":
        return "gba:bg-blue-100 gba:text-blue-800"
      case "Hold":
        return "gba:bg-green-100 gba:text-green-800"
      case "Exit":
        return "gba:bg-purple-100 gba:text-purple-800"
      default:
        return "gba:bg-gray-100 gba:text-gray-800"
    }
  }

  return (
    <div className="gba:space-y-6">
      {/* Add button to create new opportunity */}
      <div className="gba:flex gba:justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsCreateModalOpen(true)} 
          className="gba:border-gray-300"
        >
          <Plus className="gba:mr-2 gba:h-4 gba:w-4" />
          Create New Opportunity
        </Button>
      </div>
      
      <div className="gba:grid gba:gap-6 gba:md:grid-cols-2">
        <Card>
          <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-2">
            <CardTitle className="gba:text-sm gba:font-medium">Investment Overview</CardTitle>
            <Badge className={getStageBadgeColor(investment.stage)}>{investment.stage}</Badge>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <div>
                <div className="gba:mb-1 gba:text-sm gba:font-medium">Type</div>
                <div>{investment.type}</div>
              </div>
              <div>
                <div className="gba:mb-1 gba:text-sm gba:font-medium">Amount</div>
                <div>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: investment.currency,
                    maximumFractionDigits: 0,
                  }).format(investment.amount)}
                </div>
              </div>
              <div>
                <div className="gba:mb-1 gba:text-sm gba:font-medium">Entry Date</div>
                <div>{investment.entryDate ? new Date(investment.entryDate).toLocaleDateString() : "N/A"}</div>
              </div>
              {investment.actualExitDate && (
                <div>
                  <div className="gba:mb-1 gba:text-sm gba:font-medium">Exit Date</div>
                  <div>{new Date(investment.actualExitDate).toLocaleDateString()}</div>
                </div>
              )}
              <div className="gba:pt-2">
                <Link to={`/investments/${investment.id}`}>
                  <Button variant="outline" size="sm" className="gba:w-full">
                    View Investment Details
                    <ArrowUpRight className="gba:ml-2 gba:h-4 gba:w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="gba:text-sm gba:font-medium">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              {investment.irr !== undefined && (
                <div>
                  <div className="gba:mb-1 gba:flex gba:items-center gba:justify-between">
                    <span className="gba:text-sm gba:font-medium">IRR</span>
                    <span className="gba:text-sm gba:font-medium">{investment.irr.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(investment.irr * 5, 100)} className="gba:h-2" />
                </div>
              )}
              {investment.roi !== undefined && (
                <div>
                  <div className="gba:mb-1 gba:flex gba:items-center gba:justify-between">
                    <span className="gba:text-sm gba:font-medium">ROI</span>
                    <span className="gba:text-sm gba:font-medium">{investment.roi.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(investment.roi, 100)} className="gba:h-2" />
                </div>
              )}
              {investment.multiple !== undefined && (
                <div>
                  <div className="gba:mb-1 gba:flex gba:items-center gba:justify-between">
                    <span className="gba:text-sm gba:font-medium">Multiple</span>
                    <span className="gba:text-sm gba:font-medium">{investment.multiple.toFixed(2)}x</span>
                  </div>
                  <Progress value={Math.min(investment.multiple * 20, 100)} className="gba:h-2" />
                </div>
              )}
              {investment.holdingPeriod !== undefined && (
                <div>
                  <div className="gba:mb-1 gba:text-sm gba:font-medium">Holding Period</div>
                  <div>{investment.holdingPeriod} months</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Render the opportunity create modal */}
      {isCreateModalOpen && (
        <OpportunityCreateModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          pipelines={[]}
          companies={[]}
        />
      )}
    </div>
  )
}
