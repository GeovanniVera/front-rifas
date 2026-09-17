import { useNavigate, useParams } from 'react-router'
import { useRaffle } from '../../features/store/hooks/useRaffles'
import { LuArrowLeft, LuTicket, LuLock } from 'react-icons/lu'
import { useAuth } from '../../auth'
import styles from './RaffleDetailPage.module.css'

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activa',
  DRAW: 'En sorteo',
  FINISHED: 'Finalizada',
  CANCELLED: 'Cancelada',
}

export default function RaffleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { data: raffle, isLoading, error } = useRaffle(id ?? '')

  if (isLoading) {
    return (
      <div className={styles.notFound}>
        <p className="text-fg-muted">Cargando rifa...</p>
      </div>
    )
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
    )
  }

  const total = raffle.ticketCount
  const sold = raffle.ticketsSold
  const available = Math.max(0, total - sold)
  const soldOut = available === 0
  const isActive = raffle.status === 'ACTIVE'
  const progress = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0

  const handleParticipate = () => {
    if (isAuthenticated) {
      // TODO v2: checkout de rifa (selección de boletos + pago)
      navigate('/dashboard')
    } else {
      navigate('/login', { state: { from: { pathname: `/rifa/${raffle.id}` } } })
    }
  }

  const disabled = !isActive || soldOut
  const buttonLabel = !isActive
    ? STATUS_LABEL[raffle.status] ?? raffle.status
    : soldOut
      ? 'Boletos agotados'
      : 'Participar'

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
              ;(e.target as HTMLImageElement).style.display = 'none'
              ;(e.target as HTMLImageElement).parentElement!.classList.add(styles.imageFallback)
            }}
          />
        </div>

        {/* Info */}
        <div className={styles.info}>
          <span className={styles.category}>Rifa</span>
          <h1 className={styles.title}>{raffle.name}</h1>
          {raffle.description && <p className={styles.description}>{raffle.description}</p>}

          {/* Boletos */}
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
                <span className={styles.statValue}>
                  ${raffle.ticketPrice.toLocaleString('es-MX')}
                </span>
                <span className={styles.statLabel}>por boleto</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{STATUS_LABEL[raffle.status] ?? raffle.status}</span>
                <span className={styles.statLabel}>estado</span>
              </div>
            </div>
          </div>

          <button className={styles.buyBtn} onClick={handleParticipate} disabled={disabled}>
            {isAuthenticated ? (
              <>
                <LuTicket size={18} />
                {buttonLabel}
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
  )
}