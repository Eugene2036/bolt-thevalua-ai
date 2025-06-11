import type { ChangeEvent } from 'react';

import { useFetcher } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

import { useCustomSubmit } from '~/hooks/useCustomSubmit';
import { useRefs } from '~/hooks/useRefs';
import { AddGrcDeprSchema, formatAmount, hasSuccess } from '~/models/core.validations';
import { AppLinks } from '~/models/links';

import { useForm } from './ActionContextProvider';
import { AddRowButtonIfLast } from './AddRowButtonIfLast';
import { CustomForm } from './CustomForm';
import { DeleteButtonGridCell } from './DeleteButtonGridCell';
import { FieldLikeText } from './FieldLikeText';
import { FormTextField } from './FormTextField';
import { GridCell } from './GridCell';

interface Props {
  plotId: string;
  grcTotal: number;
  handleDelete: () => void;
  isLast?: boolean;
}
export function AddGrcDeprRow(props: Props) {
  const { plotId, handleDelete, isLast, grcTotal } = props;

  const fetcher = useFetcher();
  const { getNameProp, isProcessing } = useForm(fetcher, AddGrcDeprSchema);

  const identifierRef = useRef<HTMLInputElement>(null);
  const percRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const { clearAllRefs } = useRefs([identifierRef, percRef]);
  const customSubmit = useCustomSubmit(fetcher, AppLinks.AddGrcDepr, formRef);

  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (hasSuccess(fetcher.data)) {
      clearAllRefs();
      setTotal(0);
      toast.success('Item added successfully');
    }
  }, [fetcher.data, clearAllRefs]);

  const onTotalChange = (_: ChangeEvent<HTMLInputElement>) => {
    const result = z.coerce.number().safeParse(percRef.current?.value);
    const perc = result.success ? result.data : 0;
    setTotal(grcTotal * perc);
  };

  return (
    <CustomForm fetcher={fetcher} formRef={formRef} customSubmit={customSubmit} isProcessing={isProcessing} action={AppLinks.AddGrcDepr}>
      <div className="flex flex-row items-stretch">
        <div className="grid grid-cols-3 grow">
          <input type="hidden" {...getNameProp('plotId')} value={plotId} />
          <GridCell>
            <FormTextField {...getNameProp('identifier')} customRef={identifierRef} type="number" isCamo required />
          </GridCell>
          <GridCell>
            <FormTextField {...getNameProp('perc')} customRef={percRef} onChange={onTotalChange} type="number" isCamo required />
          </GridCell>
          <GridCell className="flex flex-col items-stretch">
            <FieldLikeText>{formatAmount(total)}</FieldLikeText>
          </GridCell>
        </div>
        <DeleteButtonGridCell handleDelete={handleDelete} />
      </div>
      <AddRowButtonIfLast isLast={!!isLast} />
    </CustomForm>
  );
}
