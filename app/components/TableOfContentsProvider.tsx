import { createContext, ReactNode } from 'react';

export type TocEntry = {
  title: string;
  pageNumber: number;
  level: number,
  customIndex: number;
};

export type UpdateTocProps = {
  customIndex: number;
  pageNumber: number
};

interface TocContextProps {
  tableOfContents: TocEntry[];
  updateToc: (props: UpdateTocProps) => void;
  tocDone: boolean;
}
export const TableOfContentsContext = createContext<TocContextProps>(
  null as unknown as TocContextProps,
);

interface Props {
  children: ReactNode;
  tableOfContents: TocEntry[];
  updateToc: (props: UpdateTocProps) => void;
}
export const TableOfContentsProvider = (props: Props) => {
  const { children, ...rest } = props;

  const tocDone = props.tableOfContents.every(i => !!i.pageNumber);

  return (
    <TableOfContentsContext.Provider value={{ ...rest, tocDone }}>
      {children}
    </TableOfContentsContext.Provider>
  );
};
