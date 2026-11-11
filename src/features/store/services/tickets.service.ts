import { client } from '@lib/api/client';
import type { ApiResponse } from '@lib/api/types/api-response';

export type TicketStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';

export interface RaffleTicket {
  id: string;
  raffleId: string;
  ticketNumber: number;
  status: TicketStatus;
  isMine: boolean;
  paymentMethod?: string;
  expiresAt?: string;
}

export interface CreateCheckoutIntentData {
  raffleId: string;
  ticketNumbers: number[];
}

export interface CheckoutIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amountInCents: number;
  totalAmount: number;
  currency: string;
  ticketNumbers: number[];
}

export interface ConfirmCheckoutData {
  paymentIntentId: string;
}

export interface RegisterOxxoData {
  paymentIntentId: string;
}

export interface SimulateOxxoData {
  paymentIntentId: string;
}

export interface OxxoReservationResponse {
  paymentIntentId: string;
  paymentMethod: string;
  expiresAt: string;
  expiresInMinutes: number;
  ticketNumbers: number[];
}

export interface PendingOxxoReservation {
  paymentIntentId: string;
  raffleId: string;
  raffleName: string;
  userId: string;
  userName: string;
  userEmail: string;
  ticketNumbers: number[];
  totalAmount: number;
  reservedAt: string;
  expiresAt: string;
  minutesRemaining: number;
  expired: boolean;
}

export const ticketService = {
  /** Obtiene todos los boletos de una rifa y su estado */
  listTickets: (raffleId: string): Promise<ApiResponse<RaffleTicket[]>> =>
    client.get<RaffleTicket[]>(`/raffles/${raffleId}/tickets`),

  /** Crea un PaymentIntent en Stripe y aparta los boletos temporalmente */
  createIntent: (data: CreateCheckoutIntentData): Promise<ApiResponse<CheckoutIntentResponse>> =>
    client.post<CheckoutIntentResponse>('/checkout/crear-intento', data),

  /** Confirma la compra tras el éxito en Stripe Elements */
  confirmCheckout: (data: ConfirmCheckoutData): Promise<ApiResponse<RaffleTicket[]>> =>
    client.post<RaffleTicket[]>('/checkout/confirmar', data),

  /** Registra que el usuario eligió OXXO y extiende la reserva a 3 horas */
  registerOxxo: (data: RegisterOxxoData): Promise<ApiResponse<OxxoReservationResponse>> =>
    client.post<OxxoReservationResponse>('/checkout/registrar-oxxo', data),

  /** Simula la acreditación en efectivo de OXXO (Modo prueba) */
  simulateOxxo: (data: SimulateOxxoData): Promise<ApiResponse<RaffleTicket[]>> =>
    client.post<RaffleTicket[]>('/checkout/simular-oxxo', data),

  /** Lista las reservas de OXXO pendientes de pago para el panel de administración */
  listPendingOxxo: (): Promise<ApiResponse<PendingOxxoReservation[]>> =>
    client.get<PendingOxxoReservation[]>('/admin/checkout/reservas-oxxo'),
};
