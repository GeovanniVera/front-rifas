/**
 * Integración de rutas: la ruta `/verify-email` de `App` debe estar envuelta por
 * `<RedirectIfVerified>`.
 *
 * A diferencia de `VerifyEmailPage.guard.test.tsx` (que arma su propio router y
 * prueba el guard en aislamiento), este test monta el árbol de rutas REAL de
 * `App`. Si el wrapper se quita de `App.tsx`, la pantalla de verificación se
 * monta durante la restauración de la sesión y este test falla.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
import App from './App';
import { authStorage } from './lib/auth/token-store';
import { server } from './test/mocks/server';
import type { User } from './lib/api/types/api-response';
import './lib/i18n/config';

const verifiedUser: User = {
  id: '1',
  email: 'verified@test.com',
  name: 'Verified User',
  roles: ['viewer'],
  permissions: [],
  isVerified: true,
};

/**
 * Storage en memoria por test: evita que los tokens persistidos en el storage
 * global del suite se filtren entre tests.
 */
function memoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

/**
 * jsdom no implementa `matchMedia`; `MainLayout` -> `Sidebar` -> `useMediaQuery`
 * lo usa al renderizar el dashboard real.
 */
function stubMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

function newQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('sessionStorage', memoryStorage());
  stubMatchMedia();
  authStorage.clearAll();
});

afterEach(() => {
  authStorage.clearAll();
  server.resetHandlers();
  vi.unstubAllGlobals();
});

describe('App — wiring de /verify-email con RedirectIfVerified', () => {
  it('manda al dashboard a un usuario verificado sin montar la pantalla de verificación', async () => {
    // `/auth/me` con latencia: expone el estado de carga del guard. Sin el
    // wrapper, durante esa ventana se montaría VerifyEmailPage con su reenvío.
    server.use(
      http.get('*/auth/me', async () => {
        await delay(50);
        return HttpResponse.json({ success: true, message: 'ok', data: verifiedUser });
      }),
    );
    authStorage.setToken('test-token', 3600, false);

    render(
      <QueryClientProvider client={newQueryClient()}>
        <MemoryRouter initialEntries={['/verify-email']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // El guard está en el árbol: mientras restaura la sesión muestra su loading,
    // no la página de verificación con el botón de reenvío.
    expect(await screen.findByText('Verificando sesión...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reenviar/i })).not.toBeInTheDocument();

    // Termina en el dashboard real, sin control de reenvío.
    expect(await screen.findByText(/Bienvenido, Verified User/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reenviar/i })).not.toBeInTheDocument();
  });
});
