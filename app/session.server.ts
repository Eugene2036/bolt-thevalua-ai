import type { User } from '~/models/user.server';
import type { Company } from '~/models/company.server';

import { createCookieSessionStorage, redirect } from '@remix-run/node';
import invariant from 'tiny-invariant';

import { getUserById } from '~/models/user.server';
import { getCompanyById } from '~/models/company.server';
import { prisma } from './db.server';
import { EventAction, EventDomain } from './models/events';

invariant(process.env.SESSION_SECRET, 'SESSION_SECRET must be set');

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === 'production',
  },
});

const USER_SESSION_KEY = 'userId';
const COMPANY_SESSION_KEY = 'companyId';

export let globCompanyId: string | undefined;
export function setGlobCompanyId(id: string) {
  globCompanyId = id;
}

export async function getSession(request: Request) {
  const cookie = request.headers.get('Cookie');
  return sessionStorage.getSession(cookie);
}

export async function getUserId(request: Request): Promise<User['id'] | undefined> {
  const session = await getSession(request);
  const userId = session.get(USER_SESSION_KEY);
  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (userId === undefined) return null;

  const user = await getUserById(userId);
  if (user) return user;

  throw await logout(request);
}

export async function requireUserId(request: Request, redirectTo: string = new URL(request.url).pathname) {
  const userId = await getUserId(request);
  if (!userId) {
    const searchParams = new URLSearchParams([['redirectTo', redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function requireUser(request: Request) {
  const userId = await requireUserId(request);

  const user = await getUserById(userId);
  if (user) return user;

  throw await logout(request);
}





export async function getCompanyId(request: Request): Promise<Company['id'] | undefined> {
  const session = await getSession(request);
  const companyId = session.get(COMPANY_SESSION_KEY);
  return companyId;
}

export async function getCompany(request: Request) {
  const userId = await getUserId(request);
  if (userId === undefined) return null;

  const user = await getUserById(userId);
  if (user) return user;

  throw await logout(request);
}

export async function requireCompanyId(request: Request) {
  const companyId = await getCompanyId(request);
  if (!companyId) {
    console.log('companyId not found!')
  }
  return companyId;
}

export async function requireCompany(request: Request) {
  const companyId = await requireUserId(request);

  const company = await getCompanyById(companyId);
  if (company) return company;

  throw await logout(request);
}




export async function createUserSession({ request, userId, remember, redirectTo }: { request: Request; userId: string; remember: boolean; redirectTo: string }) {
  const session = await getSession(request);

  if (!userId) {
    throw new Error("User ID is undefined or null");
  }

  // Save session companyId below
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (user && user.UserGroup && user.UserGroup.company) {
    const companyId = user.UserGroup.company.id;
    session.set(COMPANY_SESSION_KEY, companyId); // Store in session with key 'COMPANY_ID'
    // await session.save(); // Save the session if your library requires it
    console.log('current company id: ', companyId);

    // Set the global companyId upon login
    setGlobCompanyId(companyId);
  }

  session.set(USER_SESSION_KEY, userId);
  console.log('current user id: ', userId);

  // Log user login event 1
  await prisma.event.create({
    data: {
      userId: userId,
      domain: EventDomain.User,
      action: EventAction.Login,
      recordId: userId,
      recordData: JSON.stringify(user?.firstName + ' ' + user?.lastName + ' logged in'),
    },
  });

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session, {
        maxAge: remember
          ? 60 * 60 * 24 * 7 // 7 days
          : undefined,
      }),
    },
  });
}

export async function logout(request: Request) {
  const session = await getSession(request);
  const userId = session.get(USER_SESSION_KEY);

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      await prisma.event.create({
        data: {
          userId: userId,
          domain: EventDomain.User,
          action: EventAction.logout,
          recordId: userId,
          recordData: JSON.stringify(user.firstName + ' ' + user.lastName + ' logged out'),
        },
      });
    }
  }

  return redirect('/', {
    headers: {
      'Set-Cookie': await sessionStorage.destroySession(session),
    },
  });
}


// export async function logout(request: Request) {
//   const session = await getSession(request);
//   const userId = session.get(USER_SESSION_KEY);

//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//     include: {
//       UserGroup: {
//         include: {
//           company: {
//             select: {
//               id: true,
//               CompanyName: true,
//             }
//           }
//         },
//       },
//     },
//   });

//   // Log user login event 2
//   await prisma.event.create({
//     data: {
//       userId: userId,
//       domain: EventDomain.User,
//       action: EventAction.logout,
//       recordId: userId,
//       recordData: JSON.stringify(user?.firstName + ' ' + user?.lastName + ' logged out'),
//     },
//   });

//   return redirect('/', {
//     headers: {
//       'Set-Cookie': await sessionStorage.destroySession(session),
//     },
//   });
// }
