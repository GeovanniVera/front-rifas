import { useQuery } from '@tanstack/react-query';
import { earningsService, type EarningsPeriod } from '../services/earnings.service';

export function useAdminEarnings(
  period: EarningsPeriod,
  offset: number,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ['admin', 'earnings', period, offset],
    queryFn: async () => {
      const response = await earningsService.getEarnings(period, offset);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al obtener las ganancias');
      }
      return response.data;
    },
    enabled,
  });
}
