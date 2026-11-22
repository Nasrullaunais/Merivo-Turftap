import { afterEach, describe, expect, it } from "bun:test";

import { db } from "../../lib/db";
import { installPorts } from "../../ports";
import { testPorts } from "../../test/ports";
import { uniquePhone } from "../../test/fixtures";
import { loginCodeSends } from "./platform.tables";
import * as platformService from "./platform.service";

const MINUTE_MS = 60_000;

const whatsAppCodesTo = (phone: string) =>
  testPorts.messaging.sent.filter(
    (message) => message.kind === "login-code" && message.to === phone,
  );
const smsTo = (phone: string) => testPorts.sms.sent.filter((sms) => sms.to === phone);

describe("SIG-01 login codes", () => {
  afterEach(() => installPorts(testPorts));

  it("sendLoginCode_sendsTheFirstCodeByWhatsApp", async () => {
    const phone = uniquePhone();
    await platformService.sendLoginCode(phone, "123456");
    expect(whatsAppCodesTo(phone)).toEqual([{ kind: "login-code", to: phone, code: "123456" }]);
    expect(smsTo(phone)).toEqual([]);
  });

  it("sendLoginCode_sendsAResendWithinTenMinutesBySms", async () => {
    const phone = uniquePhone();
    await platformService.sendLoginCode(phone, "111111");
    await platformService.sendLoginCode(phone, "222222");
    expect(whatsAppCodesTo(phone)).toHaveLength(1);
    expect(smsTo(phone)).toHaveLength(1);
    expect(smsTo(phone)[0]!.text).toContain("222222");
  });

  it("sendLoginCode_goesBackToWhatsAppTenMinutesAfterTheLastCode", async () => {
    const phone = uniquePhone();
    const elevenMinutesAgo = new Date(Date.now() - 11 * MINUTE_MS);
    await db()
      .insert(loginCodeSends)
      .values({ phone, channel: "WHATSAPP", sentAt: elevenMinutesAgo });
    await platformService.sendLoginCode(phone, "333333");
    expect(whatsAppCodesTo(phone)).toHaveLength(1);
    expect(smsTo(phone)).toEqual([]);
  });

  it("sendLoginCode_ignoresCodesSentToOtherPhones", async () => {
    await platformService.sendLoginCode(uniquePhone(), "444444");
    const phone = uniquePhone();
    await platformService.sendLoginCode(phone, "555555");
    expect(whatsAppCodesTo(phone)).toHaveLength(1);
  });

  it("sendLoginCode_sendsTheRetryBySmsWhenWhatsAppFailed", async () => {
    const phone = uniquePhone();
    const whatsAppDown = {
      send: async () => {
        throw new Error("WhatsApp is down");
      },
    };
    installPorts({ ...testPorts, messaging: whatsAppDown });
    await expect(platformService.sendLoginCode(phone, "666666")).rejects.toThrow(
      "WhatsApp is down",
    );
    installPorts(testPorts);
    await platformService.sendLoginCode(phone, "777777");
    expect(smsTo(phone)).toHaveLength(1);
  });
});
