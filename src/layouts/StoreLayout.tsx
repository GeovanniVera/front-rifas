import { Outlet, Link, useNavigate } from 'react-router'
import { useAuth } from '../auth'
import { LuTicket, LuLogIn, LuUserPlus, LuLayoutDashboard, LuLogOut } from 'react-icons/lu'
import styles from './StoreLayout.module.css'

/**
 * Layout público de la tienda.
 *
 * Muestra los productos sin requerir autenticación.
 * El header cambia según el estado de sesión:
 * - Sin sesión: "Iniciar sesión" + "Registrarse"
 * - Con sesión: "Ir al dashboard" + "Salir"
 */
export default function StoreLayout() {
  const { isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <LuTicket size={24} className={styles.brandIcon} />
            <span className={styles.brandName}>TiendaRifas</span>
          </Link>

          <nav className={styles.nav}>
            {isLoading ? null : isAuthenticated ? (
              <>
                <Link to="/dashboard" className={styles.navBtn}>
                  <LuLayoutDashboard size={16} />
                  Ir al dashboard
                </Link>
                <button onClick={handleLogout} className={`${styles.navBtn} ${styles.danger}`}>
                  <LuLogOut size={16} />
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={styles.navBtn}>
                  <LuLogIn size={16} />
                  Iniciar sesión
                </Link>
                <Link to="/register" className={`${styles.navBtn} ${styles.primary}`}>
                  <LuUserPlus size={16} />
                  Registrarse
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Contenido */}
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2026 TiendaRifas — Ventas de rifas solidarias y sorteos.</p>
      </footer>
    </div>
  )
}