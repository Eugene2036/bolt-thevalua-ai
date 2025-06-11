import { Block, BlockNoteEditor, filterSuggestionItems, PartialBlock } from "@blocknote/core";

import { BlockNoteView } from '@blocknote/mantine';
import { DefaultReactSuggestionItem, getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import { IconBraces } from "@tabler/icons-react";
import { useEffect, useState } from 'react';
import { DYNAMIC_REPORT_VALUES } from "~/models/reports";

const getCustomSlashMenuItems = (
    editor: BlockNoteEditor
): DefaultReactSuggestionItem[] => [
        ...getDefaultReactSlashMenuItems(editor),
        ...DYNAMIC_REPORT_VALUES.map(tuple => insertDynamicVvalue(editor, tuple)),
    ];

interface Props {
    htmlMode: boolean;
    initialContent: PartialBlock[];
    setBlocks: (newBlocks: Block[]) => void;
}
export default function EditorClient(props: Props) {
    const { htmlMode, initialContent, setBlocks } = props;

    const [html, setHTML] = useState('');

    const editor = useCreateBlockNote({
        initialContent: initialContent.length ?
            initialContent :
            [
                { type: 'heading', content: 'Heading' },
                { type: 'paragraph', content: 'Start typing...' },
            ],
    });

    useEffect(() => {
        async function run() {
            const html = await editor.blocksToHTMLLossy(editor.document);
            setHTML(html);
        }
        run();
    }, [editor]);

    if (htmlMode) {
        return <div id="htmlContent" className="print:block content-block flex flex-col items-stretch p-0 font-light" dangerouslySetInnerHTML={{ __html: html }} />;
    }

    return (
        <div className="print:block flex flex-col items-stretch border-none rounded-lg py-4">
            <BlockNoteView
                theme="light"
                editor={editor}
                slashMenu={false}
                onChange={() => setBlocks(editor.document)}
                data-theming-css-variables-demo
            >
                <SuggestionMenuController
                    triggerCharacter={"/"}
                    getItems={async (query) => filterSuggestionItems(getCustomSlashMenuItems(editor), query)}
                />
            </BlockNoteView>
        </div>
    );
}

function insertDynamicVvalue(editor: BlockNoteEditor, [label, identifier]: readonly [string, string]) {
    return {
        title: `${label} - {${identifier}}`,
        onItemClick: () => {
            editor.insertInlineContent(`{${identifier}}`);
        },
        aliases: [identifier, "dynamic"],
        group: "Dynamic Values",
        icon: <IconBraces size={18} />,
        subtext: "Used to insert a dynamic value into the report.",
    }
}