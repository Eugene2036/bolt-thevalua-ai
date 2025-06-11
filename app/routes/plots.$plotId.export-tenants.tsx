import { createReadStream } from 'fs';
import path from 'path';

import { Response, type LoaderArgs } from '@remix-run/node';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';

import { prisma } from '~/db.server';
import { StatusCode, getValidatedId } from '~/models/core.validations';
import { DATE_INPUT_FORMAT } from '~/models/dates';
import { Env } from '~/models/environment';
import { getErrorMessage } from '~/models/errors';
import { requireUserId } from '~/session.server';

export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);

  const plotId = getValidatedId(params.plotId);
  try {
    const records = await prisma.tenant.findMany({
      where: { plotId },
      select: {
        name: true,
        propertyType: true,
        areaPerClient: true,
        startDate: true,
        endDate: true,
        grossMonthlyRental: true,
        escalation: true,
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tenants');

    worksheet.columns = [
      { header: 'Tenant (Text)', key: 'tenantName' },
      { header: 'Asset Type (Text)', key: 'propertyType' },
      { header: 'Area (Number)', key: 'areaPerClient' },
      { header: 'Start Date (DD-MM-YYYY)', key: 'startDate' },
      { header: 'End Date (DD-MM-YYYY)', key: 'endDate' },
      { header: 'Gross Monthly (Number)', key: 'grossMonthlyRental' },
      { header: 'Escalation (Number)', key: 'escalation' },
    ];

    if (records.length) {
      records.forEach((record) => {
        worksheet.addRow({
          tenantName: record.name,
          propertyType: record.propertyType.identifier,
          areaPerClient: Number(record.areaPerClient),
          startDate: dayjs(record.startDate).format('DD-MM-YYYY'),
          endDate: dayjs(record.endDate).format('DD-MM-YYYY'),
          grossMonthlyRental: record.grossMonthlyRental.toNumber().toFixed(2),
          escalation: record.escalation.toNumber().toFixed(2),
        });
      });
    } else {
      worksheet.addRow({
        tenantName: 'John Doe',
        propertyType: 'Office',
        areaPerClient: 100,
        startDate: dayjs().format('DD-MM-YYYY'),
        endDate: dayjs().format('DD-MM-YYYY'),
        grossMonthlyRental: 2000,
        escalation: 100,
      });
    }

    let tempDir: string;
    if (Env.NODE_ENV === 'development') {
      tempDir = path.join(__dirname, `../../../../tmp/`);
    } else {
      tempDir = '/tmp/';
    }

    const filename = `${tempDir}${plotId}_tenants_${dayjs().format(DATE_INPUT_FORMAT)}`;
    await workbook.xlsx.writeFile(filename);
    const stream = createReadStream(filename);

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${plotId}_tenants.xlsx`,
      },
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error) || 'Something went wrong exporting tenants, please try again';
    throw new Response(errorMessage, { status: StatusCode.BadRequest });
  }
}
