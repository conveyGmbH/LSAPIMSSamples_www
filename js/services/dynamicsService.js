
// Configuration for Dynamics 365
const DynamicsConfig = {
  SCOPES: ['user.read', 'https://dynamics.crm.dynamics.com/user_impersonation'],
  STORAGE_KEYS: {
    CLIENT_ID: 'dynamics_client_id',
    TENANT_ID: 'dynamics_tenant_id',
    RESOURCE_URL: 'dynamics_resource_url'
  },
  API_VERSION: '9.2'
};

class DynamicsService {
  constructor() {
    this.msalInstance = null;
    this.config = {
      clientId: "",
      tenantId: "",
      resourceUrl: "",
    };
    this.isConnected = false;
    this.currentUser = null;
    this.accessToken = null;

    this.loadConfiguration(); // Loads configuration from localStorage on instantiation
  }

  // Singleton pattern for DynamicsService
  static getInstance() {
    if (!DynamicsService.instance) {
      DynamicsService.instance = new DynamicsService();
    }
    return DynamicsService.instance;
  }

  // Loads configuration from localStorage
  loadConfiguration() {
    try {
      this.config = {
        clientId:
          localStorage.getItem(DynamicsConfig.STORAGE_KEYS.CLIENT_ID) || "",
        tenantId:
          localStorage.getItem(DynamicsConfig.STORAGE_KEYS.TENANT_ID) || "",
        resourceUrl:
          localStorage.getItem(DynamicsConfig.STORAGE_KEYS.RESOURCE_URL) || "",
      };
      console.log("Configuration loaded:", {
        clientId: this.config.clientId ? "***configured***" : "empty",
        tenantId: this.config.tenantId ? "***configured***" : "empty",
        resourceUrl: this.config.resourceUrl || "empty",
      });
    } catch (error) {
      console.error("Error loading configuration:", error);
    }
  }

  // Returns the current configuration
  getConfiguration() {
    return { ...this.config };
  }

  // Saves configuration to localStorage
  saveConfiguration(config) {
    try {
      if (!config.clientId?.trim()) {
        return {
          success: false,
          message: "Client ID is required",
        };
      }
      if (!config.tenantId?.trim()) {
        return {
          success: false,
          message: "Tenant ID is required",
        };
      }
      if (!config.resourceUrl?.trim()) {
        return {
          success: false,
          message: "Resource URL is required",
        };
      }

      try {
        new URL(config.resourceUrl);
      } catch {
        return {
          success: false,
          message: "Invalid Resource URL format",
        };
      }

      localStorage.setItem(
        DynamicsConfig.STORAGE_KEYS.CLIENT_ID,
        config.clientId.trim()
      );
      localStorage.setItem(
        DynamicsConfig.STORAGE_KEYS.TENANT_ID,
        config.tenantId.trim()
      );
      localStorage.setItem(
        DynamicsConfig.STORAGE_KEYS.RESOURCE_URL,
        config.resourceUrl.trim()
      );

      this.config = {
        clientId: config.clientId.trim(),
        tenantId: config.tenantId.trim(),
        resourceUrl: config.resourceUrl.trim(),
      };

      // Resets connection state as configuration has changed
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;
      this.msalInstance = null;

      console.log("Configuration saved successfully");
      return {
        success: true,
        message: "Configuration saved successfully",
      };
    } catch (error) {
      console.error("Error saving configuration:", error);
      return {
        success: false,
        message: `Error saving configuration: ${error.message}`,
      };
    }
  }

  // Clears configuration from localStorage
  clearConfiguration() {
    try {
      Object.values(DynamicsConfig.STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });

      this.config = {
        clientId: "",
        tenantId: "",
        resourceUrl: "",
      };
      this.msalInstance = null;
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;

      console.log("Configuration cleared");
      return {
        success: true,
        message: "Configuration cleared successfully",
      };
    } catch (error) {
      console.error("Error clearing configuration:", error);
      return {
        success: false,
        message: "Failed to clear configuration",
      };
    }
  }

  // Provides the current connection status
  getConnectionStatus() {
    const isConfigured = !!(
      this.config.clientId &&
      this.config.tenantId &&
      this.config.resourceUrl
    );

    return {
      isConfigured,
      isConnected: this.isConnected,
      currentUser: this.currentUser,
      hasValidToken: !!this.accessToken,
    };
  }

  // Initializes the MSAL (Microsoft Authentication Library) instance
  initializeMsal() {
    if (!this.config.clientId || !this.config.tenantId) {
      throw new Error(
        "Configuration required: clientId and tenantId must be set"
      );
    }

    if (this.msalInstance) {
      return this.msalInstance;
    }

    try {
      const msalConfig = {
        auth: {
          clientId: this.config.clientId,
          authority: `https://login.microsoftonline.com/${this.config.tenantId}`,
          redirectUri: window.location.origin,
          navigateToLoginRequestUrl: false,
        },
        cache: {
          cacheLocation: "sessionStorage", 
          storeAuthStateInCookie: false,
        },
        telemetry: {
          application: {
            appName: "LeadSuccess-DynamicsIntegration",
            appVersion: "1.0.0",
          },
        },
      };

      this.msalInstance = new msal.PublicClientApplication(msalConfig);
      console.log("MSAL instance initialized with session isolation");

      return this.msalInstance;
    } catch (error) {
      console.error("Error initializing MSAL:", error);
      throw new Error(`Failed to initialize authentication: ${error.message}`);
    }
  }

  // Checks for an existing authentication session
  async checkExistingSession() {
    try {
      console.log("Checking for existing authentication session...");

      if (
        !this.config.clientId ||
        !this.config.tenantId ||
        !this.config.resourceUrl
      ) {
        console.log("Configuration incomplete, skipping session check");
        return {
          success: false,
          message: "Configuration incomplete",
        };
      }

      const msalInstance = this.initializeMsal();
      await msalInstance.initialize();

      const accounts = msalInstance.getAllAccounts();

      if (accounts.length === 0) {
        console.log("No existing accounts found");
        return {
          success: false,
          message: "No existing accounts",
        };
      }

      console.log(
        "Found existing account, attempting silent token acquisition..."
      );

      const silentRequest = {
        scopes: [`${this.config.resourceUrl}/user_impersonation`],
        account: accounts[0],
      };

      const result = await msalInstance.acquireTokenSilent(silentRequest);

      // Restores session upon successful silent token acquisition
      this.accessToken = result.accessToken;
      this.currentUser = {
        name: result.account.name,
        username: result.account.username,
        id: result.account.homeAccountId,
      };
      this.isConnected = true;

      console.log("Session restored successfully");
      console.log("User:", this.currentUser);

      return {
        success: true,
        message: "Session restored successfully",
        user: this.currentUser,
      };
    } catch (error) {
      console.log("Could not restore session:", error.message);

      // Resets connection state on session restoration failure
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;

      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Connects to Dynamics 365, attempting silent login first, then interactive
  async connect() {
    try {
      console.log("Starting Dynamics 365 connection...");

      const msalInstance = this.initializeMsal();
      await msalInstance.initialize();

      const loginRequest = {
        scopes: [`${this.config.resourceUrl}/user_impersonation`],
        prompt: "select_account",
      };

      console.log("Attempting login with scopes:", loginRequest.scopes);

      let result;
      try {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          const silentRequest = {
            ...loginRequest,
            account: accounts[0],
          };
          result = await msalInstance.acquireTokenSilent(silentRequest);
          console.log("Silent login successful");
        }
      } catch (silentError) {
        console.log("Silent login failed, trying interactive login");
      }

      if (!result) {
        result = await msalInstance.acquireTokenPopup(loginRequest);
        console.log("Interactive login successful");
      }

      this.accessToken = result.accessToken;
      this.currentUser = {
        name: result.account.name,
        username: result.account.username,
        id: result.account.homeAccountId,
      };
      this.isConnected = true;

      console.log("Successfully connected to Dynamics 365");
      console.log("User:", this.currentUser);

      return {
        success: true,
        message: "Successfully connected to Dynamics 365",
        user: this.currentUser,
      };
    } catch (error) {
      console.error("Connection error:", error);

      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;

      throw new Error(`Failed to connect to Dynamics 365: ${error.message}`);
    }
  }

  // Disconnects from Dynamics 365 and clears authentication data
  async disconnect() {
    try {
      console.log("Starting disconnect process...");

      if (this.msalInstance) {
        try {
          const accounts = this.msalInstance.getAllAccounts();

          if (accounts.length > 0) {
            try {
              await this.msalInstance.logoutPopup({
                account: accounts[0],
                mainWindowRedirectUri: window.location.origin,
              });
            } catch (logoutError) {
              await this.msalInstance.clearCache();
            }
          } else {
            await this.msalInstance.clearCache();
          }
        } catch (msalError) {
          console.warn("Error during MSAL cleanup:", msalError);
          try {
            await this.msalInstance.clearCache();
            console.log("Fallback: MSAL cache cleared");
          } catch (fallbackError) {
            console.warn("Even fallback cache clear failed:", fallbackError);
          }
        }
      }

      this.msalInstance = null;
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;

      console.log("Successfully disconnected from Dynamics 365");

      return {
        success: true,
        message: "Successfully disconnected from Dynamics 365",
      };
    } catch (error) {
      console.error("Disconnect error:", error);

      this.msalInstance = null;
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;

      return {
        success: true,
        message: "Disconnected (with forced cleanup due to error)",
      };
    }
  }

  // Retrieves a fresh access token silently
  async getAccessToken() {
    if (!this.msalInstance || !this.isConnected) {
      throw new Error("Not connected to Dynamics 365");
    }

    try {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const silentRequest = {
        scopes: [`${this.config.resourceUrl}/user_impersonation`],
        account: accounts[0],
      };

      const result = await this.msalInstance.acquireTokenSilent(silentRequest);
      this.accessToken = result.accessToken;

      return this.accessToken;
    } catch (error) {
      console.error("Error getting access token:", error);

      // Resets connection state if token refresh fails
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;

      throw new Error("Token expired. Please re-authenticate.");
    }
  }

  // Makes an API call to Dynamics 365
  async makeApiCall(endpoint, method = "GET", data = null) {
    if (!this.isConnected) {
      throw new Error("Not connected to Dynamics 365");
    }

    try {
      const token = await this.getAccessToken();
      const url = `${this.config.resourceUrl}/api/data/v${DynamicsConfig.API_VERSION}/${endpoint}`;

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      };

      const requestOptions = {
        method,
        headers,
      };

      if (
        data &&
        (method === "POST" || method === "PATCH" || method === "PUT")
      ) {
        requestOptions.body = JSON.stringify(data);
      }

      console.log(`Making API call: ${method} ${url}`);

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API call failed:", response.status, errorText);
        throw new Error(
          `API call failed: ${response.status} ${response.statusText}`
        );
      }

      const result = response.status === 204 ? {} : await response.json();
      console.log("API call successful");

      return result;
    } catch (error) {
      console.error("API call error:", error);
      throw error;
    }
  }

  // Transfers lead data to Dynamics 365, including attachments info
  async transferLead(leadData, attachments = []) {
    if (!this.isConnected) {
      throw new Error("Not connected to Dynamics 365");
    }

    try {
      console.log("Starting lead transfer...", leadData);
      console.log("Attachments to transfer:", attachments);

      const dynamicsLead = this.mapLeadToDynamics(leadData);

      console.log("Mapped lead data:", dynamicsLead);

      const result = await this.makeApiCall("leads", "POST", dynamicsLead);

      const leadId = result.leadid || "unknown";
      const leadUrl = `${this.config.resourceUrl}/main.aspx?etc=4&id=${leadId}&pagetype=entityrecord`;

      if (attachments.length > 0) {
        console.log(
          `${attachments.length} attachments will be transferred separately`
        );
      }

      console.log("Lead transferred successfully:", leadId);

      return {
        success: true,
        leadId: leadId,
        dynamicsUrl: leadUrl,
        message: "Lead transferred successfully to Dynamics 365",
        attachmentsCount: attachments.length,
      };
    } catch (error) {
      console.error("Lead transfer error:", error);
      throw new Error(`Failed to transfer lead: ${error.message}`);
    }
  }

  // Maps lead data from a generic format to Dynamics 365 format with validation
  mapLeadToDynamics(leadData) {
    const getProperty = (possibleNames) => {
      for (const name of possibleNames) {
        if (leadData.hasOwnProperty(name) && leadData[name] != null) {
          return leadData[name];
        }
      }
      return null;
    };

    const truncateText = (text, maxLength) => {
      if (!text) return null;
      const str = String(text).trim();
      if (str.length <= maxLength) return str;
      return str.substring(0, maxLength - 3) + "...";
    };

    const formatPhone = (phone, maxLength = 20) => {
      if (!phone) return null;
      let cleanPhone = String(phone).replace(/[^\d\+\-\(\)\s]/g, "");
      if (cleanPhone.length > maxLength) {
        cleanPhone = cleanPhone.substring(0, maxLength);
      }
      return cleanPhone.trim() || null;
    };

    const validateEmail = (email) => {
      if (!email) return null;
      const emailStr = String(email).trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(emailStr) && emailStr.length <= 100) {
        return emailStr;
      }
      if (emailStr.includes("@") && emailStr.length > 100) {
        return emailStr.substring(0, 100);
      }
      return null;
    };

    const validateUrl = (url) => {
      if (!url) return null;
      let urlStr = String(url).trim();
      if (
        urlStr &&
        !urlStr.startsWith("http://") &&
        !urlStr.startsWith("https://")
      ) {
        urlStr = "https://" + urlStr;
      }
      if (urlStr.length > 200) {
        urlStr = urlStr.substring(0, 200);
      }
      return urlStr;
    };

    const mappedLead = {
      subject: truncateText(
        getProperty(["Topic", "topic", "Subject", "subject"]) ||
          "Lead from LeadSuccess",
        300
      ),
      firstname: truncateText(
        getProperty(["FirstName", "firstName", "first_name"]),
        50
      ),
      lastname: truncateText(
        getProperty(["LastName", "lastName", "last_name"]),
        50
      ),
      companyname: truncateText(
        getProperty(["CompanyName", "companyName", "company", "Company"]),
        100
      ),
      emailaddress1: validateEmail(
        getProperty(["EMailAddress1", "emailAddress1", "email", "Email"])
      ),
      telephone1: formatPhone(
        getProperty(["Address1_Telephone1", "telephone1", "phone", "Phone"]),
        20
      ),
      mobilephone: formatPhone(
        getProperty(["MobilePhone", "mobilePhone", "mobile", "Mobile"]),
        20
      ),
      jobtitle: truncateText(
        getProperty(["JobTitle", "jobTitle", "title", "Title"]),
        100
      ),
      address1_line1: truncateText(
        getProperty(["Address1_Line1", "address1_Line1", "address", "Address"]),
        250
      ),
      address1_city: truncateText(
        getProperty(["Address1_City", "address1_City", "city", "City"]),
        80
      ),
      address1_postalcode: truncateText(
        getProperty([
          "Address1_PostalCode",
          "address1_PostalCode",
          "postalCode",
          "zipCode",
        ]),
        20
      ),
      address1_country: truncateText(
        getProperty([
          "Address1_Country",
          "address1_Country",
          "country",
          "Country",
        ]),
        80
      ),
      address1_stateorprovince: truncateText(
        getProperty([
          "Address1_StateOrProvince",
          "address1_StateOrProvince",
          "state",
          "State",
        ]),
        50
      ),
      websiteurl: validateUrl(
        getProperty(["WebSiteUrl", "webSiteUrl", "website", "Website"])
      ),
      description: truncateText(
        getProperty(["Description", "description", "notes", "Notes"]),
        2000
      ),
      leadsourcecode: 3, // Web
      prioritycode: 1, // Normal priority
      statuscode: 1, // New
      statecode: 0, // Open
    };

    // Removes null, undefined, or empty string values from the mapped lead data
    Object.keys(mappedLead).forEach((key) => {
      if (
        mappedLead[key] === null ||
        mappedLead[key] === undefined ||
        mappedLead[key] === ""
      ) {
        delete mappedLead[key];
      }
    });

    console.log("Mapped and validated lead data:", mappedLead);

    // Logs any truncated fields for debugging
    const originalValues = {
      subject: getProperty(["Topic", "topic", "Subject", "subject"]),
      firstname: getProperty(["FirstName", "firstName", "first_name"]),
      lastname: getProperty(["LastName", "lastName", "last_name"]),
      mobilephone: getProperty([
        "MobilePhone",
        "mobilePhone",
        "mobile",
        "Mobile",
      ]),
      telephone1: getProperty([
        "Address1_Telephone1",
        "telephone1",
        "phone",
        "Phone",
      ]),
    };

    Object.keys(originalValues).forEach((key) => {
      if (
        originalValues[key] &&
        mappedLead[key] &&
        String(originalValues[key]).length > String(mappedLead[key]).length
      ) {
        console.warn(
          `Field '${key}' truncated from '${originalValues[key]}' to '${mappedLead[key]}'`
        );
      }
    });

    return mappedLead;
  }

  // Tests the connection to Dynamics 365 by making a simple API call
  async testConnection() {
    try {
      console.log("Testing Dynamics 365 connection...");

      await this.makeApiCall("leads?$top=1");

      console.log("Connection test successful");
      return {
        success: true,
        message: "Connection to Dynamics 365 is working properly",
      };
    } catch (error) {
      console.error("Connection test failed:", error);
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
      };
    }
  }
}

export default DynamicsService;