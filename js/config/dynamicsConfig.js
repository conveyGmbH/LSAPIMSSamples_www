
export const DynamicsConfig = {
  // Storage keys
  STORAGE_KEYS: {
    CLIENT_ID: 'DYNAMICS_CLIENT_ID',
    TENANT_ID: 'DYNAMICS_TENANT_ID',
    RESOURCE_URL: 'DYNAMICS_RESOURCE_URL'
  },

  // MSAL Configuration
  MSAL_CONFIG: {
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: false
    }
  },

  // API Configuration
  API: {
    VERSION: 'v9.2',
    WHO_AM_I_ENDPOINT: 'WhoAmI',
    LEADS_ENDPOINT: 'leads',
    ANNOTATIONS_ENDPOINT: 'annotations'
  },

  // Validation helpers
  VALIDATORS: {
    isValidGuid: (guid) => {
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return guidRegex.test(guid);
    },

    isValidUrl: (url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    },

    isDynamicsUrl: (url) => {
      try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname.includes('dynamics.com') || 
               parsedUrl.hostname.includes('crm.dynamics.com');
      } catch {
        return false;
      }
    }
  },

  // Default scopes for Dynamics 365
  DEFAULT_SCOPES: (resourceUrl) => [
    `${resourceUrl}/user_impersonation`,
    "openid",
    "profile"
  ],

  // Error messages
  ERRORS: {
    MISSING_CONFIG: 'Dynamics 365 configuration is missing or incomplete',
    INVALID_CLIENT_ID: 'Client ID must be a valid GUID',
    INVALID_TENANT_ID: 'Tenant ID must be a valid GUID', 
    INVALID_RESOURCE_URL: 'Resource URL must be a valid Dynamics 365 URL',
    NOT_AUTHENTICATED: 'Not authenticated with Dynamics 365',
    TOKEN_EXPIRED: 'Authentication token has expired',
    TRANSFER_FAILED: 'Failed to transfer lead to Dynamics 365'
  }
};

export default DynamicsConfig;