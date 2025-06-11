import React, { useState, useEffect } from 'react';
import { prisma } from '~/db.server';
import Box from '@mui/material/Box';
import {
    DataGrid,
    GridRowsProp,
    GridColDef,
    GridToolbarContainer,
    GridActionsCellItem,
} from '@mui/x-data-grid';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';

const ReportTemplateDataGrid: React.FC = () => {
    const [rows, setRows] = useState<GridRowsProp>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const data = await prisma.reportTemplate.findMany({
                include: {
                    reportHeader: {
                        include: {
                            reportSubHeader: {
                                include: {
                                    reportBodyContent: true,
                                },
                            },
                        },
                    },
                },
            });
            setRows(data);
            setLoading(false);
        };

        fetchData();
    }, []);

    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID', width: 150 },
        { field: 'name', headerName: 'Name', width: 200 },
        {
            field: 'actions',
            type: 'actions',
            width: 100,
            getActions: (params) => [
                <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => handleEdit(params.id)} />,
                <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={() => handleDelete(params.id)} />,
            ],
        },
    ];

    const handleEdit = (id: string) => {
        // Implement edit functionality
    };

    const handleDelete = async (id: string) => {
        await prisma.reportTemplate.delete({ where: { id } });
        setRows((prev) => prev.filter((row) => row.id !== id));
    };

    return (
        <Box>
            <DataGrid
                rows={rows}
                columns={columns}
                loading={loading}
                components={{
                    Toolbar: () => (
                        <GridToolbarContainer>
                            <Button startIcon={<AddIcon />} onClick={() => {/* Implement add functionality */ }}>
                                Add
                            </Button>
                        </GridToolbarContainer>
                    ),
                }}
            />
        </Box>
    );
};

export default ReportTemplateDataGrid;