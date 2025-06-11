import { View } from "@react-pdf/renderer";
import { ComponentProps, useContext } from "react";
import { createTw } from "react-pdf-tailwind";
import { ConstructionItem } from "~/models/con-items";
import { Section, SubSection } from "~/models/reports";
import { PdfSectionHeading } from "./PdfSectionHeading";
import { PdfSubSectionPanel } from "./PdfSubSectionPanel";
import { PlinthAreas } from "./PlinthAreas";
import { TableOfContentsContext } from "./TableOfContentsProvider";
import { ViewPlotMVAnalysisCard } from "./ViewPlotMVAnalysisCard";

const tw = createTw({
  theme: {},
});

interface Props {
  mapBase64: string;

  editable: boolean;
  section: Section;
  updateSection: (updated: Section) => void;
  removeSection: () => void;

  cood?: { lat: number; long: number, label: string };
  grcRecords?: ComponentProps<typeof PlinthAreas>['records'];
  plotMVAnalysisRecords?: ComponentProps<typeof ViewPlotMVAnalysisCard>['data'];
  items?: ConstructionItem[];

  index: number;
}
export function PdfSectionPanel(props: Props) {
  const { index: outIndex, editable, section, updateSection, cood, grcRecords, items, plotMVAnalysisRecords } = props;

  const { updateToc, tocDone } = useContext(TableOfContentsContext);

  function updateSubSection(index: number, updatedSubSection: SubSection) {
    const updatedSubSections = [...section.subSections];
    updatedSubSections[index] = updatedSubSection;
    updateSection({ ...section, subSections: updatedSubSections });
  }
  function removeSubSection(index: number) {
    updateSection({ ...section, subSections: section.subSections.filter((_, i) => i !== index) });
  }

  return (
    <View style={tw("rounded-lg flex flex-col items-stretch gap-4 relative pb-8")}>
      <PdfSectionHeading index={outIndex + 1} tocDone={tocDone} updateToc={updateToc}>{section.name}</PdfSectionHeading>
      {section.subSections.map((subSection, index) => (
        <PdfSubSectionPanel
          key={index}
          mapBase64={props.mapBase64}
          index={Number(String(outIndex + 1) + String(index))}
          editable={editable}
          titleMode={subSection.hasTitle}
          title={subSection.title}
          content={subSection.content}
          toggleTitleMode={() => updateSubSection(index, { ...subSection, hasTitle: !subSection.hasTitle })}
          updateTitle={(newValue) => updateSubSection(index, { ...subSection, title: newValue })}
          updateContent={(newValue) => updateSubSection(index, { ...subSection, content: newValue })}
          removeSubSection={() => removeSubSection(index)}
          plotMVAnalysisRecords={plotMVAnalysisRecords}
          cood={cood}
          grcRecords={grcRecords}
          items={items}
          qrCodeBase64={props.mapBase64} // Pass the QR Code base64
        />
      ))}
    </View>
  )
}