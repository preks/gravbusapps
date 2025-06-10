"use client"

import { Button } from "../common/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../common/ui/card"
import { AlertCircle, RefreshCcw } from "lucide-react"
import { Link } from "react-router-dom"

export function OpportunitiesError({ error }: { error?: Error }) {
  const errorMessage = error?.message || "No specific error details available. This is a sample error component.";
  
  return (
    <Card className="gba:mx-auto gba:max-w-md">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:gap-2">
          <AlertCircle className="gba:h-5 gba:w-5 gba:text-destructive" />
          <CardTitle>Database Connection Error</CardTitle>
        </div>
        <CardDescription>
          There was a problem connecting to the database. This might be due to a configuration issue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="gba:rounded-md gba:bg-destructive/10 gba:p-4 gba:text-sm gba:text-destructive">
          <p className="gba:font-medium">Error details:</p>
          <p className="gba:mt-1">{errorMessage}</p>
        </div>
      </CardContent>
      <CardFooter className="gba:flex gba:justify-between">
        <Button variant="outline" asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
        <Button onClick={() => window.location.reload()}>
          <RefreshCcw className="gba:mr-2 gba:h-4 gba:w-4" />
          Try Again
        </Button>
      </CardFooter>
    </Card>
  )
}
