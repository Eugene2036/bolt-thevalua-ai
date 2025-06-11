import { Section, SubSection } from "~/models/reports";
import { AddSectionButton } from "./AddSectionButton";
import { DeleteSectionButton } from "./DeleteSectionButton";
import { SubSectionPanel } from "./SubSectionPanel";
import { TextField } from "./TextField";
import { twMerge } from "tailwind-merge";
import { SectionHeading } from "./SectionHeading";
import { ComponentProps } from "react";
import { PlinthAreas } from "./PlinthAreas";
import { ConstructionItem } from "~/models/con-items";
import { ViewPlotMVAnalysisCard } from "./ViewPlotMVAnalysisCard";

interface Props {
    editable: boolean;
    section: Section;
    updateSection: (updated: Section) => void;
    removeSection: () => void;

    cood?: { lat: number; long: number, label: string };
    grcRecords?: ComponentProps<typeof PlinthAreas>['records'];
    items?: ConstructionItem[];
    plotMVAnalysisRecords?: ComponentProps<typeof ViewPlotMVAnalysisCard>['data'];
}
export function SectionPanel(props: Props) {
    const { editable, section, updateSection, removeSection, cood, grcRecords, items, plotMVAnalysisRecords } = props;

    function addSubSection() {
        updateSection({ ...section, subSections: [...section.subSections, { title: "", content: [], hasTitle: true }] });
    }
    function updateSubSection(index: number, updatedSubSection: SubSection) {
        const updatedSubSections = [...section.subSections];
        updatedSubSections[index] = updatedSubSection;
        updateSection({ ...section, subSections: updatedSubSections });
    }
    function removeSubSection(index: number) {
        updateSection({ ...section, subSections: section.subSections.filter((_, i) => i !== index) });
    }

    return (
        <div className={twMerge("rounded-lg flex flex-col items-stretch gap-4 relative", editable && "p-4 border")}>
            {editable && (
                <TextField
                    value={section.name}
                    style={{ fontSize: '28px' }}
                    onChange={(e) => updateSection({ ...section, name: e.target.value })}
                    placeholder="Section Name"
                />
            )}
            {!editable && (
                <SectionHeading>{section.name}</SectionHeading>
            )}
            <div className="flex flex-col items-stretch gap-8 mt-2 border-b border-stone-800 pb-8">
                {section.subSections.map((subSection, index) => (
                    <SubSectionPanel
                        key={index}
                        editable={editable}
                        titleMode={subSection.hasTitle}
                        title={subSection.title}
                        content={subSection.content}
                        toggleTitleMode={() => updateSubSection(index, { ...subSection, hasTitle: !subSection.hasTitle })}
                        updateTitle={(newValue) => updateSubSection(index, { ...subSection, title: newValue })}
                        updateContent={(newValue) => updateSubSection(index, { ...subSection, content: newValue })}
                        removeSubSection={() => removeSubSection(index)}

                        cood={cood}
                        grcRecords={grcRecords}
                        items={items}
                        plotData={plotMVAnalysisRecords}
                    />
                ))}
                {editable && (
                    <div className="flex flex-col items-start">
                        <AddSectionButton fn={addSubSection} />
                    </div>
                )}
            </div>
            {editable && (
                <DeleteSectionButton removeFn={removeSection} />
            )}
        </div>
    )
}