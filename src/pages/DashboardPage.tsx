/**
 * Dashboard page - default landing after login.
 */
import { useNavigate } from 'react-router';
import { useAuth } from '../auth';
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
} from 'react-icons/lu';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: products = [] } = useProductsAdmin();
  const { data: raffles = [] } = useRafflesAdmin();

  const activeRaffles = raffles.filter((r) => r.status === 'ACTIVE')
  const ticketsSold = raffles.reduce((sum, r) => sum + r.ticketsSold, 0)

  const quickActions = [
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

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
      <div className="space-y-6">
        {/* Bienvenida */}
        <Card variant="elevated">
          <Card.Body>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-fg text-xl font-bold">Bienvenido, {user?.name}</h2>
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

        {/* Stats */}
        <StatCardGroup>
          <Can privilege="products.read">
            <StatCard value={products.length} label="Productos" icon={LuPackage} accent="#6366f1" />
          </Can>
          <Can privilege="raffles.read">
            <StatCard value={activeRaffles.length} label="Rifas activas" icon={LuTicket} accent="#10b981" />
          </Can>
          <Can privilege="raffles.read">
            <StatCard value={ticketsSold} label="Boletos vendidos" icon={LuTicket} accent="#f59e0b" />
          </Can>
        </StatCardGroup>

        {/* Acciones rápidas */}
        <div>
          <h3 className="text-fg mb-3 text-sm font-semibold tracking-wide uppercase">
            Acciones rápidas
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {quickActions.map((action) => {
              const Icon = action.icon;
              const card = (
                <Card variant="default" className="h-full" onClick={() => navigate(action.to)}>
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

              // Ajustes: siempre visible (solo auth)
              if (!action.privilege) return card;

              return (
                <Can key={action.to} privilege={action.privilege}>
                  {card}
                </Can>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}