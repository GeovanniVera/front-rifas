import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ticketService,
  type CreateCheckoutIntentData,
  type ConfirmCheckoutData,
  type RegisterOxxoData,
  type SimulateOxxoData,
  type PendingOxxoReservation,
  type RegisterTransferData,
  type PendingTransferReservation,
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
    // Refresco periódico cada 5 segundos para sincronización entre múltiples usuarios
    refetchInterval: 5000,
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'raffles'] });
    },
  });
}

export function useCancelCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ConfirmCheckoutData) => {
      const response = await ticketService.cancelCheckout(data);
      if (!response.success) {
        throw new Error(response.message || 'Error al cancelar la reserva');
      }
      return response.data ?? [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'raffles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'raffles'] });
    },
  });
}

export function useRegisterOxxo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterOxxoData) => {
      const response = await ticketService.registerOxxo(data);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al registrar orden OXXO');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'raffles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'checkout', 'reservas-oxxo'] });
    },
  });
}

export function useSimulateOxxo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SimulateOxxoData) => {
      const response = await ticketService.simulateOxxo(data);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al simular pago en OXXO');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'raffles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'checkout', 'reservas-oxxo'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'raffles'] });
    },
  });
}

export function usePendingOxxoReservations(options?: { enabled?: boolean }) {
  return useQuery<PendingOxxoReservation[]>({
    queryKey: ['admin', 'checkout', 'reservas-oxxo'],
    queryFn: async () => {
      const response = await ticketService.listPendingOxxo();
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al obtener reservas OXXO');
      }
      return response.data;
    },
    refetchInterval: 10000,
    enabled: options?.enabled ?? true,
  });
}

export function useRegisterTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterTransferData) => {
      const response = await ticketService.registerTransfer(data);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al registrar transferencia bancaria');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'raffles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'checkout', 'reservas-transferencia'] });
    },
  });
}

export function usePendingTransferReservations(options?: { enabled?: boolean }) {
  return useQuery<PendingTransferReservation[]>({
    queryKey: ['admin', 'checkout', 'reservas-transferencia'],
    queryFn: async () => {
      const response = await ticketService.listPendingTransfers();
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al obtener transferencias pendientes');
      }
      return response.data;
    },
    refetchInterval: 10000,
    enabled: options?.enabled ?? true,
  });
}

export function useConfirmTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ConfirmCheckoutData) => {
      const response = await ticketService.confirmTransfer(data);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al acreditar transferencia');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'raffles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'checkout', 'reservas-transferencia'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'raffles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'earnings'] });
    },
  });
}

export function useRejectTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ConfirmCheckoutData) => {
      const response = await ticketService.rejectTransfer(data);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al liberar transferencia');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'raffles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'checkout', 'reservas-transferencia'] });
    },
  });
}
