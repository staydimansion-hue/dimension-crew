const KST_TIME_ZONE = "Asia/Seoul";

function kstParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  );
  return parts as Record<
    "year" | "month" | "day" | "hour" | "minute" | "second",
    string
  >;
}

export function kstDateString(date: Date = new Date()): string {
  const p = kstParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function kstDateTimeString(date: Date = new Date()): string {
  const p = kstParts(date);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}
