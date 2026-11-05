export const RAFFLE_CONFIG = {
  TICKET_RATE: 0.07, // Tasa por boleto (ej. 0.07 = 7%, 0.10 = 10%)
  MIN_TICKET_PRICE: 1.0, // $1.00 MXN mínimo
  get TOTAL_TICKETS(): number {
    return Math.ceil(2 / this.TICKET_RATE);
  },
};

/** Formatea montos a enteros redondeados sin centavos (ej. $70) */
export const formatCurrency = (amount: number): string => {
  return `$${Math.round(amount).toLocaleString('es-MX')}`;
};
