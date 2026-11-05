import { useState } from 'react';
import { Drawer } from '@components/overlays/Drawer';
import Button from '@components/primitives/Button';
import Input from '@components/primitives/Input';
import { Can } from '../../../auth/Can';
import { useHasPrivilege } from '../../../auth/hooks';
import { CheckboxSearchList } from '../../../components/forms/CheckboxSearchList';
import { useToast } from '@components/feedback';
import { useCreateRole, useUpdateRole, usePermissions } from '../hooks/useRoles';
import type { Role, Permission } from '../services/role.service';

interface RoleDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
}

function RoleDrawerContent({ role, onClose, isOpen }: RoleDrawerProps) {
  const toast = useToast();
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(
    () => new Set(role?.permissions.map((p) => p.id) ?? []),
  );
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const canReadPermissions = useHasPrivilege('permissions.read');
  const { data: permissions = [] } = usePermissions({
    enabled: canReadPermissions && isOpen,
  });

  const togglePerm = (permId: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const data = {
      name,
      description,
      permissionIds: Array.from(selectedPerms),
    };

    try {
      if (role) {
        await updateRole.mutateAsync({ id: role.id, data });
        toast.success(`Rol ${name} actualizado`);
      } else {
        await createRole.mutateAsync(data);
        toast.success(`Rol ${name} creado`);
      }
      onClose();
    } catch {
      toast.error('Error al guardar el rol');
    }
  };

  const readOnlyView = role ? (
    <div className="space-y-4">
      <div>
        <span className="text-fg-muted block text-sm">Nombre</span>
        <p className="text-fg text-sm font-medium">{role.name}</p>
      </div>
      <div>
        <span className="text-fg-muted block text-sm">Descripción</span>
        <p className="text-fg text-sm">{role.description || '—'}</p>
      </div>
      <div>
        <span className="text-fg mb-2 block text-sm font-medium">Permisos</span>
        <div className="flex flex-wrap gap-1">
          {role.permissions.length > 0 ? (
            role.permissions.map((p) => (
              <span
                key={p.id}
                className="bg-accent-subtle text-accent inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              >
                {p.name}
              </span>
            ))
          ) : (
            <span className="text-fg-muted text-xs">Sin permisos asignados</span>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Drawer.Header title={role ? 'Detalle del rol' : 'Crear rol'} />
      <Drawer.Body>
        <Can privilege="roles.write" fallback={readOnlyView}>
          <div className="space-y-4">
            <div>
              <label htmlFor="role-name" className="text-fg mb-1.5 block text-sm font-medium">
                Nombre
              </label>
              <Input
                id="role-name"
                type="text"
                value={name}
                onChange={setName}
                placeholder="ej: admin"
                required
              />
            </div>
            <div>
              <label
                htmlFor="role-description"
                className="text-fg mb-1.5 block text-sm font-medium"
              >
                Descripción
              </label>
              <Input
                id="role-description"
                type="text"
                value={description}
                onChange={setDescription}
                placeholder="Descripción del rol"
              />
            </div>
            <div>
              <span className="text-fg mb-2 block text-sm font-medium">Permisos</span>
              <CheckboxSearchList
                options={permissions.map((perm: Permission) => ({
                  id: perm.id,
                  label: perm.name,
                  description: perm.description,
                }))}
                selected={selectedPerms}
                onToggle={togglePerm}
                searchPlaceholder="Buscar permiso..."
                emptyMessage="No hay permisos en el catálogo"
                noResultsMessage="No se encontraron permisos"
              />
            </div>
          </div>
        </Can>
      </Drawer.Body>
      <Drawer.Footer>
        <Button variant="secondary" onClick={onClose}>
          {role ? 'Cerrar' : 'Cancelar'}
        </Button>
        <Can privilege="roles.write">
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!name || createRole.isPending || updateRole.isPending}
          >
            {createRole.isPending || updateRole.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </Can>
      </Drawer.Footer>
    </>
  );
}

export function RoleDrawer({ isOpen, onClose, role }: RoleDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      {isOpen && (
        <RoleDrawerContent key={role?.id ?? 'new'} isOpen={isOpen} onClose={onClose} role={role} />
      )}
    </Drawer>
  );
}
