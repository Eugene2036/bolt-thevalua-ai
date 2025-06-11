import type { ActionArgs, LoaderArgs } from "@remix-run/node";

import { json } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import { z } from "zod";

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
import { verifyLogin } from "~/models/user.server";
import { createUserSession, getUserId } from "~/session.server";
import Navbar from "~/components/NavBar";
import { prisma } from "~/db.server";
import { Footer } from "~/components/Footer";
import { useState } from "react";

export const loader = async ({ request }: LoaderArgs) => {
  await getUserId(request);

  return json({});
};

const Schema = z.object({
  email: z.string().email().min(1),
  password: z.string(),
});
export const action = async ({ request }: ActionArgs) => {
  const fields = await getRawFormFields(request);
  const result = Schema.safeParse(fields);
  if (!result.success) {
    console.log("Validation failed:", result.error);
    return processBadRequest(result.error, fields);
  }
  const { email, password } = result.data;

  console.log("Start login for: ", email);

  const user = await verifyLogin(email, password);

  console.log('Login is Successfull...');

  if (!user) {
    console.log("User not found:", email);
    return badRequest({ formError: "Invalid credentials" });
  }

  // User Group Validation Query
  const accessValues = getUserGroupValues(user.id);

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

  if (company?.UserGroup?.isInstructor === true) {
    return createUserSession({
      redirectTo: AppLinks.Instructions,
      remember: true,
      request,
      userId: user.id,
    });
  } else {
    return createUserSession({
      redirectTo: AppLinks.UserProfile(user.id),
      remember: true,
      request,
      userId: user.id,
    });
  }
};

export default function LoginPage() {
  const fetcher = useFetcher<typeof action>();

  const { getNameProp, isProcessing } = useForm(fetcher, Schema);
  const [passwordShown, setPasswordShown] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow flex flex-col">
        <div className="mx-auto w-full max-w-[600px] px-8 pt-40">
          <fetcher.Form
            method="post"
            className="flex flex-col items-stretch gap-6"
          >
            <ActionContextProvider {...fetcher.data} isSubmitting={isProcessing}>
              <div className="flex flex-col justify-center items-center">
                <h1 className="text-xl font-semibold">Login Your Account</h1>
                <h3 className="text-l pt-4">
                  Enter your email and password to login your account.
                </h3>
              </div>
              <FormTextField
                {...getNameProp("email")}
                name="email"
                type="email"
                placeholder="Enter Email"
                required
              />

              <div className="relative mt-1">
                <FormTextField
                  placeholder="Enter Password"
                  {...getNameProp("password")}
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

              {hasFormError(fetcher.data) && (
                <InlineAlert>{fetcher.data.formError}</InlineAlert>
              )}
              <div className="flex flex-col items-stretch py-2 gap-6">
                <PrimaryButton type="submit">
                  {isProcessing ? "Logging In..." : "Log In"}
                </PrimaryButton>
              </div>
            </ActionContextProvider>
          </fetcher.Form>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export function ErrorBoundary() {
  return <RouteErrorBoundary />;
}