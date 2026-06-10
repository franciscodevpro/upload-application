import { verifyRecaptcha } from "../../src/utils/verify-recaptcha-utils";

describe("Verify Recaptcha Utilitary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe("verifyRecaptcha", () => {
    it("should return true case there is no GOOGLE_RECAPTCHA_SECRET_KEY", async () => {
      const originalEnv = process.env.GOOGLE_RECAPTCHA_SECRET_KEY;
      delete process.env.GOOGLE_RECAPTCHA_SECRET_KEY;

      const result = await verifyRecaptcha("test-token");

      expect(result).toBe(true);

      if (originalEnv) {
        process.env.GOOGLE_RECAPTCHA_SECRET_KEY = originalEnv;
      }
    });

    it("should return false case there is no token", async () => {
      process.env.GOOGLE_RECAPTCHA_SECRET_KEY = "test-secret";
      const mockLogger = {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      };

      const result = await verifyRecaptcha("", undefined, mockLogger as any);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "No reCAPTCHA token provided",
      );
    });

    it("should call fetch correctly and return true in case of success response", async () => {
      process.env.GOOGLE_RECAPTCHA_SECRET_KEY = "test-secret";
      process.env.GOOGLE_RECAPTCHA_VERIFY_URL =
        "https://www.google.com/recaptcha/api/siteverify";

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      });

      const result = await verifyRecaptcha("valid-token", "192.168.1.1");

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        process.env.GOOGLE_RECAPTCHA_VERIFY_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `secret=test-secret&response=valid-token&remoteip=192.168.1.1`,
        },
      );
    });

    it("should return false case response be not success", async () => {
      process.env.GOOGLE_RECAPTCHA_SECRET_KEY = "test-secret";
      process.env.GOOGLE_RECAPTCHA_VERIFY_URL =
        "https://www.google.com/recaptcha/api/siteverify";

      const mockLogger = {
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const result = await verifyRecaptcha(
        "invalid-token",
        undefined,
        mockLogger as any,
      );

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
