import { PartialBlock } from '@blocknote/core';
import { createContext, useContext } from 'react';

import { Section } from '~/models/reports';

interface ContextProps {
  sections: Section[];
  
  addSection: () => void;
  updateSectionName: (index: number, name: string) => void;
  removeSection: (index: number) => void;
  
  addSubSection: (index: number) => void;
  toggleSubSectionTitle: (index: number, subIndex: number) => void;
  updateSubSectionTitle: (index: number, subIndex: number, title: string) => void;
  updateSubSectionContent: (index: number, subIndex: number, content: PartialBlock[]) => void;
  removeSubSection: (index: number, subIndex: number) => void;
  
  causeReRender: React.Dispatch<React.SetStateAction<number>>;
}

export const ReportContext = createContext<ContextProps>({
  sections: [],
  
  addSection: () => { },
  updateSectionName: () => { },
  removeSection: () => { },
  
  addSubSection: () => { },
  toggleSubSectionTitle: () => { },
  updateSubSectionTitle: () => { },
  updateSubSectionContent: () => { },
  removeSubSection: () => { },
  
  causeReRender: () => {},
});

interface Props extends ContextProps {
  children: React.ReactNode;
}
export function ReportContextProvider(props: Props) {
  const { children, ...restOfProps } = props;
  return <ReportContext.Provider value={restOfProps}>{children}</ReportContext.Provider>;
}

export function useReportContext() {
  const context = useContext<ContextProps>(ReportContext);
  if (!context) {
    throw new Error(`useReportContext must be used within a ReportContextProvider`);
  }
  return context;
}