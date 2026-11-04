import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Masked password input with a show/hide eye toggle. */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-field">
      <input {...props} type={show ? 'text' : 'password'} />
      <Button variant="ghost" size="icon" type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(!show)}>
        {show ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  );
}

export const PASSWORD_MISMATCH = 'Passwords do not match';
