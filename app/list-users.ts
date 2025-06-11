import { prisma } from "./db.server";

async function run () {
  console.log('Fetching all users from the database...');
  const users = await prisma.user.findMany({
    include: { password: true },
  });
  console.log(`Found ${users.length} users:`);
  users.forEach(user => {
    console.log(user.email, user.updatedAt, user.password?.hash);
  });
  console.log("DONE");
}
run();