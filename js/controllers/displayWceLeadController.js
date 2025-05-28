import ApiService from '../services/apiService.js';
import {escapeODataValue, formatDateForOData, formatDate, parseDate, EventIdFilter} from '../utils/helper.js';

const serverName = sessionStorage.getItem('serverName');
const apiName = sessionStorage.getItem('apiName');
const credentials = sessionStorage.getItem('credentials');

if (!serverName || !apiName || !credentials) {
  window.location.href = '/index.html';
}

const apiService = new ApiService(serverName, apiName);

const state = {
  lastSortedColumn: null,
  lastSortDirection: 'asc',
  selectedRowItem: null,
  entityName: 'WCE_Lead',
  nextUrl: '',
  columnWidths: {}, 
  columnOrder: {}, 
  hiddenColumns: {} 
};

const entityConfig = {
  displayNames: {
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
    'CompanyName': 'Company',
    'JobTitle': 'Job Title',
    'Address1_Telephone1': 'Phone',
    'MobilePhone': 'Mobile Phone',
    'Address1_Fax': 'Fax',
    'EMailAddress1': 'Email',
    'WebSiteUrl': 'Website',
    'Address1_Line1': 'Street',
    'Address1_PostalCode': 'Postal Code',
    'Address1_City': 'City',
    'Address1_Country': 'Country',
    'Address1_CountryISOCode': 'Country Code',
    'Address1_StateOrProvince': 'State/Province',
    'Description': 'Description',
    'AttachmentIdList': 'Attachments',
    'SalesArea': 'Sales Area',
    'RequestBarcode': 'Request Barcode',
    'StatusMessage': 'Status Message',
    'DeviceId': 'Device ID',
    'DeviceRecordId': 'Device Record ID',
    'ModifiedBySystemOn': 'System Modified Date',
    'EventId': 'Event ID',
    'IsReviewed': 'Is Reviewed',
    'Department': 'Department',
    'DepartmentText': 'Department Text',
    'Topic': 'Topic',
    'Gender': 'Gender',
    'Newsletter': 'Newsletter',
    'DisplayName': 'Name'
  },
  
  dateFields: ['CreatedOn', 'ModifiedOn', 'ModifiedBySystemOn'],
  
  filterFields: {
    text: ['LeadId', 'FirstName', 'LastName', 'CompanyName', 'EMailAddress1', 'Topic'],
    date: ['CreatedOn', 'ModifiedOn']
  },
  
  priorityFields: [
    'LeadId', 'FirstName', 'LastName', 'CompanyName', 'EMailAddress1', 
    'Topic', 'CreatedOn', 'ModifiedOn'
  ]
};

function init() {
  loadAppState();
  setupEventListeners();
  setupDynamicsIntegration();

  const eventId = sessionStorage.getItem('selectedEventId');
  if (eventId) {
    updateEventTitle(eventId);
  }
  
  fetchLeadData();
  displayLeadFilters();
  handleResponsiveLayout();
  window.addEventListener('resize', handleResponsiveLayout);
}

function loadAppState() {
  try {
    const savedColumnWidths = localStorage.getItem('wceColumnWidths');
    if (savedColumnWidths) {
      state.columnWidths = JSON.parse(savedColumnWidths);
    }
    
    const savedColumnOrder = localStorage.getItem('wceColumnOrder');
    if (savedColumnOrder) {
      state.columnOrder = JSON.parse(savedColumnOrder);
    }
    
    const savedHiddenColumns = localStorage.getItem('wceHiddenColumns');
    if (savedHiddenColumns) {
      state.hiddenColumns = JSON.parse(savedHiddenColumns);
    }
  } catch (error) {
    console.error('Error loading app state:', error);
    state.columnWidths = {};
    state.columnOrder = {};
    state.hiddenColumns = {};
  }
}

function saveAppState() {
  try {
    localStorage.setItem('wceColumnWidths', JSON.stringify(state.columnWidths));
    localStorage.setItem('wceColumnOrder', JSON.stringify(state.columnOrder));
    localStorage.setItem('wceHiddenColumns', JSON.stringify(state.hiddenColumns));
  } catch (error) {
    console.error('Error saving app state:', error);
  }
}

function setupEventListeners() {
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', () => {
      window.location.href = 'display.html';
    });
  }
  
  const showAttachmentButton = document.getElementById('showAttachmentButton');
  if (showAttachmentButton) {
    showAttachmentButton.addEventListener('click', handleShowAttachmentClick);
  }
  
  const nextButton = document.getElementById('nextButton');
  if (nextButton) {
    nextButton.addEventListener('click', loadNextRows);
    nextButton.disabled = true; 
  }
  
  addTransferButton();
}

// Function to update the Show Attachment button with count
function updateShowAttachmentButton(attachmentCount) {
  const showAttachmentButton = document.getElementById('showAttachmentButton');
  
  if (showAttachmentButton) {
    if (attachmentCount > 0) {
      showAttachmentButton.textContent = `Show Attachment (${attachmentCount})`;
    } else {
      showAttachmentButton.textContent = 'Show Attachment';
    }
  }
}

async function handleShowAttachmentClick() {
  if (!state.selectedRowItem) {
    alert('Please select a lead first.');
    return;
  }
  
  const leadId = state.selectedRowItem.LeadId;
  
  try {
    //Check if AttachmentIdList is available directly
    if (state.selectedRowItem.AttachmentIdList && state.selectedRowItem.AttachmentIdList.trim() !== '') {
      sessionStorage.setItem('attachmentSource', 'Lead');
      sessionStorage.setItem('AttachmentIdList', state.selectedRowItem.AttachmentIdList);
      sessionStorage.setItem('selectedLeadId', leadId);
      sessionStorage.setItem('selectedLeadName', 
        `${state.selectedRowItem.FirstName || ''} ${state.selectedRowItem.LastName || ''}`.trim() || 
        state.selectedRowItem.CompanyName || 
        'Unknown Lead'
      );
      window.location.href = 'displayWceAttachmentList.html';
      return;
    }
    
    // Option 2: If AttachmentIdList is not available, fetch attachments from API
    const endpoint = `WCE_Attachment?$format=json&$filter=LeadId eq '${escapeODataValue(leadId)}'`;
    const data = await apiService.request('GET', endpoint);
    
    if (data && data.d && data.d.results && data.d.results.length > 0) {
      const attachmentIds = data.d.results.map(attachment => attachment.Id || attachment.AttachmentId).join(',');
      
      sessionStorage.setItem('attachmentSource', 'Lead');
      sessionStorage.setItem('AttachmentIdList', attachmentIds);
      sessionStorage.setItem('selectedLeadId', leadId);
      sessionStorage.setItem('selectedLeadName', 
        `${state.selectedRowItem.FirstName || ''} ${state.selectedRowItem.LastName || ''}`.trim() || 
        state.selectedRowItem.CompanyName || 
        'Unknown Lead'
      );
      window.location.href = 'displayWceAttachmentList.html';
    } else {
      alert('No attachments found for this lead.');
    }
  } catch (error) {
    console.error('Error fetching attachments:', error);
    alert('Error retrieving attachments. Please try again.');
  }
}

function addTransferButton() {
  const actionsContainer = document.querySelector('.actions');
  if (!actionsContainer) return;
  
  if (!document.getElementById('transferButton')) {
    const transferButton = document.createElement('button');
    transferButton.id = 'transferButton';
    transferButton.className = 'action-button';
    transferButton.disabled = true;
    transferButton.textContent = 'Transfer to CRM';
    
    transferButton.addEventListener('click', handleTransferClick);
    
    actionsContainer.appendChild(transferButton);
  }
}



function handleTransferClick() {
  if (!state.selectedRowItem) {
    alert('Please select a lead first.');
    return;
  }
  
  console.log('🔄 Preparing lead transfer...', state.selectedRowItem);
  
  // Store the selected lead data
  sessionStorage.setItem('selectedLeadForTransfer', JSON.stringify(state.selectedRowItem));
  sessionStorage.setItem('transferSource', 'WCE_Lead');
  sessionStorage.setItem('transferReferrer', window.location.href);
  
  // Handle attachments properly
  if (state.selectedRowItem.AttachmentIdList && state.selectedRowItem.AttachmentIdList.trim() !== '') {
    console.log('📎 Lead has attachments:', state.selectedRowItem.AttachmentIdList);
    
    // Store attachment IDs for the transfer page
    sessionStorage.setItem('selectedLeadAttachmentIds', state.selectedRowItem.AttachmentIdList);
    
    // Optionally pre-fetch attachment details for better UX
    prefetchAttachmentDetails(state.selectedRowItem.AttachmentIdList)
      .then(() => {
        console.log('✅ Attachment details pre-fetched successfully');
        // Navigate to transfer page
        window.location.href = 'displayWceLeadTransferDynamics.html';
      })
      .catch((error) => {
        console.warn('⚠️ Could not pre-fetch attachment details:', error);
        // Navigate anyway - the transfer page will handle the fetch
        window.location.href = 'displayWceLeadTransferDynamics.html';
      });
  } else {
    console.log('ℹ️ Lead has no attachments');
    // Clear any previous attachment data
    sessionStorage.removeItem('selectedLeadAttachments');
    sessionStorage.removeItem('selectedLeadAttachmentIds');
    
    // Navigate to transfer page
    window.location.href = 'displayWceLeadTransferDynamics.html';
  }
}

// Pre-fetch attachment details function
async function prefetchAttachmentDetails(attachmentIdList) {
  try {
    console.log('🔄 Pre-fetching attachment details...');
    
    const attachmentIds = attachmentIdList.split(',')
      .map(id => id.trim())
      .filter(id => id !== '');
    
    if (attachmentIds.length === 0) {
      throw new Error('No valid attachment IDs found');
    }
    
    const attachmentDetails = [];
    
    // Fetch details for each attachment
    for (const attachmentId of attachmentIds) {
      try {
        console.log(`📎 Pre-fetching attachment: ${attachmentId}`);
        
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
            size: formatFileSize(attachmentData.FileSize || attachmentData.BodyLength),
            hasBody: !!(attachmentData.Body),
            source: 'Pre-fetched'
          };
          
          attachmentDetails.push(attachment);
          console.log(`✅ Pre-fetched attachment: ${attachment.name}`);
        }
        
      } catch (attachmentError) {
        console.warn(`⚠️ Could not pre-fetch attachment ${attachmentId}:`, attachmentError);
        
        // Add placeholder for failed attachment
        attachmentDetails.push({
          id: attachmentId,
          name: `Attachment_${attachmentId.substring(0, 8)}`,
          type: 'unknown',
          size: 'Unknown size',
          hasBody: false,
          source: 'Failed-prefetch',
          error: true
        });
      }
    }
    
    // Store pre-fetched attachment details
    if (attachmentDetails.length > 0) {
      sessionStorage.setItem('selectedLeadAttachments', JSON.stringify(attachmentDetails));
      console.log(`✅ Pre-fetched ${attachmentDetails.length} attachment details`);
    }
    
    return attachmentDetails;
    
  } catch (error) {
    console.error('❌ Error pre-fetching attachment details:', error);
    throw error;
  }
}

// UTILITY: Format file size
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return 'Unknown size';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(2);
  
  return `${size} ${sizes[i]}`;
}

// UPDATED: Enhanced handleRowClick with better attachment handling
function handleRowClick(item, row) {
  const tbody = document.querySelector('tbody');
  
  const previouslySelected = tbody.querySelector('tr.selected');
  if (previouslySelected) {
    previouslySelected.classList.remove('selected');
  }
  
  if (state.selectedRowItem && state.selectedRowItem.LeadId === item.LeadId) {
    state.selectedRowItem = null;
    updateButtonState(false);
  } else {
    row.classList.add('selected');
    state.selectedRowItem = item;
    updateButtonState(true);
    
    // ENHANCED: Better attachment handling when row is selected
    console.log('📋 Lead selected:', item.LeadId, 'Attachments:', item.AttachmentIdList);
    
    if (item.AttachmentIdList && item.AttachmentIdList.trim() !== '') {
      const attachmentIds = item.AttachmentIdList.split(',').filter(id => id.trim() !== '');
      updateShowAttachmentButton(attachmentIds.length);
      
      // Store attachment info immediately for better UX
      sessionStorage.setItem('AttachmentIdList', item.AttachmentIdList);
    } else {
      updateShowAttachmentButton(0);
      // Clear attachment data if no attachments
      sessionStorage.removeItem('AttachmentIdList');
      sessionStorage.removeItem('selectedLeadAttachments');
    }
  }
}

// Check dynamic status of the selected event
async function checkDynamicsStatus() {
  try {
    // Dynamically import DynamicsService to avoid loading issues
    const { default: DynamicsService } = await import('../services/dynamicsService.js');
    const dynamicsService = DynamicsService.getInstance();
    
    const status = dynamicsService.getConnectionStatus();
    updateTransferButtonWithStatus(status);
  } catch (error) {
    console.log('Dynamics service not available, using standard transfer button');
  }
}

function updateTransferButtonWithStatus(status) {
  const transferButton = document.getElementById('transferButton');
  if (!transferButton) return;
  
  // Update button text based on Dynamics status
  if (!status.isConfigured) {
    transferButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
      Setup & Transfer to CRM
    `;
  } else if (!status.isConnected) {
    transferButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
        <polyline points="10 17 15 12 10 7"></polyline>
        <line x1="15" y1="12" x2="3" y2="12"></line>
      </svg>
      Connect & Transfer to CRM
    `;
  } else {
    transferButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </svg>
      Transfer to Dynamics CRM
    `;
  }
}


async function fetchLeadData() {
  const eventId = sessionStorage.getItem('selectedEventId');
  console.log("selectedEventId", eventId);
  if (!eventId) {
    alert('No Event ID provided.');
    window.location.href = '/display.html';
    return;
  }

  const noDataMessage = document.getElementById('noDataMessage');
  if (noDataMessage) noDataMessage.textContent = 'Loading...';

  const filterQuery = EventIdFilter(eventId);
  const endpoint = `${state.entityName}?$format=json&$filter=${encodeURIComponent(filterQuery)}`;

  console.log('Fetch endpoint:', endpoint);

  try {
    const data = await apiService.request('GET', endpoint);
    
    if (data && data.d && data.d.results) {
      if (data.d.results.length > 0) {
        calculateColumnWidths(data.d.results);
      }
      
      displayData(data.d.results);
      state.nextUrl = apiService.getNextUrl(data);
      
      const nextButton = document.getElementById('nextButton');
      if (nextButton) {
        nextButton.disabled = !state.nextUrl;
      }
      
      if (noDataMessage) {
        noDataMessage.textContent = data.d.results.length === 0 ? 'No leads found for this event.' : '';
      }
    } else {
      displayData([]);
      if (noDataMessage) noDataMessage.textContent = 'No data available.';
    }
  } catch (error) {
    console.error('Error fetching lead data:', error);
    if (noDataMessage) noDataMessage.textContent = 'Error fetching data.';
    alert('An error occurred while fetching lead data.');
  }

  initSearch();
}

async function updateEventTitle(eventId) {
  try {
    const endpoint = `WCE_Event?$format=json&$filter=EventId eq '${escapeODataValue(eventId)}'`;
    const data = await apiService.request('GET', endpoint);
    
    if (data && data.d && data.d.results && data.d.results.length > 0) {
      const event = data.d.results[0];
      const eventTitle = document.getElementById('eventTitle');
      
      if (eventTitle) {
        eventTitle.textContent = `WCE Lead Management: ${event.DisplayName || 'Unknown Event'}`;
      }
    }
  } catch (error) {
    console.error('Error fetching event details:', error);
  }
}

function getSavedFilters() {
  const savedFilters = localStorage.getItem(`${state.entityName}_Filters`);
  return savedFilters ? JSON.parse(savedFilters) : null;
}

function buildFilterQuery(filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return '';
  }
  
  const filterParts = [];
  
  Object.keys(filters).forEach(field => {
    const value = filters[field];
    if (!value) return;
    
    if (entityConfig.dateFields.includes(field)) {
      const date = parseDate(value);
      
      if (!date) return;
      
      const formattedDate = formatDateForOData(date);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const formattedNextDay = formatDateForOData(nextDay);
      
      filterParts.push(`${field} ge datetime'${formattedDate}T00:00:00' and ${field} lt datetime'${formattedNextDay}T00:00:00'`);
    } else {
      filterParts.push(`substringof('${escapeODataValue(value)}', ${field}) eq true`);
    }
  });
  
  return filterParts.join(' and ');
}

function calculateColumnWidths(data) {
  if (!data || data.length === 0) return;
  
  if (!state.columnWidths[state.entityName]) {
    state.columnWidths[state.entityName] = {};
  }
  
  if (!state.columnOrder[state.entityName]) {
    state.columnOrder[state.entityName] = [];
  }
  
  if (!state.hiddenColumns[state.entityName]) {
    state.hiddenColumns[state.entityName] = [];
  }
  
  const allColumns = Object.keys(data[0]).filter(column => 
    column !== '__metadata' && !column.endsWith('ViewId') && !column.endsWith('VIEWID')
  );
  
  if (state.columnOrder[state.entityName].length === 0) {
    state.columnOrder[state.entityName] = [
      ...entityConfig.priorityFields.filter(field => allColumns.includes(field)),
      ...allColumns.filter(field => !entityConfig.priorityFields.includes(field))
    ];
  }
  
  allColumns.forEach(column => {
    if (state.columnWidths[state.entityName][column]) return;
    
    let maxContentLength = column.length; 
    
    const sampleSize = Math.min(data.length, 100);
    
    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][column];
      if (value !== null && value !== undefined) {
        const strValue = String(value);
        maxContentLength = Math.max(maxContentLength, strValue.length);
      }
    }
    
    let width;
    
    if (column.includes('Id') && maxContentLength > 20) {
      width = Math.max(maxContentLength * 8, 300); 
    } else if (column.includes('Name') || column.includes('Title') || column.includes('Description')) {
      width = Math.max(maxContentLength * 8, 200);
      width = Math.min(width, 400); 
    } else if (column.includes('Date') || entityConfig.dateFields.includes(column)) {
      width = 200;
    } else if (column.includes('Email')) {
      width = Math.max(maxContentLength * 8, 250);
    } else {
      width = Math.max(maxContentLength * 8, 150); 
      width = Math.min(width, 300); 
    }
    
    state.columnWidths[state.entityName][column] = `${width}px`;
  });
  
  saveAppState();
}

function displayLeadFilters() {
  const filterInputs = document.getElementById('filterInputs');
  if (!filterInputs) return;
  
  filterInputs.innerHTML = '';
  filterInputs.style.display = 'flex';
  
  const filterConfig = entityConfig.filterFields;
  const savedFilters = getSavedFilters() || {};
  
  filterConfig.text.forEach(field => {
    addFilterInput(filterInputs, field, 'text', savedFilters[field] || '');
  });
  
  filterConfig.date.forEach(field => {
    addFilterInput(filterInputs, field, 'date', savedFilters[field] || '');
  });
  
  addFilterButtons(filterInputs);
  updateResetButtonState();
}

function addFilterInput(container, field, type, value) {
  const displayName = entityConfig.displayNames[field] || field;
  
  const inputGroup = document.createElement('div');
  inputGroup.classList.add('input-group-float');
  inputGroup.id = `input-group-${field.toLowerCase()}`;
  
  const input = document.createElement('input');
  input.id = `filter-${field}`;
  input.classList.add('filter-input');
  input.placeholder = " ";
  
  if (type === 'date') {
    input.type = 'date';
    if (value) {
      const dateValue = parseDate(value);
      if (dateValue) {
        const formattedDate = dateValue.toISOString().split('T')[0];
        input.value = formattedDate;
        inputGroup.classList.add('has-value');
      }
    }
  } else {
    input.type = 'text';
    input.value = value;
  }
  
  input.addEventListener('input', () => {
    updateResetButtonState();
    if (input.type === 'date') {
      if (input.value) {
        inputGroup.classList.add('has-value');
      } else {
        inputGroup.classList.remove('has-value');
      }
    }
  });
  
  const label = document.createElement('label');
  label.setAttribute('for', `filter-${field}`);
  label.textContent = displayName;
  
  inputGroup.appendChild(input);
  inputGroup.appendChild(label);
  container.appendChild(inputGroup);
}

function addFilterButtons(container) {
  const buttonGroup = document.createElement('div');
  buttonGroup.classList.add('filter-buttons');
  
  const applyButton = document.createElement('button');
  applyButton.textContent = 'Apply Filters';
  applyButton.classList.add('filter-button');
  applyButton.addEventListener('click', applyFilters);
  buttonGroup.appendChild(applyButton);
  
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset Filters';
  resetButton.classList.add('filter-button', 'reset-button');
  resetButton.id = 'resetFiltersButton';
  resetButton.addEventListener('click', resetFilters);
  buttonGroup.appendChild(resetButton);
  
  container.appendChild(buttonGroup);
}

function updateResetButtonState() {
  const resetButton = document.getElementById('resetFiltersButton');
  if (!resetButton) return;
  
  const filterConfig = entityConfig.filterFields;
  
  const hasValue = [...filterConfig.text, ...filterConfig.date].some(field => {
    const input = document.getElementById(`filter-${field}`);
    return input && input.value && input.value.trim() !== '';
  });
  
  resetButton.disabled = !hasValue;
}

function applyFilters() {
  const filterConfig = entityConfig.filterFields;
  const filters = {};
  
  [...filterConfig.text, ...filterConfig.date].forEach(field => {
    const input = document.getElementById(`filter-${field}`);
    if (input && input.value && input.value.trim() !== '') {
      filters[field] = input.value.trim();
    }
  });
  
  localStorage.setItem(`${state.entityName}_Filters`, JSON.stringify(filters));
  fetchLeadDataWithFilters();
}

async function fetchLeadDataWithFilters() {
  const eventId = sessionStorage.getItem('selectedEventId');
  
  if (!eventId) {
    alert('No Event ID provided.');
    return;
  }

  const noDataMessage = document.getElementById('noDataMessage');
  if (noDataMessage) noDataMessage.textContent = 'Loading...';

  const eventIdFilter = EventIdFilter(eventId);
  
  const savedFilters = getSavedFilters();
  let additionalFilters = '';
  if (savedFilters && Object.keys(savedFilters).length > 0) {
    additionalFilters = buildFilterQuery(savedFilters);
  }
  
  let fullFilterQuery = eventIdFilter;
  if (additionalFilters) {
    fullFilterQuery = `${eventIdFilter} and ${additionalFilters}`;
  }

  const endpoint = `${state.entityName}?$format=json&$filter=${encodeURIComponent(fullFilterQuery)}`;

  try {
    const data = await apiService.request('GET', endpoint);
    
    if (data && data.d && data.d.results) {
      console.log(`✅ Found ${data.d.results.length} results with filters`);
      displayData(data.d.results);
    }
  } catch (error) {
    console.error('❌ Error fetching filtered data:', error);
  }
}

function resetFilters() {
  localStorage.removeItem(`${state.entityName}_Filters`);
  
  const filterConfig = entityConfig.filterFields;
  [...filterConfig.text, ...filterConfig.date].forEach(field => {
    const input = document.getElementById(`filter-${field}`);
    if (input) {
      input.value = '';
    }
  });
  
  updateResetButtonState();
  fetchLeadData();
}

function displayData(data, append = false) {
  const tableHead = document.getElementById('tableHead');
  const tableBody = document.getElementById('tableBody');
  const noDataMessage = document.getElementById('noDataMessage');
  
  if (!append) {
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    
    state.selectedRowItem = null;
    updateButtonState(false);
  }
  
  if (!data || data.length === 0) {
    if (!append) {
      noDataMessage.textContent = 'No data available.';
    }
    return;
  }
  
  noDataMessage.textContent = '';
  
  const allColumns = Object.keys(data[0]).filter(column => 
    column !== '__metadata' && !column.endsWith('ViewId') && !column.endsWith('VIEWID')
  );
  
  let displayColumns = allColumns;
  
  if (state.columnOrder[state.entityName] && state.columnOrder[state.entityName].length > 0) {
    displayColumns = state.columnOrder[state.entityName].filter(column => allColumns.includes(column));
    
    const newColumns = allColumns.filter(column => !displayColumns.includes(column));
    displayColumns = [...displayColumns, ...newColumns];
  }
  
  const hiddenColumns = state.hiddenColumns[state.entityName] || [];
  displayColumns = displayColumns.filter(column => !hiddenColumns.includes(column));
  
  if (!append) {
    const headerRow = document.createElement('tr');
    
    displayColumns.forEach(column => {
      const th = document.createElement('th');
      
      if (state.columnWidths[state.entityName] && state.columnWidths[state.entityName][column]) {
        th.style.minWidth = state.columnWidths[state.entityName][column];
      }
      
      let displayName = column;
      if (entityConfig.displayNames[column]) {
        displayName = entityConfig.displayNames[column];
      }
      
      th.setAttribute('title', displayName);
      
      const headerText = document.createTextNode(displayName);
      th.appendChild(headerText);
      
      const span = document.createElement('span');
      span.classList.add('icon-arrow');
      span.innerHTML = '&UpArrow;';
      
      if (column === state.lastSortedColumn) {
        th.classList.add(state.lastSortDirection, 'active');
      }
      
      th.appendChild(span);
      th.addEventListener('click', () => sortTable(column, th));
      headerRow.appendChild(th);
    });
    
    tableHead.appendChild(headerRow);
  }
  
  data.forEach(item => {
    const row = document.createElement('tr');
    
    displayColumns.forEach(column => {
      const td = document.createElement('td');
      
      if (column === state.lastSortedColumn) {
        td.classList.add('active');
      }
      
      const cellContent = item[column] !== null && item[column] !== undefined ? item[column] : '';
      
      const isLongContent = 
        (typeof cellContent === 'string' && cellContent.length > 40) || 
        column.includes('List') || 
        (column.includes('Id') && cellContent.length > 30);
      
      if (isLongContent) {
        td.classList.add('long-content');
      }
      
      if (isLongContent) {
        td.setAttribute('title', cellContent);
      }
      
      const isDate = entityConfig.dateFields.includes(column) || column.includes('Date');
      
      if (isDate && cellContent) {
        td.textContent = formatDate(cellContent);
      } else {
        td.textContent = cellContent;
      }
      
      row.appendChild(td);
    });
    
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => handleRowClick(item, row));
    
    tableBody.appendChild(row);
  });
  
  const nextButton = document.getElementById('nextButton');
  if (nextButton) {
    nextButton.disabled = !state.nextUrl;
  }
}

async function sortTable(columnName, th) {
  console.log("Server-side sort called for column:", columnName);
  
  const previousSelectedItem = state.selectedRowItem;
  
  let sortAsc;
  if (state.lastSortedColumn !== columnName) {
    sortAsc = true;
    state.lastSortedColumn = columnName;
  } else {
    sortAsc = state.lastSortDirection === 'desc';
  }
  
  state.lastSortDirection = sortAsc ? 'asc' : 'desc';
  
  updateSortingUI(th, state.lastSortDirection);
  
  const eventId = sessionStorage.getItem('selectedEventId');
  if (!eventId) return;
  
  const sortOrder = sortAsc ? columnName : `${columnName} desc`;
  const filterQuery = EventIdFilter(eventId);
  const endpoint = `${state.entityName}?$format=json&$filter=${encodeURIComponent(filterQuery)}&$orderby=${encodeURIComponent(sortOrder)}`;
  
  console.log('Sort endpoint:', endpoint);
  
  try {
    const noDataMessage = document.getElementById('noDataMessage');
    if (noDataMessage) noDataMessage.textContent = 'Sorting...';
    
    const data = await apiService.request('GET', endpoint);
    
    if (data && data.d && data.d.results) {
      displayData(data.d.results);
      state.nextUrl = apiService.getNextUrl(data);
      
      const nextButton = document.getElementById('nextButton');
      if (nextButton) {
        nextButton.disabled = !state.nextUrl;
      }
      
      if (previousSelectedItem && previousSelectedItem.LeadId) {
        setTimeout(() => restoreRowSelection(previousSelectedItem.LeadId), 100);
      }
      
      if (noDataMessage) noDataMessage.textContent = '';
    } else {
      displayData([]);
      if (noDataMessage) noDataMessage.textContent = 'No data available.';
    }
  } catch (error) {
    console.error('Sorting error:', error);
    alert('Error during sorting. Check console for details.');
  }
}

function updateSortingUI(clickedTh, direction) {
  const allHeaders = document.querySelectorAll('thead th');
  allHeaders.forEach(header => {
    header.classList.remove('asc', 'desc', 'active');
  });
  clickedTh.classList.add(direction, 'active');
}

function restoreRowSelection(leadId) {
  if (!leadId) return;
  const rows = document.querySelectorAll('tbody tr');
  let rowFound = false;

  rows.forEach(row => {
    row.classList.remove('selected');
    const cells = row.querySelectorAll('td');
    
    for (let i = 0; i < cells.length; i++) {
      const cellText = cells[i].textContent.trim();
      if (cellText === leadId) {
        row.classList.add('selected');
        rowFound = true;
        state.selectedRowItem = { LeadId: leadId };
        break;
      }
    }
  });
  
  updateButtonState(rowFound);
}

// function handleRowClick(item, row) {
//   const tbody = document.querySelector('tbody');
  
//   const previouslySelected = tbody.querySelector('tr.selected');
//   if (previouslySelected) {
//     previouslySelected.classList.remove('selected');
//   }
  
//   if (state.selectedRowItem && state.selectedRowItem.LeadId === item.LeadId) {
//     state.selectedRowItem = null;
//     updateButtonState(false);
//   } else {
//     row.classList.add('selected');
//     state.selectedRowItem = item;
//     updateButtonState(true);
    
//     // Update the Show Attachment button with the attachment count when a row is selected
//     if (item.AttachmentIdList) {
//       sessionStorage.setItem('AttachmentIdList', item.AttachmentIdList);
//       const attachmentIds = item.AttachmentIdList.split(',').filter(id => id.trim() !== '');
//       updateShowAttachmentButton(attachmentIds.length);
//     } else {
//       updateShowAttachmentButton(0);
//     }
//   }
// }

function updateButtonState(enabled) {
  const showAttachmentButton = document.getElementById('showAttachmentButton');
  if (showAttachmentButton) {
    showAttachmentButton.disabled = !enabled;
    
    // Reset button text when disabled
    if (!enabled) {
      showAttachmentButton.textContent = 'Show Attachment';
    }
  }
  
  const transferButton = document.getElementById('transferButton');
  if (transferButton) {
    transferButton.disabled = !enabled;
    
    // Check Dynamics status when a lead is selected
    if (enabled) {
      checkDynamicsStatus();
    }
  }
}

function setupDynamicsIntegration() {
  // Check Dynamics status on page load
  checkDynamicsStatus();
  
  // Optionally, periodically check status
  setInterval(checkDynamicsStatus, 30000); // Every 30 seconds
}

function initSearch() {
  const searchInput = document.getElementById('search');
  if (!searchInput) return;
  
  searchInput.addEventListener('input', () => {
    const searchValue = searchInput.value.toLowerCase();
    const tableRows = document.querySelectorAll('tbody tr');
    let found = false;
    
    tableRows.forEach((row, i) => {
      const rowText = row.textContent.toLowerCase();
      const isVisible = rowText.indexOf(searchValue) >= 0;
      row.classList.toggle('hide', !isVisible);
      if (isVisible) {
        found = true;
      }
      row.style.setProperty('--delay', i / 25 + 's');
    });
    
    document.querySelectorAll('tbody tr:not(.hide)').forEach((visibleRow, i) => {
      visibleRow.style.backgroundColor = (i % 2 === 0) ? 'transparent' : '#0000000b';
    });
    
    const noDataMessage = document.getElementById('noDataMessage');
    if (noDataMessage) {
      noDataMessage.textContent = !found ? 'No results found.' : '';
    }
  });
}

async function loadNextRows() {
  if (!state.nextUrl) {
    console.error('No next URL found.');
    return;
  }
  
  const nextButton = document.getElementById('nextButton');
  if (nextButton) {
    nextButton.textContent = 'Loading...';
    nextButton.disabled = true;
  }
  
  try {
    const data = await apiService.fetchNextRows(state.nextUrl);
    
    if (data && data.d && data.d.results && data.d.results.length > 0) {
      displayData(data.d.results, true);
      
      state.nextUrl = apiService.getNextUrl(data);
      
      if (nextButton) {
        nextButton.disabled = !state.nextUrl;
        nextButton.textContent = 'Next';
      }
    } else {
      state.nextUrl = '';
      if (nextButton) {
        nextButton.disabled = true;
        nextButton.textContent = 'Next';
      }
    }
  } catch (error) {
    console.error('Error loading next rows:', error);
    if (nextButton) {
      nextButton.textContent = 'Next';
      nextButton.disabled = false;
    }
    alert('Error loading more data. Please try again.');
  }
}

function handleResponsiveLayout() {
  enhanceTableResponsiveness();
  
  const filterContainer = document.querySelector('.filter-container, .filter-inputs');
  if (filterContainer) {
    if (window.innerWidth <= 768) {
      filterContainer.classList.add('mobile-filters');
    } else {
      filterContainer.classList.remove('mobile-filters');
    }
  }
}

function enhanceTableResponsiveness() {
  const tableBody = document.querySelector('.table__body');
  if (!tableBody) return;
  
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    tableBody.style.overflowX = 'auto';
    tableBody.style.minHeight = '300px';
    tableBody.style.padding = '0 6px';
    
    const table = tableBody.querySelector('table');
    if (table) {
      table.style.minWidth = 'max-content';
    }
  } else {
    tableBody.style.minHeight = '300px';
    tableBody.style.overflowX = 'auto'; 
    
    const table = tableBody.querySelector('table');
    if (table) {
      table.style.tableLayout = 'auto';
      table.style.width = 'max-content';
      table.style.minWidth = '100%';
    }
  }
  
  addDynamicTableStyles();
}

function addDynamicTableStyles() {
  const style = document.getElementById('dynamic-table-styles');
  if (!style) {
    const newStyle = document.createElement('style');
    newStyle.id = 'dynamic-table-styles';
    newStyle.textContent = `
      .table__body td, .table__body th {
        white-space: nowrap;
        overflow: visible;
        text-overflow: clip;
        max-width: none;
        padding: 16px;
      }

      .table__body td.long-content {
        word-break: break-all; 
        white-space: normal;   
      }
      
      .table__body td[title]:hover:after {
        content: attr(title);
        position: absolute;
        left: 0;
        top: 100%;
        background: white;
        color: black;
        border: 1px solid #ccc;
        padding: 5px;
        z-index: 10;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        border-radius: 3px;
        white-space: normal;
        word-break: break-word;
        max-width: 300px;
        font-size: 12px;
      }
      
      .table__body thead th {
        position: sticky;
        top: 0;
        background: #D7E5F1; 
        z-index: 1;         
      }
      
      .table__body table {
        border-collapse: collapse;
      }
      
      .table__body tbody tr:nth-child(odd) {
        background-color: rgba(0, 0, 0, 0.03);
      }
    `;
    document.head.appendChild(newStyle);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});