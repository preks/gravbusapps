import SalaryAdministration from '@/components/salary-administration'

export default function SalaryPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Employee Salary Administration</h1>
      <SalaryAdministration />
    </div>
  )
}
