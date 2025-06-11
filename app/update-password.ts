import bcrypt from 'bcryptjs';
import { prisma } from "./db.server";

async function run () {
  console.log('Fetching user by email and updating password...');
  const user = await prisma.user.findUnique({
    where: { email: 'allansimoyi@gmail.com' }
  });
  if (!user)  {
    console.log('User not found');
    return;
  }
  console.log('User found');
  console.log(`Updating password for user: ${user.email}...`);
  const result = await prisma.password.update({
    where: { userId: user.id },
    data: { hash: await createHashedPassword('default@8901') }
  });
  console.log('Password updated successfully', result);
}
run();

function createHashedPassword(password: string) {
  return bcrypt.hash(password, 10);
}