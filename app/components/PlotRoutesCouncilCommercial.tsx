import { NavLink } from '@remix-run/react';
import { useMemo } from 'react';
import { Cash, ChartDots, ChartDots3, FileDescription, Report } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';

import { AppLinks } from '~/models/links';
import { capitalize } from '~/models/strings';
import { useUser } from '~/utils';
import { FaArrowAltCircleLeft } from "react-icons/fa";


interface Props {
  plotId: string;
  redirectTo: string | undefined;
}
export function PlotRoutesCouncilCommercial(props: Props) {
  const user = useUser();
  const { plotId, redirectTo } = props;
  const routes = useMemo(() => {
    return [
      [ChartDots, 'Income Schedule', AppLinks.PlotValuations(plotId)],
      [Cash, 'Income CAP', AppLinks.PlotIncome(plotId)],
      [ChartDots, 'DCF', AppLinks.PlotDCF(plotId)],
      [ChartDots, 'Insurance', AppLinks.PlotInsurance(plotId)],
      [FileDescription, 'Summary', AppLinks.PlotSummary(plotId)],
      ...(user?.isBanker === true ? [[FaArrowAltCircleLeft, 'Back', AppLinks.ValuationReports]] : [[Report, 'Report', AppLinks.Instruction(plotId)]]),
    ] as const;
  }, [plotId]);

  return (
    <div className="flex flex-row routes-end gap-4 overflow-x-auto py-1">
      {routes.map(([Icon, label, link]) => (
        <NavLink
          key={label}
          to={`${link}?redirectTo=${redirectTo}`}
          className={({ isActive }) =>
            twMerge(
              'flex flex-row items-center justify-start gap-4 rounded-lg bg-teal-50 py-1 px-2',
              'text-teal-600 transition-all duration-300 hover:bg-teal-100 shadow',
              isActive && 'bg-teal-600 text-white hover:bg-teal-600',
            )
          }
        >
          <Icon className="shrink-0" />
          <span className="text-sm font-semibold">{capitalize(label)}</span>
        </NavLink>
      ))}
    </div>
  );
}