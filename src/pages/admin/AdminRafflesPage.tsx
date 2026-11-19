import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  useRafflesAdmin,
  useCreateRaffle,
  useChangeRaffleStatus,
  useDeleteRaffle,
} from '../../features/store/hooks/useRaffles';
import { useProductsAdmin } from '../../features/store/hooks/useProducts';
import {
  usePendingOxxoReservations,
  useSimulateOxxo,
  usePendingTransferReservations,
  useConfirmTransfer,
  useRejectTransfer,
} from '../../features/store/hooks/useTickets';
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
import { LuPlus, LuTrash2, LuClock, LuLoader, LuSparkles } from 'react-icons/lu';

const STATUS_LABEL: Record<
  RaffleStatus,
  { label: string; variant: 'success' | 'warning' | 'info' | 'danger' }
> = {
  ACTIVE: { label: 'Activa', variant: 'success' },
  DRAW: { label: 'Sorteo', variant: 'warning' },
  FINISHED: { label: 'Finalizada', variant: 'info' },
  CANCELLED: { label: 'Cancelada', variant: 'danger' },
};

function getLocalDatetimeBounds() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return {
    todayStart: `${datePart}T00:00`,
    nowMinute: `${datePart}T${timePart}`,
  };
}

export default function AdminRafflesPage() {
  const toast = useToast();
  const canReadProducts = useHasPrivilege('products.read');
  const canReadRaffles = useHasPrivilege('raffles.read');
  const { data: raffles = [], isLoading } = useRafflesAdmin({ enabled: canReadRaffles });
  const { data: products = [] } = useProductsAdmin({ enabled: canReadProducts });
  const createRaffle = useCreateRaffle();
  const changeStatus = useChangeRaffleStatus();
  const deleteRaffle = useDeleteRaffle();
  const { data: pendingOxxo = [] } = usePendingOxxoReservations({ enabled: canReadRaffles });
  const simulateOxxo = useSimulateOxxo();
  const { data: pendingTransfers = [] } = usePendingTransferReservations({
    enabled: canReadRaffles,
  });
  const confirmTransfer = useConfirmTransfer();
  const rejectTransfer = useRejectTransfer();
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [transferActionId, setTransferActionId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ productId: '', startDate: '', drawDate: '' });
  const [dateBounds, setDateBounds] = useState(getLocalDatetimeBounds);
  const [deleting, setDeleting] = useState<Raffle | null>(null);
  const [statusAction, setStatusAction] = useState<{ raffle: Raffle; status: RaffleStatus } | null>(
    null,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const targetId = searchParams.get('id');

  const targetRaffle = useMemo(() => {
    return targetId ? raffles.find((r) => r.id === targetId) : undefined;
  }, [targetId, raffles]);

  const displayRaffles = useMemo(() => {
    if (!targetId || !targetRaffle) return raffles;
    return [targetRaffle, ...raffles.filter((r) => r.id !== targetId)];
  }, [targetId, targetRaffle, raffles]);

  const availableProducts = products.filter((p) => p.stock > 0);

  const openCreate = () => {
    setDateBounds(getLocalDatetimeBounds());
    setForm({ productId: availableProducts[0]?.id ?? '', startDate: '', drawDate: '' });
    setDrawerOpen(true);
  };

  const handleCreate = async () => {
    if (!form.productId) {
      toast.error('Seleccioná un producto');
      return;
    }
    if (form.startDate) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (new Date(form.startDate) < startOfToday) {
        toast.error('La fecha de inicio no puede ser de un día anterior a hoy');
        return;
      }
    }
    if (form.drawDate && new Date(form.drawDate) <= new Date()) {
      toast.error('La fecha de fin/sorteo debe ser posterior al momento actual');
      return;
    }
    if (form.startDate && form.drawDate && new Date(form.drawDate) <= new Date(form.startDate)) {
      toast.error('La fecha de fin/sorteo debe ser posterior a la fecha de inicio');
      return;
    }
    try {
      await createRaffle.mutateAsync({
        productId: form.productId,
        startDate: form.startDate || undefined,
        drawDate: form.drawDate || undefined,
      });
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
          <span className={sold > 0 ? 'text-accent font-medium' : 'text-fg-muted'}>
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
      key: 'revenue',
      header: 'Recaudado',
      minWidth: '130px',
      render: (_: unknown, row: Raffle) => {
        const earned = row.ticketsSold * row.ticketPrice;
        const total = row.ticketCount * row.ticketPrice;
        return (
          <div className="flex flex-col">
            <span className="text-accent font-semibold">{formatCurrency(earned)}</span>
            <span className="text-fg-muted text-[11px]">de {formatCurrency(total)}</span>
          </div>
        );
      },
    },
    {
      key: 'drawDate',
      header: 'Periodo / Sorteo',
      minWidth: '175px',
      render: (value: unknown, row: Raffle) => {
        const formatDt = (val?: string) => {
          if (!val) return null;
          const d = new Date(val);
          return isNaN(d.getTime())
            ? val
            : d.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
        };
        const startStr = formatDt(row.startDate);
        const endStr = formatDt(value ? String(value) : undefined);
        if (!startStr && !endStr) return <span className="text-fg-muted">—</span>;
        return (
          <div className="flex flex-col gap-0.5 text-xs">
            {startStr && (
              <span className="text-fg-muted">
                Inicio: <strong className="text-fg font-medium">{startStr}</strong>
              </span>
            )}
            {endStr && (
              <span className="text-fg-muted">
                Fin: <strong className="text-fg font-medium">{endStr}</strong>
              </span>
            )}
          </div>
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

  // Resumen financiero global de rifas
  const totalEarned = raffles.reduce((sum, r) => sum + r.ticketsSold * r.ticketPrice, 0);
  const totalTicketsSold = raffles.reduce((sum, r) => sum + r.ticketsSold, 0);
  const totalCapacity = raffles.reduce((sum, r) => sum + r.ticketCount, 0);
  const soldOutRaffles = raffles.filter(
    (r) => r.status === 'DRAW' || r.status === 'FINISHED',
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-fg-muted">Cargando rifas...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-fg text-lg font-semibold">Gestión de Rifas</h2>
            <p className="text-fg-muted text-sm">{raffles.length} rifas registradas</p>
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

        {/* Resumen financiero superior */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-border-base bg-surface rounded-xl border p-4">
            <div className="text-fg-muted text-xs font-medium tracking-wider uppercase">
              Ingresos por Boletos
            </div>
            <div className="text-accent mt-1 text-2xl font-bold">{formatCurrency(totalEarned)}</div>
            <div className="text-fg-muted mt-0.5 text-[11px]">Recaudación acumulada</div>
          </div>
          <div className="border-border-base bg-surface rounded-xl border p-4">
            <div className="text-fg-muted text-xs font-medium tracking-wider uppercase">
              Boletos Vendidos
            </div>
            <div className="text-fg mt-1 text-2xl font-bold">
              {totalTicketsSold}{' '}
              <span className="text-fg-muted text-xs font-normal">/ {totalCapacity}</span>
            </div>
            <div className="text-fg-muted mt-0.5 text-[11px]">
              {totalCapacity > 0
                ? `${Math.round((totalTicketsSold / totalCapacity) * 100)}% de ocupación`
                : 'Sin boletos'}
            </div>
          </div>
          <div className="border-border-base bg-surface rounded-xl border p-4">
            <div className="text-fg-muted text-xs font-medium tracking-wider uppercase">
              Rifas Agotadas
            </div>
            <div className="text-fg mt-1 text-2xl font-bold">
              {soldOutRaffles} <span className="text-fg-muted text-xs font-normal">rifas</span>
            </div>
            <div className="text-fg-muted mt-0.5 text-[11px]">En fase de sorteo o finalizadas</div>
          </div>
          <div className="border-border-base bg-surface rounded-xl border p-4">
            <div className="text-fg-muted flex items-center justify-between text-xs font-medium tracking-wider uppercase">
              <span>OXXO / Transferencias</span>
              {pendingOxxo.length + pendingTransfers.length > 0 && (
                <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white uppercase">
                  Pendientes
                </span>
              )}
            </div>
            <div className="text-fg mt-1 text-2xl font-bold">
              {pendingOxxo.length + pendingTransfers.length}{' '}
              <span className="text-fg-muted text-xs font-normal">por cobrar</span>
            </div>
            <div className="text-fg-muted mt-0.5 text-[11px]">
              {pendingOxxo.length + pendingTransfers.length > 0
                ? `${formatCurrency(
                    pendingOxxo.reduce((s, r) => s + r.totalAmount, 0) +
                      pendingTransfers.reduce((s, r) => s + r.totalAmount, 0),
                  )} en espera`
                : 'Sin depósitos ni SPEI pendientes'}
            </div>
          </div>
        </div>

        {/* Sección de Depósitos OXXO Pendientes de Pago */}
        {pendingOxxo.length > 0 && (
          <div className="bg-surface border-border-base space-y-4 rounded-2xl border p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-black tracking-wider text-white uppercase">
                  OXXO Pay
                </span>
                <h3 className="text-heading text-base font-bold">
                  Depósitos en efectivo pendientes ({pendingOxxo.length})
                </h3>
              </div>
              <p className="text-fg-muted text-xs">
                Vouchers de depósito pendientes de pago en tiendas OXXO. Puedes acreditarlos aquí
                manualmente.
              </p>
            </div>

            <div className="divide-border-base border-border-base divide-y overflow-hidden rounded-xl border">
              {pendingOxxo.map((res) => (
                <div
                  key={res.paymentIntentId}
                  className="bg-background flex flex-col justify-between gap-4 p-4 md:flex-row md:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-heading text-sm font-semibold">{res.raffleName}</span>
                      <span className="text-accent text-xs font-bold">
                        Boletos: {res.ticketNumbers.map((n) => `#${n}`).join(', ')}
                      </span>
                    </div>
                    <div className="text-fg-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span>
                        Comprador: <strong>{res.userName}</strong> ({res.userEmail})
                      </span>
                      <span>
                        Total a cobrar:{' '}
                        <strong className="text-success-strong">
                          {formatCurrency(res.totalAmount)}
                        </strong>
                      </span>
                      <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <LuClock size={13} />
                        {res.expired
                          ? 'Reserva vencida (liberándose)'
                          : `Expira en ${res.minutesRemaining} min`}
                      </span>
                    </div>
                    <div className="text-fg-muted font-mono text-[11px]">
                      ID Pago: {res.paymentIntentId}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={async () => {
                        setSimulatingId(res.paymentIntentId);
                        try {
                          await simulateOxxo.mutateAsync({
                            paymentIntentId: res.paymentIntentId,
                          });
                          toast.success(
                            `¡Depósito OXXO acreditado para ${res.userName}! Boletos confirmados.`,
                          );
                        } catch (err: unknown) {
                          const msg =
                            err instanceof Error ? err.message : 'Error al acreditar depósito';
                          toast.error(msg);
                        } finally {
                          setSimulatingId(null);
                        }
                      }}
                      disabled={simulatingId === res.paymentIntentId}
                    >
                      {simulatingId === res.paymentIntentId ? (
                        <>
                          <LuLoader size={14} className="animate-spin" />
                          Acreditando...
                        </>
                      ) : (
                        <>
                          <LuSparkles size={14} />
                          Acreditar pago OXXO
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sección de Transferencias Bancarias SPEI Pendientes */}
        {pendingTransfers.length > 0 && (
          <div className="bg-surface border-border-base space-y-4 rounded-2xl border p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <span className="bg-accent rounded px-2 py-0.5 text-xs font-black tracking-wider text-white uppercase">
                  SPEI
                </span>
                <h3 className="text-heading text-base font-bold">
                  Transferencias bancarias pendientes ({pendingTransfers.length})
                </h3>
              </div>
              <p className="text-fg-muted text-xs">
                Valida en tu banco la transferencia con la referencia asignada y acredítala aquí.
              </p>
            </div>

            <div className="divide-border-base border-border-base divide-y overflow-hidden rounded-xl border">
              {pendingTransfers.map((res) => (
                <div
                  key={res.paymentIntentId}
                  className="bg-background flex flex-col justify-between gap-4 p-4 md:flex-row md:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-heading text-sm font-semibold">{res.raffleName}</span>
                      <span className="text-accent text-xs font-bold">
                        Boletos: {res.ticketNumbers.map((n) => `#${n}`).join(', ')}
                      </span>
                      <span className="bg-surface border-border-base text-heading rounded border px-2 py-0.5 font-mono text-[11px] font-bold">
                        Ref: {res.referenceCode}
                      </span>
                    </div>
                    <div className="text-fg-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span>
                        Comprador: <strong>{res.userName}</strong> ({res.userEmail})
                      </span>
                      <span>
                        Monto esperado:{' '}
                        <strong className="text-success-strong">
                          {formatCurrency(res.totalAmount)}
                        </strong>
                      </span>
                      {res.trackingReference && (
                        <span>
                          Rastreo: <strong className="font-mono">{res.trackingReference}</strong>
                        </span>
                      )}
                      <span className="text-warning-strong flex items-center gap-1 font-medium">
                        <LuClock size={13} />
                        {res.expired
                          ? 'Reserva vencida (liberándose)'
                          : `Expira en ${res.minutesRemaining} min`}
                      </span>
                    </div>
                    <div className="text-fg-muted font-mono text-[11px]">
                      ID Pago: {res.paymentIntentId}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={transferActionId === res.paymentIntentId}
                      onClick={async () => {
                        setTransferActionId(res.paymentIntentId);
                        try {
                          await rejectTransfer.mutateAsync({
                            paymentIntentId: res.paymentIntentId,
                          });
                          toast.info(`Reserva liberada para ${res.userName}.`);
                        } catch (err: unknown) {
                          const msg =
                            err instanceof Error ? err.message : 'Error al liberar reserva';
                          toast.error(msg);
                        } finally {
                          setTransferActionId(null);
                        }
                      }}
                    >
                      Liberar
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={transferActionId === res.paymentIntentId}
                      onClick={async () => {
                        setTransferActionId(res.paymentIntentId);
                        try {
                          await confirmTransfer.mutateAsync({
                            paymentIntentId: res.paymentIntentId,
                          });
                          toast.success(
                            `¡Transferencia acreditada para ${res.userName}! Boletos confirmados.`,
                          );
                        } catch (err: unknown) {
                          const msg =
                            err instanceof Error ? err.message : 'Error al acreditar transferencia';
                          toast.error(msg);
                        } finally {
                          setTransferActionId(null);
                        }
                      }}
                    >
                      {transferActionId === res.paymentIntentId ? (
                        <>
                          <LuLoader size={14} className="animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <LuSparkles size={14} />
                          Acreditar transferencia
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {targetRaffle && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderRadius: 12,
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent-border)',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 14, color: 'var(--text-h)' }}>
                Rifa enfocada desde notificaciones: <strong>{targetRaffle.name}</strong> — Estado:{' '}
                <Badge variant={STATUS_LABEL[targetRaffle.status].variant}>
                  {STATUS_LABEL[targetRaffle.status].label}
                </Badge>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {targetRaffle.status === 'DRAW' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setStatusAction({ raffle: targetRaffle, status: 'FINISHED' })}
                >
                  Finalizar sorteo
                </Button>
              )}
              {targetRaffle.status === 'ACTIVE' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setStatusAction({ raffle: targetRaffle, status: 'DRAW' })}
                >
                  Iniciar sorteo
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSearchParams({})}>
                Ver todas las rifas
              </Button>
            </div>
          </div>
        )}

        <ResponsiveTable
          columns={columns}
          data={displayRaffles}
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
                htmlFor="raffle-start-date"
                className="text-fg mb-1.5 block text-sm font-medium"
              >
                Fecha de inicio de la rifa
              </label>
              <input
                id="raffle-start-date"
                type="datetime-local"
                min={dateBounds.todayStart}
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                className="border-border-base bg-background text-fg w-full rounded-md border px-3 py-2 text-sm"
              />
              <p className="text-fg-muted mt-1 text-xs">
                Opcional. Solo permite fechas desde hoy en adelante (si es futura, los clientes
                verán la rifa pero comprarán al iniciar).
              </p>
            </div>

            <div>
              <label
                htmlFor="raffle-draw-date"
                className="text-fg mb-1.5 block text-sm font-medium"
              >
                Fecha de fin / sorteo
              </label>
              <input
                id="raffle-draw-date"
                type="datetime-local"
                min={form.startDate || dateBounds.nowMinute}
                value={form.drawDate}
                onChange={(e) => setForm((prev) => ({ ...prev, drawDate: e.target.value }))}
                className="border-border-base bg-background text-fg w-full rounded-md border px-3 py-2 text-sm"
              />
              <p className="text-fg-muted mt-1 text-xs">
                Opcional. Fecha límite de venta y realización del sorteo.
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
