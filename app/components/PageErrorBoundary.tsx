import { useNavigate } from '@remix-run/react';
import { useCallback } from 'react';

import { CustomErrorBoundary } from '~/components/CustomErrorBoundary';

interface Props {
  error: Error;
}

export function PageErrorBoundary(props: Props) {
  const { error } = props;

  const navigate = useNavigate();

  const reload = useCallback(() => {
    navigate('.', { replace: true });
  }, [navigate]);

  return <CustomErrorBoundary reload={reload} error={error} />;
}
