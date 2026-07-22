import { logger as Logger } from "./logger-utils";

export const createAssessment = async ({
  token,
  recaptchaAction,
  remoteip,
  logger,
}: {
  token: string;
  recaptchaAction: string;
  remoteip?: string;
  logger?: typeof Logger;
}): Promise<number | null | undefined> => {
  const projectID = process.env.GOOGLE_RECAPTCHA_APP_ID;
  const recaptchaKey = process.env.GOOGLE_RECAPTCHA_SITE_KEY;
  const projectKey = process.env.GOOGLE_API_KEY;
  const projectURL = process.env.GOOGLE_RECAPTCHA_PROJECT_URL;
  if (!projectID || !recaptchaKey || !projectKey || !projectURL) {
    logger?.error("Missing reCAPTCHA project ID or secret key");
    return null;
  }

  const projectPath = `${projectURL}/${projectID}/assessments?key=${projectKey}`;

  // Build the assessment request.
  const request = {
    event: {
      token: token,
      expectedAction: recaptchaAction,
      siteKey: recaptchaKey,
    },
  };

  const req = await fetch(projectPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const response = await req.json();

  logger?.info(response);

  // Check if the token is valid.
  if (!response?.tokenProperties?.valid) {
    logger?.error(
      `The CreateAssessment call failed because the token was: ${response?.tokenProperties?.invalidReason}`,
    );
    return null;
  }

  // Check if the expected action was executed.
  // The `action` property is set by user client in the grecaptcha.enterprise.execute() method.
  if (response?.tokenProperties?.action === recaptchaAction) {
    // Get the risk score and the reason(s).
    // For more information on interpreting the assessment, see:
    // https://cloud.google.com/recaptcha/docs/interpret-assessment
    logger?.info(`The reCAPTCHA score is: ${response?.riskAnalysis?.score}`);
    response?.riskAnalysis?.reasons?.forEach((reason: any) => {
      logger?.info(reason);
    });

    return response?.riskAnalysis?.score;
  } else {
    logger?.error(
      "The action attribute in your reCAPTCHA tag does not match the action you are expecting to score",
    );
    return null;
  }
};
