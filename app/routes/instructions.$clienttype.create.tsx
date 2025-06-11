import type { ActionArgs, LoaderArgs } from '@remix-run/node';

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
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';
import { FormTextArea } from '~/components/FormTextArea';
import { FormTextField } from '~/components/FormTextField';
import { PurposeOfValuation, ValuationKind, ValuationType } from '~/models/plots.validations';
import { CreateInstruction } from '~/models/instructions.server';
import { useUser } from '~/utils';
import TownNeighborhoodSelector from '~/components/TownNeighborhoodSelector';

import { useState } from 'react';
import { FormPhoneNumberTextField } from '~/components/FormPhoneNumberTextField';
import { TabPanel, TabView } from 'primereact/tabview';

export async function loader({ request, params }: LoaderArgs) {
  const plotNumber = params.plotno;
  const clientType = params.clienttype;

  if (!clientType) {
    console.error("clientType is undefined in params");
  }

  await requireUserId(request);
  const allUsers = await prisma.user.findMany({
    where: { isSignatory: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      UserGroup: {
        select: {
          company: {
            select: {
              id: true,
              CompanyName: true,
            }
          }
        }
      }
    },
  });

  const notification = await prisma.notification.findFirst({
    where: { plotNum: plotNumber }
  })

  console.log("Selected Notification:", notification);

  return json({ allUsers, clientType, plotNumber });
}

function generateAlphanumericId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 25; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result.toLowerCase();
}

const Schema = z.object({
  plotNum: z.coerce.string().min(1),
  plotExtent: z.coerce.number(),
  classification: z.coerce.string().min(1),
  valuationType: z.coerce.string().min(1),
  titleDeedDate: z.coerce.date(),
  titleDeedNum: z.coerce.string().min(1),
  companyId: z.coerce.string().min(1),
  contactPerson: z.coerce.string().min(1),
  contactNumber: z.coerce.string().min(1),
  contactEmail: z.coerce.string().min(1),
  plotAddress: z.coerce.string().min(1),
  message: z.coerce.string().min(1),
  messageBody: z.coerce.string(),
  userId: z.coerce.string().min(1),
  createdById: z.coerce.string().min(1),
  approved: z.coerce.boolean().default(false),
  approvedById: z.coerce.string().min(1),

  postalAddress: z.coerce.string(),
  postalCode: z.coerce.string(),

  location: z.coerce.string(),
  neighbourhood: z.coerce.string(),

  email: z.coerce.string().email(),
  telephone: z.coerce.string().min(1),
  phyAddress: z.coerce.string(),

  companyName: z.coerce.string(),
  position: z.coerce.string(),

  firstName: z.coerce.string(),
  lastName: z.coerce.string(),
  title: z.coerce.string(),
  repEmail: z.coerce.string(),
  repPhone: z.coerce.string(),

  clientType: z.coerce.string().min(1),
  valuationKind: z.coerce.string().min(1),

});

export const action = async ({ params, request }: ActionArgs) => {
  const currentUserId = await requireUserId(request);

  try {
    const newNoteId = generateAlphanumericId();
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);

    if (!result.success) {
      console.error("Validation errors:", result.error.errors);
      return processBadRequest(result.error, fields);
    }

    const { approved, clientType, ...restOfData } = result.data;
    await CreateInstruction({
      noteId: newNoteId, approved: true, ...restOfData, clientType: clientType
    }, currentUserId);

    return redirect(AppLinks.EditInstructions(newNoteId));
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
};



export default function PlotClientDetails() {
  const { allUsers, clientType, plotNumber } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const currentUser = useUser();

  const updateState = useUpdateState();
  const handleChange = (name: string) => (event: { target: { value: unknown; }; }) => {
    updateState(name, event.target.value);
  };

  // const [selectedCompanyId, setSelectedCompanyId] = useState(allUsers);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  const handleUserIdChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUserId = event.target.value;
    const selectedUser = allUsers.find(user => user.id === selectedUserId);
    if (selectedUser) {
      setSelectedCompanyId(selectedUser.UserGroup?.company.id || '');
    }
    updateState('userId', selectedUserId);
  };


  const titles = ['Mr', 'Mrs', 'Miss', 'Ms', 'Prof', 'Dr', 'Cde'];

  const [plotExtent, setPlotExtent] = useState('');
  const [plotNum, setPlotNum] = useState('');
  const [classification, setClassification] = useState('');
  const [valuationType, setValuationType] = useState('');
  const [titleDeedDate, setTitleDeedDate] = useState('');
  const [titleDeedNum, setTitleDeedNum] = useState('');
  const [companyId, setCompanyId] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('Mr');

  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');

  const [email, setEmail] = useState('');

  // const [telephone, setTelephone] = useState('');
  const [telephoneIndividual, setTelephoneIndividual] = useState('');
  const [telephoneOrganisation, setTelephoneOrganisation] = useState('');
  const [repPhone, setRepPhone] = useState('')

  const [postalAddress, setPostalAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phyAddress, setPhyAddress] = useState('');

  const [location, setLocation] = useState('');
  const [neighbourhood, setNeighbourhood] = useState('');

  const [repEmail, setRepEmail] = useState('')

  const [message, setMessage] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [approved, setApproved] = useState(false)
  const [approvedById, setApprovedById] = useState('')

  const [valuationKind, setValuationKind] = useState('Normal')

  // SELECTED TOWN AND HEIGHBOURHOOD
  const [selectedTown, setSelectedTown] = useState<string | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null);

  const handleSelectionChange = (town: any, neighborhood: any) => {
    setSelectedTown(town?.label || null);
    setSelectedNeighborhood(neighborhood?.label || null);

    // Update the form state for submission
    setLocation(town?.label || '');
    setNeighbourhood(neighborhood?.label || '');

    // You can also access the full objects if needed:
    console.log('Full town object:', town);
    console.log('Full neighborhood object:', neighborhood);
  };

  // const handleSelectionChange = (town: any, neighborhood: any) => {
  //   setSelectedTown(town?.label || null);
  //   setSelectedNeighborhood(neighborhood?.label || null);

  //   // You can also access the full objects if needed:
  //   console.log('Full town object:', town);
  //   console.log('Full neighborhood object:', neighborhood);
  // };

  const [activeIndex, setActiveIndex] = useState(2);

  return (
    <div className="grid grid-cols-3 gap-4 p-6 pt-2 bg-gray-50">
      <div className="flex flex-col items-stretch gap-6 col-span-3 pt-2">
        <TabView className="custom-tabview" activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.BankerAnalytics;
                }}
              >
                Cockpit
              </span>
            }
            className="p-2"
            headerClassName={`${activeIndex === 0 ? 'active-tab' : 'default-tab'}`}
          >
          </TabPanel>
          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.Instructions;
                }}
              >
                Instructions
              </span>
            }
            className="p-2"
            headerClassName={`${activeIndex === 1 ? 'active-tab' : 'default-tab'}`}
          >
          </TabPanel>

          <TabPanel header="Creating Instruction" className="p-2" headerClassName={activeIndex === 2 ? 'active-tab' : 'default-tab'}>
            <fetcher.Form method="post" className="flex flex-col items-stretch gap-6">
              <ActionContextProvider {...fetcher.data} fields={fetcher.data?.fields} isSubmitting={isProcessing} >
                <input hidden type="text" {...getNameProp('postalCode')} value="" />
                <Card>
                  <CardHeader className="flex flex-col items-center gap-4">
                    <h2 className="text-xl font-semibold">Client Information</h2>
                  </CardHeader>
                  <div className="grid grid-col-1 items-stretch">
                    <div className="flex flex-col items-stretch p-4">
                      {clientType !== 'Individual' && (
                        <div className="flex flex-col items-stretch gap-4">
                          <input type="hidden" {...getNameProp('title')} value="" />
                          <span className="font-lg font-semibold">Organisation</span>
                          <div className="grid grid-cols-3 gap-6">
                            <FormTextField
                              {...getNameProp('companyName')}
                              label="Organisation Name"
                              value={companyName!}
                              onChange={(e) => setCompanyName(e.target.value)}
                              errors={fetcher.data?.fieldErrors?.companyName}
                              required />
                            <FormTextField
                              {...getNameProp('postalAddress')}
                              label="Postal Address"
                              value={postalAddress!}
                              onChange={(e) => setPostalAddress(e.target.value)}
                              errors={fetcher.data?.fieldErrors?.postalAddress}
                              required />
                            <FormTextField
                              {...getNameProp('email')} type="email" label="Email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              errors={fetcher.data?.fieldErrors?.email}
                              required />
                            <FormPhoneNumberTextField
                              name=""
                              label="Phone"
                              value={telephoneOrganisation}
                              onChange={(telephoneOrganisation) => setTelephoneOrganisation(telephoneOrganisation)}
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
                              errors={fetcher.data?.fieldErrors?.firstName}
                              required />
                            <FormTextField {...getNameProp('lastName')}
                              label="Last Name"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              errors={fetcher.data?.fieldErrors?.lastName}
                              required />
                            <FormSelect {...getNameProp('title')}
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              label="Salutation" required>
                              {titles.map((title) => (
                                <option key={title}>{title}</option>
                              ))}
                            </FormSelect>
                            <FormTextField
                              {...getNameProp('position')}
                              label="Position"
                              value={position!}
                              onChange={(e) => setPosition(e.target.value)}
                              errors={fetcher.data?.fieldErrors?.position}
                              required
                            />
                            <FormTextField
                              {...getNameProp('repEmail')}
                              label="Email"
                              value={repEmail}
                              onChange={(e) => setRepEmail(e.target.value)}
                              errors={fetcher.data?.fieldErrors?.repEmail}
                              required />
                            <FormPhoneNumberTextField
                              name=""
                              label="Mobile"
                              value={repPhone}
                              onChange={(repPhone) => setRepPhone(repPhone)}
                              defaultCountry="BW"
                              required
                            />
                            <input type="text" {...getNameProp('repPhone')} value={repPhone} hidden />
                            <input type="text" {...getNameProp('telephone')} value={telephoneOrganisation} hidden />
                          </div>

                        </div>
                      )}
                      {clientType === 'Individual' && (
                        <div className="flex flex-col items-stretch">
                          <div className="grid grid-cols-3 gap-6">
                            <input type="hidden" {...getNameProp('companyName')} value="" />
                            <input type="hidden" {...getNameProp('position')} value="" />
                            <input type="hidden" {...getNameProp('repEmail')} value="" />
                            <input type="hidden" {...getNameProp('repPhone')} value="" />

                            <FormTextField {...getNameProp('firstName')}
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              errors={fetcher.data?.fieldErrors?.firstName}
                              label='First Name' required />
                            <FormTextField {...getNameProp('lastName')}
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              errors={fetcher.data?.fieldErrors?.lastName}
                              label="Last Name" required />
                            <FormSelect {...getNameProp('title')}
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              label="Salutation" required>
                              {titles.map((title) => (
                                <option key={title}>{title}</option>
                              ))}
                            </FormSelect>
                            <FormTextField
                              {...getNameProp('postalAddress')}
                              value={postalAddress!}
                              onChange={(e) => setPostalAddress(e.target.value)}
                              label="Postal Address"
                              errors={fetcher.data?.fieldErrors?.postalAddress}
                            />
                            <FormTextField
                              {...getNameProp('postalCode')}
                              value={postalCode!}
                              onChange={(e) => setPostalCode(e.target.value)}
                              label="Postal Code"
                            />

                            <FormPhoneNumberTextField
                              name=""
                              label="Phone"
                              value={telephoneIndividual}
                              onChange={(telephone) => setTelephoneIndividual(telephone)}
                              defaultCountry="BW"
                              required
                            />

                            <FormTextField
                              {...getNameProp('email')}
                              type="email"
                              label="Email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required />


                            <FormTextField
                              {...getNameProp('phyAddress')}
                              hidden
                              value={plotNum + ', ' + neighbourhood + ', ' + location}
                              onChange={(e) => setPhyAddress(e.target.value)}
                              errors={fetcher.data?.fieldErrors?.phyAddress}
                              required
                            />

                            <input type="text" {...getNameProp('telephone')} value={telephoneIndividual} hidden />
                          </div>
                        </div>

                      )}

                    </div>
                  </div>
                  <div className="grid grid-col-1 items-stretch p-4">
                    <Card className="grid grid-cols-1 p-4">
                      <CardHeader className="flex flex-col items-center gap-10">
                        <h2 className="text-l  font-semibold">Property Details</h2>
                      </CardHeader>
                      <div className="grid grid-cols-3 gap-6">
                        <FormTextField
                          {...getNameProp('plotNum')}
                          label="Plot Number"
                          value={plotNum}
                          onChange={(e) => setPlotNum(e.target.value)}
                          errors={fetcher.data?.fieldErrors?.plotNum}
                          required />
                        <FormTextField
                          {...getNameProp('plotExtent')}
                          label="Plot Size (sqm)"
                          required
                          value={plotExtent}
                          onChange={(e) => setPlotExtent(e.target.value)}
                          errors={fetcher.data?.fieldErrors?.plotExtent}
                        />
                        <TownNeighborhoodSelector onSelectionChange={handleSelectionChange} />
                        <FormSelect
                          {...getNameProp('message')}
                          label="Purpose of Valuation"
                          value={message}
                          // required
                          onChange={(e) => setMessage(e.target.value as PurposeOfValuation)}
                        >
                          <option value={PurposeOfValuation.Forecolsure}>{PurposeOfValuation.Forecolsure}</option>
                          <option value={PurposeOfValuation.NewMortgageApplication}>{PurposeOfValuation.NewMortgageApplication}</option>
                          <option value={PurposeOfValuation.MortgageReview}>{PurposeOfValuation.MortgageReview}</option>
                          <option value={PurposeOfValuation.Refinancing}>{PurposeOfValuation.Refinancing}</option>
                        </FormSelect>
                        <div className="grid grid-cols-2 rounded-lg px-0 gap-2">
                          <div className="flex flex-col">
                            <FormSelect
                              {...getNameProp('valuationType')}
                              label="Select Property Type"
                              value={valuationType}
                              onChange={(e) => setValuationType(e.target.value as ValuationType)}
                            >
                              <option value={ValuationType.Residential}>{ValuationType.Residential}</option>
                              <option value={ValuationType.Commercial}>{ValuationType.Commercial}</option>
                            </FormSelect>
                          </div>
                          <div className="flex flex-col">
                            <FormSelect
                              {...getNameProp('valuationKind')}
                              label="Select Valuation Type"
                              value={valuationKind}
                              onChange={(e) => setValuationKind(e.target.value as ValuationKind)}
                            >
                              <option value={ValuationKind.Normal}>{ValuationKind.Normal}</option>
                              <option value={ValuationKind.Desktop}>{ValuationKind.Desktop}</option>
                            </FormSelect>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 rounded-lg px-0 gap-2">
                          <div className="flex flex-col">
                            <FormTextField
                              {...getNameProp('titleDeedNum')}
                              label="Title Deed Number"
                              value={titleDeedNum}
                              onChange={(e) => setTitleDeedNum(e.target.value)}
                              errors={fetcher.data?.fieldErrors?.titleDeedNum}
                              required
                            />
                          </div>
                          <div className="flex flex-col">
                            <FormTextField
                              label="Title Deed Date"
                              type="date"
                              {...getNameProp('titleDeedDate')}
                              value={titleDeedDate ? new Date(titleDeedDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => setTitleDeedDate(e.target.value)}
                            />
                          </div>
                        </div>
                        <FormSelect
                          {...getNameProp('userId')}
                          label="Select Valuer"
                          onChange={handleUserIdChange}
                        >
                          <option key={'xxx'} value={''}>
                            -- Recipient of instruction --
                          </option>
                          {allUsers.map(group => (
                            <option key={group.id} value={group.id}>
                              {group.UserGroup?.company.CompanyName + ' - ' + group.firstName + ' ' + group.lastName}
                            </option>
                          ))}
                        </FormSelect>

                        <FormTextArea
                          {...getNameProp('messageBody')}
                          label="Additional Information (optional)"
                          value={messageBody}
                          onChange={(e) => setMessageBody(e.target.value)}
                        />

                        <FormSelect
                          {...getNameProp('classification')}
                          hidden
                          value={classification}
                          onChange={(e) => setClassification(e.target.value)}
                        >
                          <option value={ValuationType.Residential}>{ValuationType.Residential}</option>
                          <option value={ValuationType.Commercial}>{ValuationType.Commercial}</option>
                        </FormSelect>
                        <FormTextField
                          {...getNameProp('neighbourhood')}
                          // label="Neighbourhood"
                          value={selectedNeighborhood!}
                          onChange={(e) => setNeighbourhood(e.target.value)}
                          hidden
                          required />
                        <FormTextField
                          {...getNameProp('location')}
                          // label="Location"
                          value={selectedTown!}
                          onChange={(e) => setLocation(e.target.value)}
                          hidden
                          required />
                        <input hidden type="text" {...getNameProp('createdById')} defaultValue={currentUser.id} />
                        <input hidden type="checkbox" {...getNameProp('approved')} defaultChecked={false} />
                        <input hidden type="text" {...getNameProp('approvedById')} defaultValue={currentUser.id} />
                        <input hidden type="text" {...getNameProp('companyId')} value={selectedCompanyId} />
                        <input hidden type="text" {...getNameProp('clientType')} value={clientType} />
                      </div>
                    </Card>
                    {hasFormError(fetcher.data) && <InlineAlert>{fetcher.data.formError}</InlineAlert>}
                  </div>
                  <CardHeader className="flex flex-row items-center gap-4" topBorder>
                    <BackButton />
                    <div className="grow" />
                    <NextButton type="submit" isProcessing={isProcessing} />
                  </CardHeader>
                </Card>
              </ActionContextProvider>
            </fetcher.Form>
          </TabPanel>
          <TabPanel
            header={
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = AppLinks.ValuationReports;
                }}
              >
                Valuation Reports
              </span>
            }
            className="p-2"
            headerClassName={`${activeIndex === 3 ? 'active-tab' : 'default-tab'}`}
          >
          </TabPanel>

        </TabView>
      </div>
    </div>

  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}