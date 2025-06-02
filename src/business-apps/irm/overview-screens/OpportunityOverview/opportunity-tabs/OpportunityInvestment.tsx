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
        return "bg-blue-100 text-blue-800"
      case "Hold":
        return "bg-green-100 text-green-800"
      case "Exit":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Add button to create new opportunity */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsCreateModalOpen(true)} 
          className="border-gray-300"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Opportunity
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investment Overview</CardTitle>
            <Badge className={getStageBadgeColor(investment.stage)}>{investment.stage}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="mb-1 text-sm font-medium">Type</div>
                <div>{investment.type}</div>
              </div>
              <div>
                <div className="mb-1 text-sm font-medium">Amount</div>
                <div>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: investment.currency,
                    maximumFractionDigits: 0,
                  }).format(investment.amount)}
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm font-medium">Entry Date</div>
                <div>{investment.entryDate ? new Date(investment.entryDate).toLocaleDateString() : "N/A"}</div>
              </div>
              {investment.actualExitDate && (
                <div>
                  <div className="mb-1 text-sm font-medium">Exit Date</div>
                  <div>{new Date(investment.actualExitDate).toLocaleDateString()}</div>
                </div>
              )}
              <div className="pt-2">
                <Link to={`/investments/${investment.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Investment Details
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {investment.irr !== undefined && (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">IRR</span>
                    <span className="text-sm font-medium">{investment.irr.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(investment.irr * 5, 100)} className="h-2" />
                </div>
              )}
              {investment.roi !== undefined && (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">ROI</span>
                    <span className="text-sm font-medium">{investment.roi.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(investment.roi, 100)} className="h-2" />
                </div>
              )}
              {investment.multiple !== undefined && (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">Multiple</span>
                    <span className="text-sm font-medium">{investment.multiple.toFixed(2)}x</span>
                  </div>
                  <Progress value={Math.min(investment.multiple * 20, 100)} className="h-2" />
                </div>
              )}
              {investment.holdingPeriod !== undefined && (
                <div>
                  <div className="mb-1 text-sm font-medium">Holding Period</div>
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
