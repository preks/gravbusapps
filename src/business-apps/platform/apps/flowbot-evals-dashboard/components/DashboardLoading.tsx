import { Card, CardContent, Skeleton } from '@newwork/nw-design-system'

export function DashboardLoading() {
  return (
    <div className="gba:space-y-4" data-testid="flowbot-evals-loading">
      <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2 gba:xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Card key={idx}>
            <CardContent className="gba:space-y-3 gba:pt-6">
              <Skeleton className="gba:h-4 gba:w-2/3" />
              <Skeleton className="gba:h-8 gba:w-1/2" />
              <Skeleton className="gba:h-3 gba:w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="gba:space-y-3 gba:pt-6">
          <Skeleton className="gba:h-6 gba:w-1/3" />
          <Skeleton className="gba:h-64 gba:w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardLoading
