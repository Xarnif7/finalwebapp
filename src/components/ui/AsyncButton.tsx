import React from 'react';
import { Button } from './button';

type AsyncButtonProps = React.ComponentProps<typeof Button> & {
  onClick?: () => Promise<void> | void;
  busyText?: string;
};

export function AsyncButton({ onClick, busyText = 'Working…', children, ...rest }: AsyncButtonProps) {
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    try {
      setLoading(true);
      await onClick?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button {...rest} onClick={handleClick} disabled={loading || rest.disabled}>
      {loading ? busyText : children}
    </Button>
  );
}

export default AsyncButton;


