import { client } from '@lib/api/client'
import type { ApiResponse } from '@lib/api/types/api-response'

export type RaffleStatus = 'ACTIVE' | 'DRAW' | 'FINISHED' | 'CANCELLED'

export interface Raffle {
  id: string
  productId: string
  productName?: string
  productImageUrl?: string
  name: string
  description?: string
  marginPercent: number
  ticketCount: number
  ticketsSold: number
  ticketPrice: number
  status: RaffleStatus
  createdAt?: string
}

export interface CreateRaffleData {
  productId: string
  marginPercent: number
  ticketCount: number
}

export const raffleService = {
  /** Lista rifas activas (tienda pública) */
  listActive: (): Promise<ApiResponse<Raffle[]>> =>
    client.get<Raffle[]>('/raffles'),

  /** Lista todas las rifas (admin) */
  listAll: (): Promise<ApiResponse<Raffle[]>> =>
    client.get<Raffle[]>('/admin/raffles'),

  /** Obtiene una rifa */
  get: (id: string): Promise<ApiResponse<Raffle>> =>
    client.get<Raffle>(`/raffles/${id}`),

  /** Crea rifa desde producto (multipart no — query params) */
  create: (data: CreateRaffleData): Promise<ApiResponse<Raffle>> => {
    const params = new URLSearchParams({
      productId: data.productId,
      marginPercent: String(data.marginPercent),
      ticketCount: String(data.ticketCount),
    })
    return client.post<Raffle>(`/admin/raffles?${params.toString()}`)
  },

  /** Cambia estado de rifa */
  changeStatus: (id: string, status: RaffleStatus): Promise<ApiResponse<Raffle>> =>
    client.patch<Raffle>(`/admin/raffles/${id}/status?status=${status}`),

  /** Elimina rifa */
  delete: (id: string): Promise<ApiResponse<void>> =>
    client.delete<void>(`/admin/raffles/${id}`),
}