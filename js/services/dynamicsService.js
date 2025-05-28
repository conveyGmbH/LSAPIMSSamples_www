/**
 * Microsoft Dynamics 365 Service - ENHANCED VERSION
 * Avec persistance d'authentification et session management
 */

// Configuration pour Dynamics 365
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
      clientId: '',
      tenantId: '',
      resourceUrl: ''
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

  // Load configuration from localStorage
  loadConfiguration() {
    try {
      this.config = {
        clientId: localStorage.getItem(DynamicsConfig.STORAGE_KEYS.CLIENT_ID) || '',
        tenantId: localStorage.getItem(DynamicsConfig.STORAGE_KEYS.TENANT_ID) || '',
        resourceUrl: localStorage.getItem(DynamicsConfig.STORAGE_KEYS.RESOURCE_URL) || ''
      };
      
      console.log('✅ Configuration loaded:', {
        clientId: this.config.clientId ? '***configured***' : 'empty',
        tenantId: this.config.tenantId ? '***configured***' : 'empty',
        resourceUrl: this.config.resourceUrl || 'empty'
      });
      
    } catch (error) {
      console.error('❌ Error loading configuration:', error);
    }
  }

  // Get current configuration
  getConfiguration() {
    return { ...this.config };
  }

  // Save configuration
  saveConfiguration(config) {
    try {
      // Validation
      if (!config.clientId?.trim()) {
        return { success: false, message: 'Client ID is required' };
      }
      if (!config.tenantId?.trim()) {
        return { success: false, message: 'Tenant ID is required' };
      }
      if (!config.resourceUrl?.trim()) {
        return { success: false, message: 'Resource URL is required' };
      }

      // URL validation
      try {
        new URL(config.resourceUrl);
      } catch {
        return { success: false, message: 'Invalid Resource URL format' };
      }

      // Save to localStorage
      localStorage.setItem(DynamicsConfig.STORAGE_KEYS.CLIENT_ID, config.clientId.trim());
      localStorage.setItem(DynamicsConfig.STORAGE_KEYS.TENANT_ID, config.tenantId.trim());
      localStorage.setItem(DynamicsConfig.STORAGE_KEYS.RESOURCE_URL, config.resourceUrl.trim());

      // Update local config
      this.config = {
        clientId: config.clientId.trim(),
        tenantId: config.tenantId.trim(),
        resourceUrl: config.resourceUrl.trim()
      };

      // Reset connection state since config changed
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;
      this.msalInstance = null;

      console.log('✅ Configuration saved successfully');
      return { success: true, message: 'Configuration saved successfully' };

    } catch (error) {
      console.error('❌ Error saving configuration:', error);
      return { success: false, message: `Error saving configuration: ${error.message}` };
    }
  }

  // Clear configuration method
  clearConfiguration() {
    try {
      Object.values(DynamicsConfig.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      this.config = { clientId: '', tenantId: '', resourceUrl: '' };
      this.msalInstance = null;
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;
      
      console.log('✅ Configuration cleared');
      return { success: true, message: 'Configuration cleared successfully' };
    } catch (error) {
      console.error('❌ Error clearing configuration:', error);
      return { success: false, message: 'Failed to clear configuration' };
    }
  }

  // Get connection status
  getConnectionStatus() {
    const isConfigured = !!(this.config.clientId && this.config.tenantId && this.config.resourceUrl);
    
    return {
      isConfigured,
      isConnected: this.isConnected,
      currentUser: this.currentUser,
      hasValidToken: !!this.accessToken
    };
  }

  // Initialize MSAL instance
  initializeMsal() {
    if (!this.config.clientId || !this.config.tenantId) {
      throw new Error('Configuration required: clientId and tenantId must be set');
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
          navigateToLoginRequestUrl: false
        },
        cache: {
          cacheLocation: "localStorage",
          storeAuthStateInCookie: false
        },
        telemetry: {
          application: {
            appName: "LeadSuccess-DynamicsIntegration",
            appVersion: "1.0.0"
          }
        }
      };

      this.msalInstance = new msal.PublicClientApplication(msalConfig);
      console.log('✅ MSAL instance initialized');
      
      return this.msalInstance;

    } catch (error) {
      console.error('❌ Error initializing MSAL:', error);
      throw new Error(`Failed to initialize authentication: ${error.message}`);
    }
  }

  // NOUVELLE MÉTHODE: Check existing authentication session
  async checkExistingSession() {
    try {
      console.log('🔍 Checking for existing authentication session...');

      if (!this.config.clientId || !this.config.tenantId || !this.config.resourceUrl) {
        console.log('ℹ️ Configuration incomplete, skipping session check');
        return { success: false, message: 'Configuration incomplete' };
      }

      // Initialize MSAL if not already done
      const msalInstance = this.initializeMsal();
      await msalInstance.initialize();

      const accounts = msalInstance.getAllAccounts();
      
      if (accounts.length === 0) {
        console.log('ℹ️ No existing accounts found');
        return { success: false, message: 'No existing accounts' };
      }

      console.log('🔍 Found existing account, attempting silent token acquisition...');

      // Try to get token silently
      const silentRequest = {
        scopes: [`${this.config.resourceUrl}/user_impersonation`],
        account: accounts[0]
      };

      const result = await msalInstance.acquireTokenSilent(silentRequest);
      
      // If successful, restore session
      this.accessToken = result.accessToken;
      this.currentUser = {
        name: result.account.name,
        username: result.account.username,
        id: result.account.homeAccountId
      };
      this.isConnected = true;

      console.log('✅ Session restored successfully');
      console.log('👤 User:', this.currentUser);

      return {
        success: true,
        message: 'Session restored successfully',
        user: this.currentUser
      };

    } catch (error) {
      console.log('ℹ️ Could not restore session:', error.message);
      
      // Reset connection state
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;
      
      return { success: false, message: error.message };
    }
  }

  // Connect to Dynamics 365
  async connect() {
    try {
      console.log('🔗 Starting Dynamics 365 connection...');

      // Initialize MSAL
      const msalInstance = this.initializeMsal();
      await msalInstance.initialize();

      // Configure login request
      const loginRequest = {
        scopes: [`${this.config.resourceUrl}/user_impersonation`],
        prompt: 'select_account'
      };

      console.log('🔐 Attempting login with scopes:', loginRequest.scopes);

      // Attempt silent login first
      let result;
      try {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          const silentRequest = {
            ...loginRequest,
            account: accounts[0]
          };
          result = await msalInstance.acquireTokenSilent(silentRequest);
          console.log('✅ Silent login successful');
        }
      } catch (silentError) {
        console.log('ℹ️ Silent login failed, trying interactive login');
      }

      // If silent login failed, try interactive login
      if (!result) {
        result = await msalInstance.acquireTokenPopup(loginRequest);
        console.log('✅ Interactive login successful');
      }

      // Store authentication data
      this.accessToken = result.accessToken;
      this.currentUser = {
        name: result.account.name,
        username: result.account.username,
        id: result.account.homeAccountId
      };
      this.isConnected = true;

      console.log('✅ Successfully connected to Dynamics 365');
      console.log('👤 User:', this.currentUser);

      return {
        success: true,
        message: 'Successfully connected to Dynamics 365',
        user: this.currentUser
      };

    } catch (error) {
      console.error('❌ Connection error:', error);
      
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;

      throw new Error(`Failed to connect to Dynamics 365: ${error.message}`);
    }
  }

  // Enhanced disconnect method
  async disconnect() {
    try {
      console.log('🔌 Starting disconnect process...');

      // Clear MSAL cache if instance exists
      if (this.msalInstance) {
        try {
          const accounts = this.msalInstance.getAllAccounts();
          
          // Remove all accounts
          for (const account of accounts) {
            await this.msalInstance.getTokenCache().removeAccount(account);
          }
          
          // Clear all tokens
          await this.msalInstance.clearCache();
          console.log('✅ MSAL cache cleared');
          
        } catch (msalError) {
          console.warn('⚠️ Error clearing MSAL cache:', msalError);
        }
      }

      // Reset instance variables
      this.msalInstance = null;
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;

      console.log('✅ Successfully disconnected from Dynamics 365');
      
      return {
        success: true,
        message: 'Successfully disconnected from Dynamics 365'
      };

    } catch (error) {
      console.error('❌ Disconnect error:', error);
      
      // Force reset even if there was an error
      this.msalInstance = null;
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;
      
      return {
        success: false,
        message: `Disconnect error: ${error.message}`
      };
    }
  }

  // Get fresh access token
  async getAccessToken() {
    if (!this.msalInstance || !this.isConnected) {
      throw new Error('Not connected to Dynamics 365');
    }

    try {
      const accounts = this.msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const silentRequest = {
        scopes: [`${this.config.resourceUrl}/user_impersonation`],
        account: accounts[0]
      };

      const result = await this.msalInstance.acquireTokenSilent(silentRequest);
      this.accessToken = result.accessToken;
      
      return this.accessToken;

    } catch (error) {
      console.error('❌ Error getting access token:', error);
      
      // If token refresh fails, user needs to re-authenticate
      this.isConnected = false;
      this.currentUser = null;
      this.accessToken = null;
      
      throw new Error('Token expired. Please re-authenticate.');
    }
  }

  // Make API call to Dynamics 365
  async makeApiCall(endpoint, method = 'GET', data = null) {
    if (!this.isConnected) {
      throw new Error('Not connected to Dynamics 365');
    }

    try {
      const token = await this.getAccessToken();
      const url = `${this.config.resourceUrl}/api/data/v${DynamicsConfig.API_VERSION}/${endpoint}`;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0'
      };

      const requestOptions = {
        method,
        headers
      };

      if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(data);
      }

      console.log(`📡 Making API call: ${method} ${url}`);

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API call failed:', response.status, errorText);
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }

      const result = response.status === 204 ? {} : await response.json();
      console.log('✅ API call successful');
      
      return result;

    } catch (error) {
      console.error('❌ API call error:', error);
      throw error;
    }
  }

  // Transfer lead to Dynamics 365 (enhanced with attachments info)
  async transferLead(leadData, attachments = []) {
    if (!this.isConnected) {
      throw new Error('Not connected to Dynamics 365');
    }

    try {
      console.log('📤 Starting lead transfer...', leadData);
      console.log('📎 Attachments to transfer:', attachments);

      // Map lead data to Dynamics format
      const dynamicsLead = this.mapLeadToDynamics(leadData);
      
      console.log('🔄 Mapped lead data:', dynamicsLead);

      // Create lead in Dynamics
      const result = await this.makeApiCall('leads', 'POST', dynamicsLead);
      
      const leadId = result.leadid || 'unknown';
      const leadUrl = `${this.config.resourceUrl}/main.aspx?etc=4&id=${leadId}&pagetype=entityrecord`;

      // TODO: Handle attachments transfer here if needed
      if (attachments.length > 0) {
        console.log(`📎 ${attachments.length} attachments will be transferred separately`);
        // Implementation for attachment transfer would go here
      }

      console.log('✅ Lead transferred successfully:', leadId);

      return {
        success: true,
        leadId: leadId,
        dynamicsUrl: leadUrl,
        message: 'Lead transferred successfully to Dynamics 365',
        attachmentsCount: attachments.length
      };

    } catch (error) {
      console.error('❌ Lead transfer error:', error);
      throw new Error(`Failed to transfer lead: ${error.message}`);
    }
  }

  // Map lead data from WCE format to Dynamics format
 // Map lead data from WCE format to Dynamics format - VERSION AVEC VALIDATION
mapLeadToDynamics(leadData) {
  // Helper function to get property with multiple possible names
  const getProperty = (possibleNames) => {
    for (const name of possibleNames) {
      if (leadData.hasOwnProperty(name) && leadData[name] != null) {
        return leadData[name];
      }
    }
    return null;
  };

  // Helper function to truncate text to specific length
  const truncateText = (text, maxLength) => {
    if (!text) return null;
    const str = String(text).trim();
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  };

  // Helper function to validate and format phone numbers
  const formatPhone = (phone, maxLength = 20) => {
    if (!phone) return null;
    
    // Remove non-numeric characters except +, -, (, ), and spaces
    let cleanPhone = String(phone).replace(/[^\d\+\-\(\)\s]/g, '');
    
    // Truncate if too long
    if (cleanPhone.length > maxLength) {
      cleanPhone = cleanPhone.substring(0, maxLength);
    }
    
    return cleanPhone.trim() || null;
  };

  // Helper function to validate email
  const validateEmail = (email) => {
    if (!email) return null;
    const emailStr = String(email).trim();
    
    // Basic email validation and length check (max 100 chars for Dynamics)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(emailStr) && emailStr.length <= 100) {
      return emailStr;
    }
    
    // If invalid but contains @, try to truncate
    if (emailStr.includes('@') && emailStr.length > 100) {
      return emailStr.substring(0, 100);
    }
    
    return null;
  };

  // Helper function to validate URL
  const validateUrl = (url) => {
    if (!url) return null;
    let urlStr = String(url).trim();
    
    // Add protocol if missing
    if (urlStr && !urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
      urlStr = 'https://' + urlStr;
    }
    
    // Truncate if too long (max 200 chars for Dynamics)
    if (urlStr.length > 200) {
      urlStr = urlStr.substring(0, 200);
    }
    
    return urlStr;
  };

  const mappedLead = {
    // Basic information - Subject max 300 chars
    subject: truncateText(
      getProperty(['Topic', 'topic', 'Subject', 'subject']) || 'Lead from LeadSuccess',
      300
    ),
    
    // Contact information - Name fields max 50 chars each
    firstname: truncateText(
      getProperty(['FirstName', 'firstName', 'first_name']),
      50
    ),
    lastname: truncateText(
      getProperty(['LastName', 'lastName', 'last_name']),
      50
    ),
    
    // Company name - max 100 chars
    companyname: truncateText(
      getProperty(['CompanyName', 'companyName', 'company', 'Company']),
      100
    ),
    
    // Email - validated
    emailaddress1: validateEmail(
      getProperty(['EMailAddress1', 'emailAddress1', 'email', 'Email'])
    ),
    
    // Phone numbers - max 20 chars each
    telephone1: formatPhone(
      getProperty(['Address1_Telephone1', 'telephone1', 'phone', 'Phone']),
      20
    ),
    mobilephone: formatPhone(
      getProperty(['MobilePhone', 'mobilePhone', 'mobile', 'Mobile']),
      20
    ),
    
    // Job information - max 100 chars
    jobtitle: truncateText(
      getProperty(['JobTitle', 'jobTitle', 'title', 'Title']),
      100
    ),
    
    // Address information
    address1_line1: truncateText(
      getProperty(['Address1_Line1', 'address1_Line1', 'address', 'Address']),
      250
    ),
    address1_city: truncateText(
      getProperty(['Address1_City', 'address1_City', 'city', 'City']),
      80
    ),
    address1_postalcode: truncateText(
      getProperty(['Address1_PostalCode', 'address1_PostalCode', 'postalCode', 'zipCode']),
      20
    ),
    address1_country: truncateText(
      getProperty(['Address1_Country', 'address1_Country', 'country', 'Country']),
      80
    ),
    address1_stateorprovince: truncateText(
      getProperty(['Address1_StateOrProvince', 'address1_StateOrProvince', 'state', 'State']),
      50
    ),
    
    // Website URL - validated
    websiteurl: validateUrl(
      getProperty(['WebSiteUrl', 'webSiteUrl', 'website', 'Website'])
    ),
    
    // Description - max 2000 chars
    description: truncateText(
      getProperty(['Description', 'description', 'notes', 'Notes']),
      2000
    ),
    
    // Lead source - FIXED: use valid value (1-10)
    leadsourcecode: 3, // Web (valid range: 1-10)
    
    // Priority and status
    prioritycode: 1, // Normal priority
    statuscode: 1, // New
    statecode: 0 // Open
  };

  // Remove null/undefined values
  Object.keys(mappedLead).forEach(key => {
    if (mappedLead[key] === null || mappedLead[key] === undefined || mappedLead[key] === '') {
      delete mappedLead[key];
    }
  });

  // Log validation info
  console.log('🔄 Mapped and validated lead data:', mappedLead);
  
  // Log any truncated fields for debugging
  const originalValues = {
    subject: getProperty(['Topic', 'topic', 'Subject', 'subject']),
    firstname: getProperty(['FirstName', 'firstName', 'first_name']),
    lastname: getProperty(['LastName', 'lastName', 'last_name']),
    mobilephone: getProperty(['MobilePhone', 'mobilePhone', 'mobile', 'Mobile']),
    telephone1: getProperty(['Address1_Telephone1', 'telephone1', 'phone', 'Phone'])
  };
  
  Object.keys(originalValues).forEach(key => {
    if (originalValues[key] && mappedLead[key] && 
        String(originalValues[key]).length > String(mappedLead[key]).length) {
      console.warn(`⚠️ Field '${key}' truncated from '${originalValues[key]}' to '${mappedLead[key]}'`);
    }
  });

  return mappedLead;
}
  // Test connection to Dynamics 365
  async testConnection() {
    try {
      console.log('🧪 Testing Dynamics 365 connection...');
      
      const result = await this.makeApiCall('leads?$top=1');
      
      console.log('✅ Connection test successful');
      return {
        success: true,
        message: 'Connection to Dynamics 365 is working properly'
      };

    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }
}








export default DynamicsService;