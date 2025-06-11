import bcrypt from 'bcryptjs';

import { prisma } from './db.server';

function createHashedPassword(password: string) {
  return bcrypt.hash(password, 10);
}

(async () => {
  const emails = [
    'example@gmail.com',
    // 'maje@majemaje.com',
    // 'ivy@realassets.co.bw',
    // 'carrington@realassets.co.bw',
    // 'info@realassets.co.bw',
  ];
  const password = 'bach@6781';

  // Fetch all existing users with id, email, and isSuper fields
  const existingUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      isSuper: true,
    },
  });

  const currentUser = existingUsers.find((user) => user.isSuper);
  if (!currentUser) {
    console.log('Creating super user account');
    await prisma.user.create({
      data: {
        email: 'info@thevalua.com',
        password: { create: { hash: await createHashedPassword(password) } },
        firstName: 'Eugene',
        lastName: 'Maraura',
        phone: '+267 72 296b761',
        isSuper: true,
        isVerified: true,
        verToken: '',
      },
    });
    console.log('Created super user account');
  }

  await emails.reduce(async (acc, email) => {
    await acc;
    console.log('Checking user account for', email);

    // Check if user with this email already exists
    const existingUser = existingUsers.find((user) => user.email === email);
    if (existingUser) {
      console.log(`User with email ${email} already exists. Skipping...`);
      return; // Skip to the next email
    }

    console.log('Creating user account for', email);
    await prisma.user.create({
      data: {
        email,
        password: { create: { hash: await createHashedPassword(password) } },
        firstName: '',
        lastName: '',
        isSuper: true,
        isVerified: true,
        verToken: '',
      },
    });
    console.log('Created user account for', email);
  }, Promise.resolve());

  console.log('Done');
})();
