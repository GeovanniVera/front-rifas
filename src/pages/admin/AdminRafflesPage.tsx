import { useState } from 'react'
import {
  useRafflesAdmin,
  useCreateRaffle,
  useChangeRaffleStatus,
  useDeleteRaffle,
} from '../../features/store/hooks/useRaffles'
import { useProductsAdmin } from '../../features/store/hooks/useProducts'
import ResponsiveTable from '@components/data-display/table/ResponsiveTable'
import Button from '@components/primitives/Button'
import Input from '@components/primitives/Input'
import Badge from '@components/primitives/Badge'
import { Drawer } from '@components/overlays/Drawer'
import { ConfirmDialog } from '@components/overlays/ConfirmDialog'
import { useToast } from '@components/feedback'
import { Can } from '../../auth/Can'
import type { Raffle, RaffleStatus } from '../../features/store/services/raffles.service'
import { LuPlus, LuTrash2 } from 'react-icons/lu'

const STATUS_LABEL: Record<RaffleStatus, { label: string; variant: 'success' | 'warning' | 'info' | 'danger' }> = {
  ACTIVE: { label: 'Activa', variant: 'success' },
  DRAW: { label: 'Sorteo', variant: 'warning' },
  FINISHED: { label: 'Finalizada', variant: 'info' },
  CANCELLED: { label: 'Cancelada', variant: 'danger' },
}

export default function AdminRafflesPage() {
  const toast = useToast()
  const { data: raffles = [], isLoading } = useRafflesAdmin()
  const { data: products = [] } = useProductsAdmin()
  const createRaffle = useCreateRaffle()
  const changeStatus = useChangeRaffleStatus()
  const deleteRaffle = useDeleteRaffle()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState({ productId: '', marginPercent: 7, ticketCount: 100 })
  const [deleting, setDeleting] = useState<Raffle | null>(null)
  const [statusAction, setStatusAction] = useState<{ raffle: Raffle; status: RaffleStatus } | null>(null)

  const availableProducts = products.filter((p) => p.stock > 0)

  const openCreate = () => {
    setForm({ productId: availableProducts[0]?.id ?? '', marginPercent: 7, ticketCount: 100 })
    setDrawerOpen(true)
  }

  const handleCreate = async () => {
    if (!form.productId) {
      toast.error('Seleccioná un producto')
      return
    }
    try {
      await createRaffle.mutateAsync(form)
      toast.success('Rifa creada — el producto se apartó del stock')
      setDrawerOpen(false)
    } catch {
      toast.error('Error al crear la rifa')
    }
  }

  const handleStatus = async () => {
    if (!statusAction) return
    try {
      await changeStatus.mutateAsync({ id: statusAction.raffle.id, status: statusAction.status })
      toast.success(`Rifa marcada como ${STATUS_LABEL[statusAction.status].label}`)
      setStatusAction(null)
    } catch {
      toast.error('Error al cambiar el estado')
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteRaffle.mutateAsync(deleting.id)
      toast.success('Rifa eliminada')
      setDeleting(null)
    } catch {
      toast.error('Error al eliminar la rifa')
    }
  }

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
        const sold = Number(value ?? 0)
        const total = row.ticketCount
        const pct = total > 0 ? Math.round((sold / total) * 100) : 0
        return (
          <span className={sold > 0 ? 'text-accent' : 'text-fg-muted'}>
            {sold} ({pct}%)
          </span>
        )
      },
    },
    {
      key: 'ticketPrice',
      header: 'Precio/boleto',
      minWidth: '100px',
      render: (value: unknown) => `$${Number(value).toLocaleString('es-MX')}`,
    },
    {
      key: 'marginPercent',
      header: 'Margen',
      minWidth: '80px',
      render: (value: unknown) => `${value}%`,
    },
    {
      key: 'status',
      header: 'Estado',
      minWidth: '110px',
      filterType: 'select' as const,
      filterOptions: ['ACTIVE', 'DRAW', 'FINISHED', 'CANCELLED'],
      render: (value: unknown) => {
        const cfg = STATUS_LABEL[value as RaffleStatus]
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
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
                onClick={(e) => { e.stopPropagation(); setStatusAction({ raffle: row, status: 'DRAW' }) }}
              >
                Sorteo
              </Button>
            )}
            {row.status === 'DRAW' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setStatusAction({ raffle: row, status: 'FINISHED' }) }}
              >
                Finalizar
              </Button>
            )}
            {(row.status === 'ACTIVE' && row.ticketsSold === 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setStatusAction({ raffle: row, status: 'CANCELLED' }) }}
                className="text-warning hover:text-warning-strong"
              >
                Cancelar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setDeleting(row) }}
              className="text-danger hover:text-danger-strong"
              title="Eliminar"
            >
              <LuTrash2 size={16} />
            </Button>
          </Can>
        </div>
      ),
    },
  ]

  // Preview del precio por boleto
  const selectedProduct = products.find((p) => p.id === form.productId)
  const previewTotal = selectedProduct ? selectedProduct.price * (1 + form.marginPercent / 100) : 0
  const previewPrice = form.ticketCount > 0 ? previewTotal / form.ticketCount : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-fg-muted">Cargando rifas...</p>
      </div>
    )
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
            <Button variant="primary" onClick={openCreate} disabled={availableProducts.length === 0}>
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
        <Drawer.Header title="Crear rifa" />
        <Drawer.Body>
          <div className="space-y-4">
            <div>
              <label className="text-fg mb-1.5 block text-sm font-medium">Producto a rifar</label>
              <select
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="w-full rounded-md border border-border-base bg-background px-3 py-2 text-sm text-fg"
              >
                {availableProducts.length === 0 && (
                  <option value="">No hay productos con stock</option>
                )}
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ${p.price.toLocaleString('es-MX')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-fg mb-1.5 block text-sm font-medium">Margen (%)</label>
              <Input
                type="number"
                value={String(form.marginPercent)}
                onChange={(v) => setForm({ ...form, marginPercent: Number(v) || 0 })}
              />
              <p className="text-fg-muted mt-1 text-xs">
                Porcentaje extra sobre el precio del producto. Default 7%.
              </p>
            </div>
            <div>
              <label className="text-fg mb-1.5 block text-sm font-medium">Cantidad de boletos</label>
              <Input
                type="number"
                value={String(form.ticketCount)}
                onChange={(v) => setForm({ ...form, ticketCount: Number(v) || 0 })}
              />
            </div>
            {selectedProduct && (
              <div className="bg-surface rounded-md border border-border-base p-3 text-sm">
                <p className="text-fg">
                  Precio producto: <strong>${selectedProduct.price.toLocaleString('es-MX')}</strong>
                </p>
                <p className="text-fg mt-1">
                  Total a recaudar:{' '}
                  <strong>${Math.round(previewTotal).toLocaleString('es-MX')}</strong>
                </p>
                <p className="text-accent mt-1">
                  Precio por boleto: <strong>${Math.ceil(previewPrice).toLocaleString('es-MX')}</strong>
                </p>
              </div>
            )}
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleCreate} disabled={createRaffle.isPending}>
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
  )
}