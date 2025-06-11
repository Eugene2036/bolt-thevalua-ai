
import { json, LoaderArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import React, { useEffect, useState } from 'react';
import { prisma } from '~/db.server';


type SummaryTableProps = {
    templateId: string;
    headerSection: string;
};

export async function loader({ request, params }: LoaderArgs) {

    const templateId = 'cm5sax7bc0002rqqsk6llmaik';
    const headerSection = 'Summary of Valuation';
    const tableData = await prisma.reportTemplate.findFirst({
        where: {
            id: templateId,
        },
        select: {
            name: true,
            reportHeader: {
                select: {
                    headerTitle: true,
                    reportSubHeader: {
                        select: {
                            subHeaderTitle: true,
                            reportBodyContent: {
                                select: {
                                    bodyContentInfo: true,
                                }
                            }
                        }
                    }
                },
                where: {
                    headerTitle: headerSection,
                }
            },
        }
    });

    console.log('Data fetched:', tableData);

    return json({ tableData });

}

export default function SummaryOfValuationTable() {
    const { tableData } = useLoaderData<typeof loader>();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (tableData) {
            try {
                const mappedData = tableData.reportHeader.map((header: any) => ({
                    headerTitle: header.headerTitle,
                    subHeaders: header.reportSubHeader.map((subHeader: any) => ({
                        subHeaderTitle: subHeader.subHeaderTitle,
                        bodyContentInfo: subHeader.reportBodyContent?.bodyContentInfo || 'No Content',
                    })),
                }));
                setData(mappedData);
            } catch (err) {
                setError('Error processing data');
            }
        } else {
            setError('No data found');
        }
        setLoading(false);
    }, [tableData]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!data || data.length === 0) {
        console.log('No data found');
        return <div>No data found</div>;
    }

    return (
        <div>
            {data.map((template, index) => (
                <div key={index}>
                    <h3>Template {index + 1}</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Sub Header Title</th>
                                <th>Body Content Info</th>
                            </tr>
                        </thead>
                        <tbody>
                            {template.subHeaders.map((subHeader: any) => (
                                <tr key={subHeader.subHeaderTitle}>
                                    <td>{subHeader.subHeaderTitle}</td>
                                    <td>{subHeader.bodyContentInfo}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};