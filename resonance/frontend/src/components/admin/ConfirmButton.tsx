import { useEffect, useRef, useState } from 'react';

export function ConfirmButton({ label, confirmLabel, onConfirm, disabled, className }: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleClick = () => {
    if (!armed) {
      setArmed(true);
      timer.current = window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    window.clearTimeout(timer.current);
    setArmed(false);
    onConfirm();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onBlur={() => setArmed(false)}
      disabled={disabled}
      className={`${className ?? ''} ${armed ? 'ring-1 ring-sentiment-negative' : ''}`}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
