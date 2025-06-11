import type { RowGrcFee } from '~/models/core.validations';

import { formatAmount } from '~/models/core.validations';

import { GrcFeeRow } from './GrcFeeRow';
import { GridCell } from './GridCell';

interface Props {
  grcTotal: number;
  records: (RowGrcFee & { index: number; err?: string })[];
}
export function GrcFeesTable(props: Props) {
  const { records, grcTotal } = props;

  const total =
    grcTotal +
    records.reduce((acc, record) => {
      const rowTotal = Number(((record.perc || 0) * 0.01 * grcTotal).toFixed(2));
      return acc + rowTotal;
    }, 0);

  return (
    <div className="flex flex-col items-stretch">
      {records.map((record) => (
        <GrcFeeRow key={record.index} {...record} recordId={record.id} grcTotal={grcTotal} />
      ))}
      <div className="flex flex-row items-stretch">
        <div className="flex flex-col items-stretch grow">
          <div className="grid grid-cols-4">
            <GridCell className="col-span-3 flex flex-col justify-center items-end">
              <span className="text-end">Depreciated Replacement Cost:</span>
            </GridCell>
            <GridCell className="text-end py-4">
              <span className="font-semibold px-2">{formatAmount(total)}</span>
            </GridCell>
          </div>
        </div>
      </div>
    </div>
  );
}
