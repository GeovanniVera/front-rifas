import { useState, useRef } from 'react';
import { useAuth } from '../../auth';
import Badge from '@components/primitives/Badge';
import Button from '@components/primitives/Button';
import Input from '@components/primitives/Input';
import Card from '@components/layout/Card';
import { useToast } from '@components/feedback';
import { useUpdateProfile } from '../../features/profile/hooks/useProfile';
import { useRafflesAdmin } from '../../features/store/hooks/useRaffles';
import { formatCurrency } from '../../config/constants';
import { LuCamera, LuShieldCheck, LuWallet, LuTrendingUp, LuTicket } from 'react-icons/lu';

export default function PerfilPage() {
  const { user } = useAuth();
  const toast = useToast();
  const updateProfile = useUpdateProfile();

  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('role-admin');
  const { data: raffles = [] } = useRafflesAdmin({ enabled: !!isAdmin });

  const totalEarned = raffles.reduce((sum, r) => sum + r.ticketsSold * r.ticketPrice, 0);
  const totalTicketsSold = raffles.reduce((sum, r) => sum + r.ticketsSold, 0);
  const activeRafflesCount = raffles.filter((r) => r.status === 'ACTIVE').length;

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const photoRef = useRef<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.photoUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    photoRef.current = file;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSave();
  };

  const doSave = async () => {
    try {
      await updateProfile.mutateAsync({ name, photo: photoRef.current ?? undefined });
      toast.success('Perfil actualizado correctamente');
    } catch {
      toast.error('Error al actualizar el perfil');
    }
  };

  const avatar = photoPreview || undefined;
  const initial = (user?.name ?? 'U').charAt(0).toUpperCase();

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900, width: '100%', margin: '0 auto' }}>
      <div className="space-y-6">
        <div>
          <h2 className="text-fg text-lg font-semibold">Mi perfil</h2>
          <p className="text-fg-muted text-sm">Edita tu información personal y foto de perfil.</p>
        </div>

        {/* Sección de ganancias para la cuenta del Administrador */}
        {isAdmin && (
          <Card variant="elevated">
            <Card.Header>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'var(--accent-bg)',
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <LuWallet size={20} />
                  </div>
                  <div>
                    <h3 className="text-fg font-semibold text-base">Balance de la Cuenta de Administrador</h3>
                    <p className="text-fg-muted text-xs">Total acumulado generado por la venta de boletos.</p>
                  </div>
                </div>
                <Badge variant="success">Cuenta Administrador</Badge>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border-base bg-surface">
                  <div className="text-xs text-fg-muted font-medium uppercase tracking-wider flex items-center gap-1.5">
                    <LuTrendingUp size={14} className="text-accent" /> Total Recaudado
                  </div>
                  <div className="text-2xl font-bold text-accent mt-1">
                    {formatCurrency(totalEarned)}
                  </div>
                  <div className="text-[11px] text-fg-muted mt-1">Ingresos acumulados</div>
                </div>

                <div className="p-4 rounded-xl border border-border-base bg-surface">
                  <div className="text-xs text-fg-muted font-medium uppercase tracking-wider flex items-center gap-1.5">
                    <LuTicket size={14} className="text-fg-muted" /> Boletos Vendidos
                  </div>
                  <div className="text-2xl font-bold text-fg mt-1">
                    {totalTicketsSold}
                  </div>
                  <div className="text-[11px] text-fg-muted mt-1">En todas las rifas</div>
                </div>

                <div className="p-4 rounded-xl border border-border-base bg-surface">
                  <div className="text-xs text-fg-muted font-medium uppercase tracking-wider">
                    Rifas Activas
                  </div>
                  <div className="text-2xl font-bold text-fg mt-1">
                    {activeRafflesCount}
                  </div>
                  <div className="text-[11px] text-fg-muted mt-1">Recibiendo compras</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card variant="elevated">
            <Card.Body>
              {/* Avatar */}
              <div className="mb-6 flex items-center gap-4">
                <div className="relative">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Foto de perfil"
                      className="size-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="bg-accent flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white">
                      {initial}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-accent hover:bg-accent-hover absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full text-white shadow-md"
                    title="Cambiar foto"
                  >
                    <LuCamera size={14} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-fg text-sm font-medium">{user?.name}</p>
                  <p className="text-fg-muted text-xs">{user?.email}</p>
                  <div className="mt-1 flex gap-1">
                    {user?.roles?.map((role) => (
                      <Badge key={role} variant="info">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Formulario */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="text-fg mb-1.5 block text-sm font-medium"
                  >
                    Nombre
                  </label>
                  <Input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={setName}
                    placeholder="Tu nombre"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-email"
                    className="text-fg mb-1.5 block text-sm font-medium"
                  >
                    Email
                  </label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    readOnly
                    placeholder="tu@email.com"
                  />
                  <p className="text-fg-muted mt-1 text-xs">El email no se puede cambiar.</p>
                </div>

                <div className="bg-surface border-border-base text-fg-muted flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
                  <LuShieldCheck size={14} className="text-accent" />
                  {user?.isVerified ? 'Email verificado' : 'Email sin verificar'}
                </div>
              </div>
            </Card.Body>
            <Card.Footer>
              <Button type="submit" variant="primary" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </Card.Footer>
          </Card>
        </form>
      </div>
    </div>
  );
}
