import dayjs from 'dayjs';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';

// Import dayjs locales
import 'dayjs/locale/ro';
import 'dayjs/locale/en';
import 'dayjs/locale/de';

export const analyzeSickAbsencesByMonth = (
  sickAbsences: any[],
): { month: string; count: number } => {
  const monthlySickAbsences: { [key: string]: number } = {};
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US';

  sickAbsences.forEach((absence) => {
    const month = dayjs(absence.startDate).locale(userLocale).format('MMMM');
    monthlySickAbsences[month] = (monthlySickAbsences[month] || 0) + 1;
  });

  let maxSickMonth = 'None';
  let maxSickCount = 0;

  Object.entries(monthlySickAbsences).forEach(([month, count]) => {
    if (count > maxSickCount) {
      maxSickCount = count;
      maxSickMonth = month;
    }
  });

  return {
    month: maxSickMonth,
    count: maxSickCount,
  };
};
