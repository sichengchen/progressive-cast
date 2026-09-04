export function isoNow(): string {
  return new Date().toISOString();
}

export function toMillis(value: string | undefined | null): number {
  if (!value) {
    return 0;
  }

  const millis = Date.parse(value);
  return Number.isFinite(millis) ? millis : 0;
}
