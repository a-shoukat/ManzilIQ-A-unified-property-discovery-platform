import { useState, type InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Masked password input with a show/hide eye toggle. */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const { t } = useTranslation('common');
  const [show, setShow] = useState(false);
  return (
    <div className="password-field">
      <input {...props} type={show ? 'text' : 'password'} />
      <Button variant="ghost" size="icon" type="button" aria-label={show ? t('hidePassword') : t('showPassword')} onClick={() => setShow(!show)}>
        {show ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}

/** English constant kept for non-React callers; prefer t('auth:passwordMismatch') in UI. */
export const PASSWORD_MISMATCH = 'Passwords do not match';
