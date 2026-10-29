import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { products as seedProducts, type Product, type Raffle } from './data/products.mock';
import { buildRaffles, createRaffleFromProduct } from './data/raffles.mock';

export type RaffleStatus = Raffle['status'];

interface StoreContextValue {
  products: Product[];
  raffles: Raffle[];
  // Productos CRUD
  addProduct: (data: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  // Rifas CRUD
  createRaffle: (productId: string, marginPercent: number, ticketCount: number) => Raffle;
  updateRaffle: (id: string, data: Partial<Raffle>) => void;
  deleteRaffle: (id: string) => void;
  // Acciones de rifa
  changeRaffleStatus: (id: string, status: RaffleStatus) => void;
  getRaffleById: (id: string) => Raffle | undefined;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [raffles, setRaffles] = useState<Raffle[]>(() => buildRaffles());

  // ─── Productos CRUD ──────────────────────────────────────
  const addProduct = useCallback((data: Omit<Product, 'id'>) => {
    setProducts((prev) => [{ ...data, id: `p-${Date.now()}` }, ...prev]);
  }, []);

  const updateProduct = useCallback((id: string, data: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ─── Rifas CRUD ──────────────────────────────────────────
  const createRaffle = useCallback(
    (productId: string, marginPercent: number, ticketCount: number) => {
      const raffle = createRaffleFromProduct(productId, marginPercent, ticketCount);
      setRaffles((prev) => [raffle, ...prev]);
      // El producto queda apartado del stock de venta
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: 0 } : p)));
      return raffle;
    },
    [],
  );

  const updateRaffle = useCallback((id: string, data: Partial<Raffle>) => {
    setRaffles((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
  }, []);

  const deleteRaffle = useCallback((id: string) => {
    setRaffles((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const changeRaffleStatus = useCallback((id: string, status: RaffleStatus) => {
    setRaffles((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }, []);

  const getRaffleById = useCallback((id: string) => raffles.find((r) => r.id === id), [raffles]);

  const value = useMemo(
    () => ({
      products,
      raffles,
      addProduct,
      updateProduct,
      deleteProduct,
      createRaffle,
      updateRaffle,
      deleteRaffle,
      changeRaffleStatus,
      getRaffleById,
    }),
    [
      products,
      raffles,
      addProduct,
      updateProduct,
      deleteProduct,
      createRaffle,
      updateRaffle,
      deleteRaffle,
      changeRaffleStatus,
      getRaffleById,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>');
  return ctx;
}
