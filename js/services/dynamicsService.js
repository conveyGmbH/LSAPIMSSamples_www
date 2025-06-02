import { DynamicsConfig } from '../config/dynamicsConfig.js';

/**
 * Dynamics 365 Service - Pure Frontend with MSAL
 * Handles all authentication and API calls in frontend only
 */
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

    this.loadConfiguration();
  }

  // Singleton pattern
  static getInstance() {
    if (!DynamicsService.instance) {
      DynamicsService.instance = new DynamicsService();
    }
    return DynamicsService.instance;
  }

  
  // Configuration Management
  loadConfiguration() {
    try {
      this.config = {
        clientId: localStorage.getItem(DynamicsConfig.STORAGE_KEYS.CLIENT_ID) || "",
        tenantId: localStorage.getItem(DynamicsConfig.STORAGE_KEYS.TENANT_ID) || "",
        resourceUrl: localStorage.getItem(DynamicsConfig.STORAGE_KEYS.RESOURCE_URL) || "",
      };
      console.log("Dynamics configuration loaded:", {
        clientId: this.config.clientId ? "***configured***" : "empty",
        tenantId: this.config.tenantId ? "***configured***" : "empty",
        resourceUrl: this.config.resourceUrl || "empty",
      });
    } catch (error) {
      console.error("Error loading configuration:", error);
    }
  }

  getConfiguration() {
    return { ...this.config };
  }

  saveConfiguration(config) {
    try {
      // Validation with DynamicsConfig helpers
      if (!config.clientId?.trim()) {
        return { success: false, message: DynamicsConfig.ERRORS.INVALID_CLIENT_ID };
      }
      if (!config.tenantId?.trim()) {
        return { success: false, message: DynamicsConfig.ERRORS.INVALID_TENANT_ID };
      }
      if (!config.resourceUrl?.trim()) {
        return { success: false, message: DynamicsConfig.ERRORS.INVALID_RESOURCE_URL };
      }

      // Validation with validators
      if (!DynamicsConfig.VALIDATORS.isValidGuid(config.clientId)) {
        return { success: false, message: DynamicsConfig.ERRORS.INVALID_CLIENT_ID };
      }
      if (!DynamicsConfig.VALIDATORS.isValidGuid(config.tenantId)) {
        return { success: false, message: DynamicsConfig.ERRORS.INVALID_TENANT_ID };
      }
      if (!DynamicsConfig.VALIDATORS.isDynamicsUrl(config.resourceUrl)) {
        return { success: false, message: DynamicsConfig.ERRORS.INVALID_RESOURCE_URL };
      }

      // Save to localStorage
      localStorage.setItem(DynamicsConfig.STORAGE_KEYS.CLIENT_ID, config.clientId.trim());
      localStorage.setItem(DynamicsConfig.STORAGE_KEYS.TENANT_ID, config.tenantId.trim());
      localStorage.setItem(DynamicsConfig.STORAGE_KEYS.RESOURCE_URL, config.resourceUrl.trim());

      this.config = {
        clientId: config.clientId.trim(),
        tenantId: config.tenantId.trim(),
        resourceUrl: config.resourceUrl.trim(),
      };

      // Reset connection state
      this.disconnect();

      console.log("Dynamics configuration saved successfully");
      return { success: true, message: "Configuration saved successfully" };
    } catch (error) {
      console.error("Error saving configuration:", error);
      return { success: false, message: `Error saving configuration: ${error.message}` };
    }
  }

  clearConfiguration() {
    try {
      Object.values(DynamicsConfig.STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });

      this.config = { clientId: "", tenantId: "", resourceUrl: "" };
      this.disconnect();

      console.log("Dynamics configuration cleared");
      return { success: true, message: "Configuration cleared successfully" };
    } catch (error) {
      console.error("Error clearing configuration:", error);
      return { success: false, message: "Failed to clear configuration" };
    }
  }

  
  // Connection Status
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

  
  // MSAL Initialization
  initializeMsal() {
    if (!this.config.clientId || !this.config.tenantId) {
      throw new Error(DynamicsConfig.ERRORS.MISSING_CONFIG);
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
        cache: DynamicsConfig.MSAL_CONFIG.cache,
        telemetry: {
          application: {
            appName: "LeadSuccess-DynamicsIntegration",
            appVersion: "1.0.0",
          },
        },
      };

      this.msalInstance = new msal.PublicClientApplication(msalConfig);
      console.log("MSAL instance initialized");

      return this.msalInstance;
    } catch (error) {
      console.error("Error initializing MSAL:", error);
      throw new Error(`Failed to initialize authentication: ${error.message}`);
    }
  }

  
  // Authentication Methods
  async checkExistingSession() {
    try {
      console.log("Checking for existing authentication session...");

      if (!this.config.clientId || !this.config.tenantId || !this.config.resourceUrl) {
        return { success: false, message: "Configuration incomplete" };
      }

      const msalInstance = this.initializeMsal();
      await msalInstance.initialize();

      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        return { success: false, message: "No existing accounts" };
      }

      const silentRequest = {
        scopes: DynamicsConfig.DEFAULT_SCOPES(this.config.resourceUrl),
        account: accounts[0],
      };

      const result = await msalInstance.acquireTokenSilent(silentRequest);

      // Restore session
      this.accessToken = result.accessToken;
      this.currentUser = {
        name: result.account.name,
        username: result.account.username,
        id: result.account.homeAccountId,
      };
      this.isConnected = true;

      console.log("Session restored successfully");
      return { success: true, message: "Session restored", user: this.currentUser };
    } catch (error) {
      console.log("Could not restore session:", error.message);
      this.disconnect();
      return { success: false, message: error.message };
    }
  }

  async connect() {
    try {
      console.log("Starting Dynamics 365 connection...");

      const msalInstance = this.initializeMsal();
      await msalInstance.initialize();

      const loginRequest = {
        scopes: DynamicsConfig.DEFAULT_SCOPES(this.config.resourceUrl),
        prompt: "select_account",
      };

      let result;
      try {
        // Try silent login first
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          const silentRequest = { ...loginRequest, account: accounts[0] };
          result = await msalInstance.acquireTokenSilent(silentRequest);
          console.log("Silent login successful");
        }
      } catch (silentError) {
        console.log("Silent login failed, trying interactive login");
      }

      // Interactive login if silent failed
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
      return { success: true, message: "Successfully connected", user: this.currentUser };
    } catch (error) {
      console.error("Connection error:", error);
      this.disconnect();
      throw new Error(`Failed to connect to Dynamics 365: ${error.message}`);
    }
  }

  async disconnect() {
    try {
      console.log("Disconnecting from Dynamics 365...");

      if (this.msalInstance) {
        try {
          const accounts = this.msalInstance.getAllAccounts();
          if (accounts.length > 0) {
            await this.msalInstance.logoutPopup({
              account: accounts[0],
              mainWindowRedirectUri: window.location.origin,
            });
          } else {
            await this.msalInstance.clearCache();
          }
        } catch (msalError) {
          console.warn("MSAL cleanup error, forcing clear:", msalError);
          await this.msalInstance.clearCache();
        }
      }

      // Reset all state
      this.msalInstance = null;
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;

      console.log("Successfully disconnected");
      return { success: true, message: "Successfully disconnected" };
    } catch (error) {
      console.error("Disconnect error:", error);
      this.msalInstance = null;
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;
      return { success: true, message: "Disconnected (forced cleanup)" };
    }
  }

  
  // Token Management
  async getAccessToken() {
    if (!this.msalInstance || !this.isConnected) {
      throw new Error(DynamicsConfig.ERRORS.NOT_AUTHENTICATED);
    }

    try {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const silentRequest = {
        scopes: DynamicsConfig.DEFAULT_SCOPES(this.config.resourceUrl),
        account: accounts[0],
      };

      const result = await this.msalInstance.acquireTokenSilent(silentRequest);
      this.accessToken = result.accessToken;
      return this.accessToken;
    } catch (error) {
      console.error("Error getting access token:", error);
      this.disconnect();
      throw new Error(DynamicsConfig.ERRORS.TOKEN_EXPIRED);
    }
  }

  
  // API Calls
  

  async makeApiCall(endpoint, method = "GET", data = null) {
    if (!this.isConnected) {
      throw new Error(DynamicsConfig.ERRORS.NOT_AUTHENTICATED);
    }

    try {
      const token = await this.getAccessToken();
      const url = `${this.config.resourceUrl}/api/data/v${DynamicsConfig.API.VERSION}/${endpoint}`;

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      };

      const requestOptions = { method, headers };

      if (data && (method === "POST" || method === "PATCH" || method === "PUT")) {
        requestOptions.body = JSON.stringify(data);
      }

      console.log(`Making API call: ${method} ${url}`);

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API call failed:", response.status, errorText);
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const result = response.status === 204 ? {} : await response.json();
      console.log("API call successful");
      return result;
    } catch (error) {
      console.error("API call error:", error);
      throw error;
    }
  }

  
  // Lead Transfer
  async transferLead(leadData, attachments = []) {
    if (!this.isConnected) {
      throw new Error(DynamicsConfig.ERRORS.NOT_AUTHENTICATED);
    }

    try {
      console.log("Starting lead transfer...");

      // Check for duplicate by email
      await this.checkForDuplicateLead(leadData);

      // Map and create lead
      const dynamicsLead = this.mapLeadToDynamics(leadData);

      const result = await this.makeApiCall(DynamicsConfig.API.LEADS_ENDPOINT, "POST", dynamicsLead);
      const leadId = result.leadid;
      
      console.log("Lead created successfully:", leadId);

      // Transfer attachments
      let attachmentsTransferred = 0;
      let attachmentErrors = [];

      if (attachments.length > 0) {
        console.log(`Transferring ${attachments.length} attachments...`);
        
        for (const attachment of attachments) {
          try {
            await this.transferAttachment(leadId, attachment);
            attachmentsTransferred++;
          } catch (attachError) {
            console.error(`Failed to transfer attachment ${attachment.name}:`, attachError);
            attachmentErrors.push(`${attachment.name}: ${attachError.message}`);
          }
        }
      }

      const leadUrl = `${this.config.resourceUrl}/main.aspx?etc=4&id=${leadId}&pagetype=entityrecord`;

      return {
        success: true,
        leadId: leadId,
        dynamicsUrl: leadUrl,
        message: "Lead transferred successfully",
        attachments: {
          total: attachments.length,
          transferred: attachmentsTransferred,
          errors: attachmentErrors
        }
      };
    } catch (error) {
      console.error("Lead transfer error:", error);
      throw new Error(`${DynamicsConfig.ERRORS.TRANSFER_FAILED}: ${error.message}`);
    }
  }

  async checkForDuplicateLead(leadData) {
    const email = this.getLeadProperty(leadData, ['EMailAddress1', 'emailAddress1', 'email']);
    
    if (email) {
      try {
        const filter = `emailaddress1 eq '${email.replace(/'/g, "''")}'`;
        const result = await this.makeApiCall(`${DynamicsConfig.API.LEADS_ENDPOINT}?$filter=${filter}&$select=leadid,fullname`);
        
        if (result.value && result.value.length > 0) {
          throw new Error(`Lead with email ${email} already exists (ID: ${result.value[0].leadid})`);
        }
      } catch (error) {
        if (error.message.includes('already exists')) {
          throw error;
        }
        console.warn("Could not check for duplicates:", error);
      }
    }
  }

  async transferAttachment(leadId, attachment) {
    const annotationData = {
      subject: attachment.name || 'Attachment',
      filename: attachment.name || 'attachment.pdf',
      documentbody: attachment.body || attachment.data,
      mimetype: attachment.type || 'application/octet-stream',
      [`objectid_${DynamicsConfig.API.LEADS_ENDPOINT.slice(0, -1)}@odata.bind`]: `/${DynamicsConfig.API.LEADS_ENDPOINT}(${leadId})`
    };

    return await this.makeApiCall(DynamicsConfig.API.ANNOTATIONS_ENDPOINT, "POST", annotationData);
  }

  
  // Lead Mapping
  

  mapLeadToDynamics(leadData) {
    const truncateText = (text, maxLength) => {
      if (!text) return null;
      const str = String(text).trim();
      return str.length <= maxLength ? str : str.substring(0, maxLength - 3) + "...";
    };

    const validateEmail = (email) => {
      if (!email) return null;
      const emailStr = String(email).trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(emailStr) && emailStr.length <= 100 ? emailStr : null;
    };

    const formatPhone = (phone) => {
      if (!phone) return null;
      return String(phone).replace(/[^\d\+\-\(\)\s]/g, "").substring(0, 20).trim() || null;
    };

    const mappedLead = {
      subject: truncateText(
        this.getLeadProperty(leadData, ["Topic", "topic", "Subject", "subject"]) || "Lead from LeadSuccess",
        300
      ),
      firstname: truncateText(this.getLeadProperty(leadData, ["FirstName", "firstName", "first_name"]), 50),
      lastname: truncateText(
        this.getLeadProperty(leadData, ["LastName", "lastName", "last_name"]) || "Unknown",
        50
      ),
      companyname: truncateText(
        this.getLeadProperty(leadData, ["CompanyName", "companyName", "company"]) || "Unknown Company",
        100
      ),
      emailaddress1: validateEmail(this.getLeadProperty(leadData, ["EMailAddress1", "emailAddress1", "email"])),
      telephone1: formatPhone(this.getLeadProperty(leadData, ["Address1_Telephone1", "telephone1", "phone"])),
      mobilephone: formatPhone(this.getLeadProperty(leadData, ["MobilePhone", "mobilePhone", "mobile"])),
      jobtitle: truncateText(this.getLeadProperty(leadData, ["JobTitle", "jobTitle", "title"]), 100),
      description: truncateText(this.getLeadProperty(leadData, ["Description", "description", "notes"]), 2000),
      leadsourcecode: 3, // Web
      prioritycode: 1,   // Normal
      statuscode: 1,     // New
      statecode: 0,      // Open
    };

    // Remove null/empty values
    Object.keys(mappedLead).forEach((key) => {
      if (!mappedLead[key]) {
        delete mappedLead[key];
      }
    });

    return mappedLead;
  }

  getLeadProperty(leadData, possibleNames) {
    for (const name of possibleNames) {
      if (leadData.hasOwnProperty(name) && leadData[name] != null) {
        return leadData[name];
      }
    }
    return null;
  }

  
  // Testing
  async testConnection() {
    try {
      await this.makeApiCall(`${DynamicsConfig.API.LEADS_ENDPOINT}?$top=1`);
      return { success: true, message: "Connection test successful" };
    } catch (error) {
      return { success: false, message: `Connection test failed: ${error.message}` };
    }
  }
}

export default DynamicsService;