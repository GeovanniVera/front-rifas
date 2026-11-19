import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import AdminEarningsPage from './AdminEarningsPage';
import { AuthContext } from '../../auth/context';
import type { AuthContextValue } from '../../auth/types';
import type { User } from '../../lib/api/types/api-response';
import { ToastProvider } from '@components/feedback';
import { server } from '../../test/mocks/server';

const adminUser: User = {
  id: '1',
  email: 'admin@test.com',
  name: 'Admin User',
  roles: ['admin'],
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
    hasPrivilege: (p) => user.permissions.includes(p),
    hasAnyPrivilege: (ps) => ps.some((p) => user.permissions.includes(p)),
    hasRole: (r) => user.roles.includes(r),
    isVerified: () => user.isVerified,
  };
}

let requestedPeriods: string[] = [];

beforeEach(() => {
  requestedPeriods = [];
  server.use(
    http.get('*/admin/earnings', ({ request }) => {
      const url = new URL(request.url);
      const period = url.searchParams.get('period') || 'DAY';
      requestedPeriods.push(period);
      return HttpResponse.json({
        success: true,
        message: 'ok',
        data: {
          period,
          offset: 0,
          title: `Corte ${period}`,
          rangeLabel: '19 Nov 2026',
          rangeStart: '2026-11-19T00:00:00',
          rangeEnd: '2026-11-19T23:59:59',
          selectorOptions: [
            { offset: 0, label: 'Hoy · 19 Nov' },
            { offset: 1, label: 'Ayer · 18 Nov' },
          ],
          kpis: {
            totalEarnings: period === 'WEEK' ? 4200 : 1500,
            earningsTrend: '+10% vs anterior',
            ticketsSold: 3,
            ticketsTrend: '3 boletos vendidos',
            averageTicket: 750,
            averageTrend: '2 compras',
            transactionsCount: 2,
            rafflesCountLabel: '1 rifa con ventas',
          },
          chartSeries: [{ label: '12:00', subLabel: '12:00 hrs', amount: 1500, tickets: 3 }],
          distribution: [
            {
              category: 'Tarjeta',
              amount: 1500,
              percentage: 100,
              color: '#10B981',
              bgColor: '#ECFDF5',
            },
          ],
          movements: [
            {
              id: 'm1',
              folio: '#BOL-ABC123',
              raffleId: 'r-1',
              concept: 'Rifa — RTX 4070',
              ticketNumbers: [5, 8],
              tickets: 2,
              paymentMethod: 'Tarjeta',
              buyerName: 'Carlos Pérez',
              buyerEmail: 'carlos@test.com',
              purchasedAt: '2026-11-19T12:00:00',
              timestamp: '19 nov 2026, 12:00 p.m.',
              amount: 1000,
            },
          ],
        },
      });
    }),
  );
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthContext.Provider value={authValue(adminUser)}>
          <MemoryRouter initialEntries={['/admin/ganancias']}>
            <AdminEarningsPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('AdminEarningsPage', () => {
  it('muestra tabs DÍA, SEMANA, QUINCENA y permite cambiar de periodo y ver botones PDF/XLSX', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Revisión de Ganancias')).toBeInTheDocument();
    });

    expect(requestedPeriods).toContain('DAY');
    expect(screen.getByRole('tab', { name: 'DÍA' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'SEMANA' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'QUINCENA' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar PDF/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar Excel/i })).toBeInTheDocument();
    expect(screen.getByText('#BOL-ABC123')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'SEMANA' }));
    await waitFor(() => {
      expect(requestedPeriods).toContain('WEEK');
    });

    fireEvent.click(screen.getByRole('tab', { name: 'QUINCENA' }));
    await waitFor(() => {
      expect(requestedPeriods).toContain('FORTNIGHT');
    });

    fireEvent.click(screen.getByRole('tab', { name: 'DÍA' }));
    await waitFor(() => {
      expect(screen.getByLabelText('Seleccionar rango específico')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Seleccionar rango específico'), {
      target: { value: '1' },
    });

    await waitFor(() => {
      expect(screen.getByText(/día anterior/i)).toBeInTheDocument();
    });
    const backBtn = screen.getByRole('button', { name: /Regresar al día de hoy/i });
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.queryByText(/día anterior/i)).not.toBeInTheDocument();
    });
  }, 15000);
});
