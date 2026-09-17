import { Outlet, Link, useNavigate } from 'react-router'
import { useAuth } from '../auth'
import {
  LuLogIn,
  LuUserPlus,
  LuLayoutDashboard,
  LuLogOut,
  LuFacebook,
  LuInstagram,
  LuTwitter,
  LuYoutube,
  LuMail,
  LuPhone,
  LuShieldCheck,
  LuBadgeCheck,
  LuTruck,
  LuCreditCard,
} from 'react-icons/lu'
import styles from './StoreLayout.module.css'

/**
 * Layout público de la tienda.
 *
 * Muestra los productos sin requerir autenticación.
 * El header cambia según el estado de sesión:
 * - Sin sesión: "Iniciar sesión" + "Registrarse"
 * - Con sesión: "Ir al dashboard" + "Salir"
 *
 * Footer rico estilo tienda real: marca + redes, columnas de enlaces,
 * sellos de confianza y barra legal inferior.
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
            <img src="/nuvora.png" alt="NUVORA" className={styles.brandLogo} />
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

      {/* Footer — rico, estilo tienda real */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerGrid}>
            {/* Marca + redes */}
            <div className={styles.footerBrand}>
              <Link to="/" className={styles.footerBrandLink}>
                <img src="/nuvora.png" alt="NUVORA" className={styles.brandLogo} />
              </Link>
              <p className={styles.footerDesc}>
                Tienda de rifas solidarias y tecnología. Comprá boletos, seguí los sorteos y
                llevate productos reales por una fracción de su valor.
              </p>
              <div className={styles.socials}>
                <a href="#" aria-label="Facebook">
                  <LuFacebook size={18} />
                </a>
                <a href="#" aria-label="Instagram">
                  <LuInstagram size={18} />
                </a>
                <a href="#" aria-label="Twitter / X">
                  <LuTwitter size={18} />
                </a>
                <a href="#" aria-label="YouTube">
                  <LuYoutube size={18} />
                </a>
              </div>
            </div>

            {/* Tienda */}
            <div className={styles.footerCol}>
              <h4>Tienda</h4>
              <a href="#seccion-rifas">Rifas activas</a>
              <a href="#seccion-productos">Productos</a>
              <Link to="/login">Ofertas y sorteos</Link>
              <Link to="/">Novedades</Link>
            </div>

            {/* Mi cuenta */}
            <div className={styles.footerCol}>
              <h4>Mi cuenta</h4>
              <Link to="/login">Iniciar sesión</Link>
              <Link to="/register">Crear cuenta</Link>
              <Link to="/ajustes/perfil">Mi perfil</Link>
              <Link to="/ajustes/actividad">Mi actividad</Link>
            </div>

            {/* Soporte */}
            <div className={styles.footerCol}>
              <h4>Ayuda</h4>
              <Link to="/terms">Términos y condiciones</Link>
              <Link to="/terms">Política de privacidad</Link>
              <span>
                <LuMail size={14} />
                hola@tiendarifas.com
              </span>
              <span>
                <LuPhone size={14} />
                +54 11 5555-1234
              </span>
            </div>
          </div>

          {/* Sellos de confianza */}
          <div className={styles.footerTrust}>
            <span>
              <LuShieldCheck size={16} />
              Pagos 100% seguros
            </span>
            <span>
              <LuBadgeCheck size={16} />
              Boletos verificados
            </span>
            <span>
              <LuTruck size={16} />
              Envíos protegidos
            </span>
            <span>
              <LuCreditCard size={16} />
              Tarjetas y transferencias
            </span>
          </div>
        </div>

        {/* Barra legal */}
        <div className={styles.footerBar}>
          <div className={styles.footerBarInner}>
            <p>© 2026 NUVORA — Ventas de rifas solidarias y sorteos.</p>
            <div className={styles.footerBarLinks}>
              <Link to="/terms">Términos</Link>
              <Link to="/terms">Privacidad</Link>
              <Link to="/terms">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}