import { Badge } from "../common/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "../common/components/ui/card"

export function OrganizationCard() {
  return (
    <Card className="rounded-xl shadow-sm border-gray-300">
      <CardHeader className="border-b border-gray-300 pb-3">
        <CardTitle>Organization</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Account</p>
              <a href="#" className="text-lg font-medium text-primary hover:underline">
                Acme Corporation
              </a>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Owner</p>
              <p className="font-medium">Sarah Johnson</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Academic Title</p>
              <p>MSc. Computer Science</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Source Systems</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-0">
                  CRM
                </Badge>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-0">
                  IMS
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 border-0">
                  Marketing
                </Badge>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Last Contacted</p>
              <p className="font-medium text-blue-700">3 days ago</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
