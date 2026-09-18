import { describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import AdminRafflesPage from './AdminRafflesPage';
import { AuthContext } from '../../auth/context';
import type { AuthContextValue } from '../../auth/types';
import type { User } from '../../lib/api/types/api-response';
import { ToastProvider } from '@components/feedback';
import { server } from '../../test/mocks/server';

// jsdom no implementa matchMedia y ResponsiveTable lo consulta vía useMediaQuery.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// Usuario con raffles.read pero SIN products.read: la ruta de rifas no debe
// disparar /admin/products (era el 403 cruzado).
const rafflesOnlyUser: User = {
  id: '2',
  email: 'raffles@test.com',
  name: 'Raffles User',
  roles: ['operator'],
  permissions: ['raffles.read'],
  isVerified: true,
};

function authValue(user: User): AuthContextValue {
  return {
    user,
    token: 'token',
    isAuthenticated: true,
    isLoading: false,
    login: async () => {},
    logout: async () => {},
    hasPrivilege: (privilege) => user.permissions.includes(privilege),
    hasAnyPrivilege: (privileges) =>
      privileges.some((privilege) => user.permissions.includes(privilege)),
    hasRole: (role) => user.roles.includes(role),
    isVerified: () => user.isVerified,
  };
}

let productRequests = 0;
let raffleRequests = 0;

beforeEach(() => {
  productRequests = 0;
  raffleRequests = 0;
  server.use(
    http.get('*/admin/products', () => {
      productRequests += 1;
      return HttpResponse.json({ success: true, message: 'ok', data: [] });
    }),
    http.get('*/admin/raffles', () => {
      raffleRequests += 1;
      return HttpResponse.json({ success: true, message: 'ok', data: [] });
    }),
  );
});

function renderPage(user: User) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthContext.Provider value={authValue(user)}>
          <MemoryRouter initialEntries={['/admin/rifas']}>
            <AdminRafflesPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('AdminRafflesPage — gating cross-permission', () => {
  it('pide rifas pero no /admin/products cuando solo tiene raffles.read', async () => {
    renderPage(rafflesOnlyUser);

    await waitFor(() => {
      expect(raffleRequests).toBeGreaterThan(0);
    });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(productRequests).toBe(0);
  });
});
