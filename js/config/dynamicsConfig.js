/* Configuration for integration with Microsoft Dynamics CRM */
const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const appConfig = {
  // Detect production environment
  get isProduction() {
    const host = window.location.hostname;
    return host.includes('convey.de');
  },

  // API Base URL selection
  get apiBaseUrl() {
    if (isLocalDev) {
      return 'http://localhost:3000/api';  // dev local backend
    }
    return this.isProduction
      ? 'https://lsapisfbackend.convey.de/api'
      : 'https://lsapisamplesbackend-bhesadgtbja4dmgq.germanywestcentral-01.azurewebsites.net/api';
  },

  // OAuth2 callback URL for Dynamics
  get callbackUrl() {
    if (isLocalDev) {
      return `${window.location.protocol}//${window.location.hostname}:${window.location.port}/dynamics-oauth-callback.html`;
    }
    return `${window.location.origin}/dynamics-oauth-callback.html`;
  },

  // Dynamics CRM default config
  dynamics: {
    defaultLoginUrl: 'https://login.microsoftonline.com',
    defaultResourceUrl: 'https://org54e712bc.crm4.dynamics.com/', // Will be set by user
    defaultApiVersion: 'v9.2'
  }
};

console.log(`App running in ${appConfig.isProduction ? 'PRODUCTION' : isLocalDev ? 'LOCAL DEVELOPMENT' : 'STAGING'} mode`);
console.log(`API Base URL: ${appConfig.apiBaseUrl}`);
console.log(`Dynamics OAuth Callback URL: ${appConfig.callbackUrl}`);

// Visual indicator in development environment
if (!appConfig.isProduction) {
  // Create a visual indicator for the development environment
  const envIndicator = document.createElement('div');
  envIndicator.style.position = 'fixed';
  envIndicator.style.bottom = '10px';
  envIndicator.style.left = '10px';
  envIndicator.style.backgroundColor = '#0078d4';
  envIndicator.style.color = 'white';
  envIndicator.style.padding = '5px 10px';
  envIndicator.style.borderRadius = '5px';
  envIndicator.style.fontSize = '12px';
  envIndicator.style.zIndex = '9999';
  envIndicator.style.fontFamily = 'Arial, sans-serif';
  envIndicator.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  envIndicator.innerHTML = `DYNAMICS DEV - API: ${appConfig.apiBaseUrl.split('/api')[0]}`;
  
  // Add the indicator to the body when the DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(envIndicator);
  });
}