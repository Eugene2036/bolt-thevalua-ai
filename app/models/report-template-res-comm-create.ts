import { faker, th } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';

import { prisma } from "~/db.server";
import { getErrorMessage } from './errors';

interface TemplateDataSchema {
    rptTemplate: {
        name: string;
        ReportTemplateSection: {
            name?: string;
            subSections: {
                title?: string;
                ReportSubSection?: any[]; // Replace `any` with a more specific type if known
            }[];
        }[];
    };
}

export async function createDefaultResTemplate(
    props: {
        companyId: string;
        name: string;
    }
) {
    console.log('Creating default residential template...');
    const { name, companyId } = props;
    try {
        const residentialFilePath = path.join(__dirname, '../public/residential.json');
        const residentialData = JSON.parse(fs.readFileSync(residentialFilePath, 'utf-8')) as TemplateDataSchema;


        const existingTemplate = await prisma.rptTemplate.findFirst({
            where: { companyId: companyId },
        });

        if (existingTemplate) {
            console.log('Template already exists for this company.');
            return;
        }

        const rptTemplate = await prisma.rptTemplate.create({
            data: {
                name: name,
                companyId: companyId,
            },
        });

        // Iterate through ReportTemplateSection and insert data
        for (const section of residentialData.rptTemplate.ReportTemplateSection) {
            const reportTemplateSection = await prisma.reportTemplateSection.create({
                data: {
                    // id: rptTemplate.id,
                    refNumber: faker.number.int({ min: 1, max: 1000000 }),
                    name: section.name || '',
                    templateId: rptTemplate.id,
                },
            });

            // Iterate through subSections and insert data
            for (const subSection of section.subSections) {
                await prisma.templateSubSection.create({
                    data: {
                        sectionId: reportTemplateSection.id,
                        title: subSection.title || '',
                        content: JSON.stringify(subSection.ReportSubSection || []),
                    },
                });
            }
        }

        console.log('Residential Default template created successfully.');
        return rptTemplate;
    } catch (error) {
        console.error('Error creating residential template:', error);
        throw new Error(getErrorMessage(error));
    } finally {
        await prisma.$disconnect();
    }
}

export async function createDefaultComTemplate(props: {
    companyId: string;
    name: string;
}) {
    const { name, companyId } = props;
    try {
        const commercialFilePath = path.join(__dirname, '../public/commercial.json');
        const commercialData = JSON.parse(fs.readFileSync(commercialFilePath, 'utf-8')) as TemplateDataSchema;

        const rptTemplate = await prisma.rptTemplate.create({
            data: {
                name: name,
                companyId: companyId,
            },
        });

        // Iterate through ReportTemplateSection and insert data
        for (const section of commercialData.rptTemplate.ReportTemplateSection) {
            const reportTemplateSection = await prisma.reportTemplateSection.create({
                data: {
                    // id: rptTemplate.id,
                    refNumber: faker.number.int({ min: 1, max: 1000000 }),
                    name: section.name || '',
                    templateId: rptTemplate.id,
                },
            });

            // Iterate through subSections and insert data
            for (const subSection of section.subSections) {
                await prisma.templateSubSection.create({
                    data: {
                        sectionId: reportTemplateSection.id,
                        title: subSection.title || '',
                        content: JSON.stringify(subSection.ReportSubSection || []),
                    },
                });
            }
        }

        console.log('Commercial Default template created successfully.');
        return rptTemplate;
    } catch (error) {
        console.error('Error creating commercial template:', error);
        throw new Error(getErrorMessage(error));
    } finally {
        await prisma.$disconnect();
    }
}