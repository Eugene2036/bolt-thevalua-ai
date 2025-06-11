import type { ActionArgs, LoaderArgs } from '@remix-run/node';
import type { FormFields } from '~/models/forms';

import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import BackButton from '~/components/BackButton';
import { RouteErrorBoundary } from '~/components/Boundaries';
import { Card } from '~/components/Card';
import { CardHeader } from '~/components/CardHeader';
import { FormTextField } from '~/components/FormTextField';
import { InlineAlert } from '~/components/InlineAlert';
import { SecondaryButton } from '~/components/SecondaryButton';
import { prisma } from '~/db.server';
import { badRequest, getValidatedId, processBadRequest, StatusCode, RequiredImageIdSchema } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFieldErrors, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { requireUserId } from '~/session.server';
import { createHashedPassword } from '~/models/user.server';
import dayjs from 'dayjs';
import { ProfilePic } from '~/components/ProfilePic';
import { AddProfilePicImage } from '~/components/AddProfilePicImage';
import { Toaster, toast } from 'sonner';
import { ProfileSignatureImage } from '~/components/ProfileSignatureImage';
import { AddProfileSignature } from '~/components/AddProfileSignature';
import { FormPhoneNumberTextField } from '~/components/FormPhoneNumberTextField';


export async function loader({ request, params }: LoaderArgs) {
  await requireUserId(request);
  console.log("Received params:", params);


  // Retrieve the user id from query below
  const selectedUser = await prisma.user.findUnique({ where: { email: params.email } });
  if (!selectedUser) {
    throw new Response('User not found', {
      status: StatusCode.NotFound,
    });
  }
  const userId = selectedUser.id;

  const [user, plots] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.plot
      .findMany({
        where: { valuedById: userId },
        include: {
          valuers: true,
          tenants: true,
          parkingRecords: true,
          outgoingRecords: true,
          insuranceRecords: true,
          grcRecords: true,
          storedValues: true,
          grcFeeRecords: true,
          mvRecords: true,
          grcDeprRecords: true,
        },
      })
      .then((plots) => {
        return plots.map((plot) => {
          return {
            ...plot,
            undevelopedPortion: Number(plot.undevelopedPortion),
            rateForUndevelopedPortion: Number(plot.rateForUndevelopedPortion),
            plotExtent: Number(plot.plotExtent),
            tenants: plot.tenants.map((tenant) => ({
              ...tenant,
              startDate: dayjs(tenant.startDate).format('YYYY-MM-DD'),
              endDate: dayjs(tenant.endDate).format('YYYY-MM-DD'),
              remMonths: dayjs(tenant.endDate).diff(dayjs(), 'month'),
              grossMonthlyRental: Number(tenant.grossMonthlyRental),
              escalation: Number(tenant.escalation),
              areaPerClient: Number(tenant.areaPerClient),
              areaPerMarket: Number(tenant.areaPerMarket),
              ratePerMarket: Number(tenant.ratePerMarket),
            })),
            parkingRecords: plot.parkingRecords.map((record) => ({
              ...record,
              ratePerClient: Number(record.ratePerClient),
              ratePerMarket: Number(record.ratePerMarket),
            })),
            outgoingRecords: plot.outgoingRecords
              .sort((a, b) => {
                const sortOrder: Record<string, number> = {
                  '12': 1,
                  '1': 2,
                  '%': 3,
                } as const;
                return sortOrder[a.itemType || '12'] - sortOrder[b.itemType || '12'];
              })
              .map((record) => ({
                ...record,
                itemType: record.itemType || undefined,
                unitPerClient: Number(record.unitPerClient),
                ratePerClient: Number(record.ratePerClient),
                ratePerMarket: Number(record.ratePerMarket),
              })),
            insuranceRecords: plot.insuranceRecords.map((record) => ({
              ...record,
              rate: Number(record.rate),
              area: Number(record.area),
            })),
            grcRecords: plot.grcRecords.map((record) => ({
              ...record,
              bull: record.bull || false,
              size: Number(record.size),
              rate: Number(record.rate),
            })),
            grcFeeRecords: plot.grcFeeRecords.map((record) => ({
              ...record,
              perc: Number(record.perc),
            })),
            mvRecords: plot.mvRecords.map((record) => ({
              ...record,
              size: Number(record.size),
              // date: dayjs(record.date).format('YYYY-MM-DD'),
              price: Number(record.price),
            })),
            grcDeprRecords: (() => {
              const records = plot.grcDeprRecords.map((record) => ({
                ...record,
                perc: Number(record.perc),
              }));
              if (records.length) {
                return records;
              }
              return [{ id: '', identifier: '', perc: 0 }];
            })(),
          };
        });
      }),
  ]);
  if (!user) {
    throw new Response('User record not found', {
      status: StatusCode.NotFound,
    });
  }

  return json({ user, plots, userId });
}

const Schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string(),
  passwordConfirmation: z.string(),
  practicingCertificate: z.string(),
  practicingCertificateNum: z.string(),
  postalAddress: z.string(),
  physicalAddress: z.string(),
  email: z.string().email(),
  phone: z.string(),
  firm: z.string(),
  profilePic: RequiredImageIdSchema,
  profileSignature: RequiredImageIdSchema,
}).refine((arg) => arg.password === arg.passwordConfirmation, {
  message: "Passwords don't match",
  path: ['passwordConfirmation'],
});


export async function action({ request, params }: ActionArgs) {
  const currentUserId = await requireUserId(request);

  try {
    const id = getValidatedId(currentUserId);
    const fields = await getRawFormFields(request);
    const result = Schema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { email, password, firstName, lastName, practicingCertificate,
      practicingCertificateNum, postalAddress, physicalAddress, phone, firm, profilePic, profileSignature } = result.data;

    await prisma.$transaction(async (tx) => {
      if (password) {
        await tx.password.updateMany({
          where: { userId: id },
          data: { hash: await createHashedPassword(password) },
        });
      }
      const records = await tx.password.findMany({
        where: { userId: id },
      });
      for (let record of records) {
        await tx.event.create({
          data: {
            userId: currentUserId,
            domain: EventDomain.Password,
            action: EventAction.Update,
            recordId: record.userId,
            recordData: JSON.stringify(record),
          },
        });
      }
      const displayPic = profilePic === '' ? null : profilePic;
      const updated = await tx.user.update({
        where: { id },
        data: {
          email, firstName, lastName, practicingCertificate, practicingCertificateNum,
          postalAddress, physicalAddress, phone, firm, profilePic: displayPic, profileSignature
        },
      });
      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.User,
          action: EventAction.Update,
          recordId: updated.id,
          recordData: JSON.stringify(updated),
        },
      });
      toast.success('User Profile Information Updated...');

      await tx.event.create({
        data: {
          userId: currentUserId,
          domain: EventDomain.Valuer,
          action: EventAction.Update,
          recordId: updated.id,
          recordData: JSON.stringify(updated),
        },
      });
    });

    const getBanker = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (getBanker?.isBanker === true) {
      return redirect(AppLinks.Instructions);
    }
    return redirect(AppLinks.UserProfile(id));
  } catch (error) {
    return badRequest({ formError: getErrorMessage(error) });
  }
}

export default function EditUserProfileDetails() {
  const { user, plots } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const numValuations = plots.length;
  const perc = user.target ? numValuations / user.target : 0;

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);

  const [accepted, setAccepted] = useState(false);
  const [open, setOpen] = useState(false);

  const defaultValues: FormFields<keyof z.infer<typeof Schema>> = {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    password: '',
    passwordConfirmation: '',
    practicingCertificate: user?.practicingCertificate || '',
    practicingCertificateNum: user?.practicingCertificateNum || '',
    postalAddress: user?.postalAddress || '',
    physicalAddress: user?.physicalAddress || '',
    phone: user?.phone || '',
    email: user?.email || '',
    firm: user?.firm,
    profilePic: user?.profilePic!,
    profileSignature: user?.profileSignature!,
  };

  const profilePicError = (() => {
    if (!hasFieldErrors(fetcher.data)) {
      return undefined;
    }
    const fieldError = fetcher.data.fieldErrors[getNameProp('profilePic').name];
    if (!fieldError) {
      return undefined;
    }
    return fieldError.join(', ');
  })();

  const profileSignatureError = (() => {
    if (!hasFieldErrors(fetcher.data)) {
      return undefined;
    }
    const fieldError = fetcher.data.fieldErrors[getNameProp('profileSignature').name];
    if (!fieldError) {
      return undefined;
    }
    return fieldError.join(', ');
  })();

  const decl = useMemo(() => {
    return 'We confirm that we do not have any pecuniary interest that would conflict with the proper valuation of the subject property';
  }, []);

  // NAKE CERTAIN TEXT FIELDS EDITABLE BUT WITH DEFAULT VALUES
  const [firstName, setFirstName] = useState(user?.firstName);
  const [lastName, setLastName] = useState(user?.lastName);
  const [practicingCertificate, setPracticingCertificate] = useState(user?.practicingCertificate);
  const [practicingCertificateNum, setPracticingCertificateNum] = useState(user?.practicingCertificateNum);
  const [postalAddress, setPostalAddress] = useState(user?.postalAddress);
  const [physicalAddress, setPhysicalAddress] = useState(user?.physicalAddress);
  const [telephone, setTelephone] = useState(user?.phone);
  const [email, setEmail] = useState(user?.email);
  const [firm, setFirm] = useState(user?.firm);
  const [profilePic, setProfilePic] = useState(user?.profilePic);
  const [profileSignature, setProfileSignature] = useState(user?.profileSignature);

  return (
    <div className="grid grid-cols-1 gap-6 p-6 bg-gray-50">
      <div className="flex flex-col items-center gap-6">
        <fetcher.Form method="post" className="flex flex-col items-stretch gap-6">
          <ActionContextProvider {...fetcher.data} fields={fetcher.data?.fields || defaultValues} isSubmitting={isProcessing}>
            <div className="grid grid-cols-3 gap-6">
              <div className="flex flex-col items-stretch gap-6 col-span-3 pt-6">
                <Card>
                  <CardHeader className="flex flex-col items-center gap-4">
                    <h2 className="text-xl font-semibold">Update Profile Details</h2>
                  </CardHeader>
                  <div className="flex flex-col items-stretch p-4 gap-4">
                    <div className="grid grid-cols-3 gap-6">
                      <FormTextField
                        {...getNameProp('firstName')}
                        label="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required />
                      <FormTextField
                        {...getNameProp('lastName')}
                        label="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required />
                      <div className="grid grid-cols-2 items-center text-center min-w-full gap-6">
                        <div className="flex flex-col items-center justify-center" >
                          {/* Profile Picture */}
                          {!!profilePic && <ProfilePic key={profilePic} imageId={profilePic} removeImage={() => setProfilePic(null)} />}
                          {!profilePic && (
                            <AddProfilePicImage
                              handleUploadedImages={(imageIds) => {
                                const newImageId = imageIds.length ? imageIds[0] : '';
                                setProfilePic(newImageId);
                              }}
                              singleUpload
                            />
                          )}
                        </div>

                        {user.isSignatory && (
                          <div className="flex flex-col items-center justify-center" >
                            {/* Signature Picture */}
                            {!!profileSignature && <ProfileSignatureImage key={profileSignature} imageId={profileSignature} removeImage={() => setProfileSignature(null)} />}
                            {!profileSignature && (
                              <AddProfileSignature
                                handleUploadedImages={(imageIds) => {
                                  const newImageId = imageIds.length ? imageIds[0] : '';
                                  setProfileSignature(newImageId);
                                }}
                                singleUpload
                              />
                            )}

                            {!!profileSignatureError && <InlineAlert>{profileSignatureError}</InlineAlert>}
                          </div>
                        )}
                      </div>

                      {!!profilePicError && <InlineAlert>{profilePicError}</InlineAlert>}
                      <input type="hidden" {...getNameProp('profilePic')} value={profilePic!} />
                      <input type="hidden" {...getNameProp('profileSignature')} value={profileSignature!} />
                      <FormTextField
                        {...getNameProp('practicingCertificate')}
                        label="Professional Body"
                        value={practicingCertificate}
                        onChange={(e) => setPracticingCertificate(e.target.value)}
                        errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['practicingCertificate'] : undefined}
                      />
                      <FormTextField {...getNameProp('password')} label="Password" type="password" />
                      <FormTextField
                        {...getNameProp('passwordConfirmation')}
                        label="Re-Enter Password"
                        type="password"
                        errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['passwordConfirmation'] : undefined}
                      />
                      <FormTextField
                        {...getNameProp('practicingCertificateNum')}
                        label="Practicing / Certificate No."
                        value={practicingCertificateNum!}
                        onChange={(e) => setPracticingCertificateNum(e.target.value)}
                        errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['practicingCertificateNum'] : undefined}
                      />
                      <FormTextField
                        {...getNameProp('firm')}
                        label="Firm"
                        value={firm}
                        defaultValue={firm}
                        onChange={(e) => setFirm(e.target.value)}
                        errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['firm'] : undefined}
                      />
                      <FormPhoneNumberTextField
                        name=""
                        label="Phone"
                        value={telephone}
                        onChange={(telephone) => setTelephone(telephone)}
                        defaultCountry="BW"
                        required
                      />
                      <FormTextField
                        {...getNameProp('email')}
                        type="email"
                        label="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['email'] : undefined}
                      />
                      <FormTextField
                        {...getNameProp('postalAddress')}
                        label="Postal Address"
                        value={String(postalAddress)}
                        onChange={(e) => setPostalAddress(e.target.value)}
                        errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['postalAddress'] : undefined}
                      />
                      <FormTextField
                        {...getNameProp('physicalAddress')}
                        label="Physical Address"
                        value={physicalAddress}
                        onChange={(e) => setPhysicalAddress(e.target.value)}
                        errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['physicalAddress'] : undefined}
                      />
                      <FormTextField
                        {...getNameProp('phone')}
                        type="tel"
                        value={telephone}
                        onChange={(e) => setTelephone(e.target.value)}
                        errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['phone'] : undefined}
                        hidden
                      />
                      <div className="grow"></div>

                      <div className="grow"></div>
                    </div>
                    {/* <input type="hidden" {...getNameProp('declaration')} value={accepted.toString()} /> */}
                    {hasFormError(fetcher.data) && <InlineAlert>{fetcher.data.formError}</InlineAlert>}
                  </div>
                  <CardHeader className="flex flex-col items-stretch" topBorder>
                    <div className="flex flex-row items-center">
                      <BackButton />
                      <div className="grow" />
                      <Toaster />
                      <SecondaryButton type="submit" disabled={isProcessing}>
                        {isProcessing ? 'UPDATING...' : 'UPDATE'}
                      </SecondaryButton>
                    </div>
                  </CardHeader>
                </Card>

              </div>
            </div>
          </ActionContextProvider>
        </fetcher.Form >
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}