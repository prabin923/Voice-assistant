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

  // Hotel 1: Aurelian Grand (existing)
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

  // Hotel 2: The Sapphire Resort
  await prisma.hotel.upsert({
    where: { email: "admin@sapphireresort.com" },
    update: {
      name: "The Sapphire Resort",
      slug: "the-sapphire-resort",
    },
    create: {
      id: randomUUID(),
      name: "The Sapphire Resort",
      slug: "the-sapphire-resort",
      email: "admin@sapphireresort.com",
      password: bcrypt.hashSync("password123", 10),
      config: "{}",
    },
  });

  // Hotel 3: Evergreen Valley Inn
  await prisma.hotel.upsert({
    where: { email: "admin@evergreenvalleyinn.com" },
    update: {
      name: "Evergreen Valley Inn",
      slug: "evergreen-valley-inn",
    },
    create: {
      id: randomUUID(),
      name: "Evergreen Valley Inn",
      slug: "evergreen-valley-inn",
      email: "admin@evergreenvalleyinn.com",
      password: bcrypt.hashSync("password123", 10),
      config: "{}",
    },
  });

  // Hotel 4: Celestial Boutique Hotel
  await prisma.hotel.upsert({
    where: { email: "admin@celestialboutique.com" },
    update: {
      name: "Celestial Boutique Hotel",
      slug: "celestial-boutique-hotel",
    },
    create: {
      id: randomUUID(),
      name: "Celestial Boutique Hotel",
      slug: "celestial-boutique-hotel",
      email: "admin@celestialboutique.com",
      password: bcrypt.hashSync("password123", 10),
      config: "{}",
    },
  });

  // Hotel 5: Horizon Skyline Suites
  await prisma.hotel.upsert({
    where: { email: "admin@horizonskyline.com" },
    update: {
      name: "Horizon Skyline Suites",
      slug: "horizon-skyline-suites",
    },
    create: {
      id: randomUUID(),
      name: "Horizon Skyline Suites",
      slug: "horizon-skyline-suites",
      email: "admin@horizonskyline.com",
      password: bcrypt.hashSync("password123", 10),
      config: "{}",
    },
  });

  // Hotel 6: Monarch Palace Hotel
  await prisma.hotel.upsert({
    where: { email: "admin@monarchpalace.com" },
    update: {
      name: "Monarch Palace Hotel",
      slug: "monarch-palace-hotel",
    },
    create: {
      id: randomUUID(),
      name: "Monarch Palace Hotel",
      slug: "monarch-palace-hotel",
      email: "admin@monarchpalace.com",
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
