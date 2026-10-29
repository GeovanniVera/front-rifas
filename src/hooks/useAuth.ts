import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@lib/api/services/auth.service';
import { useAuth } from '../auth/hooks';

/**
 * Hooks de React Query integrados con AuthContext.
 *
 * Estos hooks combinan:
 * - Persistencia de tokens (via AuthContext)
 * - Cache de server state (via React Query)
 * - Estado de autenticación (via AuthContext)
 */

export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await authService.me();
      if (!response.success || !response.data) {
        throw new Error(response.message || 'No autenticado');
      }
      return response.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const { login } = useAuth();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      remember = true,
    }: {
      email: string;
      password: string;
      remember?: boolean;
    }) => {
      // login() del AuthContext maneja persistencia de tokens y estado
      await login(email, password, remember);
      // Retornamos el usuario del cache para React Query
      const user = queryClient.getQueryData(['auth', 'me']);
      return { success: true, data: { user } };
    },
    onSuccess: () => {
      // Invalidar para refrescar datos del usuario
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  return useMutation({
    mutationFn: async () => {
      // logout() del AuthContext maneja limpieza de tokens y estado
      await logout();
    },
    onSettled: () => {
      queryClient.clear();
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password: string;
      acceptedTerms: boolean;
    }) => {
      const response = await authService.register(data);
      if (!response.success) {
        throw new Error(response.message || 'Error al registrarse');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useForgotPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await authService.forgotPassword(email);
      if (!response.success) {
        throw new Error(response.message || 'Error al solicitar recuperación');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      const response = await authService.resetPassword(token, password);
      if (!response.success) {
        throw new Error(response.message || 'Error al restablecer la contraseña');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (token: string) => {
      const response = await authService.verifyEmail(token);
      if (!response.success) {
        throw new Error(response.message || 'Error al verificar el email');
      }
      return response;
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await authService.resendVerification(email);
      if (!response.success) {
        throw new Error(response.message || 'Error al reenviar verificación');
      }
      return response;
    },
  });
}
