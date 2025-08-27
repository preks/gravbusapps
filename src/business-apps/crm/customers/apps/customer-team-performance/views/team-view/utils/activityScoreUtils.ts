// Utility functions and cache for activity score calculation (duplicated locally to avoid cross-app imports)

const ACTIVITY_SCORE_CACHE = new Map<string, number>();

export const generateOccurredAt = (
  createdDate: Date,
  activityId: string
): string => {
  const seed = activityId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random1 = Math.sin(seed) * 10000;
  const random2 = Math.sin(seed * 2) * 10000;

  const maxDaysBack = 14;
  const daysBack = Math.floor((random1 - Math.floor(random1)) * maxDaysBack);
  const hoursBack = Math.floor((random2 - Math.floor(random2)) * 24);

  const occurredDate = new Date(createdDate);
  occurredDate.setDate(occurredDate.getDate() - daysBack);
  occurredDate.setHours(occurredDate.getHours() - hoursBack);

  return occurredDate.toISOString();
};

export const calculateActivityScore = (
  createdAt: string,
  occurredAt: string
): number => {
  const createdDate = new Date(createdAt);
  const occurredDate = new Date(occurredAt);

  const timeDiffMs = createdDate.getTime() - occurredDate.getTime();
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

  if (timeDiffHours <= 24) {
    return Math.max(90, Math.round(100 - (timeDiffHours / 24) * 10));
  } else if (timeDiffHours <= 72) {
    return Math.max(70, Math.round(90 - ((timeDiffHours - 24) / 48) * 20));
  } else if (timeDiffHours <= 168) {
    return Math.max(50, Math.round(70 - ((timeDiffHours - 72) / 96) * 20));
  } else if (timeDiffHours <= 336) {
    return Math.max(30, Math.round(50 - ((timeDiffHours - 168) / 168) * 20));
  } else {
    return Math.max(0, Math.round(30 - ((timeDiffHours - 336) / 168) * 30));
  }
};

export const getCachedActivityScore = (
  activityId: string,
  createdAt: string
): number => {
  if (ACTIVITY_SCORE_CACHE.has(activityId)) {
    return ACTIVITY_SCORE_CACHE.get(activityId)!;
  }

  const createdDate = new Date(createdAt);
  const occurredAt = generateOccurredAt(createdDate, activityId);
  const score = calculateActivityScore(createdAt, occurredAt);
  ACTIVITY_SCORE_CACHE.set(activityId, score);
  return score;
};


