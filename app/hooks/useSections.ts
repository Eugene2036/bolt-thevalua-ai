import { PartialBlock } from "@blocknote/core";
import { useRef, useState } from "react";
import { Section } from "~/models/reports";

export function useSections(initial?: Section[]) {
  const sections = useRef<Section[]>(initial || []);
  const [state, causeReRender] = useState(0);

  console.log("state", state);

  function addSection() {
    sections.current.push({ name: "", subSections: [] });
    causeReRender(p => p + 1);
  }
  function updateSectionName (index: number, name: string) {
    sections.current[index].name = name;
  }
  function removeSection(index: number) {
    sections.current = sections.current.filter((_, i) => i !== index);
    causeReRender(p => p - 1);
  }

  function addSubSection(index: number) {
    sections.current[index].subSections.push({ title: "", content: [], hasTitle: true });
    causeReRender(p => p + 1);
  }
  function toggleSubSectionTitle(index: number, subIndex: number) {
    const current = sections.current[index].subSections[subIndex].hasTitle;
    sections.current[index].subSections[subIndex].hasTitle = !current;
    causeReRender(p => p + 1);
  }
  function updateSubSectionTitle (index: number, subIndex: number, title: string) {
    sections.current[index].subSections[subIndex].title = title;
  }
  function updateSubSectionContent (index: number, subIndex: number, content: PartialBlock[]) {
    sections.current[index].subSections[subIndex].content = content;
  }
  function removeSubSection(index: number, subIndex: number) {
    sections.current[index].subSections = sections.current[index].subSections.filter((_, i) => i !== subIndex);
    causeReRender(p => p - 1);
  }

  // function updateSection(index: number, updatedSection: Section) {
  //   for (let i = 0; i < sections.current.length; i++) {
  //     if (i === index) {
  //       sections.current[i] = updatedSection;
  //       break;
  //     }
  //   }
  // }

  

  return {
    sections,
    state,
    causeReRender,
    
    addSection,
    updateSectionName,
    removeSection,
    
    addSubSection,
    toggleSubSectionTitle,
    updateSubSectionTitle,
    updateSubSectionContent,
    removeSubSection,
  };
}