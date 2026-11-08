import { client } from '@lib/api/client';
import type { ApiResponse } from '@lib/api/types/api-response';

export type TicketStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';

export interface RaffleTicket {
  id: string;
  raffleId: string;
  ticketNumber: number;
  status: TicketStatus;
  isMine: boolean;
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
};
