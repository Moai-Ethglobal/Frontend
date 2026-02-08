export function generateMeetingIcs(input: {
  title: string;
  scheduledAt: string;
  durationMinutes?: number;
  joinUrl?: string;
  description?: string;
}): string {
  const start = new Date(input.scheduledAt);
  const duration = input.durationMinutes ?? 60;
  const end = new Date(start.getTime() + duration * 60_000);

  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");

  const uid = `moai-${start.getTime()}@moai.local`;
  const desc = [input.description, input.joinUrl].filter(Boolean).join("\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Moai//Meeting//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${input.title}`,
  ];

  if (desc.length) lines.push(`DESCRIPTION:${desc}`);
  if (input.joinUrl) lines.push(`URL:${input.joinUrl}`);

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

export function downloadIcs(filename: string, icsContent: string): void {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
