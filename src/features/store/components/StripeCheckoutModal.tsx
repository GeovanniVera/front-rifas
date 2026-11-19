import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Modal } from '@components/overlays/Modal';
import Button from '@components/primitives/Button';
import { useToast } from '@components/feedback';
import {
  useConfirmCheckout,
  useCancelCheckout,
  useRegisterOxxo,
  useSimulateOxxo,
  useRegisterTransfer,
  useConfirmTransfer,
} from '../hooks/useTickets';
import type { TransferReservationResponse } from '../services/tickets.service';
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
  LuLandmark,
  LuCreditCard,
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
  isCancelling,
  onCancel,
  onVoucherGenerated,
  onClose,
  onSuccess,
}: Omit<StripeCheckoutModalProps, 'isOpen' | 'clientSecret'> & {
  isCancelling: boolean;
  onCancel: () => void;
  onVoucherGenerated: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const toast = useToast();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const confirmCheckout = useConfirmCheckout();
  const registerOxxo = useRegisterOxxo();
  const simulateOxxo = useSimulateOxxo();
  const registerTransfer = useRegisterTransfer();
  const confirmTransfer = useConfirmTransfer();

  const [checkoutTab, setCheckoutTab] = useState<'STRIPE' | 'TRANSFER'>('STRIPE');
  const [trackingReference, setTrackingReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [oxxoVoucher, setOxxoVoucher] = useState<OxxoVoucherData | null>(null);
  const [transferSlip, setTransferSlip] = useState<TransferReservationResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleCopyText = (text: string, fieldKey: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success(`${label} copiado al portapapeles`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleRegisterTransfer = async () => {
    setIsProcessing(true);
    try {
      const slip = await registerTransfer.mutateAsync({
        paymentIntentId,
        trackingReference: trackingReference.trim() || undefined,
      });
      onVoucherGenerated();
      setTransferSlip(slip);
      toast.info(
        'Ficha de transferencia generada. Boletos apartados por 3 horas para realizar tu SPEI.',
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al generar ficha de transferencia';
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveTransferAdmin = async () => {
    setIsSimulating(true);
    try {
      await confirmTransfer.mutateAsync({ paymentIntentId });
      toast.success(
        `¡Transferencia acreditada! Boletos confirmados: ${ticketNumbers.map((n) => `#${n}`).join(', ')}`,
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al acreditar transferencia';
      toast.error(msg);
    } finally {
      setIsSimulating(false);
    }
  };

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

        onVoucherGenerated();
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

          onVoucherGenerated();
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

  // ─── VISTA 3: FICHA DE TRANSFERENCIA BANCARIA SPEI GENERADA ───
  if (transferSlip) {
    return (
      <div className="flex flex-col gap-4">
        <div className="border-border-base bg-surface flex items-center justify-between rounded-xl border p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="bg-accent rounded px-2.5 py-1 text-xs font-black tracking-wider text-white uppercase">
              SPEI
            </span>
            <span className="text-heading text-sm font-semibold">
              Datos para Transferencia Bancaria
            </span>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            <LuClock size={13} />3 horas de reserva
          </span>
        </div>

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
              {transferSlip.ticketNumbers.map((n) => `#${n}`).join(', ')}
            </span>
          </div>
          <div className="border-border-base/50 flex items-center justify-between border-t pt-2 text-base">
            <span className="text-heading font-medium">Monto exacto a transferir:</span>
            <span className="text-success-strong text-lg font-bold">
              {formatCurrency(transferSlip.totalAmount)}
            </span>
          </div>
        </div>

        <div className="bg-surface border-border-base space-y-3 rounded-xl border p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-fg-muted text-xs">Banco receptor</span>
            <span className="text-heading font-semibold">{transferSlip.bankName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-fg-muted text-xs">Beneficiario</span>
            <span className="text-heading font-semibold">{transferSlip.beneficiary}</span>
          </div>

          <div className="border-border-base/50 border-t pt-2.5">
            <div className="text-fg-muted mb-1 text-xs font-medium">
              CLABE Interbancaria (18 dígitos)
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-background border-border-base text-heading flex-1 rounded-lg border px-3 py-2 font-mono text-sm font-bold tracking-wider">
                {transferSlip.clabe}
              </div>
              <Button
                variant="secondary"
                type="button"
                size="sm"
                onClick={() => handleCopyText(transferSlip.clabe, 'clabe', 'CLABE')}
              >
                {copiedField === 'clabe' ? (
                  <LuCheck size={15} className="text-success-strong" />
                ) : (
                  <LuCopy size={15} />
                )}
                {copiedField === 'clabe' ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>

          <div>
            <div className="text-fg-muted mb-1 text-xs font-medium">
              Concepto / Referencia obligatoria
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-background border-border-base text-accent flex-1 rounded-lg border px-3 py-2 font-mono text-sm font-extrabold tracking-wider">
                {transferSlip.referenceCode}
              </div>
              <Button
                variant="secondary"
                type="button"
                size="sm"
                onClick={() => handleCopyText(transferSlip.referenceCode, 'ref', 'Referencia')}
              >
                {copiedField === 'ref' ? (
                  <LuCheck size={15} className="text-success-strong" />
                ) : (
                  <LuCopy size={15} />
                )}
                {copiedField === 'ref' ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>

          {transferSlip.trackingReference && (
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-fg-muted">Tu clave de rastreo registrada:</span>
              <span className="text-heading font-mono font-semibold">
                {transferSlip.trackingReference}
              </span>
            </div>
          )}
        </div>

        <div className="bg-surface border-border-base text-fg-muted space-y-1.5 rounded-xl border p-4 text-xs">
          <p className="text-heading font-semibold">Instrucciones:</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>Ingresa a tu banca móvil y realiza una transferencia SPEI a la CLABE indicada.</li>
            <li>
              Coloca <strong>{transferSlip.referenceCode}</strong> en el campo de concepto o
              referencia.
            </li>
            <li>
              Tus boletos quedan apartados por 3 horas mientras el administrador valida tu
              transferencia.
            </li>
          </ol>
        </div>

        {isAdmin && (
          <div className="bg-accent-subtle/40 border-accent/30 space-y-3 rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <span className="bg-accent flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold text-white">
                <LuSparkles size={13} />
                Panel Admin (Modo Pruebas)
              </span>
              <span className="text-fg-muted text-xs">Acreditación directa</span>
            </div>
            <Button
              variant="primary"
              type="button"
              className="w-full"
              onClick={handleApproveTransferAdmin}
              disabled={isSimulating}
            >
              {isSimulating ? (
                <>
                  <LuLoader size={16} className="animate-spin" />
                  Acreditando transferencia...
                </>
              ) : (
                'Acreditar transferencia (Solo Administrador)'
              )}
            </Button>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button
            variant="ghost"
            type="button"
            onClick={() => {
              onSuccess();
              onClose();
            }}
          >
            Entendido, ya tengo los datos
          </Button>
        </div>
      </div>
    );
  }

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

  // ─── VISTA 1: FORMULARIO DE PAGO (TARJETA / OXXO / TRANSFERENCIA SPEI) ───
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

      {/* Selector de método: Tarjeta/OXXO vs Transferencia bancaria */}
      <div className="bg-background border-border-base grid grid-cols-2 gap-1.5 rounded-xl border p-1">
        <button
          type="button"
          onClick={() => setCheckoutTab('STRIPE')}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
            checkoutTab === 'STRIPE'
              ? 'bg-surface text-accent border-border-base border shadow-2xs'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          <LuCreditCard size={15} />
          Tarjeta / OXXO
        </button>
        <button
          type="button"
          onClick={() => setCheckoutTab('TRANSFER')}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
            checkoutTab === 'TRANSFER'
              ? 'bg-surface text-accent border-border-base border shadow-2xs'
              : 'text-fg-muted hover:text-fg'
          }`}
        >
          <LuLandmark size={15} />
          Transferencia (SPEI)
        </button>
      </div>

      {checkoutTab === 'STRIPE' ? (
        <>
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

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={onCancel}
              disabled={isProcessing || isCancelling}
            >
              {isCancelling ? 'Cancelando...' : 'Cancelar'}
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!stripe || !elements || isProcessing || isCancelling}
            >
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
        </>
      ) : (
        <>
          <div className="bg-surface border-border-base space-y-3 rounded-xl border p-4 text-sm">
            <div className="flex items-start gap-2.5">
              <div className="bg-accent-bg text-accent flex size-9 shrink-0 items-center justify-center rounded-lg">
                <LuLandmark size={18} />
              </div>
              <div>
                <p className="text-heading font-semibold">Transferencia Bancaria / SPEI</p>
                <p className="text-fg-muted text-xs">
                  Al generar tu ficha, te mostraremos la CLABE y referencia única. Tus boletos
                  quedarán apartados por <strong>3 horas</strong> mientras realizas el envío.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="transfer-tracking-ref"
                className="text-fg mb-1 block text-xs font-medium"
              >
                Clave de rastreo o folio (opcional)
              </label>
              <input
                id="transfer-tracking-ref"
                type="text"
                value={trackingReference}
                onChange={(e) => setTrackingReference(e.target.value)}
                placeholder="Si ya transferiste, escribe tu clave de rastreo"
                className="border-border-base bg-background text-fg w-full rounded-lg border px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={onCancel}
              disabled={isProcessing || isCancelling}
            >
              {isCancelling ? 'Cancelando...' : 'Cancelar'}
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleRegisterTransfer}
              disabled={isProcessing || isCancelling}
            >
              {isProcessing ? (
                <>
                  <LuLoader size={16} className="animate-spin" />
                  Generando ficha...
                </>
              ) : (
                `Generar ficha SPEI ${formatCurrency(totalAmount)}`
              )}
            </Button>
          </div>
        </>
      )}
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
  const cancelCheckout = useCancelCheckout();
  const toast = useToast();
  const [preserveReservation, setPreserveReservation] = useState(false);

  if (!isOpen || !clientSecret) return null;

  const handleCloseOrCancel = async () => {
    if (preserveReservation) {
      setPreserveReservation(false);
      onSuccess();
      onClose();
      return;
    }

    if (cancelCheckout.isPending) return;

    try {
      await cancelCheckout.mutateAsync({ paymentIntentId });
      toast.info('Reserva cancelada. Los boletos quedaron disponibles nuevamente.');
    } catch {
      // Si ya expiró o fue liberada, igual cerramos el modal y refrescamos
    } finally {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCloseOrCancel} width={580}>
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
            isCancelling={cancelCheckout.isPending}
            onCancel={handleCloseOrCancel}
            onVoucherGenerated={() => setPreserveReservation(true)}
            onClose={() => {
              setPreserveReservation(false);
              onClose();
            }}
            onSuccess={() => {
              setPreserveReservation(true);
              onSuccess();
            }}
          />
        </Elements>
      </Modal.Body>
    </Modal>
  );
}
