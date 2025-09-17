import dayjs from 'dayjs';

/**
 * Generates monthly usage data for a given year from absence data
 */
export const getMonthlyUsage = (absences: any[], year: number): number[] => {
  const monthlyCounts = new Array(12).fill(0);

  absences.forEach((absence) => {
    const startDate = dayjs(absence.startDate);
    const endDate = dayjs(absence.endDate);

    const isActiveInYear =
      (startDate.year() === year && startDate.month() >= 0 && startDate.month() < 12) ||
      (endDate.year() === year && endDate.month() >= 0 && endDate.month() < 12) ||
      (startDate.year() < year && endDate.year() > year);

    if (isActiveInYear) {
      let currentDate = startDate.isBefore(dayjs().year(year).startOf('year'))
        ? dayjs().year(year).startOf('year')
        : startDate;
      const yearEnd = dayjs().year(year).endOf('year');

      while (currentDate.isBefore(endDate) && currentDate.isBefore(yearEnd)) {
        const month = currentDate.month();
        if (month >= 0 && month < 12) {
          monthlyCounts[month]++;
        }
        currentDate = currentDate.add(1, 'day');
      }
    }
  });

  return monthlyCounts;
};

/**
 * Generates year-over-year chart data for absence statistics
 */
export const generateYearOverYearChartData = (
  yearOverYearRawData: any[],
  currentYear: number,
  previousYear: number,
) => {
  const currentYearMonthly = getMonthlyUsage(yearOverYearRawData, currentYear);
  const previousYearMonthly = getMonthlyUsage(yearOverYearRawData, previousYear);

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return months.map((month, index) => ({
    month,
    [previousYear]: previousYearMonthly[index],
    [currentYear]: currentYearMonthly[index],
  }));
};
