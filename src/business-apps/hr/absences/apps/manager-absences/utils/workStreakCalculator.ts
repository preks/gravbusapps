import dayjs from 'dayjs';

/**
 * Calculates work streaks for employees based on their absence data
 */
export const calculateWorkStreaks = (absencesForStreak: any[]): number[] => {
  const employeeAbsences: { [key: string]: any[] } = {};

  // Group absences by employee
  absencesForStreak.forEach((absence) => {
    const employeeId = absence.employee.id;
    if (!employeeAbsences[employeeId]) {
      employeeAbsences[employeeId] = [];
    }
    employeeAbsences[employeeId].push(absence);
  });

  const workStreaks: number[] = [];
  const currentDate = dayjs();
  const yearStart = dayjs().startOf('year');

  Object.keys(employeeAbsences).forEach((employeeId) => {
    const employeeAbsenceList = employeeAbsences[employeeId].sort((a, b) =>
      dayjs(a.startDate).diff(dayjs(b.startDate)),
    );

    let currentStreak = 0;
    let lastAbsenceEnd = yearStart;

    employeeAbsenceList.forEach((absence) => {
      const absenceStart = dayjs(absence.startDate);
      const absenceEnd = dayjs(absence.endDate);

      if (absenceStart.isAfter(lastAbsenceEnd)) {
        const workDays = absenceStart.diff(lastAbsenceEnd, 'day');
        currentStreak += workDays;
      }

      if (absenceEnd.isAfter(lastAbsenceEnd)) {
        lastAbsenceEnd = absenceEnd;
      }
    });

    if (currentDate.isAfter(lastAbsenceEnd)) {
      const finalWorkDays = currentDate.diff(lastAbsenceEnd, 'day');
      currentStreak += finalWorkDays;
    }

    workStreaks.push(currentStreak);
  });

  return workStreaks;
};

/**
 * Calculates the average work streak from an array of work streaks
 */
export const calculateAverageWorkStreak = (workStreaks: number[]): string => {
  if (workStreaks.length === 0) return '0.0';

  const average = workStreaks.reduce((sum, streak) => sum + streak, 0) / workStreaks.length;
  return (Math.round(average * 10) / 10).toFixed(1);
};
