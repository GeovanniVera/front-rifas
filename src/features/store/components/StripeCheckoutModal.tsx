import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Modal } from '@components/overlays/Modal';
import Button from '@components/primitives/Button';
import { useToast } from '@components/feedback';
import { useConfirmCheckout } from '../hooks/useTickets';
import { env } from '@config/env';
import { formatCurrency } from '@config/constants';
import { LuShieldCheck, LuLoader, LuTicket } from 'react-icons/lu';

const stripePromise = loadStripe(env.VITE_STRIPE_PUBLIC_KEY || '');

interface StripeCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffleName: string;
  ticketNumbers: number[];
  clientSecret: string;
  paymentIntentId: string;
  totalAmount: number;
  onSuccess: () => void;
}

function PaymentForm({
  raffleName,
  ticketNumbers,
  paymentIntentId,
  totalAmount,
  onClose,
  onSuccess,
}: Omit<StripeCheckoutModalProps, 'isOpen' | 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const toast = useToast();
  const confirmCheckout = useConfirmCheckout();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Error al procesar el pago con la tarjeta');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Confirmar en el backend para marcar los boletos como SOLD
        await confirmCheckout.mutateAsync({
          paymentIntentId: paymentIntentId || paymentIntent.id,
        });

        toast.success(
          `¡Compra confirmada! Boletos adquiridos: ${ticketNumbers.map((n) => `#${n}`).join(', ')}`,
        );
        onSuccess();
        onClose();
      } else {
        toast.error('El pago no pudo completarse. Intenta con otra tarjeta.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al confirmar la compra de boletos';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Resumen del pedido */}
      <div className="bg-surface border-border-base rounded-xl border p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-fg-muted">Rifa:</span>
          <span className="text-heading font-semibold">{raffleName}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-fg-muted flex items-center gap-1.5">
            <LuTicket size={15} className="text-accent" /> Boletos ({ticketNumbers.length}):
          </span>
          <span className="font-semibold text-accent">
            {ticketNumbers.map((n) => `#${n}`).join(', ')}
          </span>
        </div>
        <div className="border-border-base/50 flex items-center justify-between border-t pt-2 text-base">
          <span className="font-medium text-heading">Total a pagar:</span>
          <span className="text-lg font-bold text-success-strong">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <div className="bg-surface border-border-base rounded-xl border p-4">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      <div className="text-fg-muted flex items-center justify-center gap-1.5 text-xs">
        <LuShieldCheck size={14} className="text-success-strong" />
        <span>Pago seguro cifrado con Stripe (Modo de Pruebas)</span>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onClose} disabled={isProcessing}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={!stripe || !elements || isProcessing}>
          {isProcessing ? (
            <>
              <LuLoader size={16} className="animate-spin" />
              Procesando pago...
            </>
          ) : (
            `Pagar ${formatCurrency(totalAmount)}`
          )}
        </Button>
      </div>
    </form>
  );
}

export function StripeCheckoutModal({
  isOpen,
  onClose,
  raffleName,
  ticketNumbers,
  clientSecret,
  paymentIntentId,
  totalAmount,
  onSuccess,
}: StripeCheckoutModalProps) {
  if (!isOpen || !clientSecret) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} width={560}>
      <Modal.Header title="Finalizar compra de boletos" />
      <Modal.Body>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#2563eb',
              },
            },
          }}
        >
          <PaymentForm
            raffleName={raffleName}
            ticketNumbers={ticketNumbers}
            paymentIntentId={paymentIntentId}
            totalAmount={totalAmount}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </Elements>
      </Modal.Body>
    </Modal>
  );
}
