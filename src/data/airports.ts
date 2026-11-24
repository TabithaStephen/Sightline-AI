import type { Airport } from '../types'

export const AIRPORTS: Airport[] = [
  { code: 'BLR', city: 'Bengaluru', airport: 'Kempegowda International', aliases: ['bengaluru', 'bangalore', 'blr'] },
  { code: 'BOM', city: 'Mumbai', airport: 'Chhatrapati Shivaji Maharaj International', aliases: ['mumbai', 'bombay', 'bom'] },
  { code: 'DEL', city: 'Delhi', airport: 'Indira Gandhi International', aliases: ['delhi', 'new delhi', 'del'] },
  { code: 'HYD', city: 'Hyderabad', airport: 'Rajiv Gandhi International', aliases: ['hyderabad', 'hyd'] },
  { code: 'MAA', city: 'Chennai', airport: 'Chennai International', aliases: ['chennai', 'madras', 'maa'] },
  { code: 'GOI', city: 'Goa', airport: 'Manohar International', aliases: ['goa', 'goi'] },
]

export function airportByCode(code: string): Airport | undefined {
  return AIRPORTS.find((a) => a.code === code)
}

export function cityName(code: string): string {
  return airportByCode(code)?.city ?? code
}
