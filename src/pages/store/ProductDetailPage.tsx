import { useNavigate, useParams } from 'react-router'
import { useProduct } from '../../features/store/hooks/useProducts'
import { LuArrowLeft, LuShoppingCart, LuLock } from 'react-icons/lu'
import { useAuth } from '../../auth'
import styles from './ProductDetailPage.module.css'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { data: product, isLoading, error } = useProduct(id ?? '')

  if (isLoading) {
    return (
      <div className={styles.notFound}>
        <p className="text-fg-muted">Cargando producto...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className={styles.notFound}>
        <h2>Producto no encontrado</h2>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <LuArrowLeft size={16} />
          Volver a la tienda
        </button>
      </div>
    )
  }

  const handleBuy = () => {
    if (isAuthenticated) {
      // TODO v2: agregar al carrito o ir a checkout
      navigate('/dashboard')
    } else {
      navigate('/login', { state: { from: { pathname: `/producto/${product.id}` } } })
    }
  }

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
            src={product.imageUrl ?? ''}
            alt={product.name}
            className={styles.image}
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
              ;(e.target as HTMLImageElement).parentElement!.classList.add(styles.imageFallback)
            }}
          />
        </div>

        {/* Info */}
        <div className={styles.info}>
          <span className={styles.category}>{product.category}</span>
          <h1 className={styles.title}>{product.name}</h1>
          <p className={styles.description}>{product.description}</p>

          <div className={styles.priceRow}>
            <span className={styles.price}>${product.price.toLocaleString('es-MX')}</span>
            <span className={styles.stock}>
              {product.stock > 0 ? `${product.stock} unidades disponibles` : 'Sin stock'}
            </span>
          </div>

          <button
            className={styles.buyBtn}
            onClick={handleBuy}
            disabled={product.stock === 0}
          >
            {isAuthenticated ? (
              <>
                <LuShoppingCart size={18} />
                Comprar
              </>
            ) : (
              <>
                <LuLock size={18} />
                Iniciá sesión para comprar
              </>
            )}
          </button>

          {!isAuthenticated && (
            <p className={styles.authHint}>
              ¿Ya tenés cuenta? <a href="/login">Iniciá sesión</a> o{' '}
              <a href="/register">registrate</a> para comprar.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}