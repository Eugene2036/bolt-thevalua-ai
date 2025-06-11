import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormFields } from '~/models/forms';

import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { z } from 'zod';

import { ActionContextProvider, useForm, useUpdateState } from '~/components/ActionContextProvider';
import BackButton from '~/components/BackButton';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { Card } from '~/components/Card';
import { CardHeader } from '~/components/CardHeader';
import { FormSelect } from '~/components/FormSelect';
import { InlineAlert } from '~/components/InlineAlert';
import NextButton from '~/components/NextButton';
import { prisma } from '~/db.server';
import { badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';
import { useState } from 'react';
import { FormTextField } from '~/components/FormTextField';
import { TabPanel, TabView } from 'primereact/tabview';
import { FormPhoneNumberTextField } from '~/components/FormPhoneNumberTextField';


export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
  let client = null

  client = await prisma.notification.findFirst({
    where: { plotId: getValidatedId(params.plotId) },
    select: {
      postalAddress: true,
      postalCode: true,
      phyAddress: true,
      email: true,
      telephone: true,
      clientType: true,
      companyName: true,
      position: true,
      firstName: true,
      lastName: true,
      title: true,
      repEmail: true,
      repPhone: true,
    },
  });


  return json({ details: client || undefined, plotId: params.plotId });
}


const Schema = z.object({
  postalAddress: z.string(),
  postalCode: z.string(),
  phyAddress: z.string().min(1),
  email: z.string().email(),
  telephone: z.string().min(1),

  companyName: z.string(),
  position: z.string(),

  firstName: z.string(),
  lastName: z.string(),
  title: z.string(),
  repEmail: z.string(),
  repPhone: z.string(),
});
export const action = async ({ params, request }: ActionArgs) => {
  const currentUserId = await requireUserId(request);

  const plotId = getValidatedId(params.plotId);
  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { postalAddress, postalCode, phyAddress, email, telephone, companyName, position, firstName, lastName, title, repEmail, repPhone } = result.data;

    const client = await prisma.client.findFirst({
      where: { plotId },
    });
    if (!client) {
      await prisma.$transaction(async (tx) => {
        const record = await tx.client.create({
          data: {
            plotId,
            clientType: 'Individual',
            postalAddress: postalAddress || '',
            postalCode: postalCode || '',
            phyAddress: phyAddress || '',
            email: email || '',
            telephone: telephone || '',
            companyName: companyName || '',
            position: position || '',
            firstName: firstName || '',
            lastName: lastName || '',
            title: title || '',
            repEmail: repEmail || '',
            repPhone: repPhone || '',
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Client,
            action: EventAction.Create,
            recordId: record.id,
            recordData: JSON.stringify(record),
          },
        });
      });
    } else {
      const record = await prisma.client.findUnique({
        where: { id: client.id },
      });
      await prisma.$transaction(async (tx) => {
        const updated = await tx.client.update({
          where: { id: client.id },
          data: {
            plotId,
            postalAddress: postalAddress || '',
            postalCode: postalCode || '',
            phyAddress: phyAddress || '',
            email: email || '',
            telephone: telephone || '',
            companyName: companyName || '',
            position: position || '',
            firstName: firstName || '',
            lastName: lastName || '',
            title: title || '',
            repEmail: repEmail || '',
            repPhone: repPhone || '',
          },
        });

        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Client,
            action: EventAction.Update,
            recordId: client.id,
            recordData: JSON.stringify({ from: record, to: updated }),
          },
        });

        const notification = await tx.notification.findFirst({
          where: { plotId },
        });

        await tx.notification.update({
          where: { noteId: notification?.noteId },
          data: {
            postalAddress: postalAddress || '',
            postalCode: postalCode || '',
            phyAddress: phyAddress || '',
            email: email || '',
            telephone: telephone || '',
            companyName: companyName || '',
            position: position || '',
            firstName: firstName || '',
            lastName: lastName || '',
            title: title || '',
            repEmail: repEmail || '',
            repPhone: repPhone || '',
          },
        });
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Client,
            action: EventAction.Update,
            recordId: client.id,
            recordData: JSON.stringify({ from: record, to: updated }),
          },
        });
      });
    }

    return redirect(AppLinks.ValuerDetails(plotId));
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
};

export default function PlotClientDetails() {
  const { details, plotId } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const updateState = useUpdateState();
  const handleChange = (name: string) => (event: { target: { value: unknown; }; }) => {
    updateState(name, event.target.value);
  };

  console.log("Client Details 2: ", details);

  const defaultValues: FormFields<keyof z.infer<typeof Schema>> | undefined = details
    ? {
      postalAddress: details.postalAddress || '',
      postalCode: details.postalCode || undefined,
      phyAddress: details.phyAddress,
      email: details.email,
      telephone: details.telephone,
      companyName: details.companyName || '',
      position: details.position || '',
      firstName: details.firstName,
      lastName: details.lastName,
      title: details.title,
    }
    : undefined;

  const titles = ['Mr', 'Mrs', 'Miss', 'Ms', 'Prof', 'Dr'];

  // MAKE CERTAIN TEXT FIELDS EDITABLE BUT WITH DEFAULT VALUES
  const [firstName, setFirstName] = useState(details?.firstName);
  const [lastName, setLastName] = useState(details?.lastName);
  const [title, setTitle] = useState(details?.title);
  const [companyName, setCompanyName] = useState(details?.companyName);
  const [position, setPosition] = useState(details?.position);
  const [email, setEmail] = useState(details?.email);
  const [telephone, setTelephone] = useState(details?.telephone);
  const [postalAddress, setPostalAddress] = useState(details?.postalAddress);
  const [postalCode, setPostalCode] = useState(details?.postalCode);
  const [phyAddress, setPhyAddress] = useState(details?.phyAddress);
  const [repPhone, setRepPhone] = useState(details?.repPhone);
  const [repEmail, setRepEmail] = useState(details?.repEmail);

  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <fetcher.Form method="post" className="flex flex-col items-stretch gap-6">
      <ActionContextProvider {...fetcher.data} fields={fetcher.data?.fields || defaultValues} isSubmitting={isProcessing} >
        <input type="hidden" {...getNameProp('postalCode')} value="" />
        <TabView className="custom-tabview" activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.ClientType(plotId!);
                }}
              >
                Client Type
              </span>
            }
            className="p-2" headerClassName={'default-tab'}
          >

            <Card>
              <CardHeader className="flex flex-col items-center gap-4">
                <h2 className="text-xl font-semibold">2. Client Details</h2>
                <span className="text-lg font-light text-center text-stone-400">Please confirm if client details are correct and up to date</span>
              </CardHeader>
              <div className="flex flex-col items-stretch p-4">
                {details?.clientType !== 'Individual' && (
                  <div className="flex flex-col items-stretch gap-4">
                    <input type="hidden" {...getNameProp('title')} value="" />
                    <span className="font-lg font-semibold">Organisation</span>
                    <div className="grid grid-cols-3 gap-6">
                      <FormTextField
                        {...getNameProp('companyName')}
                        label="Organisation Name"
                        value={companyName!}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required />
                      <FormTextField
                        {...getNameProp('phyAddress')}
                        label="Physical Address"
                        value={phyAddress}
                        onChange={(e) => setPhyAddress(e.target.value)}
                        required />
                      <FormTextField
                        {...getNameProp('postalAddress')}
                        label="Postal Address"
                        value={postalAddress!}
                        onChange={(e) => setPostalAddress(e.target.value)}
                        required />
                      <FormTextField
                        {...getNameProp('email')} type="email" label="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required />
                      <FormPhoneNumberTextField
                        name="telephone"
                        label="Telephone"
                        value={telephone!}
                        onChange={(telephone) => setTelephone(telephone)}
                        defaultCountry="BW"
                        required
                      />
                    </div>
                    <span className="font-lg font-semibold">Representative</span>
                    <div className="grid grid-cols-3 gap-6">
                      <FormTextField
                        {...getNameProp('firstName')}
                        label="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required />
                      <FormTextField {...getNameProp('lastName')}
                        label="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required />
                      <FormTextField
                        {...getNameProp('position')}
                        label="Position"
                        value={position!}
                        onChange={(e) => setPosition(e.target.value)}
                      // required
                      />
                      <FormTextField
                        {...getNameProp('repEmail')}
                        label="Email"
                        value={repEmail}
                        onChange={(e) => setRepEmail(e.target.value)}
                        required />
                      <FormPhoneNumberTextField
                        name="repPhone"
                        label="Phone"
                        value={repPhone!}
                        onChange={(repPhone) => setRepPhone(repPhone)}
                        defaultCountry="BW"
                        required
                      />

                      <input type="text" {...getNameProp('telephone')} value={telephone!} onChange={(e) => setTelephone(e.target.value)} hidden />
                      <input type="text" {...getNameProp('repPhone')} value={repPhone} onChange={(e) => setRepPhone(e.target.value)} hidden />
                    </div>

                  </div>
                )}
                {details?.clientType === 'Individual' && (
                  <div className="flex flex-col items-stretch">
                    <div className="grid grid-cols-3 gap-6">
                      <input type="hidden" {...getNameProp('companyName')} value="" />
                      <input type="hidden" {...getNameProp('position')} value="" />
                      <input type="hidden" {...getNameProp('repEmail')} value="" />
                      <input type="hidden" {...getNameProp('repPhone')} value="" />

                      <FormTextField {...getNameProp('firstName')}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        label='First Name' required />
                      <FormTextField {...getNameProp('lastName')}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        label="Last Name" required />
                      <FormSelect {...getNameProp('title')}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        label="Salutation" required>
                        {titles.map((title) => (
                          <option key={title}>{title}</option>
                        ))}
                      </FormSelect>
                      <FormTextField {...getNameProp('phyAddress')}
                        value={phyAddress}
                        onChange={(e) => setPhyAddress(e.target.value)}
                        label="Physical Address" required />
                      <FormTextField
                        {...getNameProp('postalAddress')}
                        value={postalAddress!}
                        onChange={(e) => setPostalAddress(e.target.value)}
                        label="Postal Address"
                      />
                      <FormTextField
                        {...getNameProp('postalCode')}
                        value={postalCode!}
                        onChange={(e) => setPostalCode(e.target.value)}
                        label="Postal Code"
                      />
                      <FormPhoneNumberTextField
                        name="telephone"
                        label="Telephone"
                        value={telephone!}
                        onChange={(telephone) => setTelephone(telephone)}
                        defaultCountry="BW"
                        required
                      />
                      <FormTextField {...getNameProp('email')} type="email" label="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required />

                      <input type="text" {...getNameProp('telephone')} value={telephone} hidden />
                    </div>
                  </div>
                )}
                {hasFormError(fetcher.data) && <InlineAlert>{fetcher.data.formError}</InlineAlert>}
              </div>
              <CardHeader className="flex flex-row items-center gap-4" topBorder>
                <BackButton />
                <div className="grow" />
                <NextButton type="submit" isProcessing={isProcessing} />
              </CardHeader>
            </Card>

          </TabPanel>

          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.ClientDetails(plotId!);
                }}
              >
                Client Details
              </span>
            }
            className="p-2"
            headerClassName={'active-tab'}
          >

          </TabPanel>

          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.ValuerDetails(plotId!);
                }}
              >
                Valuer Details
              </span>
            }
            className="p-2"
            headerClassName={'default-tab'}
          >
          </TabPanel>

          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.ValuerDetails(plotId!);
                }}
              >
                Asset Details
              </span>
            }
            disabled
            className="p-2"
            // headerClassName={`${activeIndex === 2 ? 'active-tab' : 'default-tab'}`}
            headerClassName={'disabled-tab'}
          >
          </TabPanel>

          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.ValuerDetails(plotId!);
                }}
              >
                Report Content
              </span>
            }
            disabled
            className="p-2"
            // headerClassName={`${activeIndex === 2 ? 'active-tab' : 'default-tab'}`}
            headerClassName={'disabled-tab'}
          >
          </TabPanel>

          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.SecondValuationReport(plotId!);
                }}
              >
                Report Preview
              </span>
            }
            disabled
            className="p-2 cursor-not-allowed"
            headerClassName={'disabled-tab'}
          >
          </TabPanel>

        </TabView>
      </ActionContextProvider>
    </fetcher.Form>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}
