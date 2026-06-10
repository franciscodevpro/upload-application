import { logger as Logger } from "./logger-utils";

export const verifyRecaptcha = async (
  token: string,
  remoteip?: string,
  logger?: typeof Logger,
): Promise<boolean> => {
  if (!process.env.GOOGLE_RECAPTCHA_SECRET_KEY) return true;

  if (!token) {
    logger?.warn("No reCAPTCHA token provided");
    return false;
  }

  try {
    const response = await fetch(
      process.env.GOOGLE_RECAPTCHA_VERIFY_URL as string,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${process.env.GOOGLE_RECAPTCHA_SECRET_KEY}&response=${token}${remoteip ? `&remoteip=${remoteip}` : ""}`,
      },
    );
    if (!response.ok) throw new Error(`Status: ${response.status}`);

    const data = await response.json();

    return data.success;
  } catch (error) {
    logger?.error("Fetch error:", error);
    return false;
  }
};
