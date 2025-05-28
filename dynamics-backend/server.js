const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const { URLSearchParams } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Enable CORS for development
// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    
    // Allow requests from specific origins
    const allowedOrigins = [
    // Development origins
    'http://127.0.0.1:5504',
    'http://localhost:5504', 
    'http://localhost:3000', 
  
    // Production origins
    'https://delightful-desert-016e2a610.4.azurestaticapps.net',
    'https://brave-bush-0041ef403.6.azurestaticapps.net',
    'https://lsapisfsamples.convey.de',
    'https://lsapisfbackend.convey.de'
  ]; 

  if(!origin) return callback(null, true);

  if(allowedOrigins.includes(origin)){
    console.log(`CORS: Allowed origin: ${origin}`);
    callback(null, true);
  }else{
    console.log(`CORS: Blocked origin:, ${origin}`);
    if(process.env.NODE_ENV === 'development'){
      callback(null, true)}
      else{
      callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control', 'X-Session-Token']
}));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '/')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Create API router
const apiRouter = express.Router();
app.use('/api', apiRouter);

// === DYNAMICS CRM API ENDPOINTS ===

/**
 * Generate Dynamics CRM OAuth authorization URL
 */

apiRouter.post('/dynamics/auth', (req, res) => {
  const clientConfig = req.body;

  if (!clientConfig || !clientConfig.DYNAMICS_CLIENT_ID || !clientConfig.DYNAMICS_TENANT_ID) {
    return res.status(400).json({ 
      error: 'Missing required Dynamics CRM credentials. Please configure Client ID and Tenant ID first.' 
    });
  }

  // Utiliser l'URL de callback du serveur au lieu du fichier HTML
  const redirectUri = `${req.protocol}://${req.get('host')}/api/dynamics/oauth2/callback`;
  
  console.log('Using server callback URL:', redirectUri);

  // Microsoft OAuth2 endpoint avec l'URL de callback corrigée
  const authUrl = `https://login.microsoftonline.com/${clientConfig.DYNAMICS_TENANT_ID}/oauth2/v2.0/authorize?` +
    `client_id=${clientConfig.DYNAMICS_CLIENT_ID}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(`${clientConfig.DYNAMICS_RESOURCE_URL}/user_impersonation offline_access`)}&` +
    `response_mode=query&` +
    `state=dynamics_auth`;

  console.log('Generated Dynamics auth URL for tenant:', clientConfig.DYNAMICS_TENANT_ID);
  res.json({ authUrl });
});

// Route for dynamics-oauth-callback.html
app.get('/dynamics-oauth-callback.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dynamics-oauth-callback.html'));
});

// OAuth2 callback for Dynamics CRM (for authorization flow)
// OAuth2 callback for Dynamics CRM (for authorization flow)
apiRouter.get('/dynamics/oauth2/callback', (req, res) => {
  const { code, error, error_description } = req.query;

  console.log('Dynamics OAuth callback received:', { 
    hasCode: !!code, 
    error: error || 'none',
    userAgent: req.get('User-Agent')
  });

  const popupScript = `
    <script>
      console.log('Dynamics callback script loaded');
      
      function sendMessageToParent(data) {
        console.log('Sending message to parent:', data);
        
        if (window.opener) {
          try {
            // Essayer d'envoyer à l'origine spécifique d'abord
            const allowedOrigins = [
              'http://localhost:5504',
              'http://127.0.0.1:5504',
              'https://delightful-desert-016e2a610.4.azurestaticapps.net'
            ];
            
            let messageSent = false;
            
            allowedOrigins.forEach(origin => {
              try {
                window.opener.postMessage(data, origin);
                console.log('Message sent to origin:', origin);
                messageSent = true;
              } catch (e) {
                console.log('Failed to send to origin:', origin, e.message);
              }
            });
            
            // Fallback à wildcard si nécessaire
            if (!messageSent) {
              console.log('Trying wildcard origin...');
              window.opener.postMessage(data, '*');
            }
            
          } catch (error) {
            console.error('Error sending message:', error);
          }
        } else {
          console.warn('No opener window found');
        }
        
        // Fermer la fenêtre après un délai
        setTimeout(() => {
          console.log('Closing callback window');
          window.close();
        }, 2000);
      }
      
      window.onload = function() {
        console.log('Callback window loaded');
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code') || '${code || ''}';
        const error = urlParams.get('error') || '${error || ''}';
        const errorDesc = urlParams.get('error_description') || '${error_description || ''}';
        
        if (error) {
          console.error('OAuth error:', error, errorDesc);
          sendMessageToParent({ 
            type: 'dynamics-auth-code', 
            error: error + (errorDesc ? ': ' + errorDesc : '')
          });
        } else if (code) {
          console.log('Authorization code received:', code.substring(0, 10) + '...');
          sendMessageToParent({ 
            type: 'dynamics-auth-code', 
            code: code 
          });
        } else {
          console.error('No code or error found');
          sendMessageToParent({ 
            type: 'dynamics-auth-code', 
            error: 'No authorization code received' 
          });
        }
      };
    </script>
  `;

  if (error) {
    console.error('Dynamics OAuth error:', error, error_description);
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Authentication Error</title></head>
        <body>
          <h1>Authentication Failed</h1>
          <p>Error: ${error_description || error}</p>
          <p>This window will close automatically.</p>
          ${popupScript}
        </body>
      </html>
    `);
  }

  if (!code) {
    console.error('No authorization code received');
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Authentication Error</title></head>
        <body>
          <h1>Authentication Failed</h1>
          <p>Authorization code missing</p>
          <p>This window will close automatically.</p>
          ${popupScript}
        </body>
      </html>
    `);
  }

  // Code reçu avec succès
  console.log('Authorization code received successfully:', code.substring(0, 10) + '...');
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>Authentication Successful</title></head>
      <body>
        <h1>Authentication Successful!</h1>
        <p>You can close this window.</p>
        ${popupScript}
      </body>
    </html>
  `);
});

/**
 * Exchange authorization code for access token
 */
apiRouter.post('/dynamics/token', async (req, res) => {
  const { code, clientConfig } = req.body;

  if (!code || !clientConfig || !clientConfig.DYNAMICS_CLIENT_ID || !clientConfig.DYNAMICS_TENANT_ID || !clientConfig.DYNAMICS_REDIRECT_URI) {
    console.error('Invalid Dynamics token request:', { 
      hasCode: !!code, 
      hasClientConfig: !!clientConfig, 
      clientId: clientConfig?.DYNAMICS_CLIENT_ID ? 'provided' : 'missing',
      tenantId: clientConfig?.DYNAMICS_TENANT_ID ? 'provided' : 'missing',
      redirectUri: clientConfig?.DYNAMICS_REDIRECT_URI || 'missing'
    });
    return res.status(400).json({ error: 'Invalid request. Missing required fields for Dynamics CRM.' });
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${clientConfig.DYNAMICS_TENANT_ID}/oauth2/v2.0/token`;
    
    console.log('Exchanging code for Dynamics token:', {
      tokenUrl,
      clientId: clientConfig.DYNAMICS_CLIENT_ID,
      tenantId: clientConfig.DYNAMICS_TENANT_ID,
      redirectUri: clientConfig.DYNAMICS_REDIRECT_URI
    });

    const tokenRequest = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientConfig.DYNAMICS_CLIENT_ID,
      client_secret: clientConfig.DYNAMICS_CLIENT_SECRET || '', // Optional for public clients
      redirect_uri: clientConfig.DYNAMICS_REDIRECT_URI,
      code: code,
      scope: `${clientConfig.DYNAMICS_RESOURCE_URL}/user_impersonation offline_access`
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenRequest
    });

    const responseText = await response.text();
    let tokenData;
    
    try {
      tokenData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Dynamics token response as JSON:', responseText);
      return res.status(500).json({ error: 'Invalid response from Microsoft' });
    }

    if (!response.ok) {
      console.error('Dynamics token exchange failed:', tokenData);
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange token');
    }

    console.log('Dynamics token exchange successful, fetching user info...');
    
    // Get user info from Dynamics CRM
    try {
      const userInfoResponse = await fetch(`${clientConfig.DYNAMICS_RESOURCE_URL}/api/data/v9.2/WhoAmI`, {
        headers: { 
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0'
        }
      });

      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        console.log('Dynamics user info retrieved:', {
          userId: userInfo.UserId,
          orgId: userInfo.OrganizationId
        });
        
        // Get additional user details
        const userDetailsResponse = await fetch(`${clientConfig.DYNAMICS_RESOURCE_URL}/api/data/v9.2/systemusers(${userInfo.UserId})?$select=fullname,internalemailaddress`, {
          headers: { 
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
          }
        });

        if (userDetailsResponse.ok) {
          const userDetails = await userDetailsResponse.json();
          tokenData.userInfo = {
            systemuserid: userInfo.UserId,
            fullname: userDetails.fullname,
            internalemailaddress: userDetails.internalemailaddress,
            organizationid: userInfo.OrganizationId
          };
        }
      }
    } catch (userInfoError) {
      console.warn('Could not fetch Dynamics user info:', userInfoError);
      // Continue without user info
    }

    res.json(tokenData);
  } catch (error) {
    console.error('Dynamics token exchange error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refresh Dynamics CRM token
// apiRouter.post('/dynamics/refresh', async (req, res) => {
//   const { refreshToken, clientConfig } = req.body;

//   if (!refreshToken || !clientConfig || !clientConfig.DYNAMICS_CLIENT_ID || !clientConfig.DYNAMICS_TENANT_ID) {
//     return res.status(400).json({ error: 'Missing refresh token or client configuration.' });
//   }

//   try {
//     const tokenUrl = `https://login.microsoftonline.com/${clientConfig.DYNAMICS_TENANT_ID}/oauth2/v2.0/token`;
    
//     const tokenRequest = new URLSearchParams({
//       grant_type: 'refresh_token',
//       client_id: clientConfig.DYNAMICS_CLIENT_ID,
//       client_secret: clientConfig.DYNAMICS_CLIENT_SECRET || '',
//       refresh_token: refreshToken,
//       scope: `${clientConfig.DYNAMICS_RESOURCE_URL}/user_impersonation offline_access`
//     });

//     const response = await fetch(tokenUrl, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//       body: tokenRequest
//     });

//     const tokenData = await response.json();

//     if (!response.ok) {
//       console.error('Dynamics token refresh failed:', tokenData);
//       throw new Error(tokenData.error_description || 'Failed to refresh token');
//     }

//     res.json(tokenData);
//   } catch (error) {
//     console.error('Dynamics token refresh error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

/**
 * Refresh access token using refresh token
 */
apiRouter.post('/dynamics/refresh', async (req, res) => {
  try {
    console.log('Token refresh request received');
    
    const { refreshToken, clientConfig } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    if (!clientConfig) {
      return res.status(400).json({ error: 'Client configuration is required' });
    }

    const {
      DYNAMICS_CLIENT_ID,
      DYNAMICS_CLIENT_SECRET,
      DYNAMICS_TENANT_ID,
      DYNAMICS_RESOURCE_URL
    } = clientConfig;

    const tokenUrl = `https://login.microsoftonline.com/${DYNAMICS_TENANT_ID}/oauth2/token`;

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', DYNAMICS_CLIENT_ID);
    params.append('client_secret', DYNAMICS_CLIENT_SECRET);
    params.append('resource', DYNAMICS_RESOURCE_URL);

    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });

    console.log('Token refresh successful');

    res.json({
      success: true,
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token || refreshToken,
      expires_in: response.data.expires_in,
      token_type: response.data.token_type
    });

  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    
    res.status(error.response?.status || 500).json({
      error: 'Token refresh failed',
      message: error.response?.data?.error_description || error.message,
      details: error.response?.data
    });
  }
});

/**
 * Get user information from Dynamics CRM
 */
apiRouter.get('/dynamics/userinfo', async (req, res) => {
  const { accessToken, resourceUrl } = req.query;
  
  if (!accessToken || !resourceUrl) {
    return res.status(400).json({ error: 'Access token and resource URL required' });
  }
  
  try {
    // First get the basic user ID
    const whoAmIResponse = await fetch(`${resourceUrl}/api/data/v9.2/WhoAmI`, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0'
      }
    });
    
    if (!whoAmIResponse.ok) {
      throw new Error(`Dynamics error: ${whoAmIResponse.status}`);
    }
    
    const whoAmI = await whoAmIResponse.json();
    
    // Then get detailed user information
    const userResponse = await fetch(`${resourceUrl}/api/data/v9.2/systemusers(${whoAmI.UserId})?$select=fullname,internalemailaddress,businessunitid`, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0'
      }
    });
    
    if (!userResponse.ok) {
      throw new Error(`Dynamics user info error: ${userResponse.status}`);
    }
    
    const userData = await userResponse.json();
    
    // Combine the data
    const result = {
      systemuserid: whoAmI.UserId,
      fullname: userData.fullname,
      internalemailaddress: userData.internalemailaddress,
      _businessunitid_value: userData.businessunitid,
      organizationid: whoAmI.OrganizationId
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching Dynamics user info:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Direct lead transfer to Dynamics CRM with duplicate checking
 */
// apiRouter.post('/dynamics/direct-lead-transfer', async (req, res) => {
//   const { accessToken, resourceUrl, leadData, attachments } = req.body;
  
//   console.log('Dynamics lead transfer - Token present:', !!accessToken);
//   console.log('Dynamics lead transfer - Resource URL:', !!resourceUrl);
//   console.log('Dynamics lead transfer - Attachments count:', attachments ? attachments.length : '0');
  
//   if (!accessToken || !resourceUrl) {
//     console.error('Missing Dynamics authentication data');
//     return res.status(401).json({
//       success: false,
//       message: 'Missing authentication data. Please connect to Dynamics CRM.'
//     });
//   }
  
//   if (!leadData) {
//     console.error('Missing lead data for Dynamics');
//     return res.status(400).json({
//       success: false,
//       message: 'Lead data missing.'
//     });
//   }
  
//   try {
//     // Ensure token is decoded
//     const decodedToken = decodeURIComponent(accessToken);
    
//     // Basic check for duplicate lead by email
//     if (leadData.emailaddress1) {
//       try {
//         console.log('Checking for duplicate lead by email in Dynamics:', leadData.emailaddress1);
        
//         const queryUrl = `${resourceUrl}/api/data/v9.2/leads?$filter=emailaddress1 eq '${leadData.emailaddress1.replace(/'/g, "''")}'&$select=leadid,fullname`;
        
//         const queryResponse = await fetch(queryUrl, {
//           method: 'GET',
//           headers: {
//             'Authorization': `Bearer ${decodedToken}`,
//             'Accept': 'application/json',
//             'OData-MaxVersion': '4.0',
//             'OData-Version': '4.0'
//           }
//         });
        
//         if (queryResponse.ok) {
//           const queryResult = await queryResponse.json();
          
//           if (queryResult.value && queryResult.value.length > 0) {
//             console.log('Duplicate lead found in Dynamics by email:', queryResult.value[0].leadid);
//             return res.status(409).json({
//               success: false,
//               message: `A lead with this email already exists in Dynamics CRM (ID: ${queryResult.value[0].leadid})`,
//               duplicateId: queryResult.value[0].leadid
//             });
//           }
//         }
//       } catch (dupError) {
//         console.error('Error checking for duplicate in Dynamics:', dupError);
//         // Continue with transfer if duplicate check fails
//       }
//     }
    
//     // Prepare lead data for Dynamics CRM
//     console.log('Preparing lead data for Dynamics...');
    
//     // Function to clean field values
//     const cleanField = (value) => {
//       if (!value || value === 'N/A' || value === 'undefined' || value === 'null') {
//         return null; // Dynamics prefers null over empty strings for optional fields
//       }
//       return value;
//     };

//     const dynamicsLeadData = {
//       // Required fields
//       lastname: leadData.lastname || 'Unknown',
//       companyname: leadData.companyname || 'Unknown Company',
      
//       // Optional fields
//       firstname: cleanField(leadData.firstname),
//       middlename: cleanField(leadData.middlename),
//       jobtitle: cleanField(leadData.jobtitle),
//       emailaddress1: cleanField(leadData.emailaddress1),
//       telephone1: cleanField(leadData.telephone1),
//       mobilephone: cleanField(leadData.mobilephone),
//       websiteurl: cleanField(leadData.websiteurl),
      
//       // Address fields
//       address1_line1: cleanField(leadData.address1_line1),
//       address1_city: cleanField(leadData.address1_city),
//       address1_stateorprovince: cleanField(leadData.address1_stateorprovince),
//       address1_postalcode: cleanField(leadData.address1_postalcode),
//       address1_country: cleanField(leadData.address1_country),
      
//       // Additional fields
//       description: cleanField(leadData.description),
//       subject: leadData.subject || `Lead from LeadSuccess - ${leadData.firstname || ''} ${leadData.lastname || 'Unknown'}`.trim(),
      
//       // Source tracking
//       leadsourcecode: leadData.leadsourcecode || 100000000, // Custom value for LeadSuccess
      
//       // Original WCE ID for reference
//       new_wceleadid: cleanField(leadData.new_wceleadid)
//     };

//     // Remove null/undefined values to avoid Dynamics errors
//     Object.keys(dynamicsLeadData).forEach(key => {
//       if (dynamicsLeadData[key] === null || dynamicsLeadData[key] === undefined) {
//         delete dynamicsLeadData[key];
//       }
//     });
    
//     // Create the lead in Dynamics CRM
//     console.log('Creating lead in Dynamics CRM...');
    
//     const leadResponse = await fetch(`${resourceUrl}/api/data/v9.2/leads`, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${decodedToken}`,
//         'Content-Type': 'application/json',
//         'Accept': 'application/json',
//         'OData-MaxVersion': '4.0',
//         'OData-Version': '4.0',
//         'Prefer': 'return=representation'
//       },
//       body: JSON.stringify(dynamicsLeadData)
//     });
    
//     if (!leadResponse.ok) {
//       const leadError = await leadResponse.json();
//       console.error('Dynamics lead creation failed:', leadError);
//       return res.status(leadResponse.status).json({
//         success: false,
//         message: `Failed to create lead in Dynamics: ${leadError.error?.message || JSON.stringify(leadError)}`,
//         errors: leadError
//       });
//     }
    
//     const leadResult = await leadResponse.json();
//     const leadId = leadResult.leadid;
//     console.log('Dynamics lead created successfully, ID:', leadId);
    
//     // Process attachments if available
//     let attachmentsTransferred = 0;
//     let attachmentErrors = [];
    
//     if (attachments && attachments.length > 0) {
//       console.log(`Processing ${attachments.length} attachments for Dynamics lead ${leadId}`);
      
//       for (const attachment of attachments) {
//         try {
//           // Create annotation record in Dynamics CRM
//           const annotationData = {
//             subject: attachment.fileName || attachment.name || 'Attachment',
//             filename: attachment.fileName || attachment.name || 'attachment.pdf',
//             documentbody: attachment.body || attachment.Body,
//             mimetype: attachment.mimeType || attachment.ContentType || 'application/octet-stream',
//             'objectid_lead@odata.bind': `/leads(${leadId})` // Link to the Lead record
//           };
          
//           const attachmentResponse = await fetch(`${resourceUrl}/api/data/v9.2/annotations`, {
//             method: 'POST',
//             headers: {
//               'Authorization': `Bearer ${decodedToken}`,
//               'Content-Type': 'application/json',
//               'Accept': 'application/json',
//               'OData-MaxVersion': '4.0',
//               'OData-Version': '4.0'
//             },
//             body: JSON.stringify(annotationData)
//           });
          
//           if (attachmentResponse.ok) {
//             const attachmentResult = await attachmentResponse.json();
//             attachmentsTransferred++;
//             console.log(`Dynamics attachment '${attachment.fileName || attachment.name}' created, ID: ${attachmentResult.annotationid}`);
//           } else {
//             const attachmentError = await attachmentResponse.json();
//             console.error(`Dynamics attachment creation failed: ${JSON.stringify(attachmentError)}`);
//             attachmentErrors.push(`Failed to upload ${attachment.fileName || attachment.name}: ${attachmentError.error?.message || 'Unknown error'}`);
//           }
//         } catch (attachErr) {
//           console.error(`Error creating Dynamics attachment '${attachment.fileName || attachment.name}':`, attachErr);
//           attachmentErrors.push(`Error with ${attachment.fileName || attachment.name}: ${attachErr.message}`);
//         }
//       }
//     }
    
//     return res.json({
//       success: true,
//       leadId: leadId,
//       status: 'Transferred',
//       message: 'Lead successfully transferred to Dynamics CRM',
//       attachments: {
//         total: attachments ? attachments.length : 0,
//         transferred: attachmentsTransferred,
//         errors: attachmentErrors
//       }
//     });
//   } catch (error) {
//     console.error('Error during Dynamics lead transfer:', error);
//     return res.status(500).json({
//       success: false,
//       message: `Error: ${error.message}`
//     });
//   }
// });

// Health check endpoint


// Dans votre server.js, remplacez la section de mapping des leads par ceci :

/**
 * Direct lead transfer to Dynamics CRM with corrected field mapping
 */
// Dans votre server.js, remplacez la section de mapping des leads par ceci :

/**
 * Direct lead transfer to Dynamics CRM with corrected field mapping
 */
apiRouter.post('/dynamics/direct-lead-transfer', async (req, res) => {
  const { accessToken, resourceUrl, leadData, attachments } = req.body;
  
  console.log('Dynamics lead transfer - Token present:', !!accessToken);
  console.log('Dynamics lead transfer - Resource URL:', !!resourceUrl);
  console.log('Dynamics lead transfer - Lead data fields:', Object.keys(leadData || {}));
  console.log('Dynamics lead transfer - Attachments count:', attachments ? attachments.length : '0');
  
  if (!accessToken || !resourceUrl) {
    console.error('Missing Dynamics authentication data');
    return res.status(401).json({
      success: false,
      message: 'Missing authentication data. Please connect to Dynamics CRM.'
    });
  }
  
  if (!leadData) {
    console.error('Missing lead data for Dynamics');
    return res.status(400).json({
      success: false,
      message: 'Lead data missing.'
    });
  }
  
  try {
    // Ensure token is decoded
    const decodedToken = decodeURIComponent(accessToken);
    
    // Basic check for duplicate lead by email
    if (leadData.emailaddress1) {
      try {
        console.log('Checking for duplicate lead by email in Dynamics:', leadData.emailaddress1);
        
        const queryUrl = `${resourceUrl}/api/data/v9.2/leads?$filter=emailaddress1 eq '${leadData.emailaddress1.replace(/'/g, "''")}'&$select=leadid,fullname`;
        
        const queryResponse = await fetch(queryUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${decodedToken}`,
            'Accept': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
          }
        });
        
        if (queryResponse.ok) {
          const queryResult = await queryResponse.json();
          
          if (queryResult.value && queryResult.value.length > 0) {
            console.log('Duplicate lead found in Dynamics by email:', queryResult.value[0].leadid);
            return res.status(409).json({
              success: false,
              message: `A lead with this email already exists in Dynamics CRM (ID: ${queryResult.value[0].leadid})`,
              duplicateId: queryResult.value[0].leadid
            });
          }
        }
      } catch (dupError) {
        console.error('Error checking for duplicate in Dynamics:', dupError);
        // Continue with transfer if duplicate check fails
      }
    }
    
    // Prepare lead data for Dynamics CRM with CORRECT field mapping
    console.log('Preparing lead data for Dynamics...');
    
    // Function to clean field values
    const cleanField = (value) => {
      if (!value || value === 'N/A' || value === 'undefined' || value === 'null') {
        return null; // Dynamics prefers null over empty strings for optional fields
      }
      return value;
    };

    // ✅ MAPPING CORRIGÉ - Utilise seulement les champs standard Dynamics
    const dynamicsLeadData = {
      // Required fields
      lastname: leadData.lastname || 'Unknown',
      companyname: leadData.companyname || 'Unknown Company',
      
      // Optional standard fields only (pas de champs personnalisés)
      firstname: cleanField(leadData.firstname),
      middlename: cleanField(leadData.middlename),
      jobtitle: cleanField(leadData.jobtitle),
      emailaddress1: cleanField(leadData.emailaddress1),
      telephone1: cleanField(leadData.telephone1),
      mobilephone: cleanField(leadData.mobilephone),
      websiteurl: cleanField(leadData.websiteurl),
      
      // Address fields (standard)
      address1_line1: cleanField(leadData.address1_line1),
      address1_city: cleanField(leadData.address1_city),
      address1_stateorprovince: cleanField(leadData.address1_stateorprovince),
      address1_postalcode: cleanField(leadData.address1_postalcode),
      address1_country: cleanField(leadData.address1_country),
      
      // Additional standard fields
      description: cleanField(leadData.description),
      subject: leadData.subject || `Lead from LeadSuccess - ${leadData.firstname || ''} ${leadData.lastname || 'Unknown'}`.trim(),
      
      // ✅ CORRIGÉ: Source tracking avec valeur valide (1-10)
      leadsourcecode: 6, // 6 = Partner/Referral (approprié pour LeadSuccess)
      
      // ❌ RETIRÉ: new_wceleadid (champ personnalisé qui n'existe pas)
      // Au lieu de ça, on peut utiliser le champ description ou notes pour stocker l'ID WCE
      // Ou créer une note séparée après la création du lead
    };

    // Add WCE Lead ID to description if provided
    if (leadData.new_wceleadid || leadData.LeadId) {
      const wceId = leadData.new_wceleadid || leadData.LeadId;
      const currentDescription = dynamicsLeadData.description || '';
      dynamicsLeadData.description = currentDescription + 
        (currentDescription ? '\n\n' : '') + 
        `[WCE Lead ID: ${wceId}]`;
    }

    // Remove null/undefined values to avoid Dynamics errors
    Object.keys(dynamicsLeadData).forEach(key => {
      if (dynamicsLeadData[key] === null || dynamicsLeadData[key] === undefined) {
        delete dynamicsLeadData[key];
      }
    });
    
    console.log('✅ Final lead data for Dynamics:', JSON.stringify(dynamicsLeadData, null, 2));
    
    // Create the lead in Dynamics CRM
    console.log('Creating lead in Dynamics CRM...');
    
    const leadResponse = await fetch(`${resourceUrl}/api/data/v9.2/leads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${decodedToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(dynamicsLeadData)
    });
    
    if (!leadResponse.ok) {
      const leadError = await leadResponse.json();
      console.error('❌ Dynamics lead creation failed:', leadError);
      return res.status(leadResponse.status).json({
        success: false,
        message: `Failed to create lead in Dynamics: ${leadError.error?.message || JSON.stringify(leadError)}`,
        errors: leadError
      });
    }
    
    const leadResult = await leadResponse.json();
    const leadId = leadResult.leadid;
    console.log('✅ Dynamics lead created successfully, ID:', leadId);

    // ✅ AJOUT: Créer une note avec l'ID WCE original si fourni
    if (leadData.new_wceleadid || leadData.LeadId) {
      try {
        const wceId = leadData.new_wceleadid || leadData.LeadId;
        const noteData = {
          subject: 'Original WCE Lead ID',
          notetext: `This lead was imported from LeadSuccess WCE system.\nOriginal WCE Lead ID: ${wceId}\nImport Date: ${new Date().toISOString()}`,
          'objectid_lead@odata.bind': `/leads(${leadId})`
        };

        const noteResponse = await fetch(`${resourceUrl}/api/data/v9.2/annotations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${decodedToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0'
          },
          body: JSON.stringify(noteData)
        });

        if (noteResponse.ok) {
          console.log('✅ WCE ID note created successfully');
        } else {
          console.warn('⚠️ Failed to create WCE ID note, but lead was created successfully');
        }
      } catch (noteError) {
        console.warn('⚠️ Error creating WCE ID note:', noteError);
        // Continue - note creation failure shouldn't fail the entire transfer
      }
    }
    
    // Process attachments if available
    let attachmentsTransferred = 0;
    let attachmentErrors = [];
    
    if (attachments && attachments.length > 0) {
      console.log(`Processing ${attachments.length} attachments for Dynamics lead ${leadId}`);
      
      for (const attachment of attachments) {
        try {
          // Create annotation record in Dynamics CRM
          const annotationData = {
            subject: attachment.fileName || attachment.name || 'Attachment',
            filename: attachment.fileName || attachment.name || 'attachment.pdf',
            documentbody: attachment.body || attachment.Body,
            mimetype: attachment.mimeType || attachment.ContentType || 'application/octet-stream',
            'objectid_lead@odata.bind': `/leads(${leadId})` // Link to the Lead record
          };
          
          const attachmentResponse = await fetch(`${resourceUrl}/api/data/v9.2/annotations`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${decodedToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'OData-MaxVersion': '4.0',
              'OData-Version': '4.0'
            },
            body: JSON.stringify(annotationData)
          });
          
          if (attachmentResponse.ok) {
            const attachmentResult = await attachmentResponse.json();
            attachmentsTransferred++;
            console.log(`✅ Dynamics attachment '${attachment.fileName || attachment.name}' created, ID: ${attachmentResult.annotationid}`);
          } else {
            const attachmentError = await attachmentResponse.json();
            console.error(`❌ Dynamics attachment creation failed: ${JSON.stringify(attachmentError)}`);
            attachmentErrors.push(`Failed to upload ${attachment.fileName || attachment.name}: ${attachmentError.error?.message || 'Unknown error'}`);
          }
        } catch (attachErr) {
          console.error(`❌ Error creating Dynamics attachment '${attachment.fileName || attachment.name}':`, attachErr);
          attachmentErrors.push(`Error with ${attachment.fileName || attachment.name}: ${attachErr.message}`);
        }
      }
    }
    
    return res.json({
      success: true,
      leadId: leadId,
      status: 'Transferred',
      message: 'Lead successfully transferred to Dynamics CRM',
      wceIdStored: !!(leadData.new_wceleadid || leadData.LeadId),
      attachments: {
        total: attachments ? attachments.length : 0,
        transferred: attachmentsTransferred,
        errors: attachmentErrors
      }
    });
  } catch (error) {
    console.error('❌ Error during Dynamics lead transfer:', error);
    return res.status(500).json({
      success: false,
      message: `Error: ${error.message}`
    });
  }
});

apiRouter.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'LeadSuccess Dynamics CRM API'
  });
});

// Serve OAuth callback page
app.get('/dynamics-oauth-callback.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dynamics-oauth-callback.html'));
});



// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ LeadSuccess Dynamics CRM Server running on port ${PORT}`);
  console.log(`🌐 Access the application at http://localhost:${PORT}`);
  console.log(`🔧 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - POST /api/dynamics/auth`);
  console.log(`   - POST /api/dynamics/token`);
  console.log(`   - POST /api/dynamics/refresh`);
  console.log(`   - GET  /api/dynamics/userinfo`);
  console.log(`   - POST /api/dynamics/direct-lead-transfer`);
  console.log(`   - GET  /api/health`);
});