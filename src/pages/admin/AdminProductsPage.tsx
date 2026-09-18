import { useState } from 'react';
import {
  useProductsAdmin,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '../../features/store/hooks/useProducts';
import ResponsiveTable from '@components/data-display/table/ResponsiveTable';
import Button from '@components/primitives/Button';
import Input from '@components/primitives/Input';
import { Drawer } from '@components/overlays/Drawer';
import { ConfirmDialog } from '@components/overlays/ConfirmDialog';
import { useToast } from '@components/feedback';
import { Can } from '../../auth/Can';
import { useHasPrivilege } from '../../auth/hooks';
import type { Product } from '../../features/store/services/products.service';
import { LuPlus, LuPencil, LuTrash2 } from 'react-icons/lu';

const CATEGORIES = ['Componentes', 'Periféricos', 'Almacenamiento', 'Gaming', 'Accesorios'];

interface FormState {
  name: string;
  description: string;
  price: string;
  category: string;
  stock: string;
  image: File | null;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  price: '',
  category: 'Componentes',
  stock: '0',
  image: null,
};

export default function AdminProductsPage() {
  const toast = useToast();
  const canReadProducts = useHasPrivilege('products.read');
  const { data: products = [], isLoading } = useProductsAdmin({ enabled: canReadProducts });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [confirmImageOpen, setConfirmImageOpen] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setNewImagePreview(null);
    setDrawerOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description ?? '',
      price: String(product.price),
      category: product.category,
      stock: String(product.stock),
      image: null,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      toast.error('El precio debe ser mayor a cero');
      return;
    }

    // Si es edición con imagen nueva → confirmar reemplazo
    if (editing && form.image) {
      setConfirmImageOpen(true);
      return;
    }

    await doSave();
  };

  const doSave = async () => {
    setConfirmImageOpen(false);
    try {
      if (editing) {
        await updateProduct.mutateAsync({
          id: editing.id,
          data: {
            name: form.name,
            description: form.description || undefined,
            price: Number(form.price),
            category: form.category,
            stock: Number(form.stock) || 0,
            image: form.image ?? undefined,
          },
        });
        toast.success('Producto actualizado');
      } else {
        if (!form.image) {
          toast.error('La imagen es obligatoria');
          return;
        }
        await createProduct.mutateAsync({
          name: form.name,
          description: form.description || undefined,
          price: Number(form.price),
          category: form.category,
          stock: Number(form.stock) || 0,
          image: form.image,
        });
        toast.success('Producto creado');
      }
      setDrawerOpen(false);
      setNewImagePreview(null);
    } catch {
      toast.error('Error al guardar el producto');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteProduct.mutateAsync(deleting.id);
      toast.success('Producto eliminado');
      setDeleting(null);
    } catch {
      toast.error('Error al eliminar el producto');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Nombre',
      minWidth: '200px',
      filterType: 'text' as const,
    },
    {
      key: 'category',
      header: 'Categoría',
      minWidth: '120px',
      filterType: 'select' as const,
      filterOptions: CATEGORIES,
    },
    {
      key: 'price',
      header: 'Precio',
      minWidth: '100px',
      render: (value: unknown) => `$${Number(value).toLocaleString('es-MX')}`,
    },
    {
      key: 'stock',
      header: 'Stock',
      minWidth: '80px',
      align: 'right' as const,
      render: (value: unknown) => (
        <span className={Number(value) === 0 ? 'text-danger-strong' : ''}>{String(value)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      align: 'right' as const,
      render: (_: unknown, row: Product) => (
        <div className="flex items-center justify-end gap-1">
          <Can privilege="products.write">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row);
              }}
              title="Editar"
            >
              <LuPencil size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setDeleting(row);
              }}
              title="Eliminar"
              className="text-danger hover:text-danger-strong"
            >
              <LuTrash2 size={16} />
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-fg-muted">Cargando productos...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-fg text-lg font-semibold">Productos</h2>
            <p className="text-fg-muted text-sm">{products.length} productos en catálogo</p>
          </div>
          <Can privilege="products.write">
            <Button variant="primary" onClick={openCreate}>
              <LuPlus size={16} className="mr-1" />
              Crear producto
            </Button>
          </Can>
        </div>

        <ResponsiveTable
          columns={columns}
          data={products}
          keyExtractor={(row) => row.id}
          filters={true}
          pagination={true}
          pageSize={10}
          onRowClick={openEdit}
          emptyTitle="Sin productos"
          emptyDescription="No se encontraron productos."
        />
      </div>

      {/* Drawer crear/editar */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Drawer.Header title={editing ? 'Editar producto' : 'Crear producto'} />
        <Drawer.Body>
          <div className="space-y-4">
            <div>
              <label className="text-fg mb-1.5 block text-sm font-medium">Nombre</label>
              <Input
                type="text"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="ej: RTX 4070"
              />
            </div>
            <div>
              <label className="text-fg mb-1.5 block text-sm font-medium">Descripción</label>
              <Input
                type="text"
                value={form.description}
                onChange={(v) => setForm({ ...form, description: v })}
                placeholder="Descripción del producto"
              />
            </div>
            <div>
              <label className="text-fg mb-1.5 block text-sm font-medium">Precio (MXN)</label>
              <Input
                type="number"
                value={form.price}
                onChange={(v) => setForm({ ...form, price: v })}
                placeholder="18000"
              />
            </div>
            <div>
              <label className="text-fg mb-1.5 block text-sm font-medium">Stock</label>
              <Input
                type="number"
                value={form.stock}
                onChange={(v) => setForm({ ...form, stock: v })}
              />
            </div>
            <div>
              <label className="text-fg mb-1.5 block text-sm font-medium">Categoría</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="border-border-base bg-background text-fg w-full rounded-md border px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-fg mb-1.5 block text-sm font-medium">
                Imagen {editing ? '(opcional)' : '(obligatoria)'}
              </label>

              {/* Preview de la imagen actual / nueva */}
              {(editing?.imageUrl || newImagePreview) && (
                <div className="mb-2">
                  <p className="text-fg-muted mb-1 text-xs">
                    {newImagePreview ? 'Nueva imagen:' : 'Imagen actual:'}
                  </p>
                  <img
                    src={newImagePreview ?? editing?.imageUrl}
                    alt="Preview"
                    className="border-border-base max-h-32 rounded-md border object-contain"
                  />
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setForm({ ...form, image: file });
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setNewImagePreview(reader.result as string);
                    reader.readAsDataURL(file);
                  } else {
                    setNewImagePreview(null);
                  }
                }}
                className="border-border-base bg-background text-fg w-full rounded-md border px-3 py-2 text-sm"
              />
              {editing && (
                <p className="text-fg-muted mt-1 text-xs">
                  Dejalo vacío para mantener la imagen actual.
                </p>
              )}
            </div>
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={createProduct.isPending || updateProduct.isPending}
          >
            Guardar
          </Button>
        </Drawer.Footer>
      </Drawer>

      {/* Confirmar reemplazo de imagen */}
      <ConfirmDialog
        isOpen={confirmImageOpen}
        onClose={() => setConfirmImageOpen(false)}
        onConfirm={doSave}
        title="Reemplazar imagen"
        message={`Vas a reemplazar la imagen actual de "${editing?.name}" por la nueva imagen seleccionada. ¿Continuar?`}
        confirmLabel="Reemplazar"
        variant="warning"
      />

      {/* Confirmar eliminación */}
      {deleting && (
        <ConfirmDialog
          isOpen={!!deleting}
          onClose={() => setDeleting(null)}
          onConfirm={handleDelete}
          title="Eliminar producto"
          message={`¿Eliminar "${deleting.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          variant="destructive"
        />
      )}
    </div>
  );
}
