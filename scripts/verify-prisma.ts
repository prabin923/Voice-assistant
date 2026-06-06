import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  await prisma.hotel.count();
  console.log("✅ Connected");
}

main()
  .catch((err) => {
    console.error("❌ Connection failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
