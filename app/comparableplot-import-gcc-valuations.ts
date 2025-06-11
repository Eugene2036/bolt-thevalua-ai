import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { Env } from '~/models/environment';

const prisma = new PrismaClient();

async function upsertInspectionsData() {
    try {
        // Load the Gabs_Inspections.json file
        const inspectionsFilePath = path.join(__dirname, '../public/esri/Gabs_Inspections.json');
        const inspectionsData = JSON.parse(fs.readFileSync(inspectionsFilePath, 'utf-8')) as {
            features: {
                attributes: {
                    globalid: string;
                    dateOfInspection: string;
                    PLOT_NO: string | null;
                    AREAa: string;
                    category: string | null;
                    propertyType: string;
                    neighbourhood: string;
                    MarketValue: string;
                    LandValue: string;
                    ImpValue: string;
                    plotperimeter: string;
                    Valuation_Date: string;
                    Title_Type: string;
                    Status: string;
                    dev: string;
                    no_parking: string;
                    NumberOfStructures: string;
                    Pool: string;
                    Paving: string;
                    boundary: string;
                };
                geometry?: {
                    x: number;
                    y: number;
                };
            }[];
        };

        // Load the Structures.json file
        const structuresFilePath = path.join(__dirname, '../public/esri/Structures.json');
        const structuresData = JSON.parse(fs.readFileSync(structuresFilePath, 'utf-8')) as {
            features: {
                attributes: {
                    parentglobalid: string;
                    AirconNo: string;
                    Bathrooms: string;
                    toiletsNo: string;
                    wfinish: string;
                    roof: string;
                    ceiling1: string;
                    Kitchen: string;
                    Wardrobe: string;
                };
            }[];
        };

        // Extract features from both JSON files and filter out invalid records
        const inspectionsFeatures = inspectionsData.features.filter(
            (feature) => feature.attributes.PLOT_NO !== null && feature.attributes.category !== null && feature.attributes.neighbourhood !== null
        );
        const structuresFeatures = structuresData.features;

        for (const feature of inspectionsFeatures) {
            const attributes = feature.attributes;

            // Find related structure details using the foreign key "parentglobalid"
            const relatedStructures = structuresFeatures.filter(
                (structure) => structure.attributes.parentglobalid === attributes.globalid
            );

            // Aggregate structure details (e.g., sum of numAirCons)
            const totalAirCons = relatedStructures.reduce((sum, structure) => {
                return sum + (parseInt(structure.attributes.AirconNo) || 0);
            }, 0);

            const totalBathrooms = relatedStructures.reduce((sum, structure) => {
                return sum + (parseInt(structure.attributes.Bathrooms) || 0);
            }, 0);

            const totalToilets = relatedStructures.reduce((sum, structure) => {
                return sum + (parseInt(structure.attributes.toiletsNo) || 0);
            }, 0);

            // Upsert the inspectionsData record
            await prisma.inspectionsData.upsert({
                where: { globalId: attributes.globalid },
                update: {
                    inspectionDate: new Date(attributes.dateOfInspection),
                    plotNumber: attributes.PLOT_NO || '',
                    plotExtent: parseFloat(attributes.AREAa) || 0,
                    classification: attributes.category || '',
                    propertyType: attributes.propertyType ? attributes.propertyType : 'Unknown',
                    location: 'Gaborone',
                    suburb: attributes.neighbourhood,
                    landValue: parseFloat(attributes.LandValue) || 0,
                    improvementsValue: parseFloat(attributes.ImpValue) || 0,
                    capitalValue: parseFloat(attributes.MarketValue) || 0,
                    perimeter: parseFloat(attributes.plotperimeter) || 0,
                    titleDeed: attributes.Title_Type || '',
                    status: attributes.Status || '',
                    plotDesc: attributes.dev || '',
                    numAirCons: totalAirCons,
                    numToilets: totalToilets,
                    numParkingBays: parseInt(attributes.no_parking) || 0,
                    numOfStructures: parseInt(attributes.NumberOfStructures) || 0,
                    numBathrooms: totalBathrooms, // Use aggregated value from Structures.json
                    swimmingPool: attributes.Pool === 'swimming' ? 'Yes' : 'No',
                    paving: attributes.Paving === 'paved' ? 'Yes' : 'None',
                    boundary: attributes.boundary || 'None',
                    kitchen: relatedStructures.length > 0 ? (relatedStructures[0].attributes.Kitchen === 'fittedkitchen' ? 'Yes' : 'No') : 'No',
                    wardrobe: relatedStructures.length > 0 ? (relatedStructures[0].attributes.Wardrobe === 'fittedwardrobe' ? 'Yes' : 'No') : 'No',
                    roofModel: relatedStructures.length > 0 ? relatedStructures[0].attributes.roof || 'None' : 'None',
                    ceiling: relatedStructures.length > 0 ? relatedStructures[0].attributes.ceiling1 || 'None' : 'None',
                    interiorWallFinish: relatedStructures.length > 0 ? relatedStructures[0].attributes.wfinish || 'Unknown' : 'Unknown',
                    longitude: feature.geometry?.x || null,
                    latitude: feature.geometry?.y || null,
                },
                create: {
                    globalId: attributes.globalid,
                    inspectionDate: new Date(attributes.dateOfInspection),
                    plotNumber: attributes.PLOT_NO || '',
                    plotExtent: parseFloat(attributes.AREAa) || 0,
                    classification: attributes.category || '',
                    propertyType: attributes.propertyType ? attributes.propertyType : 'Unknown',
                    location: 'Gaborone',
                    suburb: attributes.neighbourhood,
                    landValue: parseFloat(attributes.LandValue) || 0,
                    improvementsValue: parseFloat(attributes.ImpValue) || 0,
                    capitalValue: parseFloat(attributes.MarketValue) || 0,
                    perimeter: parseFloat(attributes.plotperimeter) || 0,
                    titleDeed: attributes.Title_Type || '',
                    status: attributes.Status || '',
                    plotDesc: attributes.dev || '',
                    numAirCons: totalAirCons,
                    numToilets: totalToilets,
                    numParkingBays: parseInt(attributes.no_parking) || 0,
                    numOfStructures: parseInt(attributes.NumberOfStructures) || 0,
                    numBathrooms: totalBathrooms, // Use aggregated value from Structures.json
                    swimmingPool: attributes.Pool === 'swimming' ? 'Yes' : 'No',
                    paving: attributes.Paving === 'paved' ? 'Yes' : 'None',
                    boundary: attributes.boundary || 'None',
                    kitchen: relatedStructures.length > 0 ? (relatedStructures[0].attributes.Kitchen === 'fittedkitchen' ? 'Yes' : 'No') : 'No',
                    wardrobe: relatedStructures.length > 0 ? (relatedStructures[0].attributes.Wardrobe === 'fittedwardrobe' ? 'Yes' : 'No') : 'No',
                    roofModel: relatedStructures.length > 0 ? relatedStructures[0].attributes.roof || 'None' : 'None',
                    ceiling: relatedStructures.length > 0 ? relatedStructures[0].attributes.ceiling1 || 'None' : 'None',
                    interiorWallFinish: relatedStructures.length > 0 ? relatedStructures[0].attributes.wfinish || 'Unknown' : 'Unknown',
                    longitude: feature.geometry?.x || null,
                    latitude: feature.geometry?.y || null,
                },
            });
        }

        console.log('Upsert operation completed successfully.');
    } catch (error) {
        console.error('Error during upsert operation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

export default upsertInspectionsData();