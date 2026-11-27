/** Thrown when an AI feature is used but the external service it needs has not been configured by the owner. */
export class AiNotConfiguredError extends Error {
  constructor(public service: string, message?: string) {
    super(message ?? `${service} is not configured on this server. The site owner needs to add it in the environment settings.`);
  }
}

/** Thrown when the shared, equal-for-everyone technical usage limit is reached. Not a paid tier. */
export class AiLimitError extends Error {}

/** Thrown when the model declines or returns output that does not match the expected structure. */
export class AiOutputError extends Error {}
