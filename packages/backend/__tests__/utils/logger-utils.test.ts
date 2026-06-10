import { logger } from "../../src/utils/logger-utils";

describe("Logger Utilitary", () => {
  let spyConsoleInfo: any;
  let spyConsoleWarn: any;
  let spyConsoleError: any;

  beforeEach(() => {
    jest.clearAllMocks();

    spyConsoleInfo = jest.spyOn(console, "info");
    spyConsoleWarn = jest.spyOn(console, "warn");
    spyConsoleError = jest.spyOn(console, "error");
  });
  afterAll(() => {
    jest.clearAllMocks();
  });

  describe("logger", () => {
    it("info", async () => {
      logger.info("Teste...");

      expect(spyConsoleInfo).toHaveBeenCalledWith("Teste...");
    });
  });

  it("warn", async () => {
    logger.warn("Teste...");

    expect(spyConsoleWarn).toHaveBeenCalledWith("Teste...");
  });

  it("error", async () => {
    logger.error("Teste...");

    expect(spyConsoleError).toHaveBeenCalledWith("Teste...");
  });
});
