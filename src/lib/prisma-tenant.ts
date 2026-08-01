import prisma from "@/lib/prisma";
import { getTenantStore } from "@/lib/tenantContext";

const SCOPED_MODELS = new Set([
  "Interaction",
  "SupportTicket",
  "Booking",
  "RoomInventoryDefault",
  "RoomInventoryOverride",
  "KnowledgeGap",
  "DiningReservation",
  "Feedback",
  "Guest",
  "ServiceRequest",
  "SpaReservation",
  "Review",
]);

type Args = Record<string, unknown> | undefined;

function isScoped(model: string | undefined): boolean {
  if (!model) return false;
  return SCOPED_MODELS.has(model);
}

import { cookies, headers } from "next/headers";
import { hotels } from "@/lib/db";

export async function getRequiredTenantHotelId(): Promise<string> {
  const store = getTenantStore();
  if (store?.hotelId) return store.hotelId;

  try {
    const h = await headers();
    const fromHeader = h.get("x-hotel-id");
    if (fromHeader) return fromHeader;
  } catch (e) {
    // ignore
  }

  try {
    const c = await cookies();
    const token = c.get("session")?.value;
    if (token) {
      const payloadB64 = token.split('.')[1];
      if (payloadB64) {
         const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
         if (payload.hotelId) return payload.hotelId;
      }
    }
  } catch (e) {
    // ignore
  }

  // Fallback for webhooks and background jobs
  const firstHotel = await hotels.getFirst();
  if (firstHotel) return firstHotel.id;

  throw new Error("Strict multi-tenancy error: Missing hotelId context in tenantPrisma");
}

function injectWhere(args: Args, hotelId: string): Args {
  const a = (args ?? {}) as Record<string, unknown>;
  const existingWhere = (a.where ?? {}) as Record<string, unknown>;
  return { ...a, where: { ...existingWhere, hotelId } };
}

function injectData(args: Args, hotelId: string): Args {
  const a = (args ?? {}) as Record<string, unknown>;
  const data = a.data as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
  if (!data) return { ...a, data: { hotelId } };
  if (Array.isArray(data)) {
    return { ...a, data: data.map((row) => ({ ...row, hotelId })) };
  }
  return { ...a, data: { ...data, hotelId } };
}

export function tenantPrisma() {
  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          const hotelId = await getRequiredTenantHotelId();
          return query(isScoped(model) ? (injectWhere(args, hotelId) as never) : (args as never));
        },
        async findFirst({ model, args, query }) {
          const hotelId = await getRequiredTenantHotelId();
          return query(isScoped(model) ? (injectWhere(args, hotelId) as never) : (args as never));
        },
        async findFirstOrThrow({ model, args, query }) {
          const hotelId = await getRequiredTenantHotelId();
          return query(isScoped(model) ? (injectWhere(args, hotelId) as never) : (args as never));
        },
        async findUnique({ model, args, query }) {
          const hotelId = await getRequiredTenantHotelId();
          return query(isScoped(model) ? (injectWhere(args, hotelId) as never) : (args as never));
        },
        async count({ model, args, query }) {
          const hotelId = await getRequiredTenantHotelId();
          return query(isScoped(model) ? (injectWhere(args, hotelId) as never) : (args as never));
        },
        async aggregate({ model, args, query }) {
          const hotelId = await getRequiredTenantHotelId();
          return query(isScoped(model) ? (injectWhere(args, hotelId) as never) : (args as never));
        },
        async groupBy({ model, args, query }) {
          const hotelId = await getRequiredTenantHotelId();
          return query(isScoped(model) ? (injectWhere(args, hotelId) as never) : (args as never));
        },
        async updateMany({ model, args, query }) {
          const hotelId = await getRequiredTenantHotelId();
          return query(isScoped(model) ? (injectWhere(args, hotelId) as never) : (args as never));
        },
        async deleteMany({ model, args, query }) {
          const hotelId = await getRequiredTenantHotelId();
          return query(isScoped(model) ? (injectWhere(args, hotelId) as never) : (args as never));
        },
        async create({ model, args, query }) {
          const hotelId = await getRequiredTenantHotelId();
          return query(isScoped(model) ? (injectData(args, hotelId) as never) : (args as never));
        },
        async createMany({ model, args, query }) {
          const hotelId = await getRequiredTenantHotelId();
          return query(isScoped(model) ? (injectData(args, hotelId) as never) : (args as never));
        },
        async update({ model, args, query }) {
          const hotelId = await getRequiredTenantHotelId();
          return query(isScoped(model) ? (injectWhere(args, hotelId) as never) : (args as never));
        },
        async delete({ model, args, query }) {
          const hotelId = await getRequiredTenantHotelId();
          return query(isScoped(model) ? (injectWhere(args, hotelId) as never) : (args as never));
        },
        async upsert({ model, args, query }) {
          if (!isScoped(model)) return query(args as never);
          const hotelId = await getRequiredTenantHotelId();
          const a = (args ?? {}) as Record<string, unknown>;
          const existingWhere = (a.where ?? {}) as Record<string, unknown>;
          const create = (a.create ?? {}) as Record<string, unknown>;
          return query({
            ...a,
            where: { ...existingWhere, hotelId },
            create: { ...create, hotelId },
          } as never);
        },
      },
    },
  });
}
