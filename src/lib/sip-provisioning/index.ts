/**
 * SIP Provisioning Module
 *
 * Provides SIP account provisioning for mobile apps.
 * Integrates with FlexiSIP server for account management.
 *
 * @module lib/sip-provisioning
 */

// Export service
export {
  SipProvisioningService,
  getSipProvisioningService,
  resetSipProvisioningService,
} from "./service";

// Export client
export {
  FlexiSIPClient,
  getFlexiSIPConfig,
  createFlexiSIPClient,
} from "./flexisip-client";

// Export types
export type {
  FlexiSIPConfig,
  CreateSipAccountRequest,
  UpdateSipAccountRequest,
  FlexiSIPAccount,
  FlexiSIPResponse,
  ProvisioningInput,
  ProvisioningResult,
  RegistrationStatus,
  ServerHealthStatus,
} from "./types";

export {
  ProvisioningError,
  ProvisioningErrorCode,
} from "./types";
