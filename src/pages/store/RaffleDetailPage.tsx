import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useRaffle } from '../../features/store/hooks/useRaffles';
import { useRaffleTickets, useCreateCheckoutIntent } from '../../features/store/hooks/useTickets';
import {
  LuArrowLeft,
  LuTicket,
  LuLock,
  LuCalendar,
  LuInfo,
  LuCheck,
  LuLoader,
  LuShieldAlert,
} from 'react-icons/lu';
import { useAuth } from '../../auth';
import { useToast } from '@components/feedback';
import { StripeCheckoutModal } from '../../features/store/components/StripeCheckoutModal';
import type { Raffle } from '../../features/store/services/raffles.service';
import type { CheckoutIntentResponse } from '../../features/store/services/tickets.service';
import { formatCurrency } from '@config/constants';
import styles from './RaffleDetailPage.module.css';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activa',
  DRAW: 'En sorteo',
  FINISHED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

function RaffleStats({ raffle }: { raffle: Raffle }) {
  const total = raffle.ticketCount;
  const sold = raffle.ticketsSold;
  const available = Math.max(0, total - sold);
  const progress = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;

  return (
    <div className={styles.ticketBox}>
      <div className={styles.ticketHeader}>
        <span className={styles.ticketTitle}>
          {sold} de {total} boletos vendidos
        </span>
        <span className={styles.ticketPct}>{progress}%</span>
      </div>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{available}</span>
          <span className={styles.statLabel}>boletos disponibles</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatCurrency(raffle.ticketPrice)}</span>
          <span className={styles.statLabel}>por boleto</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{STATUS_LABEL[raffle.status] ?? raffle.status}</span>
          <span className={styles.statLabel}>estado</span>
        </div>
        {raffle.drawDate && (
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {new Date(raffle.drawDate).toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className={styles.statLabel}>fecha de sorteo</span>
          </div>
        )}
      </div>
    </div>
  );
}

function RaffleNotice({ drawDate, isExpired }: { drawDate?: string; isExpired?: boolean }) {
  const formattedDate = drawDate
    ? new Date(drawDate).toLocaleString('es-MX', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : 'Fecha de sorteo por programar';

  return (
    <div
      className={`space-y-1.5 rounded-lg border p-4 ${
        isExpired ? 'border-warning/30 bg-warning/10' : 'border-border-base bg-surface'
      }`}
    >
      <div
        className={`flex items-center gap-2 text-sm font-semibold ${
          isExpired ? 'text-warning-strong' : 'text-accent'
        }`}
      >
        <LuCalendar size={16} />
        <span>{drawDate ? `Sorteo: ${formattedDate}` : formattedDate}</span>
      </div>
      <p className="text-fg-muted flex items-start gap-1.5 text-xs">
        <LuInfo
          size={14}
          className={`mt-0.5 shrink-0 ${isExpired ? 'text-warning-strong' : 'text-accent'}`}
        />
        <span>
          {isExpired
            ? 'La fecha límite de esta rifa ya pasó. El sorteo está en proceso o finalizado; la venta de boletos ha cerrado.'
            : 'Selecciona tus boletos favoritos en el tablero interactivo de abajo para participar en el sorteo.'}
        </span>
      </p>
    </div>
  );
}

export default function RaffleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  const { data: raffle, isLoading: raffleLoading, error } = useRaffle(id ?? '');
  const {
    data: tickets = [],
    isLoading: ticketsLoading,
    refetch: refetchTickets,
  } = useRaffleTickets(id ?? '');
  const createCheckout = useCreateCheckoutIntent();

  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [checkoutData, setCheckoutData] = useState<CheckoutIntentResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (raffleLoading) {
    return (
      <div className={styles.notFound}>
        <p className="text-fg-muted">Cargando rifa...</p>
      </div>
    );
  }

  if (error || !raffle) {
    return (
      <div className={styles.notFound}>
        <h2>Rifa no encontrada</h2>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <LuArrowLeft size={16} />
          Volver a la tienda
        </button>
      </div>
    );
  }

  const isExpired = raffle.drawDate ? new Date(raffle.drawDate).getTime() < Date.now() : false;
  const isActive = raffle.status === 'ACTIVE' && !isExpired;

  const toggleTicket = (ticketNumber: number) => {
    setSelectedNumbers((prev) =>
      prev.includes(ticketNumber)
        ? prev.filter((n) => n !== ticketNumber)
        : [...prev, ticketNumber].sort((a, b) => a - b),
    );
  };

  const handleStartCheckout = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/rifa/${raffle.id}` } } });
      return;
    }

    if (selectedNumbers.length === 0) {
      toast.warning('Selecciona al menos un boleto para continuar');
      return;
    }

    try {
      const intent = await createCheckout.mutateAsync({
        raffleId: raffle.id,
        ticketNumbers: selectedNumbers,
      });

      setCheckoutData(intent);
      setIsModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al apartar los boletos';
      toast.error(msg);
      // Refrescar boletos para reflejar el estado actual si alguien más los ganó
      refetchTickets();
    }
  };

  const handleCheckoutSuccess = () => {
    setSelectedNumbers([]);
    setCheckoutData(null);
    setIsModalOpen(false);
    refetchTickets();
  };

  const totalSelectedPrice = selectedNumbers.length * raffle.ticketPrice;

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate('/')}>
        <LuArrowLeft size={16} />
        Volver a la tienda
      </button>

      <div className={styles.detail}>
        {/* Imagen */}
        <div className={styles.imageWrap}>
          <img
            src={raffle.productImageUrl ?? ''}
            alt={raffle.name}
            className={styles.image}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.classList.add(styles.imageFallback);
            }}
          />
        </div>

        {/* Info */}
        <div className={styles.info}>
          <span className={styles.category}>Rifa</span>
          <h1 className={styles.title}>{raffle.name}</h1>
          {raffle.description && <p className={styles.description}>{raffle.description}</p>}

          <RaffleStats raffle={raffle} />
          <RaffleNotice drawDate={raffle.drawDate} isExpired={isExpired} />
        </div>
      </div>

      {/* ─── TABLERO INTERACTIVO DE BOLETOS ─── */}
      <section className="bg-surface border-border-base space-y-6 rounded-2xl border p-6 shadow-sm">
        {/* Banner informativo de boletos apartados en OXXO */}
        {tickets.some((t) => t.isMine && t.status === 'RESERVED' && t.paymentMethod === 'OXXO') && (
          <div className="text-heading flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase">
                OXXO Pay
              </span>
              <span>
                Tienes{' '}
                <strong>
                  {
                    tickets.filter(
                      (t) => t.isMine && t.status === 'RESERVED' && t.paymentMethod === 'OXXO',
                    ).length
                  }{' '}
                  boleto(s)
                </strong>{' '}
                apartados (
                {tickets
                  .filter((t) => t.isMine && t.status === 'RESERVED' && t.paymentMethod === 'OXXO')
                  .map((t) => `#${t.ticketNumber}`)
                  .join(', ')}
                ) con reserva activa por 3 horas para depósito en efectivo.
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-heading flex items-center gap-2 text-xl font-bold">
              <LuTicket className="text-accent" />
              Selecciona tus Boletos
            </h2>
            <p className="text-fg-muted text-sm">
              Haz clic en los boletos disponibles que quieras comprar para este sorteo.
            </p>
          </div>

          {/* Leyenda de colores */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-foreground flex items-center gap-1.5 font-medium">
              <span className="border-border-base bg-background inline-block size-3.5 rounded border" />
              Disponible
            </span>
            <span className="text-foreground flex items-center gap-1.5 font-medium">
              <span className="bg-accent inline-block size-3.5 rounded" />
              Seleccionado
            </span>
            <span className="text-foreground flex items-center gap-1.5 font-medium">
              <span className="bg-warning/20 border-warning/40 inline-block size-3.5 rounded border" />
              Apartado
            </span>
            <span className="text-foreground flex items-center gap-1.5 font-medium">
              <span className="bg-foreground/15 border-border-base inline-block size-3.5 rounded border opacity-60" />
              Vendido
            </span>
          </div>
        </div>

        {ticketsLoading ? (
          <div className="flex items-center justify-center py-12">
            <LuLoader size={28} className="text-accent animate-spin" />
            <span className="text-fg-muted ml-2 text-sm">Cargando tablero de boletos...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-fg-muted py-8 text-center text-sm">
            No hay boletos emitidos aún para esta rifa.
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
            {tickets.map((ticket) => {
              const isSelected = selectedNumbers.includes(ticket.ticketNumber);
              const isSold = ticket.status === 'SOLD';
              const isReserved = ticket.status === 'RESERVED';
              const isDisabled = isSold || isReserved || !isActive;

              let btnStyle =
                'relative flex flex-col items-center justify-center p-2 rounded-xl text-sm font-semibold transition-all duration-150 border ';

              if (isSelected) {
                btnStyle +=
                  'bg-accent text-white border-accent shadow-md scale-105 ring-2 ring-accent/30';
              } else if (isSold) {
                btnStyle +=
                  'bg-foreground/5 text-fg-muted border-border-base/40 opacity-40 cursor-not-allowed';
              } else if (isReserved) {
                btnStyle +=
                  'bg-warning/10 text-warning-strong border-warning/30 opacity-70 cursor-not-allowed';
              } else {
                btnStyle +=
                  'bg-background hover:bg-accent-subtle hover:border-accent text-heading border-border-base cursor-pointer hover:scale-102';
              }

              return (
                <button
                  key={ticket.id || ticket.ticketNumber}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => toggleTicket(ticket.ticketNumber)}
                  className={btnStyle}
                  title={
                    isSold
                      ? `Boleto #${ticket.ticketNumber} ya vendido`
                      : isReserved
                        ? `Boleto #${ticket.ticketNumber} en proceso de pago`
                        : `Seleccionar boleto #${ticket.ticketNumber}`
                  }
                >
                  <span className="text-xs opacity-75">#</span>
                  <span className="text-base font-bold">{ticket.ticketNumber}</span>

                  {isSold && <LuLock size={12} className="absolute top-1 right-1 opacity-70" />}
                  {isSelected && (
                    <LuCheck size={12} className="absolute top-1 right-1 text-white" />
                  )}
                  {ticket.isMine && (
                    <span
                      className={`absolute -bottom-1 rounded-full px-1 text-[9px] font-bold text-white uppercase ${
                        isReserved ? 'bg-amber-600' : 'bg-success-strong'
                      }`}
                    >
                      {isReserved
                        ? ticket.paymentMethod === 'OXXO'
                          ? 'OXXO'
                          : 'Apartado'
                        : 'Tuyo'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── BARRA RESUMEN Y BOTÓN DE COMPRA ─── */}
        <div className="bg-background border-border-base flex flex-col items-center justify-between gap-4 rounded-xl border p-4 sm:flex-row">
          <div className="space-y-1 text-center sm:text-left">
            {selectedNumbers.length > 0 ? (
              <>
                <p className="text-heading text-sm font-medium">
                  Boletos seleccionados:{' '}
                  <span className="text-accent font-bold">
                    {selectedNumbers.map((n) => `#${n}`).join(', ')}
                  </span>{' '}
                  <span className="text-fg-muted">({selectedNumbers.length} boleto(s))</span>
                </p>
                <p className="text-success-strong text-lg font-extrabold">
                  Total a pagar: {formatCurrency(totalSelectedPrice)}
                </p>
              </>
            ) : (
              <p className="text-fg-muted text-sm">
                Ningún boleto seleccionado. Haz clic en los números libres para agregarlos a tu
                compra.
              </p>
            )}
          </div>

          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
            {selectedNumbers.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedNumbers([])}
                className="text-fg-muted hover:text-foreground cursor-pointer text-xs underline"
              >
                Limpiar selección
              </button>
            )}

            <button
              type="button"
              onClick={handleStartCheckout}
              disabled={selectedNumbers.length === 0 || !isActive || createCheckout.isPending}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all duration-150 ${
                selectedNumbers.length === 0 || !isActive
                  ? 'bg-foreground/20 cursor-not-allowed opacity-50'
                  : 'bg-accent shadow-accent/20 shadow-md hover:brightness-110 active:brightness-95'
              }`}
            >
              {createCheckout.isPending ? (
                <>
                  <LuLoader size={18} className="animate-spin" />
                  Apartando boletos...
                </>
              ) : isAuthenticated ? (
                <>
                  <LuTicket size={18} />
                  {isExpired
                    ? 'Fecha límite vencida'
                    : selectedNumbers.length === 0
                      ? 'Selecciona boletos'
                      : `Comprar ${selectedNumbers.length} boleto(s)`}
                </>
              ) : (
                <>
                  <LuLock size={18} />
                  Iniciá sesión para comprar
                </>
              )}
            </button>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="text-fg-muted flex items-center justify-center gap-2 pt-1 text-xs">
            <LuShieldAlert size={14} className="text-accent" />
            <span>
              Debes tener una sesión activa para que los boletos se registren a tu nombre tras
              pagar.
            </span>
          </div>
        )}
      </section>

      {/* ─── MODAL CHECKOUT STRIPE ELEMENTS ─── */}
      {checkoutData && (
        <StripeCheckoutModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          raffleName={raffle.name}
          ticketNumbers={checkoutData.ticketNumbers}
          clientSecret={checkoutData.clientSecret}
          paymentIntentId={checkoutData.paymentIntentId}
          totalAmount={checkoutData.totalAmount}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
