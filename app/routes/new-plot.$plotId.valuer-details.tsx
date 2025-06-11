import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormFields } from '~/models/forms';

import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'tabler-icons-react';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import BackButton from '~/components/BackButton';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { Card } from '~/components/Card';
import { CardHeader } from '~/components/CardHeader';
import { FormTextField } from '~/components/FormTextField';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton } from '~/components/PrimaryButton';
import { SecondaryButton } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import { badRequest, getValidatedId, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFieldErrors, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUser, requireUserId } from '~/session.server';
import { FormTextArea } from '~/components/FormTextArea';
import { FormSelect } from '~/components/FormSelect';
import NextButton from '~/components/NextButton';
import { TabPanel, TabView } from 'primereact/tabview';
import { FormPhoneNumberTextField } from '~/components/FormPhoneNumberTextField';

export async function loader({ request, params }: LoaderArgs) {
  const currentUser = await requireUser(request);

  const valuer = await prisma.valuer.findFirst({
    where: { plotId: getValidatedId(params.plotId) },
    select: {
      firstName: true,
      lastName: true,
      practicingCertificate: true,
      practicingCertificateNum: true,
      postalAddress: true,
      physicalAddress: true,
      email: true,
      telephone: true,
      firm: true,
      declaration: true,
      reportTemplateId: true,
      plot: {
        select: {
          plotNumber: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              physicalAddress: true,
              postalAddress: true,
              firm: true,
              email: true,
              practicingCertificate: true,
              practicingCertificateNum: true,
              id: true,
            },
          }
        }
      }
    },
  });

  const user = await prisma.user.findFirst({
    where: { email: valuer?.email },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      physicalAddress: true,
      postalAddress: true,
      firm: true,
      email: true,
      practicingCertificate: true,
      practicingCertificateNum: true,
      reportTemplateId: true,
      id: true,
    }
  });
  console.log('User Details: ', user);

  const company = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: {
      UserGroup: {
        include: {
          company: {
            select: {
              id: true,
              CompanyName: true,
            }
          }
        },
      },
    },
  });
  const reportTemplatesList = await prisma.rptTemplate.findMany({ where: { companyId: company?.UserGroup?.company.id } });

  return json({ user, reportTemplatesList, details: valuer || undefined, currentUserDetails: company, plotId: params.plotId });
}

const Schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  practicingCertificate: z.string().min(1),
  practicingCertificateNum: z.string().min(1),
  postalAddress: z.string(),
  physicalAddress: z.string().min(1),
  email: z.string().min(1),
  telephone: z.string().min(1),
  firm: z.string().min(1),
  declaration: z.coerce.boolean(),
  reportTemplateId: z.string().min(1),
});


export const action = async ({ params, request }: ActionArgs) => {
  const currentUserId = await requireUserId(request);

  const plotId = getValidatedId(params.plotId);
  // const reportTemplateId = getValidatedId(params.reportTemplateId)

  try {
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }

    const valuer = await prisma.valuer.findFirst({
      where: { id: plotId },
    });
    if (!valuer) {
      await prisma.$transaction(async (tx) => {
        const record = await tx.valuer.create({
          data: { plotId, ...result.data },
        });

        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Valuer,
            action: EventAction.Create,
            recordId: record.id,
            recordData: JSON.stringify(record),
          },
        });
      });
    } else {
      const record = await prisma.valuer.findUnique({
        where: { id: plotId },
      });
      await prisma.$transaction(async (tx) => {
        const updated = await tx.valuer.update({
          where: { id: plotId },
          data: { plotId, ...result.data },
        });

        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Valuer,
            action: EventAction.Update,
            recordId: plotId,
            recordData: JSON.stringify({ from: record, to: updated }),
          },
        });
      });
    }

    const reportTemplateId = result.data.reportTemplateId;
    console.log("Selected Report Template ID: ", reportTemplateId);

    return redirect(AppLinks.SecondPropertyDetails(plotId, reportTemplateId));
    // return redirect(AppLinks.PropertyDetails(plotId, reportTemplateId));
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
};

export default function PlotValuerDetails() {
  const { details, user, reportTemplatesList, currentUserDetails, plotId } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const [accepted, setAccepted] = useState(false);
  const [open, setOpen] = useState(false);

  const defaultValues: FormFields<keyof z.infer<typeof Schema>> = {
    firstName: details?.firstName || '',
    lastName: details?.lastName || '',
    practicingCertificate: details?.practicingCertificate || '',
    practicingCertificateNum: details?.practicingCertificateNum || '',
    postalAddress: details?.postalAddress || '',
    physicalAddress: details?.physicalAddress || '',
    telephone: details?.telephone || '',
    email: details?.email || '',
    firm: details?.firm,
    declaration: details?.declaration.toString(),
    reportTemplateId: details?.reportTemplateId!,
  };

  const decl = useMemo(() => {
    return 'We confirm that we do not have any pecuniary interest that would conflict with the proper valuation of the subject property';
  }, []);

  // NAKE CERTAIN TEXT FIELDS EDITABLE BUT WITH DEFAULT VALUES
  const [firstName, setFirstName] = useState(currentUserDetails?.firstName);
  const [lastName, setLastName] = useState(currentUserDetails?.lastName);
  const [practicingCertificate, setPracticingCertificate] = useState(currentUserDetails?.practicingCertificate);
  const [practicingCertificateNum, setPracticingCertificateNum] = useState(currentUserDetails?.practicingCertificateNum);
  const [postalAddress, setPostalAddress] = useState(currentUserDetails?.postalAddress);
  const [physicalAddress, setPhysicalAddress] = useState(currentUserDetails?.physicalAddress);
  const [telephone, setTelephone] = useState(currentUserDetails?.phone);
  const [email, setEmail] = useState(currentUserDetails?.email);
  const [firm, setFirm] = useState(currentUserDetails?.firm);
  const [declaration, setDeclaration] = useState(currentUserDetails?.declaration);
  const [reportTemplateId, setReportTemplateId] = useState(currentUserDetails?.reportTemplateId)

  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <fetcher.Form method="post" className="flex flex-col items-stretch gap-6">
      <ActionContextProvider {...fetcher.data} fields={fetcher.data?.fields || defaultValues} isSubmitting={isProcessing}>
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
                <h2 className="text-xl font-semibold">3. Valuer Details</h2>
                <span className="text-lg font-light text-center text-stone-400">Please confirm if valuer details are correct and up to date</span>
              </CardHeader>
              <div className="flex flex-col items-stretch p-4 gap-4">
                <div className="grid grid-cols-3 gap-6">
                  <FormTextField
                    {...getNameProp('firstName')}
                    label="First Name"
                    value={firstName}
                    placeholder={currentUserDetails?.firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['firstName'] : undefined}
                    required />
                  <FormTextField
                    {...getNameProp('lastName')}
                    label="Last Name"
                    value={lastName}
                    placeholder={currentUserDetails?.lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['lastName'] : undefined}
                    required />
                  <FormTextField
                    {...getNameProp('practicingCertificate')}
                    label="Professional Body"
                    value={practicingCertificate}
                    placeholder={currentUserDetails?.practicingCertificate}
                    onChange={(e) => setPracticingCertificate(e.target.value)}
                    errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['practicingCertificate'] : undefined}
                  />
                  <FormTextField
                    {...getNameProp('practicingCertificateNum')}
                    label="Practicing / Certificate No."
                    value={practicingCertificateNum!}
                    placeholder={currentUserDetails?.practicingCertificateNum!}
                    onChange={(e) => setPracticingCertificateNum(e.target.value)}
                    errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['practicingCertificateNum'] : undefined}
                    required />
                  <FormTextField
                    {...getNameProp('firm')}
                    label="Firm"
                    value={firm}
                    placeholder={currentUserDetails?.firm}
                    onChange={(e) => setFirm(e.target.value)}
                    errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['firm'] : undefined}
                    required />
                  {/* <FormTextField
                    {...getNameProp('telephone')}
                    type="tel"
                    label="Telephone"
                    value={telephone}
                    placeholder={currentUserDetails?.phone}
                    onChange={(e) => setTelephone(e.target.value)}
                    errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['telephone'] : undefined}
                    required /> */}
                  <FormPhoneNumberTextField
                    name="telephone"
                    label="Telephone"
                    placeholder={currentUserDetails?.phone}
                    value={telephone}
                    onChange={(telephone) => setTelephone(telephone)}
                    defaultCountry="BW"
                    required
                  />
                  <FormTextField
                    {...getNameProp('physicalAddress')}
                    label="Physical Address"
                    value={physicalAddress}
                    placeholder={currentUserDetails?.physicalAddress}
                    onChange={(e) => setPhysicalAddress(e.target.value)}
                    errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['physicalAddress'] : undefined}
                    required />
                  <FormTextField
                    {...getNameProp('postalAddress')}
                    label="Postal Address"
                    value={postalAddress || ''}
                    placeholder={currentUserDetails?.postalAddress!}
                    onChange={(e) => setPostalAddress(e.target.value)}
                  />
                  <FormTextField
                    {...getNameProp('email')}
                    type="email"
                    label="Email"
                    value={email}
                    placeholder={currentUserDetails?.email}
                    onChange={(e) => setEmail(e.target.value)}
                    errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['email'] : undefined}
                  />
                  <div>
                    <span className='font-medium text-sm text-red-600'>
                      Select Report Template
                    </span>
                    <FormSelect
                      {...getNameProp('reportTemplateId')}
                      label=""
                      errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['reportTemplateId'] : undefined}
                    >
                      {reportTemplatesList.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </FormSelect>
                  </div>
                  <input type="text" {...getNameProp('telephone')} value={telephone} hidden />
                </div>
                {/* <input type="hidden" {...getNameProp('reportTemplateId')} value={reportTemplateId} onChange={(e) => setEmail(e.target.value)} /> */}
                <input type="hidden" {...getNameProp('declaration')} value={accepted.toString()} />
                {hasFormError(fetcher.data) && <InlineAlert>{fetcher.data.formError}</InlineAlert>}
              </div>
              <CardHeader className="flex flex-col items-stretch" topBorder>
                <div className="flex flex-row items-center">
                  <BackButton />
                  <div className="grow" />
                  <NextButton type="submit" isProcessing={isProcessing} onClick={() => setAccepted(true)} />
                  {/* <SecondaryButton onClick={() => setOpen((prevState) => !prevState)} className="flex flex-row items-center gap-2" type="button">
                Read Declaration To Proceed
                {!!open && <ChevronUp className="text-teal-600" />}
                {!open && <ChevronDown className="text-teal-600" />}
              </SecondaryButton> */}
                </div>
                {!!open && (
                  <div className="flex flex-col items-stretch bg-stone-50 rounded-lg p-2 gap-4">
                    <span className="font-light text-stone-800 text-sm py-4">{decl}</span>
                    <div className="flex flex-row items-stretch gap-8">
                      <div className="grow" />
                      <div className="flex flex-col justify-center items-center">
                        <span className="text-stone-800">Do you accept?</span>
                      </div>
                      <SecondaryButton
                        type="button"
                        onClick={() => {
                          setAccepted(false);
                          setOpen(false);
                        }}
                        className="text-red-600"
                      >
                        NO
                      </SecondaryButton>
                      <PrimaryButton type="submit" onClick={() => setAccepted(true)}>
                        YES
                      </PrimaryButton>
                    </div>
                  </div>
                )}
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
                Valuer Details
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
