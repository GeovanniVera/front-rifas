import { client } from '@lib/api/client';

export interface InAppNotification {
  id: string;
  type: 'SYSTEM' | 'SECURITY' | 'WORKFLOW' | 'SOCIAL' | string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkAllReadResponse {
  markedCount: number;
}

export const notificationsService = {
  /**
   * Obtiene la lista paginada de notificaciones del usuario.
   */
  list: async (unreadOnly = false, page = 0, size = 15): Promise<InAppNotification[]> => {
    const params = new URLSearchParams({
      unreadOnly: String(unreadOnly),
      page: String(page),
      size: String(size),
      sort: 'createdAt,desc',
    });
    const res = await client.get<SpringPage<InAppNotification>>(`/notifications?${params.toString()}`);
    if (res.success && res.data) {
      return res.data.content || [];
    }
    return [];
  },

  /**
   * Obtiene el conteo de notificaciones no leídas.
   */
  getUnreadCount: async (): Promise<number> => {
    const res = await client.get<UnreadCountResponse>('/notifications/unread-count');
    if (res.success && res.data) {
      return res.data.count;
    }
    return 0;
  },

  /**
   * Marca una notificación individual como leída.
   */
  markAsRead: async (id: string): Promise<boolean> => {
    const res = await client.patch<boolean>(`/notifications/${id}/read`);
    return res.success ? !!res.data : false;
  },

  /**
   * Marca todas las notificaciones como leídas.
   */
  markAllAsRead: async (): Promise<number> => {
    const res = await client.patch<MarkAllReadResponse>('/notifications/read-all');
    if (res.success && res.data) {
      return res.data.markedCount;
    }
    return 0;
  },

  /**
   * Elimina una notificación.
   */
  delete: async (id: string): Promise<boolean> => {
    const res = await client.delete<boolean>(`/notifications/${id}`);
    return res.success;
  },
};
