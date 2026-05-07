/**
 * Return [YYYY, MM, DD] string parts for a date string offset by N days.
 * @param {string} dateStr - date string parseable by Date.parse
 * @param {number} [days] - number of days to add (negative to subtract)
 * @returns {string[]} - [YYYY, MM, DD]
 */
export const dateStrAddDay = (dateStr, days = 0) => {
  const d = new Date(Date.parse(dateStr) - new Date().getTimezoneOffset());
  d.setDate(d.getDate() + days); // add the days
  return [
    d.getFullYear().toString(),
    (d.getMonth() + 1).toString().padStart(2, 0),
    d.getDate().toString().padStart(2, 0),
  ];
};

/**
 * Return a new ISO datetime string offset by N days from the input.
 * @param {string} isoString - ISO datetime string
 * @param {number} [days] - number of days to add (negative to subtract)
 * @returns {string} ISO datetime string
 */
export const dateStrAddDayISO = (isoString, days = 0) => {
  const d = new Date(isoString);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

/**
 * Get local,date time and TZ in ISO format
 * @param {Date|string} dt - Date object or ISO datetime string
 * @param {string} tz - IANA time zone name, e.g. 'Asia/Singapore'
 * @returns {string} -  return string format: 2023-10-24 11:40:15 GMT+8
 */
export const getLocaleDateTimeTzISO = (dt, tz) => {
  const opts = {
    timeZoneName: 'short',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };
  if (tz) opts.timeZone = tz;
  if (!(dt instanceof Date)) dt = new Date(dt);
  return dt.toLocaleString('sv', opts);
};

/**
 * Get local date in ISO format
 * @param {string} isoString - ISO datetime string
 * @param {string} tz - IANA time zone name, e.g. 'Asia/Singapore'
 * @returns {string}
 */
export const getLocaleDateISO = (isoString, tz) => getLocaleDateTimeTzISO(isoString, tz).substring(0, 10);

/**
 * Get local date in ISO format
 * @param {string} isoString - ISO datetime string
 * @param {string} tz - IANA time zone name, e.g. 'Asia/Singapore'
 * @returns {string}
 */
export const getLocaleTimeISO = (isoString, tz) => getLocaleDateTimeTzISO(isoString, tz).substring(11, 19);

/**
 * Return the timezone offset of a Date in ISO format.
 * @param {Date} [date] - defaults to now
 * @returns {string} e.g. `+08:00` or `-05:30`
 */
export const getTzOffsetISO = date => {
  const pad = n => `${Math.floor(Math.abs(n))}`.padStart(2, '0'); // Pad a number to 2 digits
  if (!date) date = new Date();
  const tzOffset = -date.getTimezoneOffset();
  return `${(tzOffset >= 0 ? '+' : '-') + pad(tzOffset / 60)}:${pad(tzOffset % 60)}`;
};

/**
 * Return the current UTC timestamp as a compact string.
 * @param {Date} [date] - defaults to now
 * @returns {string} format: YYYYMMDD_HHmmssZ
 */
export const getYmdhmsUtc = date => {
  if (!date) date = new Date();
  const d = date.toISOString();
  return `${d.substring(0, 4) + d.substring(5, 7) + d.substring(8, 10)}_${d.substring(11, 13)}${d.substring(14, 16)}${d.substring(17, 19)}Z`;
};

/**
 * Get day of week index (0-6) for a given date and timezone
 * @param {Date|string} date - Date object or ISO datetime string
 * @param {string} tz - IANA time zone name, e.g. 'Asia/Singapore'
 * @returns {Number}
 */
export const getDayOfWeek = (date, tz) => {
  if (!(date instanceof Date)) date = new Date(date);
  const opts = { weekday: 'short' };
  if (tz) opts.timeZone = tz;
  const shortDayName = new Intl.DateTimeFormat('en-US', opts).format(date); // Get short day name string for specified timezone
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Map the short name back to a numeric index
  return daysOfWeek.indexOf(shortDayName);
};

// Obsolete use getLocaleDateISO and getLocaleTimeISO instead
// export const dateISO = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().substring(0, 10);
// export const timeISO = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().substring(11, 19);
