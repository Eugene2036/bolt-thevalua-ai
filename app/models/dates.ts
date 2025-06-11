export const DATE_INPUT_FORMAT = 'YYYY-MM-DD';

export function delay(milliSeconds: number) {
  return new Promise((res) => setTimeout(() => res(undefined), milliSeconds));
}

export function getYearMonthFromDate(date: Date) {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  return `${year}-${month}`;
}

export function isDateInMonth(date: Date, yearMonthStr: string): boolean {
  try {
    const year = parseInt(yearMonthStr.slice(0, 4));
    const month = parseInt(yearMonthStr.slice(5));

    return date.getFullYear() === year && date.getMonth() === month - 1;
  } catch (error) {
    return false;
  }
}
