import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, FileText } from "lucide-react"

export default function HomePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Employee Management System</h1>
        <p className="text-muted-foreground">Manage employee profiles, salaries, and organizational data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Profiles
            </CardTitle>
            <CardDescription>View and manage employee information</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/employee/1">
              <Button className="w-full">View Sample Employee</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Salary Administration
            </CardTitle>
            <CardDescription>Manage employee compensation and wages</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/employee/1/salary">
              <Button className="w-full">Manage Salaries</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reports
            </CardTitle>
            <CardDescription>Generate salary and employee reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Demo</CardTitle>
          <CardDescription>Try out the salary administration features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>This demo shows how to manage employee salaries with support for:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Monthly salaries and hourly wages</li>
              <li>Additional compensation components (bonuses, allowances, etc.)</li>
              <li>Automatic calculation of expected monthly pay</li>
              <li>Support for different payment types and currencies</li>
            </ul>
            <Link href="/employee/1/salary">
              <Button>
                <DollarSign className="mr-2 h-4 w-4" />
                Try Salary Administration
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
