import { client } from '@lib/api/client';
import type { ApiResponse } from '@lib/api/types/api-response';

export type EarningsPeriod = 'DAY' | 'WEEK' | 'FORTNIGHT';

export interface PeriodOption {
  offset: number;
  label: string;
}

export interface EarningsKpis {
  totalEarnings: number;
  earningsTrend: string;
  ticketsSold: number;
  ticketsTrend: string;
  averageTicket: number;
  averageTrend: string;
  transactionsCount: number;
  rafflesCountLabel: string;
}

export interface ChartPoint {
  label: string;
  subLabel: string;
  amount: number;
  tickets: number;
}

export interface DistributionSlice {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  bgColor: string;
}

export interface MovementRecord {
  id: string;
  folio: string;
  raffleId: string;
  concept: string;
  ticketNumbers: number[];
  tickets: number;
  paymentMethod: string;
  buyerName: string;
  buyerEmail: string;
  purchasedAt: string;
  timestamp: string;
  amount: number;
}

export interface EarningsReportResponse {
  period: EarningsPeriod;
  offset: number;
  title: string;
  rangeLabel: string;
  rangeStart: string;
  rangeEnd: string;
  selectorOptions: PeriodOption[];
  kpis: EarningsKpis;
  chartSeries: ChartPoint[];
  distribution: DistributionSlice[];
  movements: MovementRecord[];
}

export const earningsService = {
  getEarnings: (
    period: EarningsPeriod,
    offset: number = 0,
  ): Promise<ApiResponse<EarningsReportResponse>> =>
    client.get<EarningsReportResponse>(`/admin/earnings?period=${period}&offset=${offset}`),

  exportReport: (
    period: EarningsPeriod,
    offset: number,
    format: 'pdf' | 'xlsx',
    paymentMethod?: string,
  ): Promise<void> => {
    const params = new URLSearchParams({
      period,
      offset: String(offset),
      format,
    });
    if (paymentMethod && paymentMethod !== 'TODOS') {
      params.append('paymentMethod', paymentMethod);
    }
    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    return client.downloadBlob(
      `/admin/earnings/export?${params.toString()}`,
      `ganancias_${period.toLowerCase()}.${ext}`,
    );
  },
};
