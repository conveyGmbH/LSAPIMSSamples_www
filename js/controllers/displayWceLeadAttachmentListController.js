import ApiService from '../services/apiService.js';

const serverName = sessionStorage.getItem('serverName');
const apiName = sessionStorage.getItem('apiName');
const credentials = sessionStorage.getItem('credentials');

if (!serverName || !apiName || !credentials) {
  window.location.href = '/index.html';
}

const apiService = new ApiService(serverName, apiName);

function navigateBack() {
  const sourcePage = sessionStorage.getItem('attachmentSource');
  
  // Clean up session storage
  sessionStorage.removeItem('AttachmentIdList');
  sessionStorage.removeItem('attachmentSource');
  sessionStorage.removeItem('selectedLeadId');
  sessionStorage.removeItem('selectedLeadName');
  
  if (sourcePage === 'Lead') {
    window.location.href = 'displayWceLead.html';
  } else {
    window.location.href = 'display.html';
  }
}

async function loadAttachment(attachmentId) {
  try {
    const attachmentContainer = document.getElementById('attachmentContainer');
    attachmentContainer.innerHTML = '<div class="loading">Loading attachment...</div>';
    
    const fileNameElement = document.getElementById('fileName');
    fileNameElement.textContent = 'Loading...';
    
    const endpoint = `WCE_AttachmentById?Id=%27${encodeURIComponent(attachmentId)}%27&$format=json`;
    const data = await apiService.request('GET', endpoint);

    let attachmentData = null;
    
    if (data && data.d && data.d.results && data.d.results.length > 0) {
      attachmentData = data.d.results[0];
    } else if (data && data.d) {
      attachmentData = data.d;
    }
    
    if (attachmentData) {
      if (attachmentData.Body) {
        displayAttachment(attachmentData);
      } else {
        attachmentContainer.innerHTML = `
          <div class="no-data">
            <p>The attachment record exists (ID: ${attachmentId}), but no file content is available.</p>
            <p>The file may have been deleted or is inaccessible.</p>
          </div>`;
        fileNameElement.textContent = attachmentData.FileName || attachmentData.Name || 'Unknown File';
        
        const downloadButton = document.getElementById('downloadButton');
        if (downloadButton) {
          downloadButton.disabled = true;
        }
      }
    } else {
      attachmentContainer.innerHTML = '<div class="no-data"><p>No attachment data found.</p></div>';
      fileNameElement.textContent = 'No file';
    }
  } catch (error) {
    console.error("Error loading attachment:", error);
    showError(`Error loading attachment: ${error.message}`);
    document.getElementById('attachmentContainer').innerHTML = 
      `<div class="no-data"><p>Error loading attachment: ${error.message}</p></div>`;
    document.getElementById('fileName').textContent = 'Error';
  }
}

function displayAttachment(attachment) {
  const attachmentContainer = document.getElementById('attachmentContainer');
  const fileNameElement = document.getElementById('fileName');
  const downloadButton = document.getElementById('downloadButton');

  console.log("Attachment data:", attachment);
  
  if (!attachment) {
    attachmentContainer.innerHTML = '<div class="no-data"><p>No attachment available</p></div>';
    fileNameElement.textContent = 'No file';
    downloadButton.style.display = 'none';
    return;
  }
  
  // Support both old and new field names
  const fileName = attachment.FileName || attachment.Name || 'attachment';
  const fileType = attachment.MimeType || attachment.ContentType;
  const base64Data = attachment.Body;
  const fileSize = attachment.FileSize || attachment.BodyLength;
  
  fileNameElement.textContent = fileName;
  downloadButton.style.display = 'inline-flex';
  downloadButton.disabled = false;
  
  if (!base64Data || !fileType) {
    attachmentContainer.innerHTML = '<div class="no-data"><p>Missing data for this attachment</p></div>';
    return;
  }

  try {
    const dataUrl = `data:${fileType};base64,${base64Data}`;

    downloadButton.onclick = () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    
    // Handle different file types
    if (fileType === 'image/svg+xml' || fileName.toLowerCase().endsWith('.svg')) {
      try {
        const svgString = atob(base64Data);
        attachmentContainer.innerHTML = `
          <div class="svg-container">
            ${svgString}
          </div>
        `;
        
        const svgElement = attachmentContainer.querySelector('svg');
        if (svgElement) {
          svgElement.style.width = '100%';
          svgElement.style.height = 'auto';
          svgElement.style.maxHeight = '500px';
          svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        } else {
          console.warn("SVG element not found in decoded string, using fallback");
          attachmentContainer.innerHTML = `<object data="${dataUrl}" type="image/svg+xml" style="width: 100%; height: 500px;">SVG not supported</object>`;
        }
      } catch (svgError) {
        console.error("Error displaying SVG:", svgError);
        attachmentContainer.innerHTML = `<object data="${dataUrl}" type="image/svg+xml" style="width: 100%; height: 500px;">SVG not supported</object>`;
      }
    } 
    else if (fileType.startsWith('image/')) {
      attachmentContainer.innerHTML = `<img src="${dataUrl}" alt="${fileName}" style="max-width: 100%; max-height: 500px;" />`;
    } else if (fileType === 'application/pdf') {
      attachmentContainer.innerHTML = `
        <iframe 
          src="${dataUrl}#view=Fit&scrollbar=0" 
          class="pdf-viewer" 
          type="application/pdf"
          style="width: 100%; height: 100%; border: none;"
        >
         <p>Your browser does not support displaying PDFs. <a href="${dataUrl}" download="${fileName}">Download the PDF</a> to view it.</p>
        </iframe>`;
    } else if (fileType.startsWith('audio/')) {
      attachmentContainer.innerHTML = `
        <audio controls style="width: 100%;">
          <source src="${dataUrl}" type="${fileType}">
          Your browser does not support this audio element.
        </audio>`;
    } else if (fileType.startsWith('video/')) {
      attachmentContainer.innerHTML = `
        <video controls style="width: 100%; max-height: 500px;">
          <source src="${dataUrl}" type="${fileType}">
          Your browser does not support this video element.
        </video>`;
    } else {
      const fileSizeKB = fileSize ? (fileSize / 1024).toFixed(2) : 'Unknown';
      attachmentContainer.innerHTML = `
        <div class="no-data">
          <p>${fileName} (${fileSizeKB} KB)</p>
          <p>Preview not available for this file type (${fileType})</p>
          <p>Use the download button to open the file</p>
        </div>`;
    }
  } catch (error) {
    console.error("Error displaying attachment:", error);
    showError(`Error displaying attachment: ${error.message}`);
    attachmentContainer.innerHTML = `<div class="no-data"><p>Error displaying attachment: ${error.message}</p></div>`;
  }
}

async function createAttachmentTabs(attachmentIds) {
  const tabContainer = document.getElementById('tabContainer');
  
  if (!tabContainer) {
    console.error('Tab container not found');
    return;
  }
  
  tabContainer.innerHTML = '';

  if (!attachmentIds || attachmentIds.length === 0) {
    tabContainer.innerHTML = '<div class="no-tabs">No attachments available</div>';
    return;
  }

  // Create tabs with file names
  for (let i = 0; i < attachmentIds.length; i++) {
    const attachmentId = attachmentIds[i].trim();
    if (!attachmentId) continue;
    
    const tab = document.createElement('button');
    tab.classList.add('tab-button');
    tab.dataset.attachmentId = attachmentId;
    
    // Try to get the actual file name
    try {
      const endpoint = `WCE_AttachmentById?Id=%27${encodeURIComponent(attachmentId)}%27&$format=json`;
      const data = await apiService.request('GET', endpoint);
      
      let fileName = `Attachment ${i + 1}`;
      
      if (data && data.d && data.d.results && data.d.results.length > 0) {
        fileName = data.d.results[0].FileName || data.d.results[0].Name || fileName;
      } else if (data && data.d) {
        fileName = data.d.FileName || data.d.Name || fileName;
      }
      
      // Truncate long names
      if (fileName.length > 20) {
        fileName = fileName.substring(0, 17) + '...';
      }
      
      tab.textContent = fileName;
    } catch (error) {
      console.warn(`Could not fetch name for attachment ${attachmentId}:`, error);
      tab.textContent = `Attachment ${i + 1}`;
    }
    
    tab.addEventListener('click', () => {
      loadAttachment(attachmentId);
      setActiveTab(tab);
    });

    tabContainer.appendChild(tab);
  }
}

function setActiveTab(activeTab) {
  const tabs = document.querySelectorAll('.tab-button');
  tabs.forEach(tab => tab.classList.remove('active-tab'));
  activeTab.classList.add('active-tab');
}

function showError(message) {
  const errorElement = document.getElementById('errorMessage');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  }
}

function updatePageTitle() {
  const leadId = sessionStorage.getItem('selectedLeadId');
  const titleElement = document.getElementById('pageTitle');
  
  if (titleElement) {
    if (leadId) {
      titleElement.textContent = `Attachments -  Lead ID: ${leadId}`;
      titleElement.style.color = '#495057';
      titleElement.style.fontSize = '1.2rem';
    } else {
      titleElement.textContent = 'Attachments';
    }
  }
}

async function fetchAttachmentData() {
  const attachmentIdList = sessionStorage.getItem('AttachmentIdList');
  
  if (!attachmentIdList || attachmentIdList.trim() === '') {
    console.error('No AttachmentIdList found in sessionStorage');
    showError('No attachments found.');
    
    setTimeout(() => {
      navigateBack();
    }, 2000);
    return;
  }

  const attachmentIds = attachmentIdList.split(',').filter(id => id.trim() !== '');
  
  if (attachmentIds.length === 0) {
    showError('No valid attachment IDs found.');
    setTimeout(() => {
      navigateBack();
    }, 2000);
    return;
  }

  updatePageTitle();
  await createAttachmentTabs(attachmentIds);
  
  // Load first attachment by default
  if (attachmentIds.length > 0) {
    await loadAttachment(attachmentIds[0]);
    const firstTab = document.querySelector('.tab-button');
    if (firstTab) {
      setActiveTab(firstTab);
    }
  }
}

// Initialize when page loads
window.addEventListener('load', () => {
  fetchAttachmentData();
});

// Setup event listeners
document.addEventListener('DOMContentLoaded', () => {
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', navigateBack);
  }
});