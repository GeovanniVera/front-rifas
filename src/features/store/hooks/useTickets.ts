import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ticketService,
  type CreateCheckoutIntentData,
  type ConfirmCheckoutData,
  type RaffleTicket,
} from '../services/tickets.service';

export function useRaffleTickets(raffleId: string) {
  return useQuery<RaffleTicket[]>({
    queryKey: ['store', 'raffles', raffleId, 'tickets'],
    queryFn: async () => {
      const response = await ticketService.listTickets(raffleId);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al obtener boletos');
      }
      return response.data;
    },
    enabled: !!raffleId,
    // Refresco periódico cada 4 segundos para sincronización entre múltiples usuarios
    refetchInterval: 4000,
  });
}

export function useCreateCheckoutIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCheckoutIntentData) => {
      const response = await ticketService.createIntent(data);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al generar checkout');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['store', 'raffles', variables.raffleId, 'tickets'],
      });
    },
  });
}

export function useConfirmCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ConfirmCheckoutData) => {
      const response = await ticketService.confirmCheckout(data);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al confirmar compra');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'raffles'] });
    },
  });
}
