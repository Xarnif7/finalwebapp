export type MagicInput = {
  jobEndAt?: string | null;
  now?: Date;
  tzOffsetMinutes?: number; // local offset from UTC in minutes
};

function clampToWindow(d: Date): Date {
  const hour = d.getHours();
  if (hour < 6) {
    d.setHours(6, 0, 0, 0);
  } else if (hour >= 22) {
    d.setDate(d.getDate() + 1);
    d.setHours(6, 0, 0, 0);
  }
  return d;
}

export function computeBestSendAt({ jobEndAt, now = new Date() }: MagicInput): Date {
  const base = new Date(now);
  let candidate = new Date(base);

  if (jobEndAt) {
    const end = new Date(jobEndAt);
    candidate = new Date(end.getTime() + 2 * 60 * 60 * 1000); // +2h
  }

  candidate = clampToWindow(candidate);

  // Bias Tue–Thu 10:00–13:00
  const day = candidate.getDay(); // 0 Sun .. 6 Sat
  const isTueThu = day === 2 || day === 3 || day === 4;
  if (!isTueThu) {
    // move to next Tuesday 10:00
    const daysToAdd = (2 - day + 7) % 7;
    const nextTue = new Date(candidate);
    nextTue.setDate(candidate.getDate() + (daysToAdd === 0 ? 7 : daysToAdd));
    nextTue.setHours(10, 0, 0, 0);
    candidate = nextTue;
  } else {
    // set between 10 and 13; if earlier, set to 10; if later than 13, move to next day 10
    const h = candidate.getHours();
    if (h < 10) {
      candidate.setHours(10, 0, 0, 0);
    } else if (h > 13) {
      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(10, 0, 0, 0);
    }
  }

  return candidate;
}


