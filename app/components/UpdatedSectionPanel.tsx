import { ChangeEvent, ComponentProps, useContext, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { ConstructionItem } from "~/models/con-items";
import { Section } from "~/models/reports";
import { AddSectionButton } from "./AddSectionButton";
import { DeleteSectionButton } from "./DeleteSectionButton";
import { PlinthAreas } from "./PlinthAreas";
import { ReportContext } from "./ReportContextProvider";
import { SectionHeading } from "./SectionHeading";
import { TextField } from "./TextField";
import { UpdatedSubSectionPanel } from "./UpdatedSubSectionPanel";

interface Props {
  index: number;

  editable: boolean;
  section: Section;

  cood?: { lat: number; long: number, label: string };
  grcRecords?: ComponentProps<typeof PlinthAreas>['records'];
  items?: ConstructionItem[];
}
export function UpdatedSectionPanel(props: Props) {
  const { index, editable, section: initialSection, cood, grcRecords, items } = props;

  const {
    updateSectionName,
    toggleSubSectionTitle,
    updateSubSectionTitle,
    updateSubSectionContent,
    removeSubSection,
    addSubSection,
    removeSection
  } = useContext(ReportContext);
  const [name, setName] = useState(initialSection.name);

  useEffect(() => {
    setName(initialSection.name);
  }, [initialSection.name]);

  function handleNameChange(e: ChangeEvent<HTMLInputElement>) {
    updateSectionName(index, e.target.value);
    setName(e.target.value);
  }

  return (
    <div className={twMerge("rounded-lg flex flex-col items-stretch gap-4 relative", editable && "p-4 border")}>
      {editable && (
        <TextField
          value={name}
          onChange={handleNameChange}
          placeholder="Section Name"
          style={{ fontSize: '28px' }}
        />
      )}
      {!editable && (
        <SectionHeading>{name}</SectionHeading>
      )}
      <div className="flex flex-col items-stretch gap-8 mt-2 border-b border-stone-800 pb-8">
        {initialSection.subSections.map((subSection, subIndex) => (
          <UpdatedSubSectionPanel
            key={subIndex}
            editable={editable}
            titleMode={subSection.hasTitle}
            title={subSection.title}
            content={subSection.content}
            toggleTitleMode={() => toggleSubSectionTitle(index, subIndex)}
            updateTitle={(newValue) => updateSubSectionTitle(index, subIndex, newValue)}
            updateContent={(newValue) => updateSubSectionContent(index, subIndex, newValue)}
            removeSubSection={() => removeSubSection(index, subIndex)}

            cood={cood}
            grcRecords={grcRecords}
            items={items}
          />
        ))}
        {editable && (
          <div className="flex flex-col items-start">
            <AddSectionButton fn={() => addSubSection(index)} />
          </div>
        )}
      </div>
      {editable && (
        <DeleteSectionButton removeFn={() => removeSection(index)} />
      )}
    </div>
  )
}