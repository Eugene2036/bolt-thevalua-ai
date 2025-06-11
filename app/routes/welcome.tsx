import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useFetcher, Form, useActionData, useNavigate, useSearchParams } from "@remix-run/react";
import { z } from "zod";
import { useState } from "react";

import {
  ActionContextProvider,
  useForm,
} from "~/components/ActionContextProvider";
import { RouteErrorBoundary } from "~/components/Boundaries";
import { FormTextField } from "~/components/FormTextField";
import { InlineAlert } from "~/components/InlineAlert";
import { PrimaryButton } from "~/components/PrimaryButton";
import { badRequest, getUserGroupValues, processBadRequest } from "~/models/core.validations";
import { getRawFormFields, hasFormError } from "~/models/forms";
import { AppLinks } from "~/models/links";
import { verifyLogin, firstTimeLoginSetPassword } from "~/models/user.server";
import { createUserSession, getUserId } from "~/session.server";
import Navbar from "~/components/NavBar";
import { prisma } from "~/db.server";
import { Footer } from "~/components/Footer";
import { toast } from "sonner";

export const loader = async ({ request }: LoaderArgs) => {
  await getUserId(request);
  return json({});
};

const LoginSchema = z.object({
  email: z.string().email().min(1),
  password: z.string(),
});

const PasswordResetSchema = z.object({
  email: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const action = async ({ request }: ActionArgs) => {
  const formData = await request.formData();
  const actionType = formData.get("_action");

  if (actionType === "passwordReset") {
    const fields = Object.fromEntries(formData);
    console.log("Fields: ", fields);

    const result = PasswordResetSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    console.log(result.data.email);
    const verificationToken = await prisma.user.findFirst({
      where: { email: result.data.email },
      select: { verToken: true },
    });
    console.log("Verification Token: ", verificationToken?.verToken);

    const { email, newPassword, confirmPassword } = result.data;
    if (!verificationToken) {
      return badRequest({ formError: "Verification token not found" });
    }

    try {
      await firstTimeLoginSetPassword(email, newPassword, {
        verToken: verificationToken.verToken || undefined,
        skipVerification: !verificationToken.verToken,
        enforceStrength: true,
      });
      toast.success("Password updated successfully");
      return redirect(AppLinks.Login);
    } catch (error) {
      return badRequest({
        formError: error instanceof Error ? error.message : "Failed to update password"
      });
    }
  } else {
    // Handle regular login
    const fields = await getRawFormFields(request);
    const result = LoginSchema.safeParse(fields);
    if (!result.success) {
      return processBadRequest(result.error, fields);
    }
    const { email, password } = result.data;

    const user = await verifyLogin(email, password);
    if (!user) {
      return badRequest({ formError: "Invalid credentials" });
    }

    const company = await prisma.user.findUnique({
      where: { id: user.id },
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

    const redirectTo = company?.UserGroup?.isInstructor
      ? AppLinks.Instructions
      : AppLinks.UserProfile(user.id);

    return createUserSession({
      redirectTo,
      remember: true,
      request,
      userId: user.id,
    });
  }
};

function FirstTimeLoginForm() {
  const fetcher = useFetcher<typeof action>();
  const { isProcessing, getNameProp } = useForm(fetcher, PasswordResetSchema);
  const [searchParams] = useSearchParams();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const [passwordShown, setPasswordShown] = useState(false);

  const defaultToken = searchParams.get('token') || '';

  if (actionData && 'success' in actionData && actionData.success) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 text-green-600">Success!</h2>
        <p className="mb-4">Your password has been updated successfully.</p>
        <PrimaryButton
          onClick={() => navigate(AppLinks.Login)}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Proceed to Login
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <fetcher.Form
        method="post"
        className="flex flex-col items-stretch gap-6"
      >
        <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
          <input type="hidden" name="_action" value="passwordReset" />
          <div className="flex flex-col justify-center items-center">
            <h1 className="text-xl font-semibold">Welcome</h1>
            <h3 className="text-l pt-4">
              Setup your new password to continue.
            </h3>
          </div>
          <FormTextField
            placeholder="Enter Email"
            {...getNameProp('email')}
            type="email"
            required
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="relative mt-1">
            <FormTextField
              placeholder="Enter New Password"
              {...getNameProp('newPassword')}
              type={passwordShown ? 'text' : 'password'}
              required
              minLength={8}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setPasswordShown(!passwordShown)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500"
            >
              {passwordShown ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Must be 8+ characters with 1 number, 1 symbol, and mixed case.
          </p>
          <FormTextField
            {...getNameProp('confirmPassword')}
            placeholder="Re-Enter New Password"
            type={passwordShown ? 'text' : 'password'}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />

          {hasFormError(fetcher.data) && (
            <div className="flex flex-col items-stretch py-4">
              <InlineAlert>{fetcher.data.formError}</InlineAlert>
            </div>
          )}

          <PrimaryButton type="submit" disabled={isProcessing} className="w-full mt-2" >
            {isProcessing ? 'Updating Password...' : 'Update Password'}
          </PrimaryButton>
        </ActionContextProvider>
      </fetcher.Form>
    </div>
  );
}

export default function FirstTimeLoginPage() {
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, LoginSchema);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow flex flex-col">
        <div className="mx-auto w-full max-w-[695px] px-8 pt-40">
          <FirstTimeLoginForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}