/**
 * An expected, user-fixable problem (duplicate phone number, nothing to refer to...).
 * Its message is safe to show to the person using the app.
 */
export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceError";
  }
}
