import { useNavigate } from 'react-router'
import { useProductsAvailable } from '../../features/store/hooks/useProducts'
import { useRafflesActive } from '../../features/store/hooks/useRaffles'
import { LuShoppingCart, LuTicket } from 'react-icons/lu'
import styles from './StoreHomePage.module.css'

export default function StoreHomePage() {
  const navigate = useNavigate()
  const { data: products = [], isLoading: productsLoading } = useProductsAvailable()
  const { data: raffles = [], isLoading: rafflesLoading } = useRafflesActive()

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <LuTicket size={40} className={styles.heroIcon} />
        <h1 className={styles.heroTitle}>TiendaRifas — Tecnología y sorteos</h1>
        <p className={styles.heroSubtitle}>
          Comprá componentes de tecnología al mejor precio, o participá en nuestras rifas
          para llevarte un producto por una fracción de su valor.
        </p>
      </section>

      {/* Rifas activas (backend) */}
      <section>
        <h2 className={styles.sectionTitle}>Rifas activas</h2>
        {rafflesLoading ? (
          <p className="text-fg-muted py-8 text-center">Cargando rifas...</p>
        ) : raffles.length === 0 ? (
          <p className="text-fg-muted py-8 text-center">No hay rifas activas en este momento.</p>
        ) : (
          <div className={styles.grid}>
            {raffles.map((raffle) => (
              <article
                key={raffle.id}
                className={`${styles.card} ${styles.raffleCard}`}
                onClick={() => navigate(`/rifa/${raffle.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/rifa/${raffle.id}`)
                  }
                }}
              >
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
                  <span className={styles.badge}>Rifa</span>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{raffle.name}</h3>
                  <p className={styles.cardDesc}>
                    {raffle.ticketCount} boletos · margen {raffle.marginPercent}%
                  </p>
                  <div className={styles.cardFooter}>
                    <span className={styles.price}>
                      ${raffle.ticketPrice.toLocaleString('es-MX')}
                    </span>
                    <span className={styles.buyBtn}>
                      <LuTicket size={16} />
                      Participar
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Productos en venta (backend) */}
      <section>
        <h2 className={styles.sectionTitle}>Productos en venta</h2>
        {productsLoading ? (
          <p className="text-fg-muted py-8 text-center">Cargando productos...</p>
        ) : products.length === 0 ? (
          <p className="text-fg-muted py-8 text-center">No hay productos disponibles.</p>
        ) : (
          <div className={styles.grid}>
            {products.map((product) => (
              <article
                key={product.id}
                className={styles.card}
                onClick={() => navigate(`/producto/${product.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/producto/${product.id}`)
                  }
                }}
              >
                <div className={styles.imageWrap}>
                  <img
                    src={product.imageUrl ?? ''}
                    alt={product.name}
                    className={styles.image}
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                      ;(e.target as HTMLImageElement).parentElement!.classList.add(styles.imageFallback)
                    }}
                  />
                  <span className={styles.badge}>{product.category}</span>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{product.name}</h3>
                  <p className={styles.cardDesc}>{product.description}</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.price}>${product.price.toLocaleString('es-MX')}</span>
                    <span className={styles.buyBtn}>
                      <LuShoppingCart size={16} />
                      Ver
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}