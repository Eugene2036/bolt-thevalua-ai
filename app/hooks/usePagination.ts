import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { z } from 'zod';
export const PAGE_SIZES = [10, 20, 50, 100];

export function usePagination<T>(records: T[]) {
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [currentPage, setCurrentPage] = useState(1);

  function handlePageSizeChange(event: ChangeEvent<HTMLSelectElement>) {
    const newValue = event.currentTarget.value;
    const result = z.coerce.number().safeParse(newValue);
    if (result.success) {
      setPageSize(result.data);
      setCurrentPage(1);
    }
  }

  const numPages = Math.ceil(records.length / pageSize);

  function toFirstPage() {
    setCurrentPage(1);
  }
  function toLastPage() {
    setCurrentPage(numPages);
  }
  function toNextPage() {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  }
  function toPreviousPage() {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRecords = records.slice(startIndex, endIndex);

  return {
    pageSize,
    handlePageSizeChange,

    currentPage,
    numPages,

    paginatedRecords,
    toFirstPage,
    toLastPage,
    toNextPage,
    toPreviousPage,
  };
}
