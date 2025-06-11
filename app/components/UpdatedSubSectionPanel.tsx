import { Block, PartialBlock } from "@blocknote/core";
import { ChangeEvent, ComponentProps, lazy, Suspense, useState } from "react";
import { twMerge } from "tailwind-merge";
import { ConstructionItem } from "~/models/con-items";
import { DeleteSectionButton } from "./DeleteSectionButton";
import { EditorPlaceholder } from "./EditorPlaceholder";
import { PlinthAreas } from "./PlinthAreas";
import { TextField } from "./TextField";

const Editor = lazy(async () => {
  const module = await import('./editor.client');
  if (module.default) {
    return { default: module.default };
  }
  return {
    default: function () {
      return <EditorPlaceholder />
    }
  }
});
const MemoizedEditor = Editor;

interface Props {
  editable: boolean;
  titleMode: boolean;
  title: string | undefined;
  content: PartialBlock[];
  toggleTitleMode: () => void;
  updateTitle: (newValue: string) => void;
  updateContent: (newValue: Block[]) => void;
  removeSubSection: () => void;

  cood?: { lat: number; long: number, label: string };
  grcRecords?: ComponentProps<typeof PlinthAreas>['records'];
  items?: ConstructionItem[];
}
export function UpdatedSubSectionPanel(props: Props) {
  const { editable, title, titleMode, content, toggleTitleMode, updateTitle, updateContent, removeSubSection } = props;

  return (
    <div className={twMerge(
      "flex flex-col items-stretch relative rounded-md pt-1",
      !!titleMode && 'flex flex-row items-start',
      editable && 'border border-green-600 shadow-xl '
    )}>
      {editable && (
        <ToggleTitleMode
          titleMode={titleMode}
          toggleTitleMode={toggleTitleMode}
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
        />
      )}
      {titleMode && (
        <div className={twMerge(
          "flex flex-col justify-start items-stretch px-4 w-[30%] py-4 shrink-0",
          !editable && "p-2 w-[20%]"
        )}>
          <Title updateTitle={updateTitle} editable={editable}>
            {title}
          </Title>
        </div>
      )}
      <div className={twMerge("print:block flex flex-col items-stretch grow pr-4", !editable && titleMode && 'border-l-red-600 border-l-2 px-2 py-1')}>
        <Suspense fallback={<EditorPlaceholder />}>
          <MemoizedEditor
            initialContent={content}
            setBlocks={updateContent}
            htmlMode={!editable}
          />
        </Suspense>
      </div>
      {editable && (
        <DeleteSectionButton removeFn={removeSubSection} />
      )}
    </div>
  )
}

interface TitleProps {
  editable: boolean;
  children: string | undefined;
  updateTitle: (newValue: string) => void;
}
function Title(props: TitleProps) {
  const { editable, children, updateTitle } = props;

  const [title, setTitle] = useState(children);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    updateTitle(e.target.value);
    setTitle(e.target.value);
  }

  if (editable) {
    return (
      <TextField
        value={title}
        onChange={handleChange}
        placeholder="Sub-Section Title"
      />
    )
  }
  return (
    <div className="flex flex-col items-start">
      <span id={`SubSection_${children}`} className="font-semibold">{children}</span>
    </div>
  )
}

interface ToggleTitleModeProps extends Omit<ComponentProps<'div'>, 'children'> {
  toggleTitleMode: () => void;
  titleMode: boolean;
}
function ToggleTitleMode(props: ToggleTitleModeProps) {
  const { titleMode, className, toggleTitleMode, ...rest } = props;
  return (
    <div className={twMerge("grid grid-cols-2 border-green-600 rounded-full border shadow-xl", className)} {...rest}>
      <button
        type="button"
        onClick={toggleTitleMode}
        className={twMerge(
          "rounded-l-full px-4 py-1 bg-white transition-all duration-75", titleMode && 'bg-green-600',
        )}
      >
        <span className={twMerge("text-stone-400 font-light", titleMode && 'text-white font-semibold')}>With Title</span>
      </button>
      <button
        type="button"
        onClick={toggleTitleMode}
        className={twMerge(
          "rounded-r-full px-4 py-1 bg-green-600 transition-all duration-75", titleMode && 'bg-white',
        )}
      >
        <span className={twMerge("text-white font-semibold", titleMode && 'text-stone-400 font-light')}>No Title</span>
      </button>
    </div>
  )
}