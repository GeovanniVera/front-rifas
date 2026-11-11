import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Modal } from '@components/overlays/Modal';
import Button from '@components/primitives/Button';
import { useToast } from '@components/feedback';
import { useConfirmCheckout, useRegisterOxxo, useSimulateOxxo } from '../hooks/useTickets';
import { useAuth } from '../../../auth/hooks';
import { env } from '@config/env';
import { formatCurrency } from '@config/constants';
import {
  LuShieldCheck,
  LuLoader,
  LuTicket,
  LuCopy,
  LuCheck,
  LuClock,
  LuExternalLink,
  LuSparkles,
  LuStore,
} from 'react-icons/lu';

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

interface OxxoVoucherData {
  referenceNumber: string;
  hostedVoucherUrl: string;
  expiresAfter: number;
}

/** Formatea una cadena de referencia OXXO en grupos de 4 dígitos para mejor lectura */
function formatOxxoReference(ref: string): string {
  const clean = ref.replace(/\s+/g, '');
  const chunks = clean.match(/.{1,4}/g);
  return chunks ? chunks.join(' ') : clean;
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
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const confirmCheckout = useConfirmCheckout();
  const registerOxxo = useRegisterOxxo();
  const simulateOxxo = useSimulateOxxo();

  const [isProcessing, setIsProcessing] = useState(false);
  const [oxxoVoucher, setOxxoVoucher] = useState<OxxoVoucherData | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleCopyReference = () => {
    if (!oxxoVoucher?.referenceNumber) return;
    navigator.clipboard.writeText(oxxoVoucher.referenceNumber);
    setCopied(true);
    toast.success('Número de referencia copiado al portapapeles');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    try {
      await simulateOxxo.mutateAsync({ paymentIntentId });
      toast.success(
        `¡Pago en OXXO acreditado con éxito! Boletos confirmados: ${ticketNumbers.map((n) => `#${n}`).join(', ')}`,
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al simular la acreditación en OXXO';
      toast.error(msg);
    } finally {
      setIsSimulating(false);
    }
  };

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
        if (error.code === 'invalid_owner_name' || error.message?.toLowerCase().includes('name')) {
          toast.error(
            'Para OXXO debes ingresar tu Nombre y Apellido completos (ej: Demian Pérez).',
          );
        } else {
          toast.error(error.message || 'Error al procesar el método de pago');
        }
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Pago inmediato con tarjeta
        await confirmCheckout.mutateAsync({
          paymentIntentId: paymentIntentId || paymentIntent.id,
        });

        toast.success(
          `¡Compra confirmada! Boletos adquiridos: ${ticketNumbers.map((n) => `#${n}`).join(', ')}`,
        );
        onSuccess();
        onClose();
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        const nextAction = paymentIntent.next_action as unknown as {
          type?: string;
          oxxo_display_details?: {
            number?: string;
            hosted_voucher_url?: string;
            expires_after?: number;
          };
        } | null;

        if (nextAction?.oxxo_display_details) {
          // Pago con OXXO generado
          const details = nextAction.oxxo_display_details;

          // Registrar en backend para extender la reserva a 3 horas
          await registerOxxo.mutateAsync({
            paymentIntentId: paymentIntentId || paymentIntent.id,
          });

          setOxxoVoucher({
            referenceNumber: details.number || '',
            hostedVoucherUrl: details.hosted_voucher_url || '',
            expiresAfter: details.expires_after || 0,
          });

          toast.info(
            'Ficha OXXO generada. Boletos reservados por 3 horas para completar tu depósito.',
          );
        } else {
          toast.error('El pago no pudo completarse. Intenta con otro método.');
        }
      } else {
        toast.error('El pago no pudo completarse. Intenta con otro método.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el pago';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── VISTA 2: FICHA DE PAGO OXXO GENERADA ───
  if (oxxoVoucher) {
    return (
      <div className="flex flex-col gap-4">
        {/* Banner OXXO */}
        <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="rounded bg-red-600 px-2.5 py-1 text-xs font-black tracking-wider text-white uppercase">
              OXXO Pay
            </span>
            <span className="text-heading text-sm font-semibold">Ficha digital de depósito</span>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <LuClock size={13} />3 horas de reserva
          </span>
        </div>

        {/* Resumen del pedido */}
        <div className="bg-surface border-border-base space-y-2 rounded-xl border p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg-muted">Rifa:</span>
            <span className="text-heading font-semibold">{raffleName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg-muted flex items-center gap-1.5">
              <LuTicket size={15} className="text-accent" /> Boletos apartados:
            </span>
            <span className="text-accent font-semibold">
              {ticketNumbers.map((n) => `#${n}`).join(', ')}
            </span>
          </div>
          <div className="border-border-base/50 flex items-center justify-between border-t pt-2 text-base">
            <span className="text-heading font-medium">Total exacto a pagar:</span>
            <span className="text-success-strong text-lg font-bold">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        {/* Caja de Referencia Numérica */}
        <div className="bg-surface border-border-base space-y-2.5 rounded-xl border p-4 text-center">
          <p className="text-fg-muted text-xs font-medium tracking-wider uppercase">
            Referencia de pago (14 dígitos)
          </p>
          <div className="bg-background border-border-base text-heading flex items-center justify-center gap-2 rounded-lg border p-3 font-mono text-xl font-extrabold tracking-widest sm:text-2xl">
            {formatOxxoReference(oxxoVoucher.referenceNumber)}
          </div>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Button
              variant="secondary"
              type="button"
              className="flex-1"
              onClick={handleCopyReference}
            >
              {copied ? (
                <>
                  <LuCheck size={16} className="text-success-strong" />
                  ¡Copiado!
                </>
              ) : (
                <>
                  <LuCopy size={16} />
                  Copiar referencia
                </>
              )}
            </Button>
            {oxxoVoucher.hostedVoucherUrl && (
              <Button
                variant="secondary"
                type="button"
                className="flex-1"
                onClick={() => window.open(oxxoVoucher.hostedVoucherUrl, '_blank')}
              >
                <LuExternalLink size={16} />
                Ver código de barras oficial
              </Button>
            )}
          </div>
        </div>

        {/* Instrucciones en tienda */}
        <div className="bg-surface border-border-base text-fg-muted space-y-2 rounded-xl border p-4 text-xs">
          <p className="text-heading flex items-center gap-1.5 font-semibold">
            <LuStore size={14} className="text-accent" /> Instrucciones para pagar en OXXO:
          </p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>Acude a cualquier tienda OXXO de la República Mexicana.</li>
            <li>
              Indica al cajero que vas a realizar un pago de servicio <strong>OXXO Pay</strong>.
            </li>
            <li>Dicta el número de referencia de 14 dígitos o muestra el código de barras.</li>
            <li>
              Paga la cantidad exacta en efectivo. <em>(OXXO cobra una comisión fija de caja)</em>.
            </li>
          </ol>
          <p className="border-border-base/50 text-fg-muted border-t pt-2 text-[11px] italic">
            * Nota: Tu apartado en el sistema tiene vigencia de 3 horas para evitar acaparamiento de
            boletos antes de volver a estar disponible al público.
          </p>
        </div>

        {/* MODO PRUEBAS / SIMULACIÓN DOCENTE — Únicamente visible para Administradores */}
        {isAdmin && (
          <div className="bg-accent-subtle/40 border-accent/30 space-y-3 rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <span className="bg-accent flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold text-white">
                <LuSparkles size={13} />
                Panel Admin (Modo Pruebas)
              </span>
              <span className="text-fg-muted text-xs">Acreditación directa</span>
            </div>
            <p className="text-foreground text-xs">
              Como administrador, puedes simular la acreditación inmediata de este depósito en
              efectivo para evaluar el sorteo y la venta sin acudir a la tienda.
            </p>
            <Button
              variant="primary"
              type="button"
              className="w-full"
              onClick={handleSimulatePayment}
              disabled={isSimulating}
            >
              {isSimulating ? (
                <>
                  <LuLoader size={16} className="animate-spin" />
                  Acreditando pago en OXXO...
                </>
              ) : (
                '🧪 Acreditar pago OXXO (Solo Administrador)'
              )}
            </Button>
          </div>
        )}

        {/* Botón de cierre */}
        <div className="flex justify-end pt-1">
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              onSuccess();
              onClose();
            }}
          >
            Entendido, pagaré más tarde
          </Button>
        </div>
      </div>
    );
  }

  // ─── VISTA 1: FORMULARIO STRIPE ELEMENTS (TARJETA + OXXO) ───
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Resumen del pedido */}
      <div className="bg-surface border-border-base space-y-2 rounded-xl border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-fg-muted">Rifa:</span>
          <span className="text-heading font-semibold">{raffleName}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-fg-muted flex items-center gap-1.5">
            <LuTicket size={15} className="text-accent" /> Boletos ({ticketNumbers.length}):
          </span>
          <span className="text-accent font-semibold">
            {ticketNumbers.map((n) => `#${n}`).join(', ')}
          </span>
        </div>
        <div className="border-border-base/50 flex items-center justify-between border-t pt-2 text-base">
          <span className="text-heading font-medium">Total a pagar:</span>
          <span className="text-success-strong text-lg font-bold">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {/* Stripe Payment Element con pestañas Tarjeta y OXXO */}
      <div className="bg-surface border-border-base rounded-xl border p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
            defaultValues: {
              billingDetails: {
                name: user?.name && user.name.trim().includes(' ') ? user.name : undefined,
                email: user?.email || undefined,
              },
            },
          }}
        />
      </div>

      <div className="text-fg-muted flex items-center justify-center gap-1.5 text-xs">
        <LuShieldCheck size={14} className="text-success-strong" />
        <span>Pago seguro cifrado con Stripe (Tarjeta y Depósito en OXXO)</span>
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
              Procesando...
            </>
          ) : (
            `Continuar ${formatCurrency(totalAmount)}`
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
    <Modal isOpen={isOpen} onClose={onClose} width={580}>
      <Modal.Header title="Finalizar compra de boletos" />
      <Modal.Body>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#044311',
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
