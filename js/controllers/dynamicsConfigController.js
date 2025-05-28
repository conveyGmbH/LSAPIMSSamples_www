// Import avec vérification
import dynamicsConfig from '../config/dynamicsConfig.js';

// Vérification immédiate de l'import
console.log('DynamicsConfig imported:', dynamicsConfig);
if (!dynamicsConfig) {
  console.error('CRITICAL: dynamicsConfig is undefined!');
}

/**
 * Microsoft Dynamics CRM Service
 * Handles all Dynamics CRM API interactions with improved error handling and configuration
 */
class DynamicsService {
  constructor() {
    // Vérification avant utilisation
    if (!dynamicsConfig) {
      console.error('CRITICAL: dynamicsConfig is not available in constructor');
      this.apiBaseUrl = 'http://localhost:3000/api'; // Fallback
    } else {
      this.apiBaseUrl = dynamicsConfig.apiBaseUrl;
    }
    console.log('DynamicsService initialized with API URL:', this.apiBaseUrl);
  }

  // Singleton pattern implementation
  static getInstance() {
    if (!DynamicsService.instance) {
      DynamicsService.instance = new DynamicsService();
    }
    return DynamicsService.instance;
  }

  // Check if client configuration exists and is valid
  hasClientConfig() {
    // Fallback si dynamicsConfig n'est pas disponible
    if (!dynamicsConfig) {
      console.error('dynamicsConfig not available, using fallback');
      const config = this.getClientConfig();
      return !!(config.clientId && config.tenantId && config.resourceUrl && config.redirectUri);
    }

    const config = this.getClientConfig();
    return !!(
      config.clientId && 
      config.tenantId && 
      config.resourceUrl &&
      config.redirectUri &&
      dynamicsConfig.validators.isValidGuid(config.clientId) &&
      dynamicsConfig.validators.isValidGuid(config.tenantId) &&
      dynamicsConfig.validators.isValidDynamicsUrl(config.resourceUrl) &&
      dynamicsConfig.validators.isValidRedirectUri(config.redirectUri)
    );
  }

  // Get client configuration from localStorage
  getClientConfig() {
    // Utilisation des clés directement si dynamicsConfig n'est pas disponible
    const storageKeys = dynamicsConfig?.storageKeys || {
      clientId: 'DYNAMICS_CLIENT_ID',
      clientSecret: 'DYNAMICS_CLIENT_SECRET',
      tenantId: 'DYNAMICS_TENANT_ID',
      resourceUrl: 'DYNAMICS_RESOURCE_URL',
      redirectUri: 'DYNAMICS_REDIRECT_URI'
    };

    return {
      clientId: localStorage.getItem(storageKeys.clientId),
      clientSecret: localStorage.getItem(storageKeys.clientSecret),
      tenantId: localStorage.getItem(storageKeys.tenantId),
      resourceUrl: localStorage.getItem(storageKeys.resourceUrl),
      redirectUri: localStorage.getItem(storageKeys.redirectUri)
    };
  }

  // Save client configuration with validation
  async saveClientConfig(config) {
    try {
      // Validate configuration
      const validation = this.validateClientConfig(config);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.errors.join(', ')
        };
      }

      // Store configuration
      localStorage.setItem(dynamicsConfig.storageKeys.clientId, config.clientId);
      localStorage.setItem(dynamicsConfig.storageKeys.clientSecret, config.clientSecret || '');
      localStorage.setItem(dynamicsConfig.storageKeys.tenantId, config.tenantId);
      localStorage.setItem(dynamicsConfig.storageKeys.resourceUrl, config.resourceUrl);
      localStorage.setItem(dynamicsConfig.storageKeys.redirectUri, config.redirectUri);

      return {
        success: true,
        message: 'Configuration saved successfully'
      };
    } catch (error) {
      console.error('Error saving client config:', error);
      return {
        success: false,
        message: `Failed to save configuration: ${error.message}`
      };
    }
  }

  // Validate client configuration
  validateClientConfig(config) {
    const errors = [];

    if (!config.clientId) {
      errors.push('Client ID is required');
    } else if (!dynamicsConfig.validators.isValidGuid(config.clientId)) {
      errors.push('Client ID must be a valid GUID');
    }

    if (!config.tenantId) {
      errors.push('Tenant ID is required');
    } else if (!dynamicsConfig.validators.isValidGuid(config.tenantId)) {
      errors.push('Tenant ID must be a valid GUID');
    }

    if (!config.resourceUrl) {
      errors.push('Dynamics CRM URL is required');
    } else if (!dynamicsConfig.validators.isValidDynamicsUrl(config.resourceUrl)) {
      errors.push('Invalid Dynamics CRM URL format');
    }

    if (!config.redirectUri) {
      errors.push('Redirect URI is required');
    } else if (!dynamicsConfig.validators.isValidRedirectUri(config.redirectUri)) {
      errors.push('Invalid Redirect URI format');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Clear client configuration
  async clearClientConfig() {
    try {
      // Clear configuration
      localStorage.removeItem(dynamicsConfig.storageKeys.clientId);
      localStorage.removeItem(dynamicsConfig.storageKeys.clientSecret);
      localStorage.removeItem(dynamicsConfig.storageKeys.tenantId);
      localStorage.removeItem(dynamicsConfig.storageKeys.resourceUrl);
      localStorage.removeItem(dynamicsConfig.storageKeys.redirectUri);

      // Also clear authentication data
      this.clearAuthData();

      return {
        success: true,
        message: 'Configuration cleared successfully'
      };
    } catch (error) {
      console.error('Error clearing client config:', error);
      return {
        success: false,
        message: `Failed to clear configuration: ${error.message}`
      };
    }
  }

  // Test connection with current configuration
  async testConnection() {
    try {
      const config = this.getClientConfig();
      if (!this.hasClientConfig()) {
        return {
          success: false,
          message: 'Configuration incomplete'
        };
      }

      // Test by making a simple request to the auth endpoint
      const response = await fetch(`${this.apiBaseUrl}/dynamics/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          DYNAMICS_CLIENT_ID: config.clientId,
          DYNAMICS_TENANT_ID: config.tenantId,
          DYNAMICS_RESOURCE_URL: config.resourceUrl,
          DYNAMICS_REDIRECT_URI: config.redirectUri
        })
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Configuration is valid'
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          message: error.error || 'Configuration test failed'
        };
      }
    } catch (error) {
      console.error('Connection test error:', error);
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }

  // Get authentication data from local storage
  getAuthData() {
    try {
      const accessToken = localStorage.getItem(dynamicsConfig.storageKeys.accessToken);
      const resourceUrl = localStorage.getItem(dynamicsConfig.storageKeys.resourceUrl);

      if (!accessToken || !resourceUrl) {
        return null;
      }

      return {
        accessToken,
        resourceUrl,
        refreshToken: localStorage.getItem(dynamicsConfig.storageKeys.refreshToken),
        expiresAt: localStorage.getItem(dynamicsConfig.storageKeys.expiresAt)
      };
    } catch (error) {
      console.error('Error retrieving auth data:', error);
      return null;
    }
  }

  // Store authentication data in local storage
  storeAuthData(authData) {
    if (!authData || !authData.accessToken || !authData.resourceUrl) {
      console.error('Invalid auth data provided:', authData);
      return false;
    }

    try {
      localStorage.setItem(dynamicsConfig.storageKeys.accessToken, authData.accessToken);
      localStorage.setItem(dynamicsConfig.storageKeys.resourceUrl, authData.resourceUrl);
      
      // Store additional info if available
      if (authData.refreshToken) {
        localStorage.setItem(dynamicsConfig.storageKeys.refreshToken, authData.refreshToken);
      }
      if (authData.expiresAt) {
        localStorage.setItem(dynamicsConfig.storageKeys.expiresAt, authData.expiresAt.toString());
      }
      
      return true;
    } catch (error) {
      console.error('Error storing auth data:', error);
      return false;
    }
  }

  // Clear authentication data from local storage
  clearAuthData() {
    try {
      localStorage.removeItem(dynamicsConfig.storageKeys.accessToken);
      localStorage.removeItem(dynamicsConfig.storageKeys.refreshToken);
      localStorage.removeItem(dynamicsConfig.storageKeys.expiresAt);
      return true;
    } catch (error) {
      console.error('Error clearing auth data:', error);
      return false;
    }
  }

  // Initialize OAuth flow with authorization code
  async initializeAuth() {
    try {
      const config = this.getClientConfig();
      
      if (!this.hasClientConfig()) {
        throw new Error('Dynamics CRM client configuration missing or invalid. Please configure it first.');
      }

      // Request auth URL from backend
      const response = await fetch(`${this.apiBaseUrl}/dynamics/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          DYNAMICS_CLIENT_ID: config.clientId,
          DYNAMICS_CLIENT_SECRET: config.clientSecret,
          DYNAMICS_TENANT_ID: config.tenantId,
          DYNAMICS_RESOURCE_URL: config.resourceUrl,
          DYNAMICS_REDIRECT_URI: config.redirectUri
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get authentication URL');
      }

      const { authUrl } = await response.json();
      
      console.log('Opening Dynamics authentication URL:', authUrl);

      // Open the authorization URL in a popup window
      const authWindow = window.open(
        authUrl, 
        'DynamicsAuth', 
        'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes'
      );
      
      if (!authWindow) {
        throw new Error('Popup blocked! Please allow popups for this site and try again.');
      }

      return new Promise((resolve, reject) => {
        // Handle timeout (5 minutes)
        const timeout = setTimeout(() => {
          if (!authWindow.closed) {
            authWindow.close();
          }
          reject(new Error('Authentication timed out. Please try again.'));
        }, 300000);

        // Listen for messages from the popup window
        const messageHandler = (event) => {
          if (event.data && event.data.type === 'dynamics-auth-code') {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            
            if (!authWindow.closed) {
              authWindow.close();
            }
            
            console.log('Message received from Dynamics authentication window:', event.data);
            
            if (event.data.error) {
              reject(new Error(`Authentication error: ${event.data.error}`));
            } else if (event.data.code) {
              // Exchange code for token
              this.exchangeCodeForToken(event.data.code)
                .then(resolve)
                .catch(reject);
            } else {
              reject(new Error('Invalid response from authentication window'));
            }
          }
        };

        window.addEventListener('message', messageHandler);

        // Check if popup was closed manually
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            reject(new Error('Authentication cancelled by user'));
          }
        }, 1000);
      });
    } catch (error) {
      console.error('Error initializing authentication:', error);
      throw error;
    }
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code) {
    try {
      const config = this.getClientConfig();
      
      const response = await fetch(`${this.apiBaseUrl}/dynamics/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          clientConfig: {
            DYNAMICS_CLIENT_ID: config.clientId,
            DYNAMICS_CLIENT_SECRET: config.clientSecret,
            DYNAMICS_TENANT_ID: config.tenantId,
            DYNAMICS_RESOURCE_URL: config.resourceUrl,
            DYNAMICS_REDIRECT_URI: config.redirectUri
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to exchange authorization code');
      }

      const tokenData = await response.json();
      
      // Store the authentication data
      this.storeAuthData({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        resourceUrl: config.resourceUrl,
        expiresAt: Date.now() + (tokenData.expires_in * 1000)
      });

      return tokenData;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  // Validate token and refresh if needed
  async isTokenValid() {
    try {
      const authData = this.getAuthData();
      if (!authData || !authData.resourceUrl || !authData.accessToken) {
        return false;
      }
      
      // Check if token is expired
      if (dynamicsConfig.helpers.isTokenExpired()) {
        console.log('Token expired, attempting refresh...');
        const refreshed = await this.refreshToken();
        return refreshed;
      }
      
      // Test token validity by making a simple API call
      const response = await fetch(
        `${this.apiBaseUrl}/dynamics/userinfo?accessToken=${encodeURIComponent(authData.accessToken)}&resourceUrl=${encodeURIComponent(authData.resourceUrl)}`
      );
      
      return response.ok;
    } catch (error) {
      console.error("Token validation error:", error);
      return false;
    }
  }

  // Refresh access token using refresh token
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem(dynamicsConfig.storageKeys.refreshToken);
      if (!refreshToken) {
        return false;
      }

      const config = this.getClientConfig();
      
      const response = await fetch(`${this.apiBaseUrl}/dynamics/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: refreshToken,
          clientConfig: {
            DYNAMICS_CLIENT_ID: config.clientId,
            DYNAMICS_CLIENT_SECRET: config.clientSecret,
            DYNAMICS_TENANT_ID: config.tenantId,
            DYNAMICS_RESOURCE_URL: config.resourceUrl,
            DYNAMICS_REDIRECT_URI: config.redirectUri
          }
        })
      });

      if (!response.ok) {
        console.error('Token refresh failed');
        this.clearAuthData();
        return false;
      }

      const tokenData = await response.json();
      
      // Store the new authentication data
      this.storeAuthData({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken,
        resourceUrl: config.resourceUrl,
        expiresAt: Date.now() + (tokenData.expires_in * 1000)
      });

      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearAuthData();
      return false;
    }
  }

  // Check connection status and get user info
  async checkConnection() {
    try {
      const authData = this.getAuthData();
      if (!authData) {
        return { connected: false, message: 'Not authenticated with Dynamics CRM' };
      }

      const isValid = await this.isTokenValid();
      
      if (!isValid) {
        return { connected: false, message: 'Authentication expired or invalid' };
      }

      // Get user info through the proxy
      try {
        const response = await fetch(
          `${this.apiBaseUrl}/dynamics/userinfo?accessToken=${encodeURIComponent(authData.accessToken)}&resourceUrl=${encodeURIComponent(authData.resourceUrl)}`
        );
        
        if (response.ok) {
          const userInfo = await response.json();
          return { 
            connected: true,
            userInfo: {
              id: userInfo.systemuserid,
              name: userInfo.fullname,
              email: userInfo.internalemailaddress,
              organization: userInfo._businessunitid_value
            }
          };
        }
      } catch (infoError) {
        console.warn('Could not retrieve user info:', infoError);
      }

      // Return basic connection status if user info retrieval fails
      return { connected: true };
    } catch (error) {
      console.error('Connection check error:', error);
      return { connected: false, message: error.message };
    }
  }

  // Logout from Dynamics CRM
  async logout() {
    try {
      const authData = this.getAuthData();
      if (!authData) {
        return { success: true, message: 'Already logged out' };
      }

      // Clear local auth data
      this.clearAuthData();

      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: error.message };
    }
  }

  // Transfer a lead to Dynamics CRM
  async transferLead(leadData, attachments = []) {
    try {
      if (!leadData) {
        throw new Error('No lead data provided');
      }

      const authData = this.getAuthData();
      if (!authData) {
        throw new Error('Not authenticated with Dynamics CRM');
      }

      // Ensure token is valid
      const isValid = await this.isTokenValid();
      if (!isValid) {
        throw new Error('Authentication expired. Please reconnect to Dynamics CRM.');
      }

      // Use the specialized direct-lead-transfer endpoint for Dynamics
      const response = await fetch(`${this.apiBaseUrl}/dynamics/direct-lead-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: authData.accessToken,
          resourceUrl: authData.resourceUrl,
          leadData: leadData,
          attachments: attachments
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Lead transfer error:', errorData);
        throw new Error(errorData.message || 'Failed to transfer lead');
      }

      const result = await response.json();
      return result; // { success, leadId, status, message, attachments: { total, transferred, errors } }
    } catch (error) {
      console.error('Lead transfer error:', error);
      throw error;
    }
  }
}

export default DynamicsService;