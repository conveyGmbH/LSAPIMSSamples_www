// DynamicsService.js - Handles all Microsoft Dynamics CRM API interactions
class DynamicsService {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl || '/api';
    console.log('DynamicsService initialized with API URL:', this.apiBaseUrl);
  }

  // Singleton pattern implementation
  static getInstance(apiBaseUrl) {
    if (!DynamicsService.instance) {
      DynamicsService.instance = new DynamicsService(apiBaseUrl);
    }
    return DynamicsService.instance;
  }

  // Check if client configuration exists in localStorage
  hasClientConfig() {
    const clientId = localStorage.getItem('DYNAMICS_CLIENT_ID');
    const tenantId = localStorage.getItem('DYNAMICS_TENANT_ID');
    const resourceUrl = localStorage.getItem('DYNAMICS_RESOURCE_URL');
    return !!(clientId && tenantId && resourceUrl);
  }

  // Get client configuration from localStorage
  getClientConfig() {
    return {
      DYNAMICS_CLIENT_ID: localStorage.getItem('DYNAMICS_CLIENT_ID'),
      DYNAMICS_CLIENT_SECRET: localStorage.getItem('DYNAMICS_CLIENT_SECRET'),
      DYNAMICS_TENANT_ID: localStorage.getItem('DYNAMICS_TENANT_ID'),
      DYNAMICS_RESOURCE_URL: localStorage.getItem('DYNAMICS_RESOURCE_URL'),
      DYNAMICS_REDIRECT_URI: localStorage.getItem('DYNAMICS_REDIRECT_URI')
    };
  }

  // Store client configuration in localStorage
  storeClientConfig(config) {
    try {
      localStorage.setItem('DYNAMICS_CLIENT_ID', config.clientId);
      localStorage.setItem('DYNAMICS_CLIENT_SECRET', config.clientSecret || '');
      localStorage.setItem('DYNAMICS_TENANT_ID', config.tenantId);
      localStorage.setItem('DYNAMICS_RESOURCE_URL', config.resourceUrl);
      localStorage.setItem('DYNAMICS_REDIRECT_URI', config.redirectUri);
      return true;
    } catch (error) {
      console.error('Error storing client config:', error);
      return false;
    }
  }

  // Get authentication data from local storage
  getAuthData() {
    try {
      const accessToken = localStorage.getItem('DYNAMICS_ACCESS_TOKEN');
      const resourceUrl = localStorage.getItem('DYNAMICS_RESOURCE_URL');

      if (!accessToken || !resourceUrl) {
        return null;
      }

      return {
        accessToken,
        resourceUrl,
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
      localStorage.setItem('DYNAMICS_ACCESS_TOKEN', authData.accessToken);
      localStorage.setItem('DYNAMICS_RESOURCE_URL', authData.resourceUrl);
      
      // Store additional info if available
      if (authData.refreshToken) {
        localStorage.setItem('DYNAMICS_REFRESH_TOKEN', authData.refreshToken);
      }
      if (authData.expiresAt) {
        localStorage.setItem('DYNAMICS_EXPIRES_AT', authData.expiresAt);
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
      localStorage.removeItem('DYNAMICS_ACCESS_TOKEN');
      localStorage.removeItem('DYNAMICS_REFRESH_TOKEN');
      localStorage.removeItem('DYNAMICS_EXPIRES_AT');
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
      
      if (!config.DYNAMICS_CLIENT_ID || !config.DYNAMICS_TENANT_ID || !config.DYNAMICS_RESOURCE_URL) {
        throw new Error('Dynamics CRM client configuration missing. Please configure it first.');
      }

      // Request auth URL from backend
      const response = await fetch(`${this.apiBaseUrl}/dynamics/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get authentication URL');
      }

      const { authUrl } = await response.json();
      
      console.log('Opening Dynamics authentication URL:', authUrl);

      // Open the authorization URL in a popup window
      const authWindow = window.open(authUrl, 'DynamicsAuth', 'width=600,height=700');
      
      if (!authWindow) {
        throw new Error('Popup blocked! Please allow popups for this site.');
      }

      return new Promise((resolve, reject) => {
        // Handle timeout (5 minutes)
        const timeout = setTimeout(() => {
          authWindow.close();
          reject(new Error('Authentication timed out. Please try again.'));
        }, 300000);

        // Listen for messages from the popup window
        const messageHandler = (event) => {
          if (event.data && (event.data.type === 'dynamics-auth-code' || event.data.error)) {
            clearTimeout(timeout);
            window.removeEventListener('message', messageHandler);
            authWindow.close();
            
            console.log('Message received from authentication window:', event.data);
            
            if (event.data.error) {
              reject(new Error(`Authentication error: ${event.data.error}`));
            } else {
              // Exchange code for token
              this.exchangeCodeForToken(event.data.code)
                .then(resolve)
                .catch(reject);
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
          clientConfig: config
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
        resourceUrl: config.DYNAMICS_RESOURCE_URL,
        expiresAt: Date.now() + (tokenData.expires_in * 1000)
      });

      return tokenData;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  // Validate token through proxy
  async isTokenValid() {
    try {
      const authData = this.getAuthData();
      if (!authData || !authData.resourceUrl || !authData.accessToken) {
        return false;
      }
      
      // Check if token is expired
      const expiresAt = localStorage.getItem('DYNAMICS_EXPIRES_AT');
      if (expiresAt && Date.now() > parseInt(expiresAt)) {
        console.log('Token expired, attempting refresh...');
        const refreshed = await this.refreshToken();
        return refreshed;
      }
      
      // Use the proxy to avoid CORS issues
      const response = await fetch(`${this.apiBaseUrl}/dynamics/userinfo?accessToken=${encodeURIComponent(authData.accessToken)}&resourceUrl=${encodeURIComponent(authData.resourceUrl)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token validation failed');
      }
      
      return true;
    } catch (error) {
      console.error("Token validation error:", error);
      return false;
    }
  }

  // Refresh access token using refresh token
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('DYNAMICS_REFRESH_TOKEN');
      if (!refreshToken) {
        return false;
      }

      const config = this.getClientConfig();
      
      const response = await fetch(`${this.apiBaseUrl}/dynamics/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: refreshToken,
          clientConfig: config
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
        resourceUrl: config.DYNAMICS_RESOURCE_URL,
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
        const response = await fetch(`${this.apiBaseUrl}/dynamics/userinfo?accessToken=${encodeURIComponent(authData.accessToken)}&resourceUrl=${encodeURIComponent(authData.resourceUrl)}`);
        
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
      return result; // { success, leadId, status, message, attachmentsTransferred }
    } catch (error) {
      console.error('Lead transfer error:', error);
      throw error;
    }
  }
}

export default DynamicsService;