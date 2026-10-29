import { useNavigate, useParams } from 'react-router';
import { useRaffle } from '../../features/store/hooks/useRaffles';
import { LuArrowLeft, LuTicket, LuLock, LuCalendar, LuInfo } from 'react-icons/lu';
import { useAuth } from '../../auth';
import type { Raffle } from '../../features/store/services/raffles.service';
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
          <span className={styles.statValue}>${raffle.ticketPrice.toLocaleString('es-MX')}</span>
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

function RaffleNotice({ drawDate }: { drawDate?: string }) {
  const formattedDate = drawDate
    ? new Date(drawDate).toLocaleString('es-MX', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : 'Fecha de sorteo por programar';

  return (
    <div className="bg-surface border-border-base space-y-1.5 rounded-lg border p-4">
      <div className="text-accent flex items-center gap-2 text-sm font-semibold">
        <LuCalendar size={16} />
        <span>{drawDate ? `Sorteo programado: ${formattedDate}` : formattedDate}</span>
      </div>
      <p className="text-fg-muted flex items-start gap-1.5 text-xs">
        <LuInfo size={14} className="text-accent mt-0.5 shrink-0" />
        <span>
          Rifa anunciada. La compra y selección de boletos se habilitará próximamente antes del
          sorteo.
        </span>
      </p>
    </div>
  );
}

export default function RaffleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: raffle, isLoading, error } = useRaffle(id ?? '');

  if (isLoading) {
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

  const isActive = raffle.status === 'ACTIVE';
  const isAvailable = isActive && raffle.ticketsSold < raffle.ticketCount;

  const handleParticipate = () => {
    if (isAuthenticated) {
      // TODO v2: checkout de rifa (selección de boletos + pago)
      navigate('/dashboard');
    } else {
      navigate('/login', { state: { from: { pathname: `/rifa/${raffle.id}` } } });
    }
  };

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
          <RaffleNotice drawDate={raffle.drawDate} />

          <button
            className={styles.buyBtn}
            onClick={handleParticipate}
            disabled={!isAuthenticated || isActive || !isAvailable}
          >
            {isAuthenticated ? (
              <>
                <LuTicket size={18} />
                {isActive
                  ? 'Venta de boletos próximamente'
                  : (STATUS_LABEL[raffle.status] ?? raffle.status)}
              </>
            ) : (
              <>
                <LuLock size={18} />
                Iniciá sesión para participar
              </>
            )}
          </button>

          {!isAuthenticated && (
            <p className={styles.authHint}>
              ¿Ya tenés cuenta? <a href="/login">Iniciá sesión</a> o{' '}
              <a href="/register">registrate</a> para participar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
