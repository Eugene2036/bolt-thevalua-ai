import { json, type ActionArgs } from '@remix-run/node';

import { prisma } from '~/db.server';
import { badRequest, getValidatedId, processBadRequest, roundDown } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields } from '~/models/forms';
import { StoredValueId } from '~/models/storedValuest';
import { InsuranceSchema } from '~/models/tenants.validations';
import { requireUserId } from '~/session.server';

export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);
  try {
    const id = getValidatedId(params.id);
    const fields = await getRawFormFields(request);
    const result = InsuranceSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }

    const record = prisma.insurance.findUnique({
      where: { id },
    });
    const plotId = await prisma.$transaction(async (tx) => {
      const { plotId } = await tx.insurance.update({
        where: { id },
        data: result.data,
        select: { plotId: true },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Insurance,
          action: EventAction.Update,
          recordId: id,
          recordData: JSON.stringify({ from: record, to: result.data }),
        },
      });
      return plotId;
    });

    const [storedValues, tenants, insuranceItems, outgoingItems] = await Promise.all([
      prisma.storedValue.findMany({
        where: { plotId },
        select: { id: true, identifier: true, value: true },
      }),
      prisma.tenant
        .findMany({
          where: { plotId },
          select: { areaPerClient: true },
        })
        .then((tenants) =>
          tenants.map((tenant) => ({
            ...tenant,
            areaPerClient: Number(tenant.areaPerClient),
          })),
        ),
      prisma.insurance
        .findMany({
          where: { plotId },
          select: {
            id: true,
            rate: true,
            item: { select: { identifier: true } },
          },
        })
        .then((record) => {
          return record.map((item) => ({ ...item, rate: Number(item.rate) }));
        }),
      prisma.outgoing
        .findMany({
          where: { plotId },
          select: {
            id: true,
            identifier: true,
            unitPerClient: true,
          },
        })
        .then((record) => {
          return record.map((item) => ({
            ...item,
            unitPerClient: Number(item.unitPerClient),
          }));
        }),
    ]);

    function getStoredValue(identifier: StoredValueId) {
      const match = storedValues.find((el) => el.identifier === identifier);
      if (!match) {
        return undefined;
      }
      return { ...match, value: Number(match.value) };
    }

    const insuranceVat = getStoredValue(StoredValueId.InsuranceVat);
    const profFee = getStoredValue(StoredValueId.ProfFees);
    const preTenderEscalationAt = getStoredValue(StoredValueId.PreTenderEscalationAt);
    const preTenderEscalationPerc = getStoredValue(StoredValueId.PreTenderEscalationPerc);
    const postTenderEscalationAt = getStoredValue(StoredValueId.PostTenderEscalationAt);
    const postTenderEscalationPerc = getStoredValue(StoredValueId.PostTenderEscalationPerc);

    const totalAreaPerClient = tenants.reduce((acc, tenant) => acc + tenant.areaPerClient, 0);

    const subTotal = insuranceItems.reduce((acc, record) => {
      const result = acc + record.rate * totalAreaPerClient;
      return Number(result.toFixed(2));
    }, 0);

    const vat = (() => {
      const result = subTotal * ((insuranceVat?.value || 0) / 100);
      return Number(result.toFixed(2));
    })();

    const comProperty = (() => {
      // const result = 0.2 * subTotal;
      // return Number(result.toFixed(2));
      return 0;
    })();
    // }, [subTotal]);

    const profFees = (() => {
      const result = (profFee?.value || 0) * 0.01 * (subTotal + vat + comProperty);
      // const result = 0.15 * (subTotal + vat + comProperty);
      return Number(result.toFixed(2));
    })();

    const replacementCost = (() => {
      const result = subTotal + vat + comProperty + profFees;
      return Number(result.toFixed(2));
    })();

    const preTenderEscl = (() => {
      const result = ((((preTenderEscalationPerc?.value || 0) / 100) * (preTenderEscalationAt?.value || 0)) / 12) * replacementCost;
      return Number(result.toFixed(2));
    })();

    const postTenderEscl = (() => {
      const result = ((((postTenderEscalationPerc?.value || 0) / 100) * (postTenderEscalationAt?.value || 0)) / 12) * subTotal;
      return Number(result.toFixed(2));
    })();

    const total = (() => {
      const result = replacementCost + preTenderEscl + postTenderEscl;
      // const rounded = (Math.round(result / 1_000_000) * 1_000_000).toFixed(2);
      const rounded = roundDown(result, -6).toFixed(2);
      return Number(rounded);
    })();

    const itemsToUpdate = outgoingItems.filter((item) => ['Maintenance and Repairs', 'Insurance'].some((identifier) => item.identifier === identifier));

    await Promise.all(
      itemsToUpdate.map((item) => {
        const record = prisma.outgoing.findUnique({
          where: { id: item.id },
        });
        return prisma.$transaction(async (tx) => {
          const updated = await tx.outgoing.update({
            where: { id: item.id },
            data: { unitPerClient: total },
          });
          await tx.event.create({
            data: {
              userId: currentUserId,
              domain: EventDomain.Outgoing,
              action: EventAction.Update,
              recordId: item.id,
              recordData: JSON.stringify({
                from: record,
                to: updated,
              }),
            },
          });
        });
      }),
    );

    return json({ success: true });
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}
