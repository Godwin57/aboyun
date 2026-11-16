import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTwilioRequest, twilioConfig } from "./twilio";

const env = (over: Record<string, string | undefined> = {}) =>
  ({
    TWILIO_ACCOUNT_SID: "ACtest",
    TWILIO_AUTH_TOKEN: "secret-token",
    TWILIO_FROM: "+15005550006",
    ...over,
  }) as unknown as NodeJS.ProcessEnv;

describe("twilioConfig", () => {
  it("is used only when all three variables are set", () => {
    assert.deepEqual(twilioConfig(env()), {
      accountSid: "ACtest",
      authToken: "secret-token",
      from: "+15005550006",
    });
    for (const key of ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM"]) {
      assert.equal(twilioConfig(env({ [key]: undefined })), null, key);
      assert.equal(twilioConfig(env({ [key]: "  " })), null, key);
    }
  });
});

describe("buildTwilioRequest", () => {
  const config = {
    accountSid: "ACtest",
    authToken: "secret-token",
    from: "+15005550006",
  };

  it("posts a form to the account's Messages endpoint", () => {
    const { url, init } = buildTwilioRequest(config, "+2348025550118", "Hello & help");
    assert.equal(url, "https://api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json");
    assert.equal(init.method, "POST");
    assert.equal(init.headers["Content-Type"], "application/x-www-form-urlencoded");
    const body = new URLSearchParams(init.body);
    assert.equal(body.get("To"), "+2348025550118");
    assert.equal(body.get("From"), "+15005550006");
    assert.equal(body.get("Body"), "Hello & help");
  });

  it("authenticates with the account SID and token", () => {
    const { init } = buildTwilioRequest(config, "+2348025550118", "x");
    const token = init.headers.Authorization.replace("Basic ", "");
    assert.equal(Buffer.from(token, "base64").toString(), "ACtest:secret-token");
  });
});
