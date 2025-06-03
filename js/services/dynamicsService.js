import { DynamicsConfig } from '../config/dynamicsConfig.js';

/* Dynamics 365 Service - Clean and organized version
 * Handles authentication and API calls for Dynamics 365 integration
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

  // CONFIGURATION MANAGEMENT

  loadConfiguration() {
    try {
      this.config = {
        clientId: localStorage.getItem(DynamicsConfig.STORAGE_KEYS.CLIENT_ID) || "",
        tenantId: localStorage.getItem(DynamicsConfig.STORAGE_KEYS.TENANT_ID) || "",
        resourceUrl: localStorage.getItem(DynamicsConfig.STORAGE_KEYS.RESOURCE_URL) || "",
      };
    } catch (error) {
      console.error("Error loading configuration:", error);
    }
  }

  getConfiguration() {
    return { ...this.config };
  }

  saveConfiguration(config) {
    try {
      // Validation
      if ( !config.clientId?.trim() || !DynamicsConfig.VALIDATORS.isValidGuid(config.clientId)) {
        return {
          success: false,
          message: DynamicsConfig.ERRORS.INVALID_CLIENT_ID,
        };
      }
      if (!config.tenantId?.trim() || !DynamicsConfig.VALIDATORS.isValidGuid(config.tenantId)) {
        return {
          success: false,
          message: DynamicsConfig.ERRORS.INVALID_TENANT_ID,
        };
      }
      if (!config.resourceUrl?.trim() ||!DynamicsConfig.VALIDATORS.isDynamicsUrl(config.resourceUrl)) {
        return {
          success: false,
          message: DynamicsConfig.ERRORS.INVALID_RESOURCE_URL,
        };
      }

      // Save to localStorage
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

      this.disconnect();
      return { success: true, message: "Configuration saved successfully" };
    } catch (error) {
      console.error("Error saving configuration:", error);
      return {
        success: false,
        message: `Error saving configuration: ${error.message}`,
      };
    }
  }

  clearConfiguration() {
    try {
      Object.values(DynamicsConfig.STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
      });

      this.config = { clientId: "", tenantId: "", resourceUrl: "" };
      this.disconnect();
      return { success: true, message: "Configuration cleared successfully" };
    } catch (error) {
      console.error("Error clearing configuration:", error);
      return { success: false, message: "Failed to clear configuration" };
    }
  }

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

  // AUTHENTICATION METHODS

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
      return this.msalInstance;
    } catch (error) {
      console.error("Error initializing MSAL:", error);
      throw new Error(`Failed to initialize authentication: ${error.message}`);
    }
  }

  async checkExistingSession() {
    try {
      if (
        !this.config.clientId ||
        !this.config.tenantId ||
        !this.config.resourceUrl
      ) {
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

      this.accessToken = result.accessToken;
      this.currentUser = {
        name: result.account.name,
        username: result.account.username,
        id: result.account.homeAccountId,
      };
      this.isConnected = true;

      return {
        success: true,
        message: "Session restored",
        user: this.currentUser,
      };
    } catch (error) {
      this.disconnect();
      return { success: false, message: error.message };
    }
  }

  async connect() {
    try {
      const msalInstance = this.initializeMsal();
      await msalInstance.initialize();

      const loginRequest = {
        scopes: DynamicsConfig.DEFAULT_SCOPES(this.config.resourceUrl),
        prompt: "select_account",
      };

      let result;
      try {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          const silentRequest = { ...loginRequest, account: accounts[0] };
          result = await msalInstance.acquireTokenSilent(silentRequest);
        }
      } catch (silentError) {
        console.log(
          "Silent token acquisition failed, falling back to popup:",
          silentError
        );
      }

      if (!result) {
        result = await msalInstance.acquireTokenPopup(loginRequest);
      }

      this.accessToken = result.accessToken;
      this.currentUser = {
        name: result.account.name,
        username: result.account.username,
        id: result.account.homeAccountId,
      };
      this.isConnected = true;

      return {
        success: true,
        message: "Successfully connected",
        user: this.currentUser,
      };
    } catch (error) {
      console.error("Connection error:", error);
      this.disconnect();
      throw new Error(`Failed to connect to Dynamics 365: ${error.message}`);
    }
  }

  async disconnect() {
    try {
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
          await this.msalInstance.clearCache();
        }
      }

      this.msalInstance = null;
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;

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

  // API COMMUNICATION

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

      if (method === "POST") {
        headers["Prefer"] = "return=representation";
      }

      const requestOptions = { method, headers };

      if (
        data &&
        (method === "POST" || method === "PATCH" || method === "PUT")
      ) {
        try {
          JSON.stringify(data);
        } catch (jsonError) {
          throw new Error(`Invalid JSON data: ${jsonError.message}`);
        }
        requestOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          const errorMessage = errorJson.error?.message || errorText;
          throw new Error(
            `API call failed: ${response.status} ${errorMessage}`
          );
        } catch (parseError) {
          throw new Error(`API call failed: ${response.status} ${errorText}`);
        }
      }

      let result;
      if (response.status === 204) {
        result = {};
        const locationHeader = response.headers.get("Location");
        if (locationHeader) {
          const idMatch = locationHeader.match(/\(([^)]+)\)$/);
          if (idMatch) {
            result.id = idMatch[1];
            if (endpoint.includes("annotations")) {
              result.annotationid = idMatch[1];
            } else if (endpoint.includes("leads")) {
              result.leadid = idMatch[1];
            }
          }
        }
      } else {
        result = await response.json();
        if (result && !result.id) {
          if (endpoint.includes("annotations") && result.annotationid) {
            result.id = result.annotationid;
          } else if (endpoint.includes("leads") && result.leadid) {
            result.id = result.leadid;
          }
        }
      }

      return result;
    } catch (error) {
      console.error("API call error:", error);

      if (error.message.includes("401")) {
        throw new Error(
          "Authentication expired. Please reconnect to Dynamics 365."
        );
      } else if (error.message.includes("403")) {
        throw new Error("Insufficient permissions for this operation.");
      } else if (error.message.includes("404")) {
        throw new Error("Resource not found in Dynamics 365.");
      } else if (error.message.includes("429")) {
        throw new Error("Too many requests. Please wait and try again.");
      }

      throw error;
    }
  }

  // LEAD TRANSFER FUNCTIONALITY

  async transferLead(leadData, attachments = []) {
    if (!this.isConnected) {
      throw new Error(DynamicsConfig.ERRORS.NOT_AUTHENTICATED);
    }

    try {
      // Check for duplicate by email
      await this.checkForDuplicateLead(leadData);

      // Map and create lead
      const dynamicsLead = this.mapLeadToDynamics(leadData);
      const result = await this.makeApiCall(
        DynamicsConfig.API.LEADS_ENDPOINT,
        "POST",
        dynamicsLead
      );

      // Extract lead ID from response
      let leadId = this.extractLeadId(result);

      if (!leadId) {
        throw new Error("Could not extract lead ID from creation response");
      }

      // Transfer attachments
      let attachmentsTransferred = 0;
      let attachmentErrors = [];

      if (attachments.length > 0) {
        const preparedAttachments = await this.prepareAttachmentsForTransfer(
          attachments
        );

        for (const attachment of preparedAttachments) {
          try {
            await this.transferAttachment(leadId, attachment);
            attachmentsTransferred++;
          } catch (attachError) {
            console.error(
              `Failed to transfer attachment ${attachment.name}:`,
              attachError
            );
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
          errors: attachmentErrors,
        },
      };
    } catch (error) {
      console.error("Lead transfer error:", error);
      throw new Error(
        `${DynamicsConfig.ERRORS.TRANSFER_FAILED}: ${error.message}`
      );
    }
  }

  extractLeadId(result) {
    // Try different possible field names for lead ID
    if (result.leadid) return result.leadid;
    if (result.id) return result.id;
    if (result.Id) return result.Id;

    if (result["@odata.id"]) {
      const idMatch = result["@odata.id"].match(/leads\(([^)]+)\)/);
      if (idMatch) return idMatch[1];
    }

    if (result["@odata.context"]) {
      const contextMatch = result["@odata.context"].match(/leads\(([^)]+)\)/);
      if (contextMatch) return contextMatch[1];
    }

    // Last resort: find any GUID-like string
    const responseStr = JSON.stringify(result);
    const guidMatch = responseStr.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    );
    if (guidMatch) return guidMatch[0];

    return null;
  }

  async checkForDuplicateLead(leadData) {
    const email = this.getLeadProperty(leadData, [
      "EMailAddress1",
      "emailAddress1",
      "email",
    ]);

    if (email) {
      try {
        const filter = `emailaddress1 eq '${email.replace(/'/g, "''")}'`;
        const result = await this.makeApiCall(
          `${DynamicsConfig.API.LEADS_ENDPOINT}?$filter=${filter}&$select=leadid,fullname`
        );

        if (result.value && result.value.length > 0) {
          throw new Error(
            `Lead with email ${email} already exists (ID: ${result.value[0].leadid})`
          );
        }
      } catch (error) {
        if (error.message.includes("already exists")) {
          throw error;
        }
        console.warn("Could not check for duplicates:", error);
      }
    }
  }

  // ATTACHMENT TRANSFER

  async transferAttachment(leadId, attachment) {
    if (!leadId || !attachment?.body) {
      throw new Error("Lead ID and attachment body are required");
    }

    const cleanLeadId = leadId.replace(/[{}]/g, "");

    if (!DynamicsConfig.VALIDATORS.isValidGuid(cleanLeadId)) {
      throw new Error(`Invalid lead ID format: ${leadId}`);
    }

    const validatedAttachment = await this.validateAndPrepareAttachment(
      attachment
    );

    if (!validatedAttachment) {
      throw new Error(
        `Attachment ${attachment.name} cannot be transferred: unsupported type or too large`
      );
    }

    const annotationData = {
      subject: validatedAttachment.name || "Attachment from LeadSuccess",
      filename: validatedAttachment.name || "attachment.pdf",
      documentbody: validatedAttachment.body,
      mimetype: validatedAttachment.type || "application/octet-stream",
      notetext: `Attachment transferred from LeadSuccess: ${
        validatedAttachment.name || "Unknown"
      }`,
      isdocument: true,
      "objectid_lead@odata.bind": `/leads(${cleanLeadId})`,
    };

    try {
      const result = await this.makeApiCall(
        DynamicsConfig.API.ANNOTATIONS_ENDPOINT,
        "POST",
        annotationData
      );
      return result;
    } catch (error) {
      // Fallback: create standalone annotation
      const simpleData = {
        subject: `[UNLINKED] ${validatedAttachment.name || "Attachment"}`,
        filename: validatedAttachment.name || "attachment.pdf",
        documentbody: validatedAttachment.body,
        mimetype: validatedAttachment.type || "application/octet-stream",
        notetext: `This attachment was transferred from LeadSuccess but could not be linked to the lead. Original: ${attachment.name}`,
        isdocument: true,
      };

      try {
        const result = await this.makeApiCall(
          DynamicsConfig.API.ANNOTATIONS_ENDPOINT,
          "POST",
          simpleData
        );
        return result;
      } catch (standaloneError) {
        return await this.createTextNoteForFailedAttachment(
          cleanLeadId,
          attachment,
          error.message
        );
      }
    }
  }

  async validateAndPrepareAttachment(attachment) {
    try {
      const maxSize = 32 * 1024 * 1024; // 32MB
      const fileSize = this.calculateBase64FileSize(attachment.body);

      if (fileSize > maxSize) {
        return null;
      }

      const validatedType = this.validateAndConvertMimeType(
        attachment.type,
        attachment.name
      );

      if (!validatedType.isSupported) {
        if (attachment.type === "image/svg+xml") {
          return await this.convertSvgToSupportedFormat(attachment);
        }

        return {
          ...attachment,
          type: "application/octet-stream",
          name: this.ensureFileExtension(attachment.name, "txt"),
        };
      }

      if (!this.isValidBase64(attachment.body)) {
        return null;
      }

      return {
        ...attachment,
        type: validatedType.convertedType,
        name: validatedType.convertedName || attachment.name,
        size: fileSize,
      };
    } catch (error) {
      console.error(`Attachment validation failed: ${error.message}`);
      return null;
    }
  }

  validateAndConvertMimeType(mimeType, filename) {
    const supportedTypes = {
      "application/pdf": { supported: true },
      "application/msword": { supported: true },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        { supported: true },
      "application/vnd.ms-excel": { supported: true },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        supported: true,
      },
      "text/plain": { supported: true },
      "text/csv": { supported: true },
      "image/jpeg": { supported: true },
      "image/png": { supported: true },
      "image/gif": { supported: true },
      "image/svg+xml": {
        supported: false,
        convertedType: "text/plain",
        convertedName: filename
          ? filename.replace(".svg", ".txt")
          : "svg-content.txt",
      },
      "application/octet-stream": { supported: true },
    };

    const typeInfo = supportedTypes[mimeType] || {
      supported: false,
      convertedType: "application/octet-stream",
    };

    return {
      isSupported: typeInfo.supported,
      convertedType: typeInfo.convertedType || mimeType,
      convertedName: typeInfo.convertedName,
    };
  }

  async convertSvgToSupportedFormat(attachment) {
    try {
      const svgContent = atob(attachment.body);

      const textContent = `SVG File: ${attachment.name}
        Original MIME Type: image/svg+xml
        Content Length: ${svgContent.length} characters

        SVG Content:
        ${svgContent}

        Note: This SVG file was converted to text format for compatibility with Dynamics 365.
        To view the original SVG, copy the content between the SVG tags and save as a .svg file.`;

      const textBase64 = btoa(textContent);

      return {
        ...attachment,
        name: attachment.name.replace(".svg", ".txt"),
        type: "text/plain",
        body: textBase64,
        size: textContent.length,
        converted: true,
        originalType: "image/svg+xml",
      };
    } catch (error) {
      console.error("SVG conversion failed:", error);
      return null;
    }
  }

  async createTextNoteForFailedAttachment(leadId, attachment, errorMessage) {
    try {
      const noteContent = `ATTACHMENT TRANSFER FAILED

          File: ${attachment.name}
          Type: ${attachment.type}
          Size: ${this.formatFileSize(this.calculateBase64FileSize(attachment.body))}
          Error: ${errorMessage}

          The original attachment could not be transferred to Dynamics 365 due to file type or size restrictions.
          Please contact your administrator if you need to attach this type of file.

          Transfer attempted on: ${new Date().toLocaleString()}
          Source: LeadSuccess Integration`;

      const noteBase64 = btoa(noteContent);

      const noteData = {
        subject: `Failed Attachment: ${attachment.name}`,
        filename: `failed-attachment-${attachment.name.replace(
          /[^a-zA-Z0-9.]/g,
          "_"
        )}.txt`,
        documentbody: noteBase64,
        mimetype: "text/plain",
        notetext: "Attachment transfer failed - see document for details",
        isdocument: true,
        "objectid_lead@odata.bind": `/leads(${leadId})`,
      };

      const result = await this.makeApiCall(
        DynamicsConfig.API.ANNOTATIONS_ENDPOINT,
        "POST",
        noteData
      );
      return result;
    } catch (noteError) {
      console.error("Text note creation failed:", noteError);
      throw new Error(`Complete attachment transfer failure: ${errorMessage}`);
    }
  }

  async prepareAttachmentsForTransfer(attachments) {
    const preparedAttachments = [];

    for (const attachment of attachments) {
      try {
        if (!attachment.id) {
          continue;
        }

        const { default: ApiService } = await import("./apiService.js");
        const serverName = sessionStorage.getItem("serverName");
        const apiName = sessionStorage.getItem("apiName");

        if (!serverName || !apiName) {
          preparedAttachments.push(attachment);
          continue;
        }

        const apiService = new ApiService(serverName, apiName);
        const endpoint = `WCE_AttachmentById?Id=%27${encodeURIComponent(
          attachment.id
        )}%27&$format=json`;
        const data = await apiService.request("GET", endpoint);

        let attachmentData = null;
        if (data && data.d && data.d.results && data.d.results.length > 0) {
          attachmentData = data.d.results[0];
        } else if (data && data.d) {
          attachmentData = data.d;
        }

        if (attachmentData && attachmentData.Body) {
          if (!this.isValidBase64(attachmentData.Body)) {
            continue;
          }

          const preparedAttachment = {
            id: attachment.id,
            name: this.sanitizeFileName(
              attachmentData.FileName ||
                attachmentData.Name ||
                `attachment_${attachment.id.substring(0, 8)}.pdf`
            ),
            type: this.validateMimeType(
              attachmentData.MimeType ||
                attachmentData.ContentType ||
                "application/octet-stream"
            ),
            body: attachmentData.Body,
            size:
              attachmentData.FileSize ||
              attachmentData.BodyLength ||
              attachmentData.Body.length,
          };

          preparedAttachments.push(preparedAttachment);
        }
      } catch (error) {
        console.error(`Error preparing attachment ${attachment.id}:`, error);
      }
    }

    return preparedAttachments;
  }

  // UTILITY METHODS

  calculateBase64FileSize(base64String) {
    if (!base64String) return 0;
    const withoutPadding = base64String.replace(/=/g, "");
    return Math.floor((withoutPadding.length * 3) / 4);
  }

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);
    return `${size} ${sizes[i]}`;
  }

  ensureFileExtension(filename, defaultExt) {
    if (!filename) return `file.${defaultExt}`;
    const hasExtension = filename.includes(".");
    return hasExtension ? filename : `${filename}.${defaultExt}`;
  }

  isValidBase64(str) {
    if (!str || typeof str !== "string") return false;

    try {
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(str)) return false;
      if (str.length % 4 !== 0) return false;
      const testSample = str.substring(0, Math.min(100, str.length));
      atob(testSample);
      return true;
    } catch (error) {
      return false;
    }
  }

  sanitizeFileName(filename) {
    if (!filename) return "attachment.pdf";

    const sanitized = filename
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/\s+/g, "_")
      .substring(0, 255);

    if (!sanitized.includes(".")) {
      return sanitized + ".pdf";
    }

    return sanitized;
  }

  validateMimeType(mimeType) {
    if (!mimeType) return "application/octet-stream";

    const validMimeTypes = {
      "application/pdf": "application/pdf",
      "image/jpeg": "image/jpeg",
      "image/jpg": "image/jpeg",
      "image/png": "image/png",
      "image/gif": "image/gif",
      "image/svg+xml": "image/svg+xml",
      "text/plain": "text/plain",
      "text/csv": "text/csv",
      "application/msword": "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel": "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };

    const normalizedType = mimeType.toLowerCase().trim();
    return validMimeTypes[normalizedType] || "application/octet-stream";
  }

  mapLeadToDynamics(leadData) {
    const truncateText = (text, maxLength) => {
      if (!text) return null;
      const str = String(text).trim();
      return str.length <= maxLength
        ? str
        : str.substring(0, maxLength - 3) + "...";
    };

    const validateEmail = (email) => {
      if (!email) return null;
      const emailStr = String(email).trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(emailStr) && emailStr.length <= 100
        ? emailStr
        : null;
    };

    const formatPhone = (phone) => {
      if (!phone) return null;
      return (
        String(phone)
          .replace(/[^\d\+\-\(\)\s]/g, "")
          .substring(0, 20)
          .trim() || null
      );
    };

    const mappedLead = {
      subject: truncateText(
        this.getLeadProperty(leadData, [
          "Topic",
          "topic",
          "Subject",
          "subject",
        ]) || "Lead from LeadSuccess",
        300
      ),
      firstname: truncateText(
        this.getLeadProperty(leadData, [
          "FirstName",
          "firstName",
          "first_name",
        ]),
        50
      ),
      lastname: truncateText(
        this.getLeadProperty(leadData, ["LastName", "lastName", "last_name"]) ||
          "Unknown",
        50
      ),
      companyname: truncateText(
        this.getLeadProperty(leadData, [
          "CompanyName",
          "companyName",
          "company",
        ]) || "Unknown Company",
        100
      ),
      emailaddress1: validateEmail(
        this.getLeadProperty(leadData, [
          "EMailAddress1",
          "emailAddress1",
          "email",
        ])
      ),
      telephone1: formatPhone(
        this.getLeadProperty(leadData, [
          "Address1_Telephone1",
          "telephone1",
          "phone",
        ])
      ),
      mobilephone: formatPhone(
        this.getLeadProperty(leadData, ["MobilePhone", "mobilePhone", "mobile"])
      ),
      jobtitle: truncateText(
        this.getLeadProperty(leadData, ["JobTitle", "jobTitle", "title"]),
        100
      ),
      description: truncateText(
        this.getLeadProperty(leadData, ["Description", "description", "notes"]),
        2000
      ),
      leadsourcecode: 3, // Web
      prioritycode: 1, // Normal
      statuscode: 1, // New
      statecode: 0, // Open
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

  async testConnection() {
    try {
      await this.makeApiCall(`${DynamicsConfig.API.LEADS_ENDPOINT}?$top=1`);
      return { success: true, message: "Connection test successful" };
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
      };
    }
  }
}

export default DynamicsService;