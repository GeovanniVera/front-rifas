import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import DashboardPage from './DashboardPage';
import { AuthContext } from '../auth/context';
import type { AuthContextValue } from '../auth/types';
import type { User } from '../lib/api/types/api-response';
import { server } from '../test/mocks/server';

// ─── Fixtures ──────────────────────────────────────────────
const viewer: User = {
  id: '1',
  email: 'viewer@test.com',
  name: 'Viewer User',
  roles: ['viewer'],
  permissions: [],
  isVerified: true,
};

const admin: User = {
  ...viewer,
  permissions: ['products.read', 'raffles.read'],
};

function authValue(user: User | null): AuthContextValue {
  return {
    user,
    token: user ? 'token' : null,
    isAuthenticated: Boolean(user),
    isLoading: false,
    login: async () => {},
    logout: async () => {},
    hasPrivilege: (privilege) => user?.permissions.includes(privilege) ?? false,
    hasAnyPrivilege: (privileges) =>
      privileges.some((privilege) => user?.permissions.includes(privilege) ?? false),
    hasRole: (role) => user?.roles.includes(role) ?? false,
    isVerified: () => user?.isVerified ?? false,
  };
}

// ─── Captura de peticiones vía MSW ─────────────────────────
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

function renderDashboard(user: User | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue(user)}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <DashboardPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('DashboardPage — gating de fetches por privilegio', () => {
  it('no pide /admin/products ni /admin/raffles sin los privilegios', async () => {
    renderDashboard(viewer);

    // La página renderiza (no se queda en loading)…
    await screen.findByText(/Bienvenido/i);
    // …y, si los hooks estuvieran habilitados, el fetch ya habría salido.
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(productRequests).toBe(0);
    expect(raffleRequests).toBe(0);
  });

  it('pide ambos listados cuando el usuario tiene los privilegios', async () => {
    renderDashboard(admin);

    await waitFor(() => {
      expect(productRequests).toBeGreaterThan(0);
      expect(raffleRequests).toBeGreaterThan(0);
    });
  });
});
