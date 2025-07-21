import type React from "react"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function EmployeeLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  return (
    <div className="container mx-auto">
      <Tabs defaultValue="profile" className="w-full mb-6">
        <TabsList>
          <Link href={`/employee/${params.id}`}>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </Link>
          <Link href={`/employee/${params.id}/salary`}>
            <TabsTrigger value="salary">Salary</TabsTrigger>
          </Link>
          <Link href={`/employee/${params.id}/documents`}>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </Link>
        </TabsList>
      </Tabs>
      {children}
    </div>
  )
}
