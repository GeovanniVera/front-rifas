import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  raffleService,
  type CreateRaffleData,
  type RaffleStatus,
} from '../services/raffles.service';
import type { UseAdminQueryOptions } from './useProducts';

export function useRafflesActive() {
  return useQuery({
    queryKey: ['store', 'raffles'],
    queryFn: async () => {
      const response = await raffleService.listActive();
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al listar rifas');
      }
      return response.data;
    },
  });
}

export function useRafflesAdmin({ enabled = true }: UseAdminQueryOptions = {}) {
  return useQuery({
    queryKey: ['admin', 'raffles'],
    queryFn: async () => {
      const response = await raffleService.listAll();
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al listar rifas');
      }
      return response.data;
    },
    enabled,
  });
}

export function useRaffle(id: string) {
  return useQuery({
    queryKey: ['store', 'raffles', id],
    queryFn: async () => {
      const response = await raffleService.get(id);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Error al obtener rifa');
      }
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateRaffle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRaffleData) => raffleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'raffles'] });
      queryClient.invalidateQueries({ queryKey: ['store', 'raffles'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['store', 'products'] });
    },
  });
}

export function useChangeRaffleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RaffleStatus }) =>
      raffleService.changeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'raffles'] });
      queryClient.invalidateQueries({ queryKey: ['store', 'raffles'] });
    },
  });
}

export function useDeleteRaffle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => raffleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'raffles'] });
      queryClient.invalidateQueries({ queryKey: ['store', 'raffles'] });
    },
  });
}
