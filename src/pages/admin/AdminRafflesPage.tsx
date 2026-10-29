import { useState } from 'react';
import {
  useRafflesAdmin,
  useCreateRaffle,
  useChangeRaffleStatus,
  useDeleteRaffle,
} from '../../features/store/hooks/useRaffles';
import { useProductsAdmin } from '../../features/store/hooks/useProducts';
import ResponsiveTable from '@components/data-display/table/ResponsiveTable';
import Button from '@components/primitives/Button';
import Badge from '@components/primitives/Badge';
import { Drawer } from '@components/overlays/Drawer';
import { ConfirmDialog } from '@components/overlays/ConfirmDialog';
import { useToast } from '@components/feedback';
import { Can } from '../../auth/Can';
import { useHasPrivilege } from '../../auth/hooks';
import type { Raffle, RaffleStatus } from '../../features/store/services/raffles.service';
import { RAFFLE_CONFIG, formatCurrency } from '../../config/constants';
import { LuPlus, LuTrash2 } from 'react-icons/lu';

const STATUS_LABEL: Record<
  RaffleStatus,
  { label: string; variant: 'success' | 'warning' | 'info' | 'danger' }
> = {
  ACTIVE: { label: 'Activa', variant: 'success' },
  DRAW: { label: 'Sorteo', variant: 'warning' },
  FINISHED: { label: 'Finalizada', variant: 'info' },
  CANCELLED: { label: 'Cancelada', variant: 'danger' },
};

export default function AdminRafflesPage() {
  const toast = useToast();
  const canReadProducts = useHasPrivilege('products.read');
  const canReadRaffles = useHasPrivilege('raffles.read');
  const { data: raffles = [], isLoading } = useRafflesAdmin({ enabled: canReadRaffles });
  const { data: products = [] } = useProductsAdmin({ enabled: canReadProducts });
  const createRaffle = useCreateRaffle();
  const changeStatus = useChangeRaffleStatus();
  const deleteRaffle = useDeleteRaffle();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ productId: '', drawDate: '' });
  const [deleting, setDeleting] = useState<Raffle | null>(null);
  const [statusAction, setStatusAction] = useState<{ raffle: Raffle; status: RaffleStatus } | null>(
    null,
  );

  const availableProducts = products.filter((p) => p.stock > 0);

  const openCreate = () => {
    setForm({ productId: availableProducts[0]?.id ?? '', drawDate: '' });
    setDrawerOpen(true);
  };

  const handleCreate = async () => {
    if (!form.productId) {
      toast.error('Seleccioná un producto');
      return;
    }
    try {
      await createRaffle.mutateAsync(form);
      toast.success('Rifa creada — el producto se apartó del stock');
      setDrawerOpen(false);
    } catch {
      toast.error('Error al crear la rifa');
    }
  };

  const handleStatus = async () => {
    if (!statusAction) return;
    try {
      await changeStatus.mutateAsync({ id: statusAction.raffle.id, status: statusAction.status });
      toast.success(`Rifa marcada como ${STATUS_LABEL[statusAction.status].label}`);
      setStatusAction(null);
    } catch {
      toast.error('Error al cambiar el estado');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteRaffle.mutateAsync(deleting.id);
      toast.success('Rifa eliminada');
      setDeleting(null);
    } catch {
      toast.error('Error al eliminar la rifa');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Rifa',
      minWidth: '220px',
      filterType: 'text' as const,
    },
    {
      key: 'productName',
      header: 'Producto',
      minWidth: '150px',
      filterType: 'text' as const,
      render: (value: unknown) => String(value ?? '—'),
    },
    {
      key: 'ticketCount',
      header: 'Boletos',
      minWidth: '80px',
    },
    {
      key: 'ticketsSold',
      header: 'Vendidos',
      minWidth: '80px',
      render: (value: unknown, row: Raffle) => {
        const sold = Number(value ?? 0);
        const total = row.ticketCount;
        const pct = total > 0 ? Math.round((sold / total) * 100) : 0;
        return (
          <span className={sold > 0 ? 'text-accent' : 'text-fg-muted'}>
            {sold} ({pct}%)
          </span>
        );
      },
    },
    {
      key: 'ticketPrice',
      header: 'Precio/boleto',
      minWidth: '100px',
      render: (value: unknown) => formatCurrency(Number(value)),
    },
    {
      key: 'drawDate',
      header: 'Sorteo',
      minWidth: '140px',
      render: (value: unknown) => {
        if (!value) return <span className="text-fg-muted">—</span>;
        const d = new Date(String(value));
        return isNaN(d.getTime()) ? (
          String(value)
        ) : (
          <span className="text-xs">
            {d.toLocaleDateString('es-MX', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      minWidth: '110px',
      filterType: 'select' as const,
      filterOptions: ['ACTIVE', 'DRAW', 'FINISHED', 'CANCELLED'],
      render: (value: unknown) => {
        const cfg = STATUS_LABEL[value as RaffleStatus];
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: '220px',
      align: 'right' as const,
      render: (_: unknown, row: Raffle) => (
        <div className="flex items-center justify-end gap-1">
          <Can privilege="raffles.write">
            {row.status === 'ACTIVE' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusAction({ raffle: row, status: 'DRAW' });
                }}
              >
                Sorteo
              </Button>
            )}
            {row.status === 'DRAW' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusAction({ raffle: row, status: 'FINISHED' });
                }}
              >
                Finalizar
              </Button>
            )}
            {row.status === 'ACTIVE' && row.ticketsSold === 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusAction({ raffle: row, status: 'CANCELLED' });
                }}
                className="text-warning hover:text-warning-strong"
              >
                Cancelar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setDeleting(row);
              }}
              className="text-danger hover:text-danger-strong"
              title="Eliminar"
            >
              <LuTrash2 size={16} />
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  // Calculadora visual en tiempo real
  const selectedProduct = products.find((p) => p.id === form.productId);
  const cost = selectedProduct ? selectedProduct.price : 0;
  const previewTicketPrice = Math.round(cost * RAFFLE_CONFIG.TICKET_RATE);
  const previewTotalTickets = RAFFLE_CONFIG.TOTAL_TICKETS;
  const previewTotalRevenue = previewTicketPrice * previewTotalTickets;
  const previewProfit = previewTotalRevenue - cost;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-fg-muted">Cargando rifas...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-fg text-lg font-semibold">Rifas</h2>
            <p className="text-fg-muted text-sm">{raffles.length} rifas</p>
          </div>
          <Can privilege="raffles.write">
            <Button
              variant="primary"
              onClick={openCreate}
              disabled={availableProducts.length === 0}
            >
              <LuPlus size={16} className="mr-1" />
              Crear rifa
            </Button>
          </Can>
        </div>

        <ResponsiveTable
          columns={columns}
          data={raffles}
          keyExtractor={(row) => row.id}
          filters={true}
          pagination={true}
          pageSize={10}
          emptyTitle="Sin rifas"
          emptyDescription="No se encontraron rifas."
        />
      </div>

      {/* Drawer crear rifa */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Drawer.Header title="Crear rifa (Regla RN-RIFA-001)" />
        <Drawer.Body>
          <div className="space-y-4">
            <div>
              <label htmlFor="raffle-product" className="text-fg mb-1.5 block text-sm font-medium">
                Producto a rifar
              </label>
              <select
                id="raffle-product"
                aria-label="Producto a rifar"
                value={form.productId}
                onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
                className="border-border-base bg-background text-fg w-full rounded-md border px-3 py-2 text-sm"
              >
                {availableProducts.length === 0 && (
                  <option value="">No hay productos con stock</option>
                )}
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.price)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="raffle-draw-date"
                className="text-fg mb-1.5 block text-sm font-medium"
              >
                Fecha estimada del sorteo
              </label>
              <input
                id="raffle-draw-date"
                type="datetime-local"
                value={form.drawDate}
                onChange={(e) => setForm((prev) => ({ ...prev, drawDate: e.target.value }))}
                className="border-border-base bg-background text-fg w-full rounded-md border px-3 py-2 text-sm"
              />
              <p className="text-fg-muted mt-1 text-xs">
                Opcional. Fecha y hora en la que se realizará el sorteo.
              </p>
            </div>

            {selectedProduct && (
              <div className="bg-surface border-border-base space-y-2 rounded-md border p-4 text-sm">
                <p className="text-fg flex justify-between">
                  <span>Costo base del producto:</span>
                  <strong>{formatCurrency(cost)}</strong>
                </p>
                <p className="text-fg flex justify-between">
                  <span>Precio por boleto (7%):</span>
                  <strong className="text-accent">{formatCurrency(previewTicketPrice)}</strong>
                </p>
                <p className="text-fg flex justify-between">
                  <span>Boletos a emitir:</span>
                  <strong>{previewTotalTickets} boletos fijos</strong>
                </p>
                <hr className="border-border-base my-2" />
                <p className="text-fg flex justify-between">
                  <span>Recaudación estimada:</span>
                  <strong>{formatCurrency(previewTotalRevenue)}</strong>
                </p>
                <p className="text-success flex justify-between font-semibold">
                  <span>Ganancia neta proyectada:</span>
                  <span>+{formatCurrency(previewProfit)}</span>
                </p>
              </div>
            )}
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={createRaffle.isPending || !form.productId}
          >
            Crear rifa
          </Button>
        </Drawer.Footer>
      </Drawer>

      {/* Confirmar cambio de estado */}
      {statusAction && (
        <ConfirmDialog
          isOpen={!!statusAction}
          onClose={() => setStatusAction(null)}
          onConfirm={handleStatus}
          title={`Marcar como ${STATUS_LABEL[statusAction.status].label}`}
          message={`¿Cambiar el estado de "${statusAction.raffle.name}" a ${STATUS_LABEL[statusAction.status].label}?`}
          confirmLabel={STATUS_LABEL[statusAction.status].label}
          variant={statusAction.status === 'CANCELLED' ? 'destructive' : 'default'}
        />
      )}

      {/* Confirmar eliminación */}
      {deleting && (
        <ConfirmDialog
          isOpen={!!deleting}
          onClose={() => setDeleting(null)}
          onConfirm={handleDelete}
          title="Eliminar rifa"
          message={`¿Eliminar "${deleting.name}"?`}
          confirmLabel="Eliminar"
          variant="destructive"
        />
      )}
    </div>
  );
}
