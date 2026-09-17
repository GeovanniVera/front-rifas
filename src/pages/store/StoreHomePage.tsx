import { useNavigate } from 'react-router'
import { useProductsAvailable } from '../../features/store/hooks/useProducts'
import { useRafflesActive } from '../../features/store/hooks/useRaffles'
import { LuShoppingCart, LuTicket, LuPackage, LuSparkles, LuArrowRight, LuShieldCheck } from 'react-icons/lu'
import styles from './StoreHomePage.module.css'

export default function StoreHomePage() {
  const navigate = useNavigate()
  const { data: products = [], isLoading: productsLoading } = useProductsAvailable()
  const { data: raffles = [], isLoading: rafflesLoading } = useRafflesActive()

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className={styles.page}>
      {/* Hero — estilo categoría de tienda real */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <div className={`${styles.floatIcon} ${styles.floatIcon1}`}>
            <LuTicket size={110} />
          </div>
          <div className={`${styles.floatIcon} ${styles.floatIcon2}`}>
            <LuPackage size={80} />
          </div>
          <div className={`${styles.floatIcon} ${styles.floatIcon3}`}>
            <LuSparkles size={56} />
          </div>
        </div>

        <span className={styles.heroEyebrow}>Rifas · Tecnología · Sorteos</span>
        <h1 className={styles.heroTitle}>
          Participá en rifas y llevate <span className={styles.heroHighlight}>la tecnología</span>{' '}
          que querés
        </h1>
        <p className={styles.heroSubtitle}>
          Comprá componentes de tecnología al mejor precio, o participá en nuestras rifas
          para llevarte un producto por una fracción de su valor.
        </p>

        <div className={styles.heroCtas}>
          <button className={styles.heroCtaPrimary} onClick={() => scrollToSection('seccion-rifas')}>
            Explorar rifas
            <LuArrowRight size={16} />
          </button>
          <button className={styles.heroCtaGhost} onClick={() => scrollToSection('seccion-productos')}>
            Ver productos
          </button>
        </div>

        <div className={styles.heroStats}>
          <span>
            <strong>{raffles.length}</strong> rifas activas
          </span>
          <span>
            <strong>{products.length}</strong> productos
          </span>
          <span>
            <LuShieldCheck size={14} />
            pagos seguros
          </span>
        </div>
      </section>

      {/* Rifas activas (backend) */}
      <section id="seccion-rifas">
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
      <section id="seccion-productos">
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