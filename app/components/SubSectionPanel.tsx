import { Block, PartialBlock } from "@blocknote/core";
import { ComponentProps, lazy, Suspense, useMemo } from "react";
import { twMerge } from "tailwind-merge";
import { CustomMap } from "./CustomMap";
import { DeleteSectionButton } from "./DeleteSectionButton";
import { EditorPlaceholder } from "./EditorPlaceholder";
import { TextField } from "./TextField";
import { PlinthAreas } from "./PlinthAreas";
import { ConstructionItem } from "~/models/con-items";
import { ViewConstruction } from "./ViewConstruction";
import { ViewPlotMVAnalysisCard } from "./ViewPlotMVAnalysisCard";

const Editor = lazy(async () => {
    const module = await import('../components/editor.client');
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
    plotData?: ComponentProps<typeof ViewPlotMVAnalysisCard>['data'];
}
export function SubSectionPanel(props: Props) {
    const { items, cood, editable, title, titleMode, content, toggleTitleMode, updateTitle, updateContent, removeSubSection, grcRecords, plotData } = props;

    const elementType = useMemo(() => {
        if (JSON.stringify(content).includes('{map}')) {
            return 'map' as const;
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
                <ContentSection />
            </div>
            {editable && (
                <DeleteSectionButton removeFn={removeSubSection} />
            )}
        </div>
    )

    function ContentSection() {
        if (editable) {
            return (
                <Suspense fallback={<EditorPlaceholder />}>
                    <MemoizedEditor
                        initialContent={content}
                        setBlocks={updateContent}
                        htmlMode={false}
                    />
                </Suspense>
            )
        }
        if (elementType === 'map') {
            return <CustomMap {...cood} />
        }
        if (elementType === 'plinthAreas') {
            return <PlinthAreas records={grcRecords || []} />
        }
        if (elementType === 'constructionTable') {
            return <ViewConstruction items={items || []} />
        }
        if (elementType === 'marketValueTable') {
            return plotData ? <ViewPlotMVAnalysisCard data={plotData} /> : null;
        }
        return (
            <Suspense fallback={<EditorPlaceholder />}>
                <MemoizedEditor
                    initialContent={content}
                    setBlocks={updateContent}
                    htmlMode={true}
                />
            </Suspense>
        )
    }
}

interface TitleProps {
    editable: boolean;
    children: string | undefined;
    updateTitle: (newValue: string) => void;
}
function Title(props: TitleProps) {
    const { editable, children, updateTitle } = props;
    if (editable) {
        return (
            <TextField
                value={children}
                onChange={(e) => updateTitle(e.target.value)}
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