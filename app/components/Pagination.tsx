import type { ComponentProps } from 'react';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'tabler-icons-react';
import { twMerge } from 'tailwind-merge';

import { Select } from './Select';

interface Props {
  pageSizes: number[];
  pageSize: number;
  handlePageSizeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;

  currentPage: number;
  numPages: number;

  toFirstPage: () => void;
  toLastPage: () => void;
  toNextPage: () => void;
  toPreviousPage: () => void;
}
export function Pagination(props: Props) {
  const { currentPage, numPages, pageSizes, pageSize, handlePageSizeChange, toFirstPage, toLastPage, toNextPage, toPreviousPage } = props;

  return (
    <div className="flex flex-row items-stretch bg-stone-50 rounded divide-x divide-stone-200">
      <div className="flex flex-col justify-center items-center px-2">
        <Select name="paginate" errors={[]} isCamo value={pageSize} onChange={handlePageSizeChange}>
          {pageSizes.map((size) => (
            <option key={size} value={size}>
              {size} per page
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-row items-center gap-2 px-2">
        <CustomButton title="First page" onClick={toFirstPage} disabled={currentPage === 1} className={twMerge(currentPage === 1 && 'cursor-not-allowed')}>
          <ChevronsLeft className={twMerge(currentPage === 1 && 'text-stone-200')} />
        </CustomButton>
        <CustomButton title="Previous page" onClick={toPreviousPage} disabled={currentPage === 1} className={twMerge(currentPage === 1 && 'cursor-not-allowed')}>
          <ChevronLeft className={twMerge(currentPage === 1 && 'text-stone-200')} />
        </CustomButton>
        <div className="flex flex-col justify-center items-center">
          <span className="text-sm text-stone-800 font-light">
            Page {currentPage} of {numPages}
          </span>
        </div>
        <CustomButton title="Next page" onClick={toNextPage} disabled={currentPage === numPages} className={twMerge(currentPage === numPages && 'cursor-not-allowed')}>
          <ChevronRight className={twMerge(currentPage === numPages && 'text-stone-200')} />
        </CustomButton>
        <CustomButton title="Last page" onClick={toLastPage} disabled={currentPage === numPages} className={twMerge(currentPage === numPages && 'cursor-not-allowed')}>
          <ChevronsRight className={twMerge(currentPage === numPages && 'text-stone-200')} />
        </CustomButton>
      </div>
    </div>
  );
}

function CustomButton(props: ComponentProps<'button'>) {
  const { children, className, ...rest } = props;
  return (
    <button className={twMerge('flex flex-col justify-center items-center p-2 cursor-pointer hover:bg-stone-100 rounded', className)} {...rest}>
      {children}
    </button>
  );
}
