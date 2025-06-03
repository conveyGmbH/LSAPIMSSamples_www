import DynamicsService from '../services/dynamicsService.js';
import { formatDate } from '../utils/helper.js';
import ApiService from '../services/apiService.js';

/**
 * Controller for lead transfer to Dynamics 365
 * Handles UI interactions, authentication, and transfer operations
 */
class DisplayLeadTransferDynamicsController {
  constructor() {
    this.dynamicsService = DynamicsService.getInstance();
    this.selectedLead = null;
    this.leadAttachments = [];
    this.isTransferring = false;
    this.isAuthenticating = false;
    this.recentTransfers = [];

    this.initializeController();
  }

  // ========================================
  // INITIALIZATION
  // ========================================

  async initializeController() {
    try {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setupController());
      } else {
        await this.setupController();
      }
    } catch (error) {
      console.error('Error initializing controller:', error);
    }
  }

  async setupController() {
    this.loadSelectedLead();
    this.loadRecentTransfers();
    this.setupEventListeners();
    this.displayLeadData();
    await this.checkExistingAuthentication();
    this.updateUI();
  }

  async checkExistingAuthentication() {
    try {
      const status = this.dynamicsService.getConnectionStatus();

      if (status.isConfigured && !status.isConnected) {
        const restored = await this.dynamicsService.checkExistingSession();
        if (restored.success) {
          this.updateStatusCard();
        }
      }
    } catch (error) {
      // Silent fail for session check
    }
  }

  // ========================================
  // LEAD DATA MANAGEMENT
  // ========================================

  loadSelectedLead() {
    try {
      const leadData = sessionStorage.getItem('selectedLeadForTransfer');
      
      if (leadData) {
        this.selectedLead = JSON.parse(leadData);
        this.loadLeadAttachments();
        
        if (!this.selectedLead || typeof this.selectedLead !== 'object') {
          this.selectedLead = null;
          this.showError('Invalid lead data structure. Please go back and select a lead again.');
          return;
        }
      } else {
        this.showError('No lead selected for transfer. Please go back and select a lead.');
      }
    } catch (error) {
      console.error('Error loading selected lead:', error);
      this.selectedLead = null;
      this.showError('Error loading lead data. Please try again.');
    }
  }

  loadLeadAttachments() {
    try {
      const attachmentsData = sessionStorage.getItem('selectedLeadAttachments');
      if (attachmentsData) {
        this.leadAttachments = JSON.parse(attachmentsData);
        return;
      }

      const attachmentIdList = this.selectedLead?.AttachmentIdList;
      
      if (attachmentIdList && attachmentIdList.trim() !== '') {
        const attachmentIds = attachmentIdList.split(',')
          .map(id => id.trim())
          .filter(id => id !== '');
        
        if (attachmentIds.length > 0) {
          this.fetchAttachmentDetails(attachmentIds)
            .then(() => {
              this.displayLeadAttachments();
            })
            .catch(error => {
              this.createMockAttachments(attachmentIds);
              this.displayLeadAttachments();
            });
          return;
        }
      }

      this.extractAttachmentsFromLead();
    } catch (error) {
      console.error('Error loading attachments:', error);
      this.leadAttachments = [];
    }
  }

  async fetchAttachmentDetails(attachmentIds) {
    try {
      const serverName = sessionStorage.getItem('serverName');
      const apiName = sessionStorage.getItem('apiName');
      
      if (!serverName || !apiName) {
        throw new Error('API configuration not found');
      }
      
      const apiService = new ApiService(serverName, apiName);
      const attachmentDetails = [];
      
      for (const attachmentId of attachmentIds) {
        try {
          const endpoint = `WCE_AttachmentById?Id=%27${encodeURIComponent(attachmentId)}%27&$format=json`;
          const data = await apiService.request('GET', endpoint);
          
          let attachmentData = null;
          if (data && data.d && data.d.results && data.d.results.length > 0) {
            attachmentData = data.d.results[0];
          } else if (data && data.d) {
            attachmentData = data.d;
          }
          
          if (attachmentData) {
            const attachment = {
              id: attachmentId,
              name: attachmentData.FileName || attachmentData.Name || `Attachment_${attachmentId.substring(0, 8)}`,
              type: attachmentData.MimeType || attachmentData.ContentType || 'application/octet-stream',
              size: this.formatFileSize(attachmentData.FileSize || attachmentData.BodyLength),
              hasBody: !!(attachmentData.Body),
              source: 'API'
            };
            
            attachmentDetails.push(attachment);
          }
        } catch (attachmentError) {
          attachmentDetails.push({
            id: attachmentId,
            name: `Attachment_${attachmentId.substring(0, 8)}`,
            type: 'unknown',
            size: 'Unknown size',
            hasBody: false,
            source: 'Failed',
            error: true
          });
        }
      }
      
      this.leadAttachments = attachmentDetails;
      sessionStorage.setItem('selectedLeadAttachments', JSON.stringify(attachmentDetails));
    } catch (error) {
      console.error('Error fetching attachment details:', error);
      throw error;
    }
  }

  createMockAttachments(attachmentIds) {
    this.leadAttachments = attachmentIds.map((id, index) => ({
      id: id,
      name: `Attachment_${index + 1}_${id.substring(0, 8)}`,
      type: 'application/octet-stream',
      size: 'Unknown size',
      hasBody: false,
      source: 'Mock'
    }));
  }

  extractAttachmentsFromLead() {
    if (!this.selectedLead) {
      this.leadAttachments = [];
      return;
    }

    // Look for attachment fields in lead data
    const attachmentFields = [
      'attachments', 'Attachments', 'files', 'Files',
      'documents', 'Documents', 'assets', 'Assets',
      'fileAttachments', 'leadAttachments'
    ];

    for (const field of attachmentFields) {
      if (this.selectedLead[field] && Array.isArray(this.selectedLead[field])) {
        this.leadAttachments = this.selectedLead[field];
        return;
      }
    }

    // Look for file-like properties
    const fileProperties = [];
    Object.keys(this.selectedLead).forEach(key => {
      const value = this.selectedLead[key];
      
      if (typeof value === 'string') {
        if (value.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png|gif|svg|txt|csv)$/i)) {
          fileProperties.push({
            name: value,
            type: this.getFileTypeFromExtension(value),
            size: 'Unknown size',
            source: key
          });
        }
        else if (value.startsWith('data:') || value.match(/^[A-Za-z0-9+/]={0,2}$/)) {
          fileProperties.push({
            name: `${key}.${this.getExtensionFromDataUrl(value) || 'file'}`,
            type: this.getFileTypeFromDataUrl(value),
            size: `${Math.round(value.length * 0.75 / 1024)} KB`,
            source: key,
            data: value
          });
        }
      }
    });

    if (fileProperties.length > 0) {
      this.leadAttachments = fileProperties;
      return;
    }

    this.leadAttachments = [];
  }

  // ========================================
  // UI DISPLAY METHODS
  // ========================================

  displayLeadData() {
    const leadDataContainer = document.getElementById('leadData');
    if (!leadDataContainer) {
      console.error('Lead data container not found');
      return;
    }

    if (!this.selectedLead) {
      leadDataContainer.innerHTML = '<div class="no-data">No lead data available</div>';
      return;
    }

    const leadHtml = this.buildLeadDataHTML();
    leadDataContainer.innerHTML = leadHtml;

    this.displayLeadAttachments();
  }

  buildLeadDataHTML() {
    if (!this.selectedLead) {
      return '<div class="no-data">No lead data available</div>';
    }

    // Lead header info
    const leadId = this.getLeadProperty(['LeadId', 'leadId', 'id', 'Id']) || 'N/A';
    const topic = this.getLeadProperty(['Topic', 'topic', 'Subject', 'subject']) || 'N/A';
    const createdOn = this.getLeadProperty(['CreatedOn', 'createdOn', 'CreatedDate', 'DateCreated']) || null;
    
    const formattedDate = createdOn ? formatDate(createdOn) : 'N/A';

    let headerHtml = `
      <div class="lead-header-info">
        <div class="lead-id"><strong>Lead ID:</strong> ${this.escapeHtml(leadId)}</div>
        <div class="lead-topic"><strong>Topic:</strong> ${this.escapeHtml(topic)}</div>
        <div class="lead-created"><strong>Created On:</strong> ${formattedDate}</div>
      </div>
    `;

    // Field display names mapping
    const fieldDisplayNames = {
      'KontaktViewId': 'Kontakt View ID',
      'LeadId': 'Lead ID',
      'CreatedOn': 'Created Date',
      'ModifiedOn': 'Modified Date',
      'CreatedBy': 'Created By',
      'ModifiedBy': 'Modified By',
      'Salutation': 'Salutation',
      'Suffix': 'Suffix',
      'FirstName': 'First Name',
      'MiddleName': 'Middle Name',
      'LastName': 'Last Name',
      'CompanyName': 'Company Name',
      'JobTitle': 'Job Title',
      'Address1_Telephone1': 'Phone',
      'MobilePhone': 'Mobile Phone',
      'Address1_Fax': 'Fax',
      'EMailAddress1': 'Email',
      'WebSiteUrl': 'Website',
      'Address1_Line1': 'Address Line 1',
      'Address1_PostalCode': 'Postal Code',
      'Address1_City': 'City',
      'Address1_Country': 'Country',
      'Address1_CountryISOCode': 'Country ISO Code',
      'Address1_StateOrProvince': 'State/Province',
      'Description': 'Description',
      'AttachmentIdList': 'Attachment IDs',
      'SalesArea': 'Sales Area',
      'RequestBarcode': 'Request Barcode',
      'StatusMessage': 'Status Message',
      'DeviceId': 'Device ID',
      'DeviceRecordId': 'Device Record ID',
      'ModifiedBySystemOn': 'System Modified Date',
      'EventId': 'Event ID',
      'Gender': 'Gender',
      'Topic': 'Topic',
      'Newsletter': 'Newsletter',
      'Department': 'Department',
      'DisplayName': 'Display Name',
      'IsReviewed': 'Is Reviewed',
      'DepartmentText': 'Department Text'
    };

    const dateFields = ['CreatedOn', 'ModifiedOn', 'ModifiedBySystemOn'];
    const excludeFields = ['__metadata'];
    const fullWidthFields = ['Description', 'AttachmentIdList', 'StatusMessage'];

    const allFields = Object.keys(this.selectedLead).filter(field => 
      !excludeFields.includes(field) && 
      this.selectedLead[field] !== null && 
      this.selectedLead[field] !== undefined &&
      this.selectedLead[field] !== ''
    );

    let fieldsHtml = '<div class="lead-fields-grid">';
    let fieldsDisplayed = 0;

    const priorityFields = ['LeadId', 'FirstName', 'LastName', 'CompanyName', 'EMailAddress1', 'Address1_Telephone1', 'MobilePhone', 'Topic'];
    const sortedFields = [
      ...priorityFields.filter(field => allFields.includes(field)),
      ...allFields.filter(field => !priorityFields.includes(field))
    ];

    sortedFields.forEach(field => {
      const value = this.selectedLead[field];
      
      if (value !== null && value !== undefined && value.toString().trim() !== '') {
        const displayName = fieldDisplayNames[field] || field;
        let displayValue = value;
        
        if (dateFields.includes(field)) {
          displayValue = formatDate(value);
        }
        
        if (typeof value === 'boolean' || (typeof value === 'number' && (value === 0 || value === 1))) {
          displayValue = value === true || value === 1 ? 'Yes' : 'No';
        }
        
        const isLongContent = fullWidthFields.includes(field) || (displayValue && displayValue.toString().length > 50);
        const fieldClass = isLongContent ? 'field-item full-width' : 'field-item';
        
        fieldsHtml += `
          <div class="${fieldClass}">
            <label class="field-label">${displayName}:</label>
            <div class="field-value ${isLongContent ? 'long-text' : ''}">${this.escapeHtml(displayValue.toString())}</div>
          </div>
        `;
        fieldsDisplayed++;
      }
    });

    fieldsHtml += '</div>';

    if (fieldsDisplayed === 0) {
      fieldsHtml += `
        <div class="debug-info">
          <h4>Debug: Raw Lead Data</h4>
          <pre style="background: #f5f5f5; padding: 10px; font-size: 12px; overflow-x: auto;">
${JSON.stringify(this.selectedLead, null, 2)}
          </pre>
        </div>
      `;
    }

    return headerHtml + fieldsHtml;
  }

  displayLeadAttachments() {
    const attachmentsContainer = document.getElementById('leadAttachments');
    const attachmentsList = document.getElementById('attachmentsList');
    const attachmentsCount = document.getElementById('attachmentsCount');
    
    if (!attachmentsContainer || !attachmentsList || !attachmentsCount) {
      console.error('Attachment container elements not found in DOM');
      return;
    }

    if (this.leadAttachments.length > 0) {
      attachmentsContainer.style.display = 'block';
      
      let attachmentsHtml = '';
      this.leadAttachments.forEach((attachment, index) => {
        const fileExtension = this.getFileExtension(attachment.name);
        const iconText = fileExtension.substring(0, 3).toUpperCase();
        
        const errorClass = attachment.error ? 'attachment-error' : '';
        const errorIcon = attachment.error ? ' ⚠️' : '';
        
        attachmentsHtml += `
          <div class="attachment-item ${errorClass}">
            <div class="attachment-icon">${iconText}${errorIcon}</div>
            <div class="attachment-details">
              <div class="attachment-name">${this.escapeHtml(attachment.name)}</div>
              <div class="attachment-meta">
                ${attachment.type || 'Unknown type'} • ${attachment.size || 'Unknown size'}
                ${attachment.source ? ` • Source: ${attachment.source}` : ''}
              </div>
            </div>
          </div>
        `;
      });

      attachmentsList.innerHTML = attachmentsHtml;
      attachmentsCount.textContent = `${this.leadAttachments.length} file(s) will be transferred with this lead`;
    } else {
      attachmentsContainer.style.display = 'none';
    }
  }

  // ========================================
  // EVENT LISTENERS
  // ========================================

  setupEventListeners() {
    const backButton = document.getElementById('backButton');
    if (backButton) {
      backButton.addEventListener('click', () => this.goBack());
    }

    const configButton = document.getElementById('dynamicsConfigButton');
    if (configButton) {
      configButton.addEventListener('click', () => this.openConfigModal());
    }

    const configNowBtn = document.getElementById('configure-dynamics-now-btn');
    if (configNowBtn) {
      configNowBtn.addEventListener('click', () => this.openConfigModal());
    }

    const connectBtn = document.getElementById('connectButton');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.handleAuthenticate());
    }

    const disconnectBtn = document.getElementById('disconnectButton');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => this.handleDisconnect());
    }

    const authNowBtn = document.getElementById('authenticate-dynamics-now-btn');
    if (authNowBtn) {
      authNowBtn.addEventListener('click', () => this.handleAuthenticate());
    }

    const transferBtn = document.getElementById('transferToDynamicsBtn');
    if (transferBtn) {
      transferBtn.addEventListener('click', () => this.handleTransfer());
    }

    this.setupConfigModalEvents();
  }

  setupConfigModalEvents() {
    const modal = document.getElementById('dynamicsConfigModal');
    if (!modal) return;

    const closeButton = modal.querySelector('#closeDynamicsConfigModal');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.closeConfigModal());
    }

    const saveButton = modal.querySelector('#saveDynamicsConfigBtn');
    if (saveButton) {
      saveButton.addEventListener('click', () => this.handleSaveConfig());
    }

    const resetButton = modal.querySelector('#resetDynamicsConfigBtn');
    if (resetButton) {
      resetButton.addEventListener('click', () => this.handleResetConfig());
    }

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        this.closeConfigModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.style.display === 'block') {
        this.closeConfigModal();
      }
    });
  }

  // ========================================
  // CONFIGURATION MODAL
  // ========================================

  openConfigModal() {
    const modal = document.getElementById('dynamicsConfigModal');
    if (modal) {
      modal.style.display = 'block';
      this.loadConfigurationToModal();
    }
  }

  closeConfigModal() {
    const modal = document.getElementById('dynamicsConfigModal');
    if (modal) {
      modal.style.display = 'none';
      this.clearConfigStatus();
    }
  }

  loadConfigurationToModal() {
    const config = this.dynamicsService.getConfiguration();
    
    const fields = {
      'dynamics-client-id': config.clientId,
      'dynamics-tenant-id': config.tenantId,
      'dynamics-resource-url': config.resourceUrl
    };

    Object.entries(fields).forEach(([fieldId, value]) => {
      const input = document.getElementById(fieldId);
      if (input) {
        input.value = value || '';
      }
    });
  }

  async handleSaveConfig() {
    try {
      this.showConfigStatus('Saving configuration...', 'info');

      const config = {
        clientId: document.getElementById('dynamics-client-id')?.value?.trim() || '',
        tenantId: document.getElementById('dynamics-tenant-id')?.value?.trim() || '',
        resourceUrl: document.getElementById('dynamics-resource-url')?.value?.trim() || ''
      };

      const result = this.dynamicsService.saveConfiguration(config);
      
      if (result.success) {
        this.showConfigStatus('Configuration saved successfully!', 'success');
        
        setTimeout(() => {
          this.closeConfigModal();
          this.updateUI();
        }, 2000);
      } else {
        this.showConfigStatus(result.message, 'error');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      this.showConfigStatus(`Failed to save: ${error.message}`, 'error');
    }
  }

  async handleResetConfig() {
    if (confirm('Are you sure you want to reset all Dynamics 365 configuration?')) {
      try {
        this.dynamicsService.clearConfiguration();
        this.loadConfigurationToModal();
        this.showConfigStatus('Configuration reset successfully', 'success');
        this.updateUI();
      } catch (error) {
        console.error('Error resetting configuration:', error);
        this.showConfigStatus('Failed to reset configuration', 'error');
      }
    }
  }

  showConfigStatus(message, type) {
    const statusElement = document.getElementById('dynamics-config-status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-message status-${type}`;
    }
  }

  clearConfigStatus() {
    const statusElement = document.getElementById('dynamics-config-status');
    if (statusElement) {
      statusElement.textContent = '';
      statusElement.className = 'status-message';
    }
  }

  // ========================================
  // AUTHENTICATION HANDLERS
  // ========================================

  async handleAuthenticate() {
    if (this.isAuthenticating) return;

    try {
      this.isAuthenticating = true;
      this.updateUI();
      this.updateStatusCard();

      const result = await this.dynamicsService.connect();
      
      if (result.success) {
        this.updateUI();
        this.updateStatusCard();
        this.showSuccess('Successfully authenticated with Dynamics 365!');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.showError(`Authentication failed: ${error.message}`);
    } finally {
      this.isAuthenticating = false;
      this.updateUI();
      this.updateStatusCard();
    }
  }

  async handleDisconnect() {
    try {
      if (!this.dynamicsService) {
        throw new Error('DynamicsService is not available');
      }

      if (typeof this.dynamicsService.disconnect !== 'function') {
        throw new Error('Disconnect method is not available in DynamicsService');
      }

      const result = await this.dynamicsService.disconnect();
      
      this.updateUI();
      this.updateStatusCard();
      this.showSuccess('Disconnected from Dynamics 365');
    } catch (error) {
      console.error('Disconnect error:', error);
      
      try {
        if (this.dynamicsService.msalInstance) {
          await this.dynamicsService.msalInstance.clearCache();
        }
        
        this.dynamicsService.isConnected = false;
        this.dynamicsService.currentUser = null;
        this.dynamicsService.accessToken = null;
        
        this.updateUI();
        this.updateStatusCard();
        this.showSuccess('Disconnected from Dynamics 365 (manual cleanup)');
      } catch (fallbackError) {
        console.error('Manual disconnect fallback failed:', fallbackError);
        this.showError('Error during disconnect. Please refresh the page.');
      }
    }
  }

  // ========================================
  // TRANSFER FUNCTIONALITY
  // ========================================

  async handleTransfer() {
    if (!this.selectedLead) {
      this.showError('No lead selected for transfer');
      return;
    }

    const status = this.dynamicsService.getConnectionStatus();

    if (!status.isConfigured || !status.isConnected) {
      this.showError('Please authenticate with Dynamics 365 first');
      return;
    }

    if (this.isTransferring) return;

    try {
      this.isTransferring = true;
      this.showLoading('Sending lead to Dynamics 365...');

      const result = await this.dynamicsService.transferLead(this.selectedLead, this.leadAttachments);

      if (result.success) {
        this.hideLoading();
        this.showTransferSuccess(result);
        this.saveRecentTransfer(result);
      }
    } catch (error) {
      console.error('Transfer error:', error);
      this.hideLoading();
      this.showError(`Transfer failed: ${error.message}`);
    } finally {
      this.isTransferring = false;
    }
  }

  showTransferSuccess(result) {
    const resultsDiv = document.getElementById('transferResults');
    const statusDiv = document.getElementById('transferStatus');
    
    if (resultsDiv && statusDiv) {
      resultsDiv.style.display = 'block';

      statusDiv.innerHTML = `
        <div class="transfer-success">
          <div class="success-content">
            <h4>✅ Lead Transferred Successfully!</h4>
            <div class="transfer-details">
              <p><strong>Lead ID:</strong> ${result.leadId}</p>
              <p><strong>Lead Name:</strong> ${this.getLeadDisplayName()}</p>
              <p><strong>Status:</strong> ${result.message}</p>
              <p><strong>Attachments:</strong> ${this.leadAttachments.length} file(s) included</p>
              <p><strong>Transferred At:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      `;
    }

    this.showSuccess('Lead successfully transferred to Dynamics 365!');
  }

  // ========================================
  // RECENT TRANSFERS
  // ========================================

  loadRecentTransfers() {
    try {
      const transfersData = localStorage.getItem('dynamics_recent_transfers');
      if (transfersData) {
        this.recentTransfers = JSON.parse(transfersData);
      }
    } catch (error) {
      console.error('Error loading recent transfers:', error);
      this.recentTransfers = [];
    }
  }

  saveRecentTransfer(transferData) {
    try {
      const transfer = {
        id: Date.now(),
        leadName: this.getLeadDisplayName(),
        leadId: transferData.leadId,
        dynamicsUrl: transferData.dynamicsUrl,
        timestamp: new Date().toISOString(),
        status: 'success'
      };

      this.recentTransfers.unshift(transfer);
      
      if (this.recentTransfers.length > 10) {
        this.recentTransfers = this.recentTransfers.slice(0, 10);
      }

      localStorage.setItem('dynamics_recent_transfers', JSON.stringify(this.recentTransfers));
      this.displayRecentTransfers();
    } catch (error) {
      console.error('Error saving recent transfer:', error);
    }
  }

  displayRecentTransfers() {
    const recentTransfersDiv = document.getElementById('recentTransfers');
    const transfersList = document.getElementById('transfersList');

    if (!recentTransfersDiv || !transfersList) return;

    if (this.recentTransfers && this.recentTransfers.length > 0) {
      recentTransfersDiv.style.display = 'block';
      
      let transfersHtml = '';
      this.recentTransfers.forEach(transfer => {
        const transferDate = new Date(transfer.timestamp).toLocaleString();
        
        transfersHtml += `
          <div class="transfer-item">
            <div class="transfer-item-icon">✅</div>
            <div class="transfer-item-details">
              <div class="transfer-item-name">${this.escapeHtml(transfer.leadName)}</div>
              <div class="transfer-item-meta">
                Lead ID: ${transfer.leadId} • Transferred: ${transferDate}
              </div>
            </div>
            <div class="transfer-item-actions">
              ${transfer.dynamicsUrl ? `<a href="${transfer.dynamicsUrl}" target="_blank">View in Dynamics</a>` : ''}
            </div>
          </div>
        `;
      });
      
      transfersList.innerHTML = transfersHtml;
    } else {
      recentTransfersDiv.style.display = 'none';
    }
  }

  // ========================================
  // UI UPDATES
  // ========================================

  updateUI() {
    const status = this.dynamicsService.getConnectionStatus();
    
    this.updateConfigurationNotices(status);
    this.updateStatusCard();
    this.updateTransferButton();
    this.updateConfigButton(status);
    this.displayRecentTransfers();
  }

  updateStatusCard() {
    const status = this.dynamicsService.getConnectionStatus();
    
    const connectionText = document.getElementById('connectionText');
    const userInfo = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');  
    const userEmail = document.getElementById('userEmail');
    const connectButton = document.getElementById('connectButton');
    const disconnectButton = document.getElementById('disconnectButton');

    if (!connectionText) {
      console.error('connectionText element not found');
      return;
    }

    connectionText.classList.remove('status-connected', 'status-disconnected');

    if (this.isAuthenticating) {
      connectionText.textContent = 'Authenticating...';
      connectionText.classList.add('status-disconnected');
      
      if (userInfo) userInfo.style.display = 'none';
      if (connectButton) connectButton.style.display = 'none';
      if (disconnectButton) disconnectButton.style.display = 'none';
    } else if (status.isConnected && status.currentUser) {
      connectionText.textContent = 'Connected to Dynamics 365';
      connectionText.classList.add('status-connected');
      
      if (userInfo && userAvatar && userName && userEmail) {
        userInfo.style.display = 'block';
        
        const firstLetter = status.currentUser.name ? 
          status.currentUser.name.charAt(0).toUpperCase() : 'U';
        userAvatar.textContent = firstLetter;
        
        userName.textContent = status.currentUser.name || 'Unknown User';
        userEmail.textContent = status.currentUser.username || 'unknown@example.com';
      }
      
      if (connectButton) connectButton.style.display = 'none';
      if (disconnectButton) disconnectButton.style.display = 'block';
    } else if (status.isConfigured) {
      connectionText.textContent = 'Ready to connect to Dynamics 365';
      connectionText.classList.add('status-disconnected');
      
      if (userInfo) userInfo.style.display = 'none';
      if (connectButton) connectButton.style.display = 'block';
      if (disconnectButton) disconnectButton.style.display = 'none';
    } else {
      connectionText.textContent = 'Not configured for Dynamics 365';
      connectionText.classList.add('status-disconnected');
      
      if (userInfo) userInfo.style.display = 'none';
      if (connectButton) connectButton.style.display = 'none';
      if (disconnectButton) disconnectButton.style.display = 'none';
    }
  }

  updateConfigurationNotices(status) {
    const configNotice = document.getElementById('dynamics-config-required-notice');
    const authNotice = document.getElementById('dynamics-auth-required-notice');
    
    if (configNotice) {
      configNotice.style.display = !status.isConfigured ? 'flex' : 'none';
    }
    
    if (authNotice) {
      authNotice.style.display = (status.isConfigured && !status.isConnected) ? 'flex' : 'none';
    }
  }

  updateTransferButton() {
    const status = this.dynamicsService.getConnectionStatus();
    const transferBtn = document.getElementById('transferToDynamicsBtn');
    if (!transferBtn) return;
    
    const btnText = transferBtn.querySelector('.btn-text');
    
    if (status.isConnected && status.isConfigured) {
      transferBtn.disabled = false;
      transferBtn.removeAttribute('disabled'); 
      if (btnText) btnText.textContent = 'Transfer to Dynamics CRM';
    } else {
      transferBtn.disabled = true;
      transferBtn.setAttribute('disabled', 'disabled');
      if (btnText) btnText.textContent = 'Authentication Required';
    }
  }

  updateConfigButton(status) {
    const configBtn = document.getElementById('dynamicsConfigButton');
    if (configBtn) {
      configBtn.textContent = status.isConfigured ? '⚙️ Reconfigure Dynamics CRM' : '⚙️ Configure Dynamics CRM';
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  showLoading(text) {
    let loadingModal = document.getElementById('loadingModal');
    if (!loadingModal) {
      loadingModal = document.createElement('div');
      loadingModal.id = 'loadingModal';
      loadingModal.className = 'loading-modal';
      loadingModal.innerHTML = `
        <div class="loading-content">
          <div class="loading">
            <div class="spinner"></div>
            <div id="loadingText">${text}</div>
          </div>
        </div>
      `;
      document.body.appendChild(loadingModal);
    }
    
    const loadingText = document.getElementById('loadingText');
    if (loadingText) loadingText.textContent = text;
    loadingModal.style.display = 'block';
  }

  hideLoading() {
    const loadingModal = document.getElementById('loadingModal');
    if (loadingModal) {
      loadingModal.style.display = 'none';
    }
  }

  getLeadDisplayName() {
    if (!this.selectedLead) return 'Unknown Lead';
    
    const firstName = this.getLeadProperty(['FirstName', 'firstName', 'first_name']) || '';
    const lastName = this.getLeadProperty(['LastName', 'lastName', 'last_name']) || '';
    const companyName = this.getLeadProperty(['CompanyName', 'companyName', 'company', 'Company']) || '';
    
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || companyName || 'Unknown Lead';
  }

  getLeadProperty(possibleNames) {
    if (!this.selectedLead || !Array.isArray(possibleNames)) {
      return null;
    }

    for (const name of possibleNames) {
      if (this.selectedLead.hasOwnProperty(name) && this.selectedLead[name] != null) {
        return this.selectedLead[name];
      }
    }
    return null;
  }

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return 'Unknown size';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);
    
    return `${size} ${sizes[i]}`;
  }

  getFileExtension(filename) {
    return filename.split('.').pop() || 'file';
  }

  getFileTypeFromExtension(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const typeMap = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'txt': 'text/plain',
      'csv': 'text/csv'
    };
    return typeMap[ext] || 'application/octet-stream';
  }

  getFileTypeFromDataUrl(dataUrl) {
    if (dataUrl.startsWith('data:')) {
      return dataUrl.split(';')[0].split(':')[1];
    }
    return 'application/octet-stream';
  }

  getExtensionFromDataUrl(dataUrl) {
    if (dataUrl.startsWith('data:')) {
      const mimeType = dataUrl.split(';')[0].split(':')[1];
      const extMap = {
        'application/pdf': 'pdf',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/svg+xml': 'svg',
        'text/plain': 'txt'
      };
      return extMap[mimeType] || 'file';
    }
    return 'file';
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text.toString();
    return div.innerHTML;
  }

  showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      errorDiv.classList.add('show');
      
      setTimeout(() => {
        errorDiv.classList.remove('show');
        setTimeout(() => {
          errorDiv.style.display = 'none';
        }, 300);
      }, 5000);
    }
  }

  showSuccess(message) {
    let successDiv = document.getElementById('successMessage');
    if (!successDiv) {
      successDiv = document.createElement('div');
      successDiv.id = 'successMessage';
      successDiv.className = 'success-message';
      document.body.appendChild(successDiv);
    }
    
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    successDiv.classList.add('show');
    
    setTimeout(() => {
      successDiv.classList.remove('show');
      setTimeout(() => {
        successDiv.style.display = 'none';
      }, 300);
    }, 4000);
  }

  goBack() {
    const referrer = sessionStorage.getItem('transferReferrer') || '../displayWceLead.html';
    window.location.href = referrer;
  }

  static initialize() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => new DisplayLeadTransferDynamicsController());
    } else {
      new DisplayLeadTransferDynamicsController();
    }
  }
}

DisplayLeadTransferDynamicsController.initialize();

export default DisplayLeadTransferDynamicsController;