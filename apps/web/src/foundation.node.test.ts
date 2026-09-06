import { parseWithValibot } from "@conform-to/valibot";
import { CalendarDate } from "@internationalized/date";
import * as v from "valibot";
import { describe, expect, test } from "vitest";

import { orpc, orpcClient } from "./lib/orpc.ts";

describe("foundation node smoke", () => {
  test("foundation libraries parse a date, a valibot form, and an orpc query helper", () => {
    const date = new CalendarDate(2026, 9, 6);
    expect(date.toString()).toBe("2026-09-06");

    const schema = v.object({
      title: v.pipe(v.string(), v.minLength(1)),
    });
    const formData = new FormData();
    formData.set("title", "miso soup");
    const submission = parseWithValibot(formData, { schema });
    expect(submission.status).toBe("success");

    expect(orpcClient).toBeTypeOf("function");
    expect(orpc.key()[0]).toStrictEqual([]);
  });
});
