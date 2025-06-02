"use client"

import { Button } from "../common/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../common/ui/card"
import { AlertCircle, RefreshCcw } from "lucide-react"
import { Link } from "react-router-dom"

export function OpportunitiesError({ error }: { error?: Error }) {
  const errorMessage = error?.message || "No specific error details available. This is a sample error component.";
  
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle>Database Connection Error</CardTitle>
        </div>
        <CardDescription>
          There was a problem connecting to the database. This might be due to a configuration issue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Error details:</p>
          <p className="mt-1">{errorMessage}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
        <Button onClick={() => window.location.reload()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </CardFooter>
    </Card>
  )
}
