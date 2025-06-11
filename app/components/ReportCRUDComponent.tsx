import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Close';
import {
    DataGrid,
    GridRowsProp,
    GridColDef,
    GridToolbarContainer,
    GridActionsCellItem,
    GridRowModesModel,
    GridRowId,
} from '@mui/x-data-grid';
import { prisma } from '~/db.server';

const ReportCRUDComponent = () => {
    const [rows, setRows] = useState<GridRowsProp>([]);
    const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

    useEffect(() => {
        // Fetch data from Prisma models (e.g., ReportTemplate)
        const fetchData = async () => {
            // Replace with actual data fetching logic
            const repTemplates = await prisma.reportTemplate.findMany({
                where: { companyId: 'cm5kr0ekt001rq70l4xgr92tc' },
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            const initialRows: GridRowsProp = repTemplates.map(template => ({
                id: template.id,
                name: template.name,
                createdAt: new Date(template.createdAt), // Convert to Date object
                updatedAt: new Date(template.updatedAt), // Convert to Date object
            }));
            setRows(initialRows);
        };
        fetchData();
    }, []);

    const handleAdd = () => {
        // Logic to add a new row
    };

    const handleEdit = (id: GridRowId) => () => {
        // Logic to edit a row
    };

    const handleDelete = (id: GridRowId) => () => {
        // Logic to delete a row
    };

    const handleSave = (id: GridRowId) => () => {
        // Logic to save changes
    };

    const handleCancel = (id: GridRowId) => () => {
        // Logic to cancel editing
    };

    const columns: GridColDef[] = [
        { field: 'id', headerName: 'ID', width: 150 },
        { field: 'name', headerName: 'Name', width: 200 },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 150,
            getActions: (params) => [
                <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={handleEdit(params.id)} />,
                <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={handleDelete(params.id)} />,
                <GridActionsCellItem icon={<SaveIcon />} label="Save" onClick={handleSave(params.id)} />,
                <GridActionsCellItem icon={<CancelIcon />} label="Cancel" onClick={handleCancel(params.id)} />,
            ],
        },
    ];

    return (
        <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
                rows={rows}
                columns={columns}
                editMode="row"
                rowModesModel={rowModesModel}
                onRowModesModelChange={(newModel) => setRowModesModel(newModel)}
                components={{
                    Toolbar: () => (
                        <GridToolbarContainer>
                            <Button color="primary" startIcon={<AddIcon />} onClick={handleAdd}>
                                Add Template
                            </Button>
                        </GridToolbarContainer>
                    ),
                }}
            />
        </Box>
    );
};

export default ReportCRUDComponent;