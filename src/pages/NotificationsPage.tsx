import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '../features/notifications/hooks/useNotifications';
import type { InAppNotification } from '../features/notifications/services/notifications.service';
import { useRafflesAdmin } from '../features/store/hooks/useRaffles';
import {
  LuBell,
  LuCheckCheck,
  LuTicket,
  LuShieldAlert,
  LuInfo,
  LuFilter,
  LuCheck,
  LuTrophy,
  LuShoppingBag,
} from 'react-icons/lu';

export default function NotificationsPage() {
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const navigate = useNavigate();

  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const { data: allNotifications = [], isLoading } = useNotifications(false);
  const { data: raffles = [] } = useRafflesAdmin();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const rafflesMap = useMemo(() => new Map(raffles.map((r) => [r.id, r])), [raffles]);

  const notifications = filterUnreadOnly
    ? allNotifications.filter((n) => !n.read)
    : allNotifications;

  const formatFullDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatBody = (body: string) => {
    return body.replace(
      /Todos los boletos \((\d+) boletos\) de la rifa "(.*?)" han sido vendidos\. La rifa ha pasado automáticamente a estado de sorteo \(DRAW\)\./gi,
      '¡Éxito total! Se han vendido todos los boletos ($1 de $1) de la rifa "$2". La rifa ya está lista para que realices el sorteo y selecciones al ganador.',
    );
  };

  const getRaffleAction = (notif: InAppNotification) => {
    if (notif.entityType !== 'RAFFLE' || !notif.entityId) {
      return { label: 'Gestionar sorteo', icon: LuTrophy };
    }
    const raffle = rafflesMap.get(notif.entityId);
    if (!raffle) {
      return { label: 'Gestionar sorteo', icon: LuTrophy };
    }
    switch (raffle.status) {
      case 'DRAW':
        return { label: 'Realizar sorteo', icon: LuTrophy };
      case 'FINISHED':
        return { label: 'Ver resultado', icon: LuTrophy };
      case 'ACTIVE':
        return { label: 'Gestionar sorteo', icon: LuTicket };
      case 'CANCELLED':
        return { label: 'Ver rifa', icon: LuTicket };
      default:
        return { label: 'Gestionar sorteo', icon: LuTrophy };
    }
  };

  const getIcon = (type: string, entityType?: string) => {
    if (entityType === 'RAFFLE' || type === 'SYSTEM') {
      return <LuTicket size={20} style={{ color: 'var(--accent)' }} />;
    }
    if (type === 'SECURITY') {
      return <LuShieldAlert size={20} style={{ color: '#b45309' }} />;
    }
    return <LuInfo size={20} style={{ color: 'var(--accent)' }} />;
  };

  const getTypeLabel = (type: string, entityType?: string) => {
    if (entityType === 'RAFFLE') return 'Rifas & Boletos';
    if (type === 'SYSTEM') return 'Sistema';
    if (type === 'SECURITY') return 'Seguridad';
    return 'General';
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
      {/* Encabezado */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--heading)',
              fontSize: 28,
              fontWeight: 600,
              color: 'var(--text-h)',
              margin: '0 0 6px',
            }}
          >
            Centro de Notificaciones
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text)', margin: 0 }}>
            Revisa las alertas automáticas de rifas agotadas, ventas y avisos del sistema.
          </p>
        </div>

        {/* Acciones principales */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 16px',
                borderRadius: 10,
                border: '1px solid var(--accent)',
                background: 'var(--accent-bg)',
                color: 'var(--accent)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--accent-bg)';
                e.currentTarget.style.color = 'var(--accent)';
              }}
            >
              <LuCheckCheck size={16} />
              Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {/* Barra de filtros / tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={() => setFilterUnreadOnly(false)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 8,
            border: 'none',
            background: !filterUnreadOnly ? 'var(--accent)' : 'transparent',
            color: !filterUnreadOnly ? '#ffffff' : 'var(--text)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Todas
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 999,
              fontSize: 11,
              background: !filterUnreadOnly ? 'rgba(255,255,255,0.25)' : 'var(--border)',
              color: !filterUnreadOnly ? '#ffffff' : 'var(--text-h)',
            }}
          >
            {allNotifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterUnreadOnly(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 8,
            border: 'none',
            background: filterUnreadOnly ? 'var(--accent)' : 'transparent',
            color: filterUnreadOnly ? '#ffffff' : 'var(--text)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <LuFilter size={14} />
          No leídas
          {unreadCount > 0 && (
            <span
              style={{
                padding: '1px 6px',
                borderRadius: 999,
                fontSize: 11,
                background: filterUnreadOnly ? 'rgba(255,255,255,0.25)' : 'var(--accent-bg)',
                color: filterUnreadOnly ? '#ffffff' : 'var(--accent)',
                fontWeight: 700,
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Lista de Notificaciones */}
      {isLoading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text)' }}>
          Cargando notificaciones...
        </div>
      ) : notifications.length === 0 ? (
        <div
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            border: '1px solid var(--border)',
            borderRadius: 14,
            background: 'var(--bg)',
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <LuBell size={26} />
          </div>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-h)',
              margin: '0 0 6px',
            }}
          >
            {filterUnreadOnly ? 'No tienes notificaciones pendientes' : 'No hay notificaciones'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>
            {filterUnreadOnly
              ? 'Todas tus notificaciones han sido leídas.'
              : 'Las alertas sobre rifas agotadas y actividad del sistema aparecerán aquí.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.map((notif) => {
            const isUnread = !notif.read;
            const action = getRaffleAction(notif);
            const ActionIcon = action.icon;
            const targetUrl =
              notif.actionUrl ||
              (notif.entityType === 'RAFFLE' && notif.entityId
                ? `/admin/rifas?id=${notif.entityId}`
                : '/admin/rifas');

            return (
              <div
                key={notif.id}
                style={{
                  border: '1px solid var(--border)',
                  borderLeft: isUnread ? '4px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: 12,
                  background: isUnread ? 'rgba(4, 67, 17, 0.025)' : 'var(--bg)',
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    '0 4px 16px -2px rgba(4, 67, 17, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)';
                  e.currentTarget.style.borderColor = 'var(--accent-border)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  if (isUnread) {
                    e.currentTarget.style.borderLeft = '4px solid var(--accent)';
                  }
                }}
              >
                {/* Ícono */}
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: 'var(--accent-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getIcon(notif.type, notif.entityType)}
                </div>

                {/* Contenido */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: 'var(--accent)',
                          background: 'var(--accent-bg)',
                          padding: '2px 8px',
                          borderRadius: 6,
                        }}
                      >
                        {getTypeLabel(notif.type, notif.entityType)}
                      </span>
                      <h4
                        style={{
                          fontSize: 15,
                          fontWeight: isUnread ? 700 : 600,
                          color: 'var(--text-h)',
                          margin: 0,
                        }}
                      >
                        {notif.title}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text)', opacity: 0.85 }}>
                        {formatFullDate(notif.createdAt)}
                      </span>
                      {isUnread && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'var(--accent)',
                          }}
                          title="No leída"
                        />
                      )}
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: 14,
                      color: 'var(--text)',
                      lineHeight: 1.5,
                      margin: '0 0 14px',
                    }}
                  >
                    {formatBody(notif.body)}
                  </p>

                  {/* Acciones del item */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Botón Principal: Realizar sorteo / Gestionar sorteo / Ver resultado */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isUnread) markAsRead.mutate(notif.id);
                        navigate(targetUrl);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--accent)',
                        background: 'var(--accent)',
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'opacity 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      <ActionIcon size={14} />
                      {action.label}
                    </button>

                    {/* Enlace secundario: Ver en tienda */}
                    {notif.entityType === 'RAFFLE' && notif.entityId && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isUnread) markAsRead.mutate(notif.id);
                          navigate(`/rifa/${notif.entityId}`);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 14px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--bg)',
                          color: 'var(--text-h)',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent-border)';
                          e.currentTarget.style.color = 'var(--accent)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.color = 'var(--text-h)';
                        }}
                      >
                        <LuShoppingBag size={14} />
                        Ver en tienda
                      </button>
                    )}

                    {/* Marcar como leída */}
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => markAsRead.mutate(notif.id)}
                        disabled={markAsRead.isPending}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 12px',
                          borderRadius: 8,
                          border: '1px solid transparent',
                          background: 'transparent',
                          color: 'var(--text)',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                          marginLeft: 'auto',
                          transition: 'color 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text)')}
                      >
                        <LuCheck size={14} />
                        Marcar como leída
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
