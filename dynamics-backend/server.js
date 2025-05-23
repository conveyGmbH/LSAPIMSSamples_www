// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const { URLSearchParams } = require('url'); // For encoding URL parameters

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the root and 'public' directories
app.use(express.static(path.join(__dirname, '/'))); // Serve root directory
app.use('/public', express.static(path.join(__dirname, 'public'))); // Serve /public for backward compatibility

// API router for handling various API integrations
const apiRouter = express.Router();
app.use('/api', apiRouter); // Mount the API router under /api




/*
 * DYNAMICS CRM ROUTES
 *
 * These routes handle authentication and data transfer for Dynamics CRM.
 */

/**
 * Generates the Dynamics CRM authentication URL.
 * Requires Dynamics client ID, tenant ID, and resource URL in the request body.
 */
apiRouter.post('/dynamics/auth', (req, res) => {
  const clientConfig = req.body;

  if (!clientConfig || !clientConfig.DYNAMICS_CLIENT_ID || !clientConfig.DYNAMICS_TENANT_ID || !clientConfig.DYNAMICS_RESOURCE_URL) {
    return res.status(400).json({ error: 'Missing required Dynamics CRM credentials.' });
  }

  const { DYNAMICS_TENANT_ID, DYNAMICS_CLIENT_ID, DYNAMICS_RESOURCE_URL } = clientConfig;
  const redirectUri = clientConfig.DYNAMICS_REDIRECT_URI || `${req.protocol}://${req.get('host')}/dynamics-oauth-callback.html`;

  // Microsoft OAuth2 authorization URL
  const authUrl = `https://login.microsoftonline.com/${DYNAMICS_TENANT_ID}/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${encodeURIComponent(DYNAMICS_CLIENT_ID)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `resource=${encodeURIComponent(DYNAMICS_RESOURCE_URL)}&` +
    `prompt=select_account`;

  res.json({ authUrl });
});

/**
 * Exchanges Dynamics CRM authorization code for access and refresh tokens.
 * This route is used by the dynamics-oauth-callback.html page.
 */
apiRouter.post('/dynamics/token', async (req, res) => {
  const { code, DYNAMICS_CLIENT_ID, DYNAMICS_CLIENT_SECRET, DYNAMICS_REDIRECT_URI, DYNAMICS_RESOURCE_URL, DYNAMICS_TENANT_ID } = req.body;

  if (!code || !DYNAMICS_CLIENT_ID || !DYNAMICS_CLIENT_SECRET || !DYNAMICS_REDIRECT_URI || !DYNAMICS_RESOURCE_URL || !DYNAMICS_TENANT_ID) {
    return res.status(400).json({ error: 'Missing required parameters for token exchange.' });
  }

  const tokenUrl = `https://login.microsoftonline.com/${DYNAMICS_TENANT_ID}/oauth2/token`;

  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('client_id', DYNAMICS_CLIENT_ID);
  params.append('client_secret', DYNAMICS_CLIENT_SECRET);
  params.append('redirect_uri', DYNAMICS_REDIRECT_URI);
  params.append('resource', DYNAMICS_RESOURCE_URL);

  try {
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Dynamics CRM token exchange error:', error.response ? error.response.data : error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to exchange code for tokens in Dynamics CRM.',
      details: error.response?.data
    });
  }
});

/**
 * Transfers lead data to Dynamics CRM.
 * Requires Dynamics access token, resource URL, and lead data.
 */
apiRouter.post('/dynamics/transferLead', async (req, res) => {
  const { accessToken, resourceUrl, leadData } = req.body;

  if (!accessToken || !resourceUrl || !leadData) {
    return res.status(400).json({ success: false, message: 'Missing required data for Dynamics CRM lead transfer.' });
  }

  try {
    // Check for duplicate leads by email in Dynamics
    if (leadData.Email) {
      console.log(`Checking for duplicate lead with email: ${leadData.Email} in Dynamics CRM...`);
      const queryUrl = `${resourceUrl}/api/data/v9.1/leads?$filter=emailaddress1 eq '${encodeURIComponent(leadData.Email)}'`;
      const duplicateCheckResponse = await axios.get(queryUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'Accept': 'application/json'
        }
      });

      if (duplicateCheckResponse.data.value && duplicateCheckResponse.data.value.length > 0) {
        console.log('Duplicate lead found by email in Dynamics:', duplicateCheckResponse.data.value[0].leadid);
        return res.status(409).json({
          success: false,
          message: `A lead with this email already exists in Dynamics CRM (ID: ${duplicateCheckResponse.data.value[0].leadid})`,
          duplicateId: duplicateCheckResponse.data.value[0].leadid
        });
      }
    }

    // Prepare lead data for Dynamics CRM with field mapping
    console.log('Preparing lead data for Dynamics...');
    const dynamicsLeadData = {
      firstname: leadData.FirstName || '',
      lastname: leadData.LastName || 'Unknown',
      companyname: leadData.Company || leadData.CompanyName || 'Unknown',
      emailaddress1: leadData.Email || leadData.emailaddress1 || '',
      telephone1: leadData.Phone || leadData.telephone1 || '',
      mobilephone: leadData.MobilePhone || leadData.mobilephone || '',
      jobtitle: leadData.Title || leadData.JobTitle || leadData.jobtitle || '',
      description: leadData.Description || leadData.description || '',
      leadsourcecode: 100000000, // Custom value for 'LeadSuccess API'
      subject: `Lead from LeadSuccess API - ${leadData.FirstName || ''} ${leadData.LastName || 'Unknown'}`,
      // Add other relevant fields here, mapping from leadData
    };

    console.log('Attempting to create lead in Dynamics CRM...');
    const createUrl = `${resourceUrl}/api/data/v9.1/leads`;
    const createResponse = await axios.post(createUrl, dynamicsLeadData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json'
      }
    });

    console.log('Dynamics CRM lead creation successful:', createResponse.data);
    res.json({ success: true, id: createResponse.data.leadid });
  } catch (error) {
    console.error('Dynamics CRM lead transfer error:', error.response ? error.response.data : error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to transfer lead to Dynamics CRM.',
      details: error.response?.data
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});