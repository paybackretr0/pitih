import {
  DEFAULT_REMINDER_TIME,
  REMINDER_BODY,
  REMINDER_TITLE,
  formatReminderTime,
  parseReminderTime,
} from "@/features/reminder/reminder";

describe("parseReminderTime", () => {
  it("reads a valid 24-hour time", () => {
    expect(parseReminderTime("20:00")).toEqual({ hour: 20, minute: 0 });
    expect(parseReminderTime("00:05")).toEqual({ hour: 0, minute: 5 });
    expect(parseReminderTime("23:59")).toEqual({ hour: 23, minute: 59 });
  });

  it("rejects values that are not strict HH:mm", () => {
    expect(parseReminderTime("24:00")).toBeNull();
    expect(parseReminderTime("20:60")).toBeNull();
    expect(parseReminderTime("8:00")).toBeNull();
    expect(parseReminderTime("20.00")).toBeNull();
    expect(parseReminderTime("jam 8")).toBeNull();
  });

  it("rejects missing values", () => {
    expect(parseReminderTime(null)).toBeNull();
    expect(parseReminderTime(undefined)).toBeNull();
    expect(parseReminderTime("")).toBeNull();
  });
});

describe("formatReminderTime", () => {
  it("pads both parts to two digits", () => {
    expect(formatReminderTime({ hour: 8, minute: 5 })).toBe("08:05");
    expect(formatReminderTime({ hour: 20, minute: 0 })).toBe("20:00");
    expect(formatReminderTime({ hour: 0, minute: 59 })).toBe("00:59");
  });

  it("round-trips through the parser", () => {
    const time = { hour: 21, minute: 15 };
    expect(parseReminderTime(formatReminderTime(time))).toEqual(time);
  });

  it("ships a default evening time", () => {
    expect(parseReminderTime(DEFAULT_REMINDER_TIME)).not.toBeNull();
  });
});

describe("reminder copy", () => {
  it("asks about today and names the app", () => {
    expect(REMINDER_TITLE.length).toBeGreaterThan(0);
    expect(REMINDER_BODY).toContain("PITIH");
  });

  it("does not use an em dash", () => {
    expect(`${REMINDER_TITLE}${REMINDER_BODY}`).not.toContain("\u2014");
  });
});
