import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Button,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@newwork/nw-design-system'
import { MapPin, TrendUp } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { LocationDetail, DailyOccupancyData } from '../../types'
import { getOccupancyBadgeVariant } from '../../utils/occupancyCalculations'

interface LocationDetailPanelProps {
  location: LocationDetail | null
  isOpen: boolean
  onClose: () => void
  onViewLivePresence: (locationId: string) => void
  prefixDataTestId?: string
}

export const LocationDetailPanel: React.FC<LocationDetailPanelProps> = ({
  location,
  isOpen,
  onClose,
  onViewLivePresence,
  prefixDataTestId = 'location-detail-panel'
}) => {
  if (!location) return null

  const badgeVariant = getOccupancyBadgeVariant(location.averageOccupancy)

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="gba:w-full sm:gba:max-w-2xl" data-testid={prefixDataTestId}>
        <SheetHeader>
          <SheetTitle className="gba:flex gba:items-center gba:gap-2">
            <MapPin className="gba:w-5 gba:h-5" />
            {location.siteLocationName}
          </SheetTitle>
          <SheetDescription>
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.capacity', 'Capacity')}: {location.capacity}{' '}
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.desks', 'desks')}
          </SheetDescription>
        </SheetHeader>

        <div className="gba:mt-6 gba:space-y-6">
          {/* Action Button */}
          <Button onClick={() => onViewLivePresence(location.siteLocationId)} className="gba:w-full">
            {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.see_whos_in_now', "See who's in now")}
          </Button>

          {/* Summary Stats */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div className="gba:p-4 gba:bg-muted/50 gba:rounded-lg">
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.avg_occupancy', 'Avg Occupancy')}
              </p>
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:text-2xl gba:font-bold">{location.averageOccupancy.toFixed(1)}%</span>
                <Badge variant={badgeVariant}>
                  {Math.round((location.averageOccupied / location.capacity) * 100)}%
                </Badge>
              </div>
            </div>
            <div className="gba:p-4 gba:bg-muted/50 gba:rounded-lg">
              <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.peak_occupancy', 'Peak Occupancy')}
              </p>
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:text-2xl gba:font-bold">{location.peakOccupancy.toFixed(1)}%</span>
                <Badge variant="secondary">{location.peakOccupied}</Badge>
              </div>
              {location.peakDate && (
                <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{location.peakDate}</p>
              )}
            </div>
          </div>

          {/* Trend Chart Placeholder */}
          <div className="gba:p-6 gba:bg-muted/30 gba:rounded-lg gba:border gba:border-border">
            <div className="gba:flex gba:items-center gba:justify-center gba:h-48">
              <div className="gba:text-center">
                <TrendUp className="gba:w-12 gba:h-12 gba:mx-auto gba:text-muted-foreground gba:mb-2" />
                <p className="gba:text-sm gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:office_usage.trend_chart_placeholder',
                    'Trend chart (coming soon)'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Day-by-Day Table */}
          <div>
            <h4 className="gba:font-semibold gba:text-foreground gba:mb-3">
              {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.day_by_day', 'Day-by-Day')}
            </h4>
            <div className="gba:border gba:border-border gba:rounded-lg gba:overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.date', 'Date')}</TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.occupancy', 'Occupancy')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.people_in_office', 'People in Office')}
                    </TableHead>
                    <TableHead>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.over_capacity', 'Over Capacity?')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {location.dailyData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="gba:text-center gba:text-muted-foreground">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.no_data', 'No data')}
                      </TableCell>
                    </TableRow>
                  )}
                  {location.dailyData.map((day: DailyOccupancyData) => {
                    const dayBadgeVariant = getOccupancyBadgeVariant(day.occupancyPercentage)
                    return (
                      <TableRow key={day.date}>
                        <TableCell className="gba:font-medium">{day.date}</TableCell>
                        <TableCell>
                          <Badge variant={dayBadgeVariant}>{day.occupancyPercentage.toFixed(0)}%</Badge>
                        </TableCell>
                        <TableCell>
                          {day.occupied} / {day.capacity}
                        </TableCell>
                        <TableCell>
                          {day.overCapacity ? (
                            <Badge variant="destructive">
                              {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.yes', 'Yes')}
                            </Badge>
                          ) : (
                            <span className="gba:text-muted-foreground">
                              {getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.no', 'No')}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
