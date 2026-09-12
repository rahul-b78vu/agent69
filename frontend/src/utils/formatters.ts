/**
 * Utility formatters for Agent 69 frontend.
 */

export function extractAlertHeadline(narrative?: string, fallbackCategory?: string): string {
  if (!narrative) {
    return fallbackCategory ? fallbackCategory.replace(/_/g, ' ') : 'Early Warning Alert';
  }

  const lines = narrative
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Filter out "WHY THIS ALERT WAS GENERATED"
  const nonHeaderLines = lines.filter(
    (l) => !l.toUpperCase().includes('WHY THIS ALERT WAS GENERATED')
  );

  if (nonHeaderLines.length === 0) {
    return fallbackCategory ? fallbackCategory.replace(/_/g, ' ') : 'Early Warning Alert';
  }

  // Look for contributing signal blocks: e.g. "Marks:", "Attendance:", etc.
  const signals: string[] = [];
  for (let i = 0; i < nonHeaderLines.length; i++) {
    const line = nonHeaderLines[i];
    if (
      line.endsWith(':') &&
      !line.toLowerCase().startsWith('final notice') &&
      !line.toLowerCase().startsWith('note') &&
      !line.includes('=')
    ) {
      const name = line.replace(':', '').trim();
      let devStr = '';

      for (let j = i + 1; j < Math.min(i + 5, nonHeaderLines.length); j++) {
        const nextLine = nonHeaderLines[j];
        if (nextLine.startsWith('Deviation =')) {
          const match = nextLine.match(/Deviation = ([+-]?[\d\.]+)/);
          if (match) {
            devStr = ` (${match[1]}%)`;
          }
          break;
        }
      }
      signals.push(`${name}${devStr}`);
    }
  }

  if (signals.length > 0) {
    return signals.join(' • ');
  }

  return fallbackCategory ? fallbackCategory.replace(/_/g, ' ') : nonHeaderLines[0];
}
