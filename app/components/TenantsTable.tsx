import { formatAmount } from '~/models/core.validations';

import { TableCell } from './TableCell';
import { TableHeading } from './TableHeading';

interface Props {
  records: {
    propertyType: string;
    areaPerClient: number;
    gla: string;
  }[];
  totalRental: number;
  assetTypes: {
    area: number;
    gla: number;
    identifier: string;
    num: number;
    rate: number;
    gross: number;
    ratePerMarket: number;
  }[];
  // assetTypes: [string, number, number, number, number, number, number][];
}
export function TenantsTable(props: Props) {
  const { records, totalRental, assetTypes } = props;

  return (
    <table>
      <thead>
        <tr>
          <TableHeading>Asset Type</TableHeading>
          <TableHeading className="text-end">Area</TableHeading>
          <TableHeading className="text-end">Income Roll Rate/m2</TableHeading>
          <TableHeading className="text-end bg-teal-50">Market Rate/m2</TableHeading>
          <TableHeading className="text-end">% GLA</TableHeading>
          <TableHeading className="text-end bg-teal-50">Gross Income</TableHeading>
        </tr>
      </thead>
      <tbody>
        {assetTypes.map((a) => (
          <tr key={a.identifier}>
            <TableCell>{a.identifier}</TableCell>
            <TableCell className="text-end">
              <span className="font-light">{formatAmount(a.area)}</span>
            </TableCell>
            <TableCell className="text-end">
              <span className="font-light">{formatAmount(a.ratePerMarket)}</span>
              {/* <span className="font-light">{formatAmount(a.rate)}</span> */}
            </TableCell>
            <TableCell className="text-end bg-teal-50">
              <span className="font-light">{formatAmount(a.rate)}</span>
              {/* <span className="font-light">
                {formatAmount(a.ratePerMarket)}
              </span> */}
            </TableCell>
            <TableCell className="text-end">
              <span className="font-light">{formatAmount(a.gla * 100)} %</span>
            </TableCell>
            <TableCell className="text-end bg-teal-50">
              <span className="font-light">{formatAmount(a.gross)}</span>
            </TableCell>
          </tr>
        ))}
        {records.map((tenant, index) => (
          <tr key={index}>
            <TableCell>{tenant.propertyType}</TableCell>
            <TableCell className="text-end">
              <span className="font-light">{formatAmount(tenant.areaPerClient)}</span>
            </TableCell>
            <TableCell className="text-end">
              <span className="font-light">-</span>
            </TableCell>
            <TableCell className="text-end bg-teal-50">
              <span className="font-light">-</span>
            </TableCell>
            <TableCell className="text-end">
              <span className="font-light">{tenant.gla}%</span>
            </TableCell>
            <TableCell className="text-end bg-teal-50">
              <span className="font-light">-</span>
            </TableCell>
          </tr>
        ))}
        {!records.length && (
          <tr>
            <TableCell colSpan={6} className="text-center text-stone-400">
              No tenants found
            </TableCell>
          </tr>
        )}
      </tbody>
      <tfoot>
        <tr>
          <TableCell colSpan={5} className="text-end">
            Total Monthly Income:
          </TableCell>
          <TableCell className="text-end">
            <span className="font-semibold">{formatAmount(totalRental)}</span>
          </TableCell>
        </tr>
      </tfoot>
    </table>
  );
}
