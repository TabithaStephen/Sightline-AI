import type { Flight } from '../types'

/**
 * Simulated flight data. Nothing here comes from a live airline system:
 * times, prices and availability are invented for the SIGHTLINE demo.
 */
export const FLIGHTS: Flight[] = [
  // Bengaluru -> Mumbai
  { id: 'f01', airline: 'IndiGo', airlineCode: '6E', flightNumber: '6E 5302', from: 'BLR', to: 'BOM', departTime: '06:10', arriveTime: '08:00', price: 4780, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false },
  { id: 'f02', airline: 'Akasa Air', airlineCode: 'QP', flightNumber: 'QP 1104', from: 'BLR', to: 'BOM', departTime: '07:45', arriveTime: '09:30', price: 5240, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false },
  { id: 'f03', airline: 'Air India', airlineCode: 'AI', flightNumber: 'AI 2854', from: 'BLR', to: 'BOM', departTime: '09:20', arriveTime: '11:10', price: 6890, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '25 kg check-in bag included', refundable: true },
  { id: 'f04', airline: 'SpiceJet', airlineCode: 'SG', flightNumber: 'SG 416', from: 'BLR', to: 'BOM', departTime: '12:40', arriveTime: '14:35', price: 5960, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false },
  { id: 'f05', airline: 'Air India Express', airlineCode: 'IX', flightNumber: 'IX 1182', from: 'BLR', to: 'BOM', departTime: '15:05', arriveTime: '16:55', price: 5310, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '20 kg check-in bag included', refundable: false },
  { id: 'f06', airline: 'IndiGo', airlineCode: '6E', flightNumber: '6E 6174', from: 'BLR', to: 'BOM', departTime: '18:30', arriveTime: '20:15', price: 7420, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false },
  { id: 'f07', airline: 'Air India', airlineCode: 'AI', flightNumber: 'AI 2910', from: 'BLR', to: 'BOM', departTime: '21:15', arriveTime: '23:05', price: 8650, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '25 kg check-in bag included', refundable: true },
  { id: 'f08', airline: 'SpiceJet', airlineCode: 'SG', flightNumber: 'SG 8702', from: 'BLR', to: 'BOM', departTime: '05:55', arriveTime: '10:40', price: 4120, stops: 1, via: ['HYD'], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false },
  { id: 'f09', airline: 'IndiGo', airlineCode: '6E', flightNumber: '6E 2231', from: 'BLR', to: 'BOM', departTime: '13:10', arriveTime: '19:45', price: 3860, stops: 1, via: ['MAA'], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false },
  { id: 'f10', airline: 'Akasa Air', airlineCode: 'QP', flightNumber: 'QP 1620', from: 'BLR', to: 'BOM', departTime: '11:20', arriveTime: '20:50', price: 3540, stops: 2, via: ['HYD', 'DEL'], cabinBag: '7 kg cabin bag', checkedBag: 'No check-in bag included', refundable: false },

  // Mumbai -> Bengaluru
  { id: 'f11', airline: 'IndiGo', airlineCode: '6E', flightNumber: '6E 5311', from: 'BOM', to: 'BLR', departTime: '06:35', arriveTime: '08:25', price: 4950, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false },
  { id: 'f12', airline: 'Vistara', airlineCode: 'UK', flightNumber: 'UK 864', from: 'BOM', to: 'BLR', departTime: '10:05', arriveTime: '11:55', price: 7180, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '20 kg check-in bag included', refundable: true },
  { id: 'f13', airline: 'SpiceJet', airlineCode: 'SG', flightNumber: 'SG 475', from: 'BOM', to: 'BLR', departTime: '14:20', arriveTime: '16:15', price: 5620, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false },
  { id: 'f14', airline: 'Air India', airlineCode: 'AI', flightNumber: 'AI 2861', from: 'BOM', to: 'BLR', departTime: '19:40', arriveTime: '21:35', price: 6740, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '25 kg check-in bag included', refundable: true },
  { id: 'f15', airline: 'IndiGo', airlineCode: '6E', flightNumber: '6E 7044', from: 'BOM', to: 'BLR', departTime: '22:50', arriveTime: '00:45', price: 4380, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false, arrivesNextDay: true },
  { id: 'f16', airline: 'Akasa Air', airlineCode: 'QP', flightNumber: 'QP 1372', from: 'BOM', to: 'BLR', departTime: '08:15', arriveTime: '13:30', price: 3990, stops: 1, via: ['HYD'], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false },

  // Bengaluru -> Delhi
  { id: 'f17', airline: 'IndiGo', airlineCode: '6E', flightNumber: '6E 2044', from: 'BLR', to: 'DEL', departTime: '06:00', arriveTime: '08:50', price: 6240, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false },
  { id: 'f18', airline: 'Air India', airlineCode: 'AI', flightNumber: 'AI 804', from: 'BLR', to: 'DEL', departTime: '09:45', arriveTime: '12:40', price: 8420, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '25 kg check-in bag included', refundable: true },
  { id: 'f19', airline: 'Vistara', airlineCode: 'UK', flightNumber: 'UK 814', from: 'BLR', to: 'DEL', departTime: '13:30', arriveTime: '16:20', price: 9150, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '20 kg check-in bag included', refundable: true },
  { id: 'f20', airline: 'SpiceJet', airlineCode: 'SG', flightNumber: 'SG 194', from: 'BLR', to: 'DEL', departTime: '17:55', arriveTime: '20:50', price: 7030, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false },
  { id: 'f21', airline: 'IndiGo', airlineCode: '6E', flightNumber: '6E 6588', from: 'BLR', to: 'DEL', departTime: '21:40', arriveTime: '00:35', price: 5880, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false, arrivesNextDay: true },
  { id: 'f22', airline: 'Air India Express', airlineCode: 'IX', flightNumber: 'IX 1452', from: 'BLR', to: 'DEL', departTime: '10:25', arriveTime: '16:45', price: 4990, stops: 1, via: ['BOM'], cabinBag: '7 kg cabin bag', checkedBag: '20 kg check-in bag included', refundable: false },

  // Delhi -> Mumbai
  { id: 'f23', airline: 'IndiGo', airlineCode: '6E', flightNumber: '6E 2105', from: 'DEL', to: 'BOM', departTime: '07:20', arriveTime: '09:35', price: 5490, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false },
  { id: 'f24', airline: 'Air India', airlineCode: 'AI', flightNumber: 'AI 865', from: 'DEL', to: 'BOM', departTime: '11:15', arriveTime: '13:25', price: 7260, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '25 kg check-in bag included', refundable: true },
  { id: 'f25', airline: 'SpiceJet', airlineCode: 'SG', flightNumber: 'SG 8169', from: 'DEL', to: 'BOM', departTime: '16:40', arriveTime: '18:55', price: 6180, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false },
  { id: 'f26', airline: 'Vistara', airlineCode: 'UK', flightNumber: 'UK 928', from: 'DEL', to: 'BOM', departTime: '20:10', arriveTime: '22:20', price: 8040, stops: 0, via: [], cabinBag: '7 kg cabin bag', checkedBag: '20 kg check-in bag included', refundable: true },
  { id: 'f27', airline: 'Akasa Air', airlineCode: 'QP', flightNumber: 'QP 1812', from: 'DEL', to: 'BOM', departTime: '09:05', arriveTime: '14:50', price: 4620, stops: 1, via: ['HYD'], cabinBag: '7 kg cabin bag', checkedBag: '15 kg check-in bag included', refundable: false },
]

export const SUPPORTED_ROUTES: Array<[string, string]> = [
  ['BLR', 'BOM'],
  ['BOM', 'BLR'],
  ['BLR', 'DEL'],
  ['DEL', 'BOM'],
]

export const AIRLINE_NAMES = [
  'IndiGo',
  'Air India Express',
  'Air India',
  'SpiceJet',
  'Akasa Air',
  'Vistara',
]
