import bcrypt from 'bcryptjs';
import { prisma } from "./db.server";

run();
async function run () {
  console.log("Fetching user...");
  const user = await prisma.user.findUnique({
    where: { email: 'allansimoyi@gmail.com' },
    include: { password: true }
  });
  if (!user) {
    throw new Error("User not found");
  }
  if (!user.password) {
    throw new Error("Password not found");
  }

  console.log("Updating...");
  await prisma.password.update({
    where: { userId: user.password.userId },
    data: { hash: await createHashedPassword('default@7891') },
  });
  console.log("Done");
}

function createHashedPassword(password: string) {
  return bcrypt.hash(password, 10);
}