import { Block, PartialBlock } from "@blocknote/core";
import { Text, View } from "@react-pdf/renderer";
import { ComponentProps, useContext, useMemo } from "react";
import { createTw } from "react-pdf-tailwind";
import { twMerge } from "tailwind-merge";
import { ConstructionItem } from "~/models/con-items";
import PdfEditorClient from "./pdf-editor";
import { PdfPlinthAreas } from "./PdfPlinthAreas";
import { PdfViewConstruction } from "./PdfViewConstruction";
import { PlinthAreas } from "./PlinthAreas";
import { TableOfContentsContext, UpdateTocProps } from "./TableOfContentsProvider";
import { PdfMap } from "./PdfMap";
import { ViewPlotMVAnalysisCard } from "./ViewPlotMVAnalysisCard";
import { PdfPlotMVAnalysisCard } from "./PdfPlotMVAnalysisCard";

const tw = createTw({
  theme: {},
});

interface Props {
  mapBase64: string;
  qrCodeBase64: string;

  editable: boolean;
  titleMode: boolean;
  title: string | undefined;
  content: PartialBlock[];
  toggleTitleMode: () => void;
  updateTitle: (newValue: string) => void;
  updateContent: (newValue: Block[]) => void;
  removeSubSection: () => void;
  plotMVAnalysisRecords?: ComponentProps<typeof ViewPlotMVAnalysisCard>['data'];
  cood?: { lat: number; long: number, label: string };
  grcRecords?: ComponentProps<typeof PlinthAreas>['records'];
  items?: ConstructionItem[];
  plotId?: string;

  index: number;
}
export function PdfSubSectionPanel(props: Props) {
  const { index, items, editable, title, titleMode, content, updateTitle, grcRecords, plotMVAnalysisRecords } = props;

  const { updateToc, tocDone } = useContext(TableOfContentsContext);

  const elementType = useMemo(() => {
    if (JSON.stringify(content).includes('{map}')) {
      return 'map' as const;
    }
    if (JSON.stringify(content).includes('{qrCode}')) {
      return 'qrCode' as const;
    }
    if (JSON.stringify(content).includes('{plinthAreas}')) {
      return 'plinthAreas' as const;
    }
    if (JSON.stringify(content).includes('{constructionTable}')) {
      return 'constructionTable' as const;
    }
    if (JSON.stringify(content).includes('{marketValueTable}')) {
      return 'marketValueTable' as const;
    }
  }, [content]);

  return (
    <View wrap={false} style={tw(twMerge(
      "flex flex-col items-stretch relative rounded-md py-[8pt]",
      !!titleMode && 'flex flex-row items-stretch',
    ))}>
      {titleMode && (
        <View style={tw("flex flex-col justify-start items-stretch px-4 py-4 shrink-0 w-[20%]")}>
          <Title index={index} tocDone={tocDone} updateToc={updateToc} updateTitle={updateTitle} editable={editable}>
            {title || ''}
          </Title>
        </View>
      )}
      <View style={tw(twMerge("flex flex-col items-stretch w-full pr-4", titleMode && 'w-[80%] border-l-red-600 border-l-2 px-2 py-1'))}>
        {elementType === 'map' && (
          <PdfMap base64={props.mapBase64} />
        )}
        {elementType === 'plinthAreas' && (
          <PdfPlinthAreas records={grcRecords || []} />
        )}
        {elementType === 'constructionTable' && (
          <PdfViewConstruction items={items || []} />
        )}
        {elementType === 'marketValueTable' && (
          <PdfPlotMVAnalysisCard
            plotNumber={plotMVAnalysisRecords?.plotNumber ?? ""}
            plotDesc={plotMVAnalysisRecords?.plotDesc ?? ""}
            comparables={plotMVAnalysisRecords?.comparables ?? []}
            avgPrice={plotMVAnalysisRecords?.avgPrice ?? 0}
            marketValue={plotMVAnalysisRecords?.marketValue ?? 0}
            forcedSaleValue={plotMVAnalysisRecords?.forcedSaleValue ?? 0}
            valuerComments={plotMVAnalysisRecords?.valuerComments ?? ""}
            aiAnalysis={plotMVAnalysisRecords?.aiAnalysis ?? ""}
          />
        )}
        {!elementType && (
          // <PdfEditorClient />
          <PdfEditorClient content={content} />
        )}
      </View>
    </View>
  )
}

interface TitleProps {
  editable: boolean;
  children: string;
  updateTitle: (newValue: string) => void;
  updateToc: (props: UpdateTocProps) => void;
  tocDone: boolean;
  index: number;
}
function Title(props: TitleProps) {
  const { index, updateToc, tocDone, children } = props;
  return (
    <>
      <Text
        style={tw("hidden text-sm")}
        render={({ pageNumber }) => {
          if (!tocDone) {
            updateToc({ pageNumber, customIndex: index });
          }
          return '';
        }}
      />
      <Text
        id={`SubSection_${children.split(" ").join('_')}_${index}`}
        style={tw("font-semibold text-sm")}
      >
        {children}
      </Text>
    </>
  )
}