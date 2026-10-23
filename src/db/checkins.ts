import { desc } from "drizzle-orm";

import { db } from "./client";
import { checkins, type Checkin, type CheckinStatus } from "./schema";

export type CheckinInput = {
  weekStart: string;
  expense: number;
  income: number;
  daysLogged: number;
  status: CheckinStatus | null;
};

export async function listCheckins(): Promise<Checkin[]> {
  return db.select().from(checkins).orderBy(desc(checkins.weekStart));
}

export async function createCheckin(input: CheckinInput): Promise<void> {
  await db.insert(checkins).values(input).onConflictDoNothing();
}
