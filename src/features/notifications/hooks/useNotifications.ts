import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services/notifications.service';
import { useAuth } from '../../../auth';

export const NOTIFICATIONS_KEYS = {
  all: ['notifications'] as const,
  list: (unreadOnly: boolean) => [...NOTIFICATIONS_KEYS.all, 'list', { unreadOnly }] as const,
  unreadCount: () => [...NOTIFICATIONS_KEYS.all, 'unread-count'] as const,
};

export function useUnreadNotificationsCount() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: NOTIFICATIONS_KEYS.unreadCount(),
    queryFn: () => notificationsService.getUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 10000, // Polling cada 10 segundos
    staleTime: 5000,
  });
}

export function useNotifications(unreadOnly = false) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: NOTIFICATIONS_KEYS.list(unreadOnly),
    queryFn: () => notificationsService.list(unreadOnly),
    enabled: isAuthenticated,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEYS.all });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEYS.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEYS.all });
    },
  });
}
