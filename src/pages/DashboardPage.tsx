/**
 * Dashboard page - default landing after login.
 */
import { useNavigate } from 'react-router';
import { useAuth, useHasPrivilege } from '../auth';
import { Can } from '../auth/Can';
import Badge from '@components/primitives/Badge';
import Card from '@components/layout/Card';
import { StatCard, StatCardGroup } from '@components/layout/StatCard';
import { useProductsAdmin } from '../features/store/hooks/useProducts';
import { useRafflesAdmin } from '../features/store/hooks/useRaffles';
import {
  LuPackage,
  LuTicket,
  LuUsers,
  LuSettings,
  LuArrowRight,
  LuShoppingBag,
  LuUser,
  LuScrollText,
} from 'react-icons/lu';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Gatear el fetch por privilegio: sin products.read/raffles.read el backend
  // responde 403 y onForbidden recarga la página. La UI ya oculta las stats,
  // pero los hooks se llamaban igual y mantenían el loop de peticiones.
  const canReadProducts = useHasPrivilege('products.read');
  const canReadRaffles = useHasPrivilege('raffles.read');
  const canReadUsers = useHasPrivilege('users.read');
  const { data: products = [] } = useProductsAdmin({ enabled: canReadProducts });
  const { data: raffles = [] } = useRafflesAdmin({ enabled: canReadRaffles });

  const activeRaffles = raffles.filter((r) => r.status === 'ACTIVE');
  const ticketsSold = raffles.reduce((sum, r) => sum + r.ticketsSold, 0);

  const hasAdminPrivilege = canReadProducts || canReadRaffles || canReadUsers;

  const adminQuickActions = [
    {
      to: '/admin/productos',
      icon: LuPackage,
      title: 'Productos',
      desc: 'Gestioná el catálogo de productos de la tienda.',
      privilege: 'products.read',
    },
    {
      to: '/admin/rifas',
      icon: LuTicket,
      title: 'Rifas',
      desc: 'Creá rifas y gestioná sus estados.',
      privilege: 'raffles.read',
    },
    {
      to: '/admin',
      icon: LuUsers,
      title: 'Gestión de usuarios',
      desc: 'Usuarios, roles, permisos y auditoría.',
      privilege: 'users.read',
    },
    {
      to: '/ajustes',
      icon: LuSettings,
      title: 'Ajustes',
      desc: 'Perfil, actividad y configuración.',
      privilege: null,
    },
  ];

  const clientQuickActions = [
    {
      to: '/',
      icon: LuShoppingBag,
      title: 'Ver rifas activas',
      desc: 'Explorá las rifas disponibles en la tienda y participá.',
    },
    {
      to: '/ajustes/perfil',
      icon: LuUser,
      title: 'Mi perfil',
      desc: 'Gestioná tus datos personales, foto y contraseña.',
    },
    {
      to: '/ajustes/actividad',
      icon: LuScrollText,
      title: 'Mi actividad',
      desc: 'Consultá tu historial de sesiones y acciones.',
    },
  ];

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
      <div className="space-y-6">
        {/* Bienvenida */}
        <Card variant="elevated">
          <Card.Body>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-fg text-xl font-bold">Bienvenido, {user?.name}</h2>
                <p className="text-fg-muted mt-1 text-sm">
                  {hasAdminPrivilege
                    ? 'Panel de control administrativo.'
                    : 'Panel de tu cuenta de usuario.'}
                </p>
              </div>
              <div className="flex gap-2">
                {user?.roles?.map((role) => (
                  <Badge key={role} variant="info">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Stats de administración (solo visibles si tiene permisos de catálogo o rifas) */}
        {(canReadProducts || canReadRaffles) && (
          <StatCardGroup>
            <Can privilege="products.read">
              <StatCard
                value={products.length}
                label="Productos"
                icon={LuPackage}
                accent="#6366f1"
              />
            </Can>
            <Can privilege="raffles.read">
              <StatCard
                value={activeRaffles.length}
                label="Rifas activas"
                icon={LuTicket}
                accent="#10b981"
              />
            </Can>
            <Can privilege="raffles.read">
              <StatCard
                value={ticketsSold}
                label="Boletos vendidos"
                icon={LuTicket}
                accent="#f59e0b"
              />
            </Can>
          </StatCardGroup>
        )}

        {/* Acciones rápidas */}
        <div>
          <h3 className="text-fg mb-3 text-sm font-semibold tracking-wide uppercase">
            {hasAdminPrivilege ? 'Acciones administrativas' : 'Accesos directos'}
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {hasAdminPrivilege
              ? adminQuickActions.map((action) => {
                  const Icon = action.icon;
                  const card = (
                    <Card
                      key={action.to}
                      variant="default"
                      className="h-full"
                      onClick={() => navigate(action.to)}
                    >
                      <Card.Body>
                        <div className="flex items-start justify-between gap-3">
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: 'var(--accent-bg)',
                              color: 'var(--accent)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Icon size={20} />
                          </div>
                          <LuArrowRight size={16} className="text-fg-muted" />
                        </div>
                        <div className="mt-4">
                          <div className="text-fg text-sm font-semibold">{action.title}</div>
                          <div className="text-fg-muted mt-1 text-xs leading-relaxed">
                            {action.desc}
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  );

                  if (!action.privilege) return card;

                  return (
                    <Can key={action.to} privilege={action.privilege}>
                      {card}
                    </Can>
                  );
                })
              : clientQuickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Card
                      key={action.to}
                      variant="default"
                      className="h-full cursor-pointer transition-shadow hover:shadow-md"
                      onClick={() => navigate(action.to)}
                    >
                      <Card.Body>
                        <div className="flex items-start justify-between gap-3">
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: 'var(--accent-bg)',
                              color: 'var(--accent)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Icon size={20} />
                          </div>
                          <LuArrowRight size={16} className="text-fg-muted" />
                        </div>
                        <div className="mt-4">
                          <div className="text-fg text-sm font-semibold">{action.title}</div>
                          <div className="text-fg-muted mt-1 text-xs leading-relaxed">
                            {action.desc}
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
}
