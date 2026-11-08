import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  useUnreadNotificationsCount,
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '../hooks/useNotifications';
import {
  LuBell,
  LuCheckCheck,
  LuTicket,
  LuShieldAlert,
  LuInfo,
  LuExternalLink,
  LuX,
} from 'react-icons/lu';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const { data: notifications = [], isLoading } = useNotifications(false);
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

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

  const handleNotificationClick = async (notif: { id: string; read: boolean; actionUrl?: string }) => {
    if (!notif.read) {
      await markAsRead.mutateAsync(notif.id);
    }
    if (notif.actionUrl) {
      setIsOpen(false);
      navigate(notif.actionUrl);
    }
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

  const getIcon = (type: string, entityType?: string) => {
    if (entityType === 'RAFFLE' || type === 'SYSTEM') {
      return <LuTicket size={18} className="text-accent" />;
    }
    if (type === 'SECURITY') {
      return <LuShieldAlert size={18} className="text-warning-strong" />;
    }
    return <LuInfo size={18} className="text-fg-muted" />;
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
          border: '1px solid var(--border)',
          background: isOpen ? 'var(--accent-bg)' : 'var(--bg)',
          color: isOpen ? 'var(--accent)' : 'var(--fg)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
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
              background: '#ef4444',
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
            width: 360,
            maxWidth: '90vw',
            maxHeight: 460,
            background: 'var(--surface, #1e293b)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 12px 28px rgba(0,0,0,0.25)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header del dropdown */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--heading)' }}>
                Notificaciones
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: 'var(--accent-bg)',
                    color: 'var(--accent)',
                  }}
                >
                  {unreadCount} nueva{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead.mutate()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    color: 'var(--accent)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: 6,
                  }}
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
                  color: 'var(--fg-muted)',
                  cursor: 'pointer',
                  padding: 2,
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
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
                Cargando notificaciones...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--fg-muted)' }}>
                <LuBell size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>No tienes notificaciones</p>
                <p style={{ fontSize: 12, margin: '4px 0 0', opacity: 0.8 }}>
                  Te avisaremos aquí cuando ocurra algo importante.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    background: notif.read ? 'transparent' : 'var(--accent-bg-subtle, rgba(99, 102, 241, 0.07))',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover, rgba(255,255,255,0.05))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = notif.read
                      ? 'transparent'
                      : 'var(--accent-bg-subtle, rgba(99, 102, 241, 0.07))';
                  }}
                >
                  <div style={{ marginTop: 2, flexShrink: 0 }}>
                    {getIcon(notif.type, notif.entityType)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: notif.read ? 600 : 700,
                          color: 'var(--heading)',
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
                            background: 'var(--accent, #6366f1)',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--fg-muted)',
                        margin: '4px 0 0',
                        lineHeight: 1.4,
                      }}
                    >
                      {notif.body}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 6,
                        fontSize: 11,
                        color: 'var(--fg-muted)',
                      }}
                    >
                      <span>{formatRelativeTime(notif.createdAt)}</span>
                      {notif.actionUrl && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--accent)' }}>
                          Ver detalles <LuExternalLink size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
