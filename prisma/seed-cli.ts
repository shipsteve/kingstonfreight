import { PrismaClient } from "@prisma/client";
import { seed } from "./seed";

const db = new PrismaClient();
seed(db)
  .then(() => console.log("Seeded."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
