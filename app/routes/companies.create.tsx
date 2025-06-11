import type { ActionArgs } from '@remix-run/node';

import { redirect } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { z } from 'zod';

import { ActionContextProvider, useForm } from '~/components/ActionContextProvider';
import { FormTextField } from '~/components/FormTextField';
import { InlineAlert } from '~/components/InlineAlert';
import { PrimaryButton } from '~/components/PrimaryButton';
import { badRequest, processBadRequest } from '~/models/core.validations';
import { getErrorMessage } from '~/models/errors';
import { getRawFormFields, hasFieldErrors, hasFormError } from '~/models/forms';
import { AppLinks } from '~/models/links';
import { CreateCompany } from '~/models/company.server';
import { requireUserId } from '~/session.server';
import { useState } from 'react';
import { Card } from '~/components/Card';
import { CardHeader } from '~/components/CardHeader';
import { FormPhoneNumberTextField } from '~/components/FormPhoneNumberTextField';

const Schema = z
    .object({
        FirstName: z.coerce.string().min(1),
        LastName: z.coerce.string().min(1),
        FullName: z.coerce.string().min(1),
        CompanyName: z.coerce.string().min(1),
        LocationAddress: z.coerce.string().min(1),
        PostalAddress: z.coerce.string(),
        Phone: z.coerce.string().min(1),
        Mobile: z.coerce.string().min(1),
        Fax: z.coerce.string() || '',
        Email: z.coerce.string().email().min(3),
        Website: z.coerce.string() || '',
        // LogoLink: z.string().min(1) || '',
    });

export async function action({ request }: ActionArgs) {
    const currentUserId = await requireUserId(request);
    try {
        const fields = await getRawFormFields(request);
        const result = Schema.safeParse(fields);

        console.log('USER ID: ' + currentUserId)
        console.log('RESULT VALUE: ' + result.error)

        if (!result.success) {
            return processBadRequest(result.error, fields);
        }

        const { ...restOfData } = result.data;
        await CreateCompany({ ...restOfData }, currentUserId);

        return redirect(AppLinks.Companies);
    } catch (error) {
        return badRequest({ formError: getErrorMessage(error) });
    }
}

export default function CreateCompanyPage() {
    const fetcher = useFetcher<typeof action>();
    const { isProcessing, getNameProp } = useForm(fetcher, Schema);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    const [phone, setPhone] = useState("");
    const [mobile, setMobile] = useState("");
    const [fax, setFax] = useState("");

    return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
            <span className="text-xl font-semibold">Create New Company</span>
            <fetcher.Form method="post" className="flex flex-col items-stretch w-[80%] gap-4">
                <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
                    <Card className="flex flex-col items-stretch gap-2 p-2 pt-2">
                        <CardHeader className="flex flex-row items-center gap-4 p-2 w-full">
                            <h1 >Company Information</h1>
                        </CardHeader>
                        <div className="grid grid-cols-2 gap-6 py-4">
                            <FormTextField
                                {...getNameProp('CompanyName')}
                                label="Company"
                                errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['CompanyName'] : undefined}
                            />
                            <FormTextField
                                {...getNameProp('LocationAddress')}
                                label="Location Address"
                                errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['LocationAddress'] : undefined}
                            />
                            <FormTextField
                                {...getNameProp('PostalAddress')}
                                label="Postal Address"
                            // errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['PostalAddress'] : undefined}
                            />
                            <input type="text" {...getNameProp('Phone')} value={phone} hidden />
                            <FormPhoneNumberTextField
                                name="Phone"
                                label="Phone"
                                onChange={(phone) => setPhone(phone)}
                                defaultCountry="BW"
                                required value={''} />
                            <input type="text" {...getNameProp('Fax')} value={fax} hidden />
                            <FormPhoneNumberTextField
                                name="Fax"
                                label="Fax"
                                onChange={(fax) => setFax(fax)}
                                defaultCountry="BW"
                                required value={''} />
                            <FormTextField
                                {...getNameProp('Website')}
                                label="Website"
                                errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['Website'] : undefined}
                            />
                        </div>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-4 p-2 w-full">
                            <h1 >Representative Information</h1>
                        </CardHeader>
                        <div className="grid grid-cols-2 gap-2 p-2">
                            <div className="flex flex-col">
                                <FormTextField
                                    {...getNameProp('FirstName')}
                                    label="First Name"
                                    errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['FullName'] : undefined}
                                    value={String(firstName)} onChange={(e) => setFirstName(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col">
                                <FormTextField
                                    {...getNameProp('LastName')}
                                    label="Last Name"
                                    errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['FullName'] : undefined}
                                    value={String(lastName)} onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col">
                                <FormTextField
                                    {...getNameProp('Email')}
                                    label="Email (specify login email for this new company)"
                                    type='email'
                                    errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['Email'] : undefined}
                                />
                            </div>
                            <div className="flex flex-col">
                                <input type="text" {...getNameProp('Mobile')} value={mobile} hidden />
                                <FormPhoneNumberTextField
                                    name="Mobile"
                                    label="Mobile"
                                    onChange={(mobile) => setMobile(mobile)}
                                    defaultCountry="BW"
                                    required value={''} />
                            </div>
                            <FormTextField
                                hidden
                                {...getNameProp('FullName')}
                                // label="Company Representative's Full Name"
                                value={firstName + ' ' + lastName}
                                errors={hasFieldErrors(fetcher.data) ? fetcher.data.fieldErrors['FullName'] : undefined}
                            />
                        </div>

                    </Card>
                    {hasFormError(fetcher.data) && (
                        <div className="flex flex-col items-stretch py-4">
                            <InlineAlert>{fetcher.data.formError}</InlineAlert>
                        </div>
                    )}
                    <div className="flex flex-col items-stretch py-4">
                        <PrimaryButton type="submit" disabled={isProcessing}>
                            {isProcessing ? 'Creating Company...' : 'Create Company'}
                        </PrimaryButton>
                    </div>
                </ActionContextProvider>
            </fetcher.Form>
        </div>
    );
}
