export function rupees(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN')
}

export function minutesToHuman(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} minutes`
  if (m === 0) return `${h} ${h === 1 ? 'hour' : 'hours'}`
  return `${h} ${h === 1 ? 'hour' : 'hours'} ${m} minutes`
}

export function minutesToShort(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

/** "06:10" -> "6:10 am", readable for screen readers and for sighted users. */
export function clockToHuman(time: string): string {
  const [hStr, mStr] = time.split(':')
  const h = Number(hStr)
  const suffix = h < 12 ? 'am' : 'pm'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${mStr} ${suffix}`
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function stopsLabel(stops: number): string {
  if (stops === 0) return 'Direct'
  if (stops === 1) return '1 stop'
  return `${stops} stops`
}
