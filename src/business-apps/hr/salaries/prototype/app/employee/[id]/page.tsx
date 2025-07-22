import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { DollarSign } from "lucide-react"

export default function EmployeeProfilePage({ params }: { params: { id: string } }) {
  // Mock employee data - in a real app, this would come from a database
  const employee = {
    id: params.id,
    name: "Lisa Lee",
    position: "Chief Executive Officer",
    employeeId: "EMP001",
    company: "NEWWORK Software GmbH",
    location: "ACME Dublin",
    workspace: "Berlin",
    costCenter: "M110",
    employmentType: "Internal",
    contractType: "Full time wage",
    startDate: "09/01/2019",
    probationEndDate: "02/28/2020",
    remote: "100%",
    region: "Berlin",
    weeklyHours: 40,
    avatar: "/placeholder.svg?height=100&width=100&text=LL",
  }

  return (
    <div className="container mx-auto py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center text-2xl font-bold">
              LL
            </div>
            <CardTitle>{employee.name}</CardTitle>
            <CardDescription>{employee.position}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center gap-2">
              <Link href={`/employee/${employee.id}/salary`}>
                <Button>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Manage Salary
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Organizational Data & Working Conditions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Employee Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Organizational Data */}
            <div>
              <h3 className="font-semibold mb-3">Organizational Data</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Employee ID:</span>
                  <p className="font-medium">{employee.employeeId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Company:</span>
                  <p className="font-medium">{employee.company}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Job Position:</span>
                  <p className="font-medium">{employee.position}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <p className="font-medium">{employee.location}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Workspace:</span>
                  <p className="font-medium">{employee.workspace}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cost Center:</span>
                  <p className="font-medium">{employee.costCenter}</p>
                </div>
              </div>
            </div>

            {/* Working Conditions */}
            <div>
              <h3 className="font-semibold mb-3">Working Conditions</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Employment Type:</span>
                  <p className="font-medium">{employee.employmentType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Start Date:</span>
                  <p className="font-medium">{employee.startDate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Contract Type:</span>
                  <p className="font-medium">{employee.contractType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Probation End Date:</span>
                  <p className="font-medium">{employee.probationEndDate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Remote %:</span>
                  <p className="font-medium">{employee.remote}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Region:</span>
                  <p className="font-medium">{employee.region}</p>
                </div>
              </div>
            </div>

            {/* Working Hours */}
            <div>
              <h3 className="font-semibold mb-3">Working Hours</h3>
              <div className="text-sm">
                <div className="mb-2">
                  <span className="text-muted-foreground">Weekly Hours:</span>
                  <span className="font-medium ml-2">{employee.weeklyHours}</span>
                </div>
                <div className="grid grid-cols-7 gap-2 mt-3">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div key={day} className="text-center p-2 border rounded text-xs">
                      {day}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
