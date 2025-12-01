import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import localeData from 'dayjs/plugin/localeData';
import type { StepInstance } from '../../../types';

dayjs.extend(weekday);
dayjs.extend(localeData);

export interface CompletedTicketsKPIData {
  averageResolutionTime: {
    hours: number;
    formatted: string;
  };
  slaComplianceRate: {
    percentage: number;
    compliant: number;
    total: number;
  };
  weeklyCompletionRate: {
    thisWeek: number;
    lastWeek: number;
    changePercentage: number;
    trend: 'up' | 'down' | 'stable';
  };
  peakCompletionHours: {
    peakHour: number;
    peakHourFormatted: string;
    completionsAtPeak: number;
  };
}

/**
 * Calculate average resolution time from completed tickets
 */
export const calculateAverageResolutionTime = (tickets: StepInstance[]): CompletedTicketsKPIData['averageResolutionTime'] => {
  if (!tickets.length) {
    return { hours: 0, formatted: '0h 0m' };
  }

  const resolutionTimes: number[] = [];

  tickets.forEach(ticket => {
    if (ticket.createdAt && ticket.updatedAt) {
      const created = dayjs(ticket.createdAt);
      const completed = dayjs(ticket.updatedAt);
      const diffHours = completed.diff(created, 'hour', true);
      if (diffHours >= 0) {
        resolutionTimes.push(diffHours);
      }
    }
  });

  if (!resolutionTimes.length) {
    return { hours: 0, formatted: '0h 0m' };
  }

  const avgHours = resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length;
  const hours = Math.floor(avgHours);
  const minutes = Math.round((avgHours - hours) * 60);

  return {
    hours: avgHours,
    formatted: `${hours}h ${minutes}m`
  };
};

/**
 * Calculate SLA compliance rate
 */
export const calculateSLAComplianceRate = (tickets: StepInstance[]): CompletedTicketsKPIData['slaComplianceRate'] => {
  if (!tickets.length) {
    return { percentage: 0, compliant: 0, total: 0 };
  }

  let compliantCount = 0;
  let totalWithSLA = 0;

  tickets.forEach(ticket => {
    if (ticket.dueDate && ticket.updatedAt) {
      totalWithSLA++;
      const dueDate = dayjs(ticket.dueDate);
      const completedDate = dayjs(ticket.updatedAt);
      
      if (completedDate.isBefore(dueDate) || completedDate.isSame(dueDate)) {
        compliantCount++;
      }
    }
  });

  const percentage = totalWithSLA > 0 ? Math.round((compliantCount / totalWithSLA) * 100) : 0;

  return {
    percentage,
    compliant: compliantCount,
    total: totalWithSLA
  };
};

/**
 * Calculate weekly completion rate comparison
 */
export const calculateWeeklyCompletionRate = (tickets: StepInstance[]): CompletedTicketsKPIData['weeklyCompletionRate'] => {
  const now = dayjs();
  const startOfThisWeek = now.startOf('week');
  const startOfLastWeek = startOfThisWeek.subtract(1, 'week');
  const endOfLastWeek = startOfThisWeek.subtract(1, 'day');

  let thisWeekCount = 0;
  let lastWeekCount = 0;

  tickets.forEach(ticket => {
    if (ticket.updatedAt) {
      const completedDate = dayjs(ticket.updatedAt);
      
      if (completedDate.isAfter(startOfThisWeek)) {
        thisWeekCount++;
      } else if (completedDate.isAfter(startOfLastWeek) && completedDate.isBefore(endOfLastWeek.add(1, 'day'))) {
        lastWeekCount++;
      }
    }
  });

  let changePercentage = 0;
  let trend: 'up' | 'down' | 'stable' = 'stable';

  if (lastWeekCount > 0) {
    changePercentage = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
    trend = changePercentage > 5 ? 'up' : changePercentage < -5 ? 'down' : 'stable';
  } else if (thisWeekCount > 0) {
    changePercentage = 100;
    trend = 'up';
  }

  return {
    thisWeek: thisWeekCount,
    lastWeek: lastWeekCount,
    changePercentage,
    trend
  };
};

/**
 * Calculate peak completion hours
 */
export const calculatePeakCompletionHours = (tickets: StepInstance[]): CompletedTicketsKPIData['peakCompletionHours'] => {
  if (!tickets.length) {
    return {
      peakHour: 9,
      peakHourFormatted: '9:00 AM',
      completionsAtPeak: 0
    };
  }

  // Count completions by hour (0-23)
  const hourCounts: Record<number, number> = {};
  
  for (let i = 0; i < 24; i++) {
    hourCounts[i] = 0;
  }

  tickets.forEach(ticket => {
    if (ticket.updatedAt) {
      const completedDate = dayjs(ticket.updatedAt);
      const hour = completedDate.hour();
      hourCounts[hour]++;
    }
  });

  // Find peak hour
  let peakHour = 9; // Default to 9 AM
  let maxCompletions = 0;

  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > maxCompletions) {
      maxCompletions = count;
      peakHour = parseInt(hour);
    }
  });

  // Format peak hour
  const peakHourFormatted = dayjs().hour(peakHour).minute(0).format('h:mm A');

  return {
    peakHour,
    peakHourFormatted,
    completionsAtPeak: maxCompletions
  };
};

/**
 * Calculate all KPIs for completed tickets
 */
export const calculateCompletedTicketsKPIs = (tickets: StepInstance[]): CompletedTicketsKPIData => {
  return {
    averageResolutionTime: calculateAverageResolutionTime(tickets),
    slaComplianceRate: calculateSLAComplianceRate(tickets),
    weeklyCompletionRate: calculateWeeklyCompletionRate(tickets),
    peakCompletionHours: calculatePeakCompletionHours(tickets)
  };
};
