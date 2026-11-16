import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { smtpConfig } from "./email";

const env = (over: Record<string, string | undefined> = {}) =>
  ({
    SMTP_USER: "demo@gmail.com",
    SMTP_PASS: "abcd efgh ijkl mnop",
    ...over,
  }) as unknown as NodeJS.ProcessEnv;

describe("smtpConfig", () => {
  it("defaults to Gmail over implicit TLS, sending as the signed-in address", () => {
    assert.deepEqual(smtpConfig(env()), {
      host: "smtp.gmail.com",
      port: 465,
      user: "demo@gmail.com",
      pass: "abcdefghijklmnop",
      from: "Aboyun <demo@gmail.com>",
    });
  });

  it("needs both a user and a password", () => {
    assert.equal(smtpConfig(env({ SMTP_USER: undefined })), null);
    assert.equal(smtpConfig(env({ SMTP_PASS: undefined })), null);
    assert.equal(smtpConfig(env({ SMTP_PASS: "   " })), null);
    assert.equal(smtpConfig({} as NodeJS.ProcessEnv), null);
  });

  it("lets host, port and sender be overridden", () => {
    const c = smtpConfig(
      env({
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "587",
        SMTP_FROM: "Aboyun <hi@x.com>",
      }),
    );
    assert.equal(c?.host, "smtp.example.com");
    assert.equal(c?.port, 587);
    assert.equal(c?.from, "Aboyun <hi@x.com>");
  });
});
