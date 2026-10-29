/**
 * Página de acceso denegado (403).
 */
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import Button from '@components/primitives/Button';
import ErrorLayout from '../../layouts/ErrorLayout';
import { useAuth } from '../../auth';

export default function ForbiddenPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <ErrorLayout
      image="/403.png"
      imageAlt={t('pages.forbidden.title')}
      title={t('pages.forbidden.title')}
      description={t('pages.forbidden.message')}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="primary" onClick={() => navigate(-1)}>
          {t('common.back')}
        </Button>
        <Button variant="secondary" onClick={() => navigate('/')}>
          {t('pages.forbidden.backToHome')}
        </Button>
        <Button variant="danger" onClick={() => logout()}>
          {t('common.logout', 'Cerrar sesión')}
        </Button>
      </div>
    </ErrorLayout>
  );
}
