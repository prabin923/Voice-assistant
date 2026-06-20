import "dotenv/config";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const hotelId = randomUUID();
  const guestId = randomUUID();
  const bookingId = randomUUID();

  await prisma.hotel.upsert({
    where: { email: "admin@hotel.com" },
    update: {
      name: "Aurelian Grand",
      slug: "aurelian-grand",
    },
    create: {
      id: hotelId,
      name: "Aurelian Grand",
      slug: "aurelian-grand",
      email: "admin@hotel.com",
      password: bcrypt.hashSync("password123", 10),
      config: "{}",
    },
  });

  await prisma.roomInventoryDefault.upsert({
    where: { roomType: "Standard Room" },
    update: { count: 5 },
    create: { roomType: "Standard Room", count: 5 },
  });

  await prisma.guest.upsert({
    where: { email: "guest@example.com" },
    update: {},
    create: {
      id: guestId,
      name: "Sample Guest",
      email: "guest@example.com",
      password: bcrypt.hashSync("password123", 10),
      phone: "+15551234567",
      visitCount: 1,
      lastVisitAt: new Date(),
    },
  });

  await prisma.booking.upsert({
    where: { id: bookingId },
    update: {},
    create: {
      id: bookingId,
      roomType: "Standard Room",
      checkIn: "2026-12-01",
      checkOut: "2026-12-03",
      rooms: 1,
      guestName: "Sample Guest",
      guestPhone: "+15551234567",
      guestEmail: "guest@example.com",
      guestId,
      status: "confirmed",
    },
  });

  await prisma.interaction.create({
    data: {
      id: randomUUID(),
      guestMessage: "What time is check-in?",
      aiResponse: "Check-in begins at 3:00 PM.",
      language: "en-US",
      guestId,
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
