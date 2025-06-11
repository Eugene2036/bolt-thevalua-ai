import type { ActionArgs, LoaderArgs } from '@remix-run/node';

import { Response, json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { useState } from 'react';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { AddImage } from '~/components/AddImage';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton } from '~/components/PrimaryButton';
import { TextArea } from '~/components/TextArea';
import { TextField } from '~/components/TextField';
import { prisma } from '~/db.server';
import { StatusCode, badRequest, getValidatedId, processBadRequest, safeJsonParse, RequiredImageIdSchema } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { EventAction, EventDomain } from '~/models/events';
import { getRawFormFields, hasFieldErrors, hasFields, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { Image } from '~/components/Image';
import { requireUserId, requireUser } from '~/session.server';
import { AddMultipleImages } from '~/components/AddMultipleImages';
import { FormPhoneNumberTextField } from '~/components/FormPhoneNumberTextField';

var cantEdit: boolean = false;

export async function loader({ request, params }: LoaderArgs) {
    const id = getValidatedId(params.id);
    const currentUser = await requireUser(request);

    const company = await prisma.company.findUnique({
        where: { id },
        include: {
            CompanyImage: true,
        }
    });
    if (!company) {
        throw new Response('Company record not found, please try again or create create a new company', {
            status: StatusCode.NotFound,
        });
    }

    cantEdit = currentUser.isBanker === true ? true : false;

    return json({ company, cantEdit });
}

const Schema = z
    .object({
        // id: z.string().min(1),
        FullName: z.string().min(1),
        CompanyName: z.string().min(1),
        LocationAddress: z.string().min(1),
        PostalAddress: z.string().min(1),
        Phone: z.string(),
        Mobile: z.string(),
        Fax: z.string() || '',
        Email: z.string().email().min(3),
        Website: z.string().min(1) || '',
        LogoLink: z.string().min(1) || '',
        headerTitle: z.string().min(1),
        footerNote: z.string().min(1),
        imageIds: z.preprocess(safeJsonParse, z.array(RequiredImageIdSchema)),
    });



export const action = async ({ params, request }: ActionArgs) => {
    // export async function action({ request, params }: ActionArgs) {
    const currentUserId = await requireUserId(request);

    try {
        const companyId = getValidatedId(params.id);
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);

        console.log('COMAPANY ID: ' + companyId)
        console.log('QUERY ERROR RESULT: ' + result.error + '\n QUERY SUCCESS RESULT: ' + result.success)

        if (!result.success) {
            return processBadRequest(result.error, fields);
        }
        const {
            FullName,
            CompanyName,
            LocationAddress,
            PostalAddress,
            Phone,
            Mobile,
            Fax,
            Email,
            Website,
            LogoLink,
            headerTitle,
            footerNote,
            imageIds
        } = result.data;

        if (!imageIds.length) {
            return badRequest({ formError: 'Provide logos of the company partners' });
        }

        await prisma.$transaction(async (tx) => {

            const updated = await tx.company.update({
                where: { id: companyId },
                data: {
                    FullName,
                    CompanyName,
                    LocationAddress,
                    PostalAddress,
                    Phone,
                    Mobile,
                    Fax,
                    Email,
                    Website,
                    LogoLink,
                    headerTitle,
                    footerNote,
                },
            });
            await tx.event.create({
                data: {
                    userId: currentUserId,
                    domain: EventDomain.Company,
                    action: EventAction.Update,
                    recordId: updated.id,
                    recordData: JSON.stringify(updated),
                },
            });

            await tx.companyImage.deleteMany({
                where: { companyId },
            });
            await tx.companyImage.createMany({
                data: imageIds.map((imageId) => ({
                    imageId,
                    companyId,
                })),
            });

            const images = await tx.companyImage.findMany({
                where: { companyId },
            });
            await tx.event.createMany({
                data: images.map((image) => ({
                    userId: currentUserId,
                    domain: EventDomain.CompanyImage,
                    action: EventAction.Create,
                    recordId: image.id,
                    recordData: JSON.stringify(image),
                })),
            });

        });

        return redirect(AppLinks.Companies);
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}


export default function EditCompanyPage() {
    const { company, cantEdit } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();

    const { isProcessing, getNameProp } = useForm(fetcher, Schema);

    const [logoLink, setLogoLink] = useState(company.LogoLink || '');

    const [imageIds, setImageIds] = useState<string[]>(company.CompanyImage.map((imageId) => imageId.imageId) || []);
    const addImages = (imageIds: string[]) => setImageIds((prevState) => [...prevState, ...imageIds]);
    const removeImage = (imageId: string) => setImageIds((prevState) => prevState.filter((id) => id !== imageId));

    const defaultValues: Record<keyof z.infer<typeof Schema>, string> = {
        // id: company.id,
        FullName: company.FullName,
        CompanyName: company.CompanyName,
        LocationAddress: company.LocationAddress,
        PostalAddress: company.PostalAddress,
        Phone: company.Phone,
        Mobile: company.Mobile,
        Fax: company.Fax || '',
        Email: company.Email,
        Website: company.Website || '',
        LogoLink: company.LogoLink || '',
        headerTitle: company.headerTitle || 'REAL PROPERTY VALUATION REPORT',
        footerNote: company.footerNote || 'Report prepared by ' + company.CompanyName,
        imageIds: JSON.stringify(company.CompanyImage.map((image) => image.imageId)),
    };

    const coverImageError = (() => {
        const fetcher = useFetcher<typeof action>();
        if (!hasFieldErrors(fetcher.data)) {
            return undefined;
        }
        const fieldError = fetcher.data.fieldErrors['LogoLink'];
        if (!fieldError) {
            return undefined;
        }
        return fieldError.join(', ');
    })();

    const imagesError = (() => {
        if (!hasFieldErrors(fetcher.data)) {
            return undefined;
        }
        const fieldError = fetcher.data.fieldErrors[getNameProp('imageIds').name];
        if (!fieldError) {
            return undefined;
        }
        return fieldError.join(', ');
    })();

    const [phone, setPhone] = useState(company.Phone || '');
    const [mobile, setMobile] = useState(company.Mobile || '');

    return (
        <div className="flex flex-col items-center h-full gap-6 py-8">
            <span className="text-xl font-semibold">Edit Company Details</span>
            <fetcher.Form method="post" className="flex flex-col items-stretch w-[80%]">
                <ActionContextProvider {...fetcher.data} fields={hasFields(fetcher.data) ? fetcher.data.fields : defaultValues} isSubmitting={isProcessing} disabled={cantEdit}>
                    <div className="grid grid-cols-3 gap-6 py-4">
                        {/* <input type='hidden' defaultValue={company.id} /> */}
                        <input type="hidden" {...getNameProp('Phone')} value={phone} />
                        <input type="hidden" {...getNameProp('Mobile')} value={mobile} />
                        <TextField
                            disabled={cantEdit}
                            {...getNameProp('FullName')}
                            defaultValue={company.FullName}
                            label="Full Name"
                            errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['FullName'] : undefined}
                        />
                        <TextField
                            disabled={cantEdit}
                            {...getNameProp('CompanyName')}
                            defaultValue={company.CompanyName}
                            label="Company"
                            errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['CompanyName'] : undefined}
                        />
                        <TextArea
                            disabled={cantEdit}
                            {...getNameProp('LocationAddress')}
                            defaultValue={company.LocationAddress}
                            label="Physical Address"
                            errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['LocationAddress'] : undefined}
                        />
                        <TextArea
                            disabled={cantEdit}
                            {...getNameProp('PostalAddress')}
                            defaultValue={company.PostalAddress}
                            label="Postal Address"
                            errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['PostalAddress'] : undefined}
                        />

                        {
                            cantEdit && (
                                <TextField
                                    disabled={cantEdit}
                                    {...getNameProp('Phone')}
                                    defaultValue={company.Phone}
                                    label="Phone"
                                    errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['Phone'] : undefined}
                                />
                            )
                        }

                        {
                            !cantEdit && (
                                <FormPhoneNumberTextField
                                    {...getNameProp('Phone')}
                                    name="Phone"
                                    label="Phone"
                                    value={phone}
                                    onChange={(phone) => setPhone(phone)}
                                    defaultCountry="BW"
                                    required
                                />
                            )
                        }

                        {
                            cantEdit && (
                                <TextField
                                    disabled={cantEdit}
                                    {...getNameProp('Mobile')}
                                    defaultValue={company.Mobile}
                                    label="Mobile"
                                    errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['Mobile'] : undefined}
                                />
                            )
                        }

                        {
                            !cantEdit && (
                                <FormPhoneNumberTextField
                                    {...getNameProp('Mobile')}
                                    name="Mobile"
                                    label="Mobile"
                                    value={mobile}
                                    onChange={(mobile) => setMobile(mobile)}
                                    defaultCountry="BW"
                                    required
                                />
                            )
                        }

                        <TextField
                            disabled={cantEdit}
                            {...getNameProp('Fax')}
                            defaultValue={company.Fax || ''}
                            label="Fax"
                            errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['Fax'] : undefined}
                        />
                        <TextField
                            disabled={cantEdit}
                            {...getNameProp('Email')}
                            defaultValue={company.Email}
                            label="Email"
                            type='email'
                            errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['Email'] : undefined}
                        />
                        <TextField
                            disabled={cantEdit}
                            {...getNameProp('Website')}
                            defaultValue={company.Website || ''}
                            label="Website"
                            errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['Website'] : undefined}
                        />
                        <input type="hidden" {...getNameProp('LogoLink')} value={logoLink} />
                        <input type="hidden" {...getNameProp('imageIds')} value={JSON.stringify(imageIds)} />
                        <div className="flex flex-col items-stretch col-span-3 gap-2">
                            <span className="text-sm font-light text-stone-600">Logo Image</span>
                            <div className="grid grid-cols-3 gap-4">
                                {!!logoLink && <Image key={logoLink} imageId={logoLink} removeImage={() => setLogoLink('')} disabled={cantEdit} />}
                                {!logoLink && (
                                    <AddImage
                                        handleUploadedImages={(imageIds) => {
                                            const newImageId = imageIds.length ? imageIds[0] : '';
                                            setLogoLink(newImageId);
                                        }}
                                        singleUpload
                                    />
                                )}
                            </div>
                            {!!coverImageError && <InlineAlert>{coverImageError}</InlineAlert>}
                        </div>
                        <TextField
                            disabled={cantEdit}
                            {...getNameProp('headerTitle')}
                            defaultValue={company.headerTitle || 'REAL PROPERTY VALUATION REPORT'}
                            label="Report Header Title"
                            errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['headerTitle'] : undefined}
                        />
                        <TextField
                            disabled={cantEdit}
                            {...getNameProp('footerNote')}
                            defaultValue={company.footerNote || 'Report prepared by ' + company.CompanyName}
                            label="Footer Title"
                            errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['footerNote'] : undefined}
                        />
                        <div className="flex flex-col items-stretch col-span-3 gap-2">
                            <span className="text-sm font-light text-stone-600">Add partner logos</span>
                            <div className="grid grid-cols-4 gap-4">
                                {imageIds.map((imageId) => (
                                    <Image key={imageId} imageId={imageId} removeImage={() => removeImage(imageId)} disabled={cantEdit} />
                                ))}
                                {
                                    !cantEdit && (
                                        <AddMultipleImages handleUploadedImages={addImages} />
                                    )
                                }
                            </div>
                            {!!imagesError && <InlineAlert>{imagesError}</InlineAlert>}
                        </div>
                    </div>
                    {hasFormError(fetcher.data) && (
                        <div className="flex flex-col items-stretch py-4">
                            <InlineAlert>{fetcher.data.formError}</InlineAlert>
                        </div>
                    )}
                    <div className="flex flex-col items-stretch py-4">
                        <PrimaryButton type="submit" disabled={isProcessing || cantEdit}>
                            {isProcessing ? 'Updating Company...' : 'Update Company'}
                        </PrimaryButton>
                    </div>
                </ActionContextProvider>
            </fetcher.Form>
        </div>
    );
}