import dayjs from 'dayjs';

export const analyzeSickAbsencesByMonth = (
  sickAbsences: any[],
): { month: string; count: number } => {
  const monthlySickAbsences: { [key: string]: number } = {};

  sickAbsences.forEach((absence) => {
    const month = dayjs(absence.startDate).format('MMMM');
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
