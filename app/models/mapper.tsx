/* utils/blocknote-to-pdf.ts ------------------------------------------------ */
import type { PartialBlock } from '@blocknote/core'; // Default schema
import {
  Image,
  Link,
  StyleSheet,
  Text,
  View
} from '@react-pdf/renderer';
import React from 'react';
import { createTw } from 'react-pdf-tailwind';
import { SafeText } from '~/components/SafeText';

/* ---------- styles ------------------------------------------------------- */

const tw = createTw({
  theme: {},
});

const styles = StyleSheet.create({
  paragraph: { fontSize: 11, marginBottom: 4 },
  quote: { fontSize: 11, marginBottom: 4, fontStyle: 'italic', borderLeftWidth: 2, borderLeftColor: '#999', paddingLeft: 6 },
  code: { fontSize: 10, fontFamily: 'Courier', backgroundColor: '#f5f5f5', padding: 4, borderRadius: 4, marginBottom: 4 },
  listItem: { flexDirection: 'row', marginBottom: 2 },
  image: { width: 200, marginVertical: 8 },
});

const headingStyles: Record<number, any> = {
  1: { fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  2: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  3: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
};

/* ---------- public API --------------------------------------------------- */

/**
 * Convert an array of BlockNote `PartialBlock` objects to react-pdf components.
 *
 * @param blocks BlockNote blocks (default schema)
 * @returns React nodes ready to be placed inside a <Page>
 */
export function blocksToPdfComponents(blocks: PartialBlock[]): React.ReactNode[] {
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const node = renderBlock(blocks[i], `bn-${i}`);
    if (node !== null) elements.push(node);
  }

  return elements;
}

/* ---------- internals ---------------------------------------------------- */

function renderBlock(block: PartialBlock, key: React.Key): React.ReactNode {
  // handle unknown / empty blocks early
  if (!block || typeof block !== 'object') {
    return null;
  }

  switch (block.type) {
    /* === textish blocks === */
    case 'paragraph':
      return (
        <View style={tw('flex flex-row flex-wrap items-center')}>
          <SafeText key={key} style={styles.paragraph}>
            {inline(block.content)}
          </SafeText>
        </View>
      );

    case 'heading': {
      /** BlockNote stores the heading level in props.level (1-3) */
      const level = Number(block.props?.level ?? 1);
      const style = headingStyles[level] ?? headingStyles[3];
      return (
        <SafeText key={key} style={style}>
          {inline(block.content)}
        </SafeText>
      );
    }

    /* === list items === */
    case 'bulletListItem':
      return (
        <View key={key} style={styles.listItem}>
          <SafeText>• </SafeText>
          <SafeText>{inline(block.content)}</SafeText>
          {renderChildren(block.children)}
        </View>
      );

    case 'numberedListItem': {
      // BlockNote keeps the number in props.order, fall back to 1
      // const n = Number(block.props?.order ?? 1);
      // const n = Number(1);
      return (
        <View key={key} style={styles.listItem}>
          <Text>&middot; </Text>
          <SafeText>{inline(block.content)}</SafeText>
          {renderChildren(block.children)}
        </View>
      );
    }

    case 'checkListItem': {
      const checked = Boolean(block.props?.checked);
      return (
        <View key={key} style={styles.listItem}>
          <SafeText>{checked ? '☑ ' : '☐ '}</SafeText>
          <SafeText>{inline(block.content)}</SafeText>
          {renderChildren(block.children)}
        </View>
      );
    }

    /* === media === */
    case 'image':
      if (typeof block.props?.url !== 'string') return null;
      return <Image key={key} src={block.props.url} style={styles.image} />;

    case 'file':
      if (typeof block.props?.url !== 'string') return null;
      return (
        <Link key={key} src={block.props.url}>
          {/* {block.props.fileName ?? 'Download file'} */}
          {'Download file'}
        </Link>
      );

    /* === containers (e.g. table) === */
    case 'table':
      return renderTableBlock(block, key);
    // very simple table: each row becomes a flex row, each cell is a <SafeText>
    // return (
    //   <View key={key} style={tw('bg-red-600')}>
    //     <Text style={tw('text-2xl')}>Table here</Text>
    //     {renderChildren(block.children)}
    //   </View>
    // );

    default:
      // unknown block types are ignored silently
      return null;
  }
}

function renderChildren(children: PartialBlock[] | undefined): React.ReactNode {
  if (!children?.length) return null;

  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < children.length; i += 1) {
    const child = renderBlock(children[i], `child-${i}`);
    if (child !== null) nodes.push(child);
  }

  return nodes;
}

/* ---------- inline helpers ---------------------------------------------- */

/**
 * Convert BlockNote inline content to a react-pdf Text child array.
 * Only bold, italic, underline, strike and links are handled here,
 * extend if you need more.
 */
function inline(content: any): React.ReactNode {
  /* Plain string */
  if (typeof content === 'string') {
    return content;
  }

  /* Array of rich-text spans */
  if (Array.isArray(content)) {
    return content.map((span: any, idx) => {
      if (span.type === 'link') {
        return (
          <Link key={idx} src={span.href}>
            {inline(span.content)}
          </Link>
        );
      }

      // styled text
      const style: any = {};
      if (span.styles?.bold) style.fontWeight = 'bold';
      if (span.styles?.italic) style.fontStyle = 'italic';
      if (span.styles?.underline) style.textDecoration = 'underline';
      if (span.styles?.strike) style.textDecoration = 'line-through';
      if (span.styles?.textColor) style.color = span.styles.textColor as string;

      return (
        <SafeText key={idx} style={style}>
          {span.text ?? ''}
        </SafeText>
      );
    });
  }

  /* Fallback */
  return '';
}

// type WrapTextProps = TextProps & { children: string | React.ReactNode; };
// function WrapText(props: WrapTextProps) {
//   const { children, style, ...rest } = props;
//   if (typeof children === 'string') {
//     return <SafeText style={style} {...rest}>{children}</SafeText>
//   }
//   return children;
// }

function renderTableBlock(block: PartialBlock, key: React.Key): React.ReactNode {
  const content = (block as any).content;           // BlockNote’s tableContent
  // const content = block.content as any;           // BlockNote’s tableContent
  if (!content || content.type !== 'tableContent') {
    return null;
  }

  const colWidths = Array.isArray(content.columnWidths) ? content.columnWidths : [];

  const styles = StyleSheet.create({
    /* …existing styles… */
    table: { borderWidth: 0.5, borderColor: '#888', marginBottom: 6 },
    row: { flexDirection: 'row' },
    cell: { borderRightWidth: 0.5, borderBottomWidth: 0.5, padding: 4 },
    headerCell: { fontWeight: 'bold', backgroundColor: '#f0f0f0' },
  });

  return (
    <View key={key} style={styles.table}>
      {content.rows.map((row: any, rIdx: number) => (
        <View key={`row-${rIdx}`} style={styles.row}>
          {row.cells.map((cell: any, cIdx: number) => {
            const width = colWidths[cIdx];
            const isHeader = rIdx === 0;            // crude header check
            return (
              <View
                key={`cell-${cIdx}`}
                style={[
                  styles.cell,
                  isHeader ? styles.headerCell : undefined,
                  width ? { width } : { flex: 1 },
                ].filter(Boolean)}
              >
                <Text>{inline(cell.content)}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// const zxc = [
//   {
//     "id": "4ad08548-50fe-43d4-a57b-33cb72632a07",
//     "type": "table",
//     "props": {
//       "textColor": "default"
//     },
//     "content": {
//       "type": "tableContent",
//       "columnWidths": [
//         368,
//         396
//       ],
//       "rows": [
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Valuer",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Real Assets Pty Ltd",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Valuation Date",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "2025-03-12",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Plot Description",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Developed Land",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Plot Extent m² ",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "350",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Physical Address",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Plot 33334, Block 7, Gaborone",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Zoning",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Residential",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Property Classification",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Residential",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Usage",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Residential",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "GLA m² ",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "0",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "GBA m²",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "23.22",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Gross Annual Income ",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "0.00",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Net Annual Income ",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "0.00",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Annual Expenditure ",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "0.00",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Operating Costs / Month (P/m²) ",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "0.00",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Annual Expenditure as a % ",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "0.00",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Capitalisation Rate ",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "0.00%",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Vacancy Rate ",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "0.00%",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Market Value",
//                   "styles": {
//                     "bold": true
//                   }
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "2,166,232.50",
//                   "styles": {
//                     "bold": true
//                   }
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Rate/m² based on MV (GLA) ",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "0.00",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Rate/m² based on MV (Plot Size) ",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "0.00",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Total Replacement Value ",
//                   "styles": {
//                     "bold": true
//                   }
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "89,512.10",
//                   "styles": {
//                     "bold": true
//                   }
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         },
//         {
//           "cells": [
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "Rate/m² based on Replacement Cost (GBA) ",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             },
//             {
//               "type": "tableCell",
//               "content": [
//                 {
//                   "type": "text",
//                   "text": "0.00",
//                   "styles": {}
//                 }
//               ],
//               "props": {
//                 "colspan": 1,
//                 "rowspan": 1,
//                 "backgroundColor": "default",
//                 "textColor": "default",
//                 "textAlignment": "left"
//               }
//             }
//           ]
//         }
//       ]
//     },
//     "children": []
//   },
//   {
//     "id": "b98008f9-4174-42ed-ae95-fbd6735c8116",
//     "type": "paragraph",
//     "props": {
//       "textColor": "default",
//       "backgroundColor": "default",
//       "textAlignment": "left"
//     },
//     "content": [
//       {
//         "type": "text",
//         "text": "Two Million One Hundred Sixty Six Thousand Two Hundred Thirty Two and Five",
//         "styles": {
//           "bold": true
//         }
//       }
//     ],
//     "children": []
//   },
//   {
//     "id": "17404532-e3aa-4ab8-90ad-019d3b386608",
//     "type": "paragraph",
//     "props": {
//       "textColor": "default",
//       "backgroundColor": "default",
//       "textAlignment": "left"
//     },
//     "content": [
//       {
//         "type": "text",
//         "text": "2,166,232.50",
//         "styles": {
//           "bold": true
//         }
//       }
//     ],
//     "children": []
//   },
//   {
//     "id": "1e498bc2-f5fc-49a0-8de8-375f86ae47c1",
//     "type": "paragraph",
//     "props": {
//       "textColor": "default",
//       "backgroundColor": "default",
//       "textAlignment": "left"
//     },
//     "content": [],
//     "children": []
//   }
// ]