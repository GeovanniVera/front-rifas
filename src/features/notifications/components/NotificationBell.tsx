import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  useUnreadNotificationsCount,
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '../hooks/useNotifications';
import type { InAppNotification } from '../services/notifications.service';
import { useRafflesAdmin } from '../../store/hooks/useRaffles';
import {
  LuBell,
  LuCheckCheck,
  LuTicket,
  LuShieldAlert,
  LuInfo,
  LuExternalLink,
  LuX,
  LuArrowRight,
  LuShoppingBag,
} from 'react-icons/lu';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const { data: notifications = [], isLoading } = useNotifications(false);
  const { data: raffles = [] } = useRafflesAdmin();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const rafflesMap = useMemo(() => new Map(raffles.map((r) => [r.id, r])), [raffles]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notif: InAppNotification) => {
    if (!notif.read) {
      await markAsRead.mutateAsync(notif.id);
    }
    const targetUrl =
      notif.actionUrl ||
      (notif.entityType === 'RAFFLE' && notif.entityId
        ? `/admin/rifas?id=${notif.entityId}`
        : '/admin/rifas');
    setIsOpen(false);
    navigate(targetUrl);
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  const formatBody = (body: string) => {
    return body.replace(
      /Todos los boletos \((\d+) boletos\) de la rifa "(.*?)" han sido vendidos\. La rifa ha pasado automáticamente a estado de sorteo \(DRAW\)\./gi,
      '¡Éxito total! Se han vendido todos los boletos ($1 de $1) de la rifa "$2". La rifa ya está lista para que realices el sorteo y selecciones al ganador.',
    );
  };

  const getRaffleActionLabel = (notif: InAppNotification): string => {
    if (notif.entityType !== 'RAFFLE' || !notif.entityId) {
      return 'Gestionar';
    }
    const raffle = rafflesMap.get(notif.entityId);
    if (!raffle) {
      return 'Gestionar sorteo';
    }
    switch (raffle.status) {
      case 'DRAW':
        return 'Realizar sorteo';
      case 'FINISHED':
        return 'Ver resultado';
      case 'ACTIVE':
        return 'Gestionar sorteo';
      default:
        return 'Gestionar sorteo';
    }
  };

  const getIcon = (type: string, entityType?: string) => {
    if (entityType === 'RAFFLE' || type === 'SYSTEM') {
      return <LuTicket size={17} style={{ color: 'var(--accent)' }} />;
    }
    if (type === 'SECURITY') {
      return <LuShieldAlert size={17} style={{ color: '#b45309' }} />;
    }
    return <LuInfo size={17} style={{ color: 'var(--accent)' }} />;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Botón de campana */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notificaciones"
        title="Notificaciones"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 38,
          height: 38,
          borderRadius: 10,
          border: isOpen ? '1px solid var(--accent)' : '1px solid var(--border)',
          background: isOpen ? 'var(--accent-bg)' : 'var(--bg)',
          color: isOpen ? 'var(--accent)' : 'var(--text-h)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = 'var(--accent-border)';
            e.currentTarget.style.background = 'var(--accent-bg)';
            e.currentTarget.style.color = 'var(--accent)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.background = 'var(--bg)';
            e.currentTarget.style.color = 'var(--text-h)';
          }
        }}
      >
        <LuBell size={19} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 18,
              height: 18,
              padding: '0 4px',
              borderRadius: 999,
              background: 'var(--accent)',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px var(--bg)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover / Menú desplegable */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 400,
            maxWidth: '92vw',
            maxHeight: 520,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow:
              '0 12px 32px -4px rgba(4, 67, 17, 0.12), 0 4px 16px -2px rgba(0, 0, 0, 0.06)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header del dropdown */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--code-bg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-h)' }}>
                Notificaciones
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'var(--accent-bg)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                  }}
                >
                  {unreadCount} nueva{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead.mutate()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--accent)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: 6,
                    transition: 'opacity 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  title="Marcar todas como leídas"
                >
                  <LuCheckCheck size={14} />
                  Marcar leídas
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Cerrar"
              >
                <LuX size={16} />
              </button>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 380 }}>
            {isLoading ? (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'var(--text)',
                  fontSize: 13,
                }}
              >
                Cargando notificaciones...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text)' }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--accent-bg)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <LuBell size={22} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>
                  No tienes notificaciones
                </p>
                <p style={{ fontSize: 12, color: 'var(--text)', margin: '4px 0 0' }}>
                  Te avisaremos aquí cuando se agoten los boletos o haya actividad en tus rifas.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const actionLabel = getRaffleActionLabel(notif);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border)',
                      background: notif.read ? 'var(--bg)' : 'rgba(4, 67, 17, 0.035)',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent-bg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = notif.read
                        ? 'var(--bg)'
                        : 'rgba(4, 67, 17, 0.035)';
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: 'var(--accent-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {getIcon(notif.type, notif.entityType)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: notif.read ? 600 : 700,
                            color: 'var(--text-h)',
                            lineHeight: 1.3,
                          }}
                        >
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: 'var(--accent)',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: 12,
                          color: 'var(--text)',
                          margin: '4px 0 0',
                          lineHeight: 1.45,
                        }}
                      >
                        {formatBody(notif.body)}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 8,
                          fontSize: 11,
                          color: 'var(--text)',
                          opacity: 0.9,
                          flexWrap: 'wrap',
                          gap: 6,
                        }}
                      >
                        <span>{formatRelativeTime(notif.createdAt)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {notif.entityType === 'RAFFLE' && notif.entityId && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!notif.read) markAsRead.mutate(notif.id);
                                setIsOpen(false);
                                navigate(`/rifa/${notif.entityId}`);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                color: 'var(--text)',
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text)')}
                            >
                              <LuShoppingBag size={12} />
                              Ver en tienda
                            </span>
                          )}
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              color: 'var(--accent)',
                              fontWeight: 600,
                            }}
                          >
                            {actionLabel} <LuExternalLink size={11} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer del dropdown */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--border)',
              background: 'var(--code-bg)',
              textAlign: 'center',
            }}
          >
            <Link
              to="/notificaciones"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--accent)',
                textDecoration: 'none',
                padding: '4px 8px',
                borderRadius: 6,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Ver todas las notificaciones
              <LuArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
