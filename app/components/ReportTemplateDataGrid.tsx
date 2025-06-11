"use client";

import React, { useMemo, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AgGridReact } from "ag-grid-react";
import {
    ClientSideRowModelModule,
    ColDef,
    GridOptions,
    ModuleRegistry,
} from "ag-grid-community";
import {
    ColumnMenuModule,
    ColumnsToolPanelModule,
    ContextMenuModule,
    MasterDetailModule,
} from "ag-grid-enterprise";

// Register AG Grid Enterprise modules
ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    ColumnsToolPanelModule,
    MasterDetailModule,
    ColumnMenuModule,
    ContextMenuModule,
]);

export function ReportTemplateDataGrid() {
    const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
    const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
    const [rowData, setRowData] = useState<ReportTemplate[]>([]);

    useEffect(() => {
        fetchReportTemplates().then((data) => setRowData(data));
    }, []);

    // Fetch Report Templates (Level 1)
    const fetchReportTemplates = async (): Promise<ReportTemplate[]> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        id: "1",
                        name: "Template 1",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        reportHeader: [],
                    },
                    {
                        id: "2",
                        name: "Template 2",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        reportHeader: [],
                    },
                ]);
            }, 500);
        });
    };

    // Fetch Report Headers (Level 2)
    const fetchReportHeaders = async (templateId: string): Promise<ReportHeader[]> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const headers = [
                    {
                        id: "21",
                        headerTitle: "Header 1",
                        reportTemplateId: templateId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        reportSubHeader: [],
                    },
                    {
                        id: "22",
                        headerTitle: "Header 2",
                        reportTemplateId: templateId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        reportSubHeader: [],
                    },
                ];
                resolve(headers);
            }, 500);
        });
    };

    // Fetch Report SubHeaders (Level 3)
    const fetchReportSubHeaders = async (headerId: string): Promise<ReportSubHeader[]> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const subHeaders = [
                    {
                        id: "31",
                        subHeaderTitle: "SubHeader 1",
                        reportHeaderId: headerId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        reportBodyContent: [],
                    },
                    {
                        id: "32",
                        subHeaderTitle: "SubHeader 2",
                        reportHeaderId: headerId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        reportBodyContent: [],
                    },
                ];
                resolve(subHeaders);
            }, 500);
        });
    };

    // Fetch Report Body Content (Level 4)
    const fetchReportBodyContent = async (subHeaderId: string): Promise<ReportBodyContent[]> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const bodyContent = [
                    {
                        id: "41",
                        bodyContentInfo: "Body Content 1",
                        subHeaderId: subHeaderId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                    {
                        id: "42",
                        bodyContentInfo: "Body Content 2",
                        subHeaderId: subHeaderId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ];
                resolve(bodyContent);
            }, 500);
        });
    };

    const columnDefs = useMemo<ColDef[]>(() => [
        { headerName: "Template Name", field: "name", cellRenderer: "agGroupCellRenderer" },
    ], []);

    const defaultColDef = useMemo(() => ({
        flex: 1,
    }), []);

    // Handle row expansion to fetch Child and Grandchild data
    const onRowGroupOpened = async (event: any) => {
        if (event.node.expanded) {
            let newData = [...rowData];

            if (event.data.LEVEL === 1) {
                // Fetch Level 2 children
                const childData = await fetchReportHeaders(event.data.id);
                newData = newData.map((parent) => {
                    if (parent.id === event.data.id) {
                        return {
                            ...parent,
                            reportHeader: parent.reportHeader ? [...parent.reportHeader, ...childData] : childData
                        };
                    }
                    return parent;
                });
            }

            if (event.data.LEVEL === 2) {
                // Fetch Level 3 grandchildren
                const grandChildData = await fetchReportSubHeaders(event.data.id);
                newData = newData.map((parent) => {
                    if (parent.reportHeader) {
                        parent.reportHeader = parent.reportHeader.map((child) => {
                            if (child.id === event.data.id) {
                                return {
                                    ...child,
                                    reportSubHeader: child.reportSubHeader ? [...child.reportSubHeader, ...grandChildData] : grandChildData
                                };
                            }
                            return child;
                        });
                    }
                    return parent;
                });
            }

            if (event.data.LEVEL === 3) {
                // Fetch Level 4 great-grandchildren
                const greatGrandChildData = await fetchReportBodyContent(event.data.id);
                newData = newData.map((parent) => {
                    if (parent.reportHeader) {
                        parent.reportHeader = parent.reportHeader.map((child) => {
                            if (child.reportSubHeader) {
                                child.reportSubHeader = child.reportSubHeader.map((grandChild) => {
                                    if (grandChild.id === event.data.id) {
                                        return {
                                            ...grandChild,
                                            reportBodyContent: grandChild.reportBodyContent ? [...grandChild.reportBodyContent, ...greatGrandChildData] : greatGrandChildData
                                        };
                                    }
                                    return grandChild;
                                });
                            }
                            return child;
                        });
                    }
                    return parent;
                });
            }

            setRowData(newData);
        }
    };

    const detailCellRendererParams = useMemo(() => ({
        detailGridOptions: {
            rowSelection: "multiple",
            columnDefs: [
                { headerCheckboxSelection: true, checkboxSelection: true, width: 40 },
                { headerName: "Header Title", field: "headerTitle", cellRenderer: "agGroupCellRenderer" },
            ],
            defaultColDef: { flex: 1 },
            masterDetail: true,
            detailCellRendererParams: {
                detailGridOptions: {
                    columnDefs: [
                        { headerName: "SubHeader Title", field: "subHeaderTitle", cellRenderer: "agGroupCellRenderer" },
                    ],
                    defaultColDef: { flex: 1 },
                    masterDetail: true,
                    detailCellRendererParams: {
                        detailGridOptions: {
                            columnDefs: [
                                { headerName: "Body Content Info", field: "bodyContentInfo" },
                            ],
                            defaultColDef: { flex: 1 },
                        },
                        getDetailRowData: (params: any) => {
                            params.successCallback(params.data.reportBodyContent || []);
                        },
                    },
                },
                getDetailRowData: (params: any) => {
                    params.successCallback(params.data.reportSubHeader || []);
                },
            },
        },
        getDetailRowData: (params: any) => {
            params.successCallback(params.data.reportHeader || []);
        },
    }), []);

    return (
        <div style={containerStyle}>
            <div style={gridStyle}>
                <AgGridReact
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    masterDetail={true}
                    detailCellRendererParams={detailCellRendererParams}
                    onRowGroupOpened={onRowGroupOpened}
                />
            </div>
        </div>
    );
};

// const root = createRoot(document.getElementById("root"));
// root.render(<ReportTemplateDataGrid />);

// TypeScript interfaces for the Prisma models
interface ReportTemplate {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    reportHeader: ReportHeader[];
}

interface ReportHeader {
    id: string;
    headerTitle: string;
    createdAt: Date;
    updatedAt: Date;
    reportTemplateId: string;
    reportSubHeader: ReportSubHeader[];
}

interface ReportSubHeader {
    id: string;
    subHeaderTitle: string;
    createdAt: Date;
    updatedAt: Date;
    reportHeaderId: string;
    reportBodyContent: ReportBodyContent[];
}

interface ReportBodyContent {
    id: string;
    bodyContentInfo: string;
    createdAt: Date;
    updatedAt: Date;
    subHeaderId: string;
}