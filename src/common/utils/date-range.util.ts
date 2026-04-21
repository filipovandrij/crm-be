const DATE_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

export function formatDateInTimeZone(date: Date, timeZone: string) {
  const formatter = getFormatter(
    `date:${timeZone}`,
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }),
  );

  return formatter.format(date);
}

export function getCurrentMonthToDateRange(timeZone: string, now = new Date()) {
  const current = getTimeZoneParts(now, timeZone);
  const from = zonedTimeToUtc(current.year, current.month, 1, 0, 0, 0, timeZone);
  const toExclusive = zonedTimeToUtc(
    current.year,
    current.month,
    current.day + 1,
    0,
    0,
    0,
    timeZone,
  );

  return {
    from,
    toExclusive,
    period: {
      from: formatDateInTimeZone(from, timeZone),
      to: formatDateInTimeZone(addDays(toExclusive, -1), timeZone),
      timezone: timeZone,
    },
    days: current.day,
  };
}

export function getPreviousAnalogRange(currentFrom: Date, days: number) {
  const from = addDays(currentFrom, -days);
  const toExclusive = currentFrom;

  return { from, toExclusive };
}

export function parseIsoDate(value: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return zonedTimeToUtc(
    Number(year),
    Number(month),
    Number(day),
    0,
    0,
    0,
    timeZone,
  );
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return asUtc - date.getTime();
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = getFormatter(
    `parts:${timeZone}`,
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  );

  const parts = formatter.formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
    hour: Number(parts.find((part) => part.type === 'hour')?.value),
    minute: Number(parts.find((part) => part.type === 'minute')?.value),
    second: Number(parts.find((part) => part.type === 'second')?.value),
  };
}

function getFormatter(key: string, formatter: Intl.DateTimeFormat) {
  if (!DATE_FORMATTER_CACHE.has(key)) {
    DATE_FORMATTER_CACHE.set(key, formatter);
  }

  return DATE_FORMATTER_CACHE.get(key)!;
}
