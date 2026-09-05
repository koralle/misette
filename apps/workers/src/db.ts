import * as schema from "@misette/db/schema";
import { drizzle } from "drizzle-orm/d1";

export const createDb = (d1: D1Database) => drizzle(d1, { schema });

export type Database = ReturnType<typeof createDb>;
