:root {
    --primary-color: #d9613f;
    --background-color: rgb(215, 229, 241);
    --secondary-color: #2d3446;
    --text-color: #2d3446;
    --accent-color: #d9613f;
    --border-color: rgba(45, 52, 70, 0.2);
    --hover-color: rgba(217, 97, 63, 0.1);
    --white: #ffffff;
    --purple: #6c00bd;
    --gray: #6c757d;
    --light-gray: #ccc;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f5f7fa;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* Header styles */
.main-header {
    background: #d9613f;
    color: white;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.logo img {
    height: 40px;
}

.header-right {
    display: flex;
    align-items: center;
}

.logout-button {
    background-color: var(--white);
    color: var(--primary-color);
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 5px 0;
}

.logout-button:hover {
    background-color: rgba(255, 255, 255, 0.9);
}

.sub-header {
    background-color: #f0f2f5;
    padding: 1rem 2rem;
    border-bottom: 1px solid #e0e0e0;
    text-align: center;
}

.head-line {
    font-size: 1.5rem;
    color: #444;
}

.sub-header h3 {
    margin-top: 0;
    font-size: 16px;
}

.sub-header h2 {
    font-size: 1.3rem;
}

.page-title {
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    background-color: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.page-title h2 {
    flex-grow: 1;
    font-size: 1.3rem;
    margin: 0;
    color: #333;
}

.button-group {
    display: flex;
    gap: 10px;
    margin-right: 20px;
}

.action-button {
    background-color: var(--primary-color);
    color: var(--white);
    border: none;
    padding: 0 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 48px;
}

.action-button:disabled {
    background-color: var(--light-gray);
    cursor: not-allowed;
}

.action-button:hover:not(:disabled) {
    background-color: #c55535;
}

/* Dynamics connection wrapper */
.dynamics-connection-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
}

.dynamics-connection-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #666;
    background-color: #f8f9fa;
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid #e9ecef;
}

.status-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

.status-indicator.not-connected {
    background-color: #dc3545;
}

.status-indicator.connecting {
    background-color: #ffc107;
}

.status-indicator.connected {
    background-color: #28a745;
}

.disconnect-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 14px;
    color: #dc3545;
    cursor: pointer;
    transition: all 0.2s ease;
}

.disconnect-btn:hover {
    background-color: #f8d7da;
    border-color: #dc3545;
}

.disconnect-btn svg {
    color: #dc3545;
}

.dynamics-config-button {
    display: inline-flex;
    align-items: center;
    background-color: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 14px;
    color: #555;
    cursor: pointer;
    transition: all 0.2s ease;
}

.dynamics-config-button:hover {
    background-color: #e9ecef;
}

.dynamics-config-button svg {
    margin-right: 6px;
}

/* Container */
.container {
    flex: 1;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
}

/* Configuration and Auth notices */
.config-required-notice,
.auth-required-notice {
    display: flex;
    align-items: center;
    background-color: #fff3cd;
    border: 1px solid #ffeeba;
    border-left: 4px solid #ffc107;
    border-radius: 4px;
    padding: 16px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.notice-icon {
    color: #0078d4;
    margin-right: 16px;
    flex-shrink: 0;
}

.notice-content,
.auth-required-notice-content {
    flex-grow: 1;
}

.notice-content h3,
.auth-required-notice-content h4 {
    color: #856404;
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
}

.notice-content p,
.auth-required-notice-content p {
    color: #856404;
    margin: 0;
    font-size: 14px;
}

.configure-now-btn,
.auth-now-btn {
    background-color: #ffc107;
    color: #212529;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-weight: 500;
    white-space: nowrap;
    margin-left: 16px;
    transition: background-color 0.2s;
}

.configure-now-btn:hover,
.auth-now-btn:hover {
    background-color: #e0a800;
}

/* Lead Preview */
.lead-preview {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    margin-bottom: 2rem;
}

.preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e0e0e0;
}

.preview-header h3 {
    font-size: 1.2rem;
    color: #333;
}

.source-info {
    font-size: 0.9rem;
    color: #666;
}

.lead-data {
    margin-bottom: 1.5rem;
}

.lead-data .loading {
    text-align: center;
    padding: 2rem;
    color: #666;
}

.lead-data .no-data {
    text-align: center;
    padding: 2rem;
    color: #999;
    font-style: italic;
}

/* Lead info grid - Same as Salesforce */
.lead-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.lead-field {
    background: #f8f9fa;
    border-radius: 6px;
    padding: 12px;
    border-left: 3px solid #e9ecef;
}

.lead-field.priority {
    border-left-color: #0078d4;
    background: #f0f8ff;
}

.field-label {
    font-size: 0.75rem;
    color: #6c757d;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 6px;
    letter-spacing: 0.5px;
}

.field-value {
    color: #495057;
    font-weight: 500;
    word-break: break-word;
    min-height: 20px;
    display: flex;
    align-items: center;
}

/* Attachments Section - Same style as Salesforce */
.attachments-preview {
    margin-top: 30px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;
}

.attachments-preview h4 {
    margin: 0 0 15px 0;
    color: #495057;
    font-size: 1.1rem;
    font-weight: 600;
    padding-bottom: 10px;
    border-bottom: 1px solid #dee2e6;
}

.attachments-list {
    list-style-type: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.attachment-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.attachment-item:hover {
    border-color: #0078d4;
    box-shadow: 0 2px 4px rgba(0, 120, 212, 0.1);
}

.attachment-icon {
    margin-right: 12px;
    color: #0078d4;
    flex-shrink: 0;
}

.attachment-icon svg {
    width: 20px;
    height: 20px;
}

.attachment-details {
    flex: 1;
    min-width: 0;
}

.attachment-name {
    font-weight: 500;
    color: #495057;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.attachment-meta {
    font-size: 0.875rem;
    color: #6c757d;
}

.attachments-summary {
    margin-top: 15px;
    font-style: italic;
    color: #666;
    font-size: 13px;
    text-align: right;
}

.no-attachments {
    text-align: center;
    padding: 40px 20px;
    color: #6c757d;
    font-style: italic;
}

.no-attachments svg {
    margin-bottom: 10px;
    color: #6c757d;
}

/* Action panel */
.action-panel {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e0e0e0;
}

.transfer-btn {
    background-color: #0d6efd;
    color: white;
    padding: 12px 24px;
    border-radius: 4px;
    border: none;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: background-color 0.3s ease;
    font-size: 14px;
}

.transfer-btn:hover:not(:disabled) {
    background-color: #0b5ed7;
}

.transfer-btn:disabled {
    background-color: #a9c4f5;
    cursor: not-allowed;
}

.transfer-btn.ready {
    background-color: #28a745;
}

.transfer-btn.ready:hover {
    background-color: #218838;
}

/* Validation styles */
.status-warning {
    display: flex;
    align-items: flex-start;
    background-color: #fff3cd;
    border: 1px solid #ffeeba;
    border-left: 4px solid #ffc107;
    border-radius: 4px;
    padding: 12px 15px;
    margin-bottom: 15px;
    color: #664d03;
}

.status-icon {
    margin-right: 10px;
    flex-shrink: 0;
}

/* Transfer Results */
.transfer-results {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
}

.transfer-results h3 {
    font-size: 1.2rem;
    color: #333;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e0e0e0;
}

.transfer-status {
    padding: 1rem;
}

.transfer-progress {
    display: flex;
    align-items: center;
    color: #0078d4;
    padding: 12px 15px;
    background-color: #cfe2ff;
    border-radius: 4px;
    margin-bottom: 15px;
}

.transfer-success {
    display: flex;
    align-items: flex-start;
    color: #0f5132;
    padding: 12px 15px;
    background-color: #d1e7dd;
    border-radius: 4px;
    margin-bottom: 15px;
}

.transfer-error {
    display: flex;
    align-items: flex-start;
    color: #842029;
    padding: 12px 15px;
    background-color: #f8d7da;
    border-radius: 4px;
    margin-bottom: 15px;
}

.success-icon,
.error-icon {
    margin-right: 10px;
    flex-shrink: 0;
}

.success-content,
.error-content {
    flex-grow: 1;
}

.success-content h4,
.error-content h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
}

.transfer-details {
    margin: 10px 0;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
}

.transfer-details p {
    margin: 5px 0;
    font-size: 0.875rem;
}

.transfer-message {
    font-style: italic;
    color: #6c757d;
}

/* Loading spinner */
.spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid rgba(0, 120, 212, 0.3);
    border-radius: 50%;
    border-top-color: #0078d4;
    animation: spin 1s ease-in-out infinite;
    margin-right: 10px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.progress-message {
    font-weight: 500;
}

/* User info styles */
.user-info-container {
    margin-top: 10px;
    padding: 8px 10px;
    background-color: rgba(0, 120, 212, 0.08);
    border-radius: 4px;
    max-width: 300px;
}

.user-info {
    display: flex;
    align-items: center;
    font-size: 14px;
}

.user-avatar {
    margin-right: 8px;
    color: var(--primary-color);
}

.user-details {
    flex-grow: 1;
}

.user-name {
    font-weight: bold;
    color: var(--primary-color);
}

.user-email {
    font-size: 12px;
    color: #666;
    margin-top: 2px;
}

/* Error message */
.error-message {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #dc3545;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    max-width: 80%;
    text-align: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    animation: fadeIn 0.3s ease;
    z-index: 1000;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, 20px); }
    to { opacity: 1; transform: translate(-50%, 0); }
}

/* Modal styles */
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1050;
    overflow-y: auto;
    animation: modalFadeIn 0.3s ease;
}

@keyframes modalFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.modal-content {
    position: relative;
    background-color: #fff;
    margin: 5% auto;
    padding: 20px;
    width: 90%;
    max-width: 600px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    animation: modalSlideIn 0.3s ease-out;
    max-height: 90vh;
    overflow-y: auto;
}

@keyframes modalSlideIn {
    from {
        transform: translateY(-50px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 15px;
    border-bottom: 1px solid #e9ecef;
    margin-bottom: 15px;
}

.modal-header h3 {
    margin: 0;
    color: #212529;
    font-size: 20px;
}

.close-modal {
    color: #aaa;
    font-size: 24px;
    font-weight: bold;
    cursor: pointer;
    transition: color 0.2s;
    background: none;
    border: none;
}

.close-modal:hover {
    color: #555;
}

/* Form elements in modal */
.modal-body .form-group {
    margin-bottom: 16px;
}

.modal-body label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #333;
    font-weight: bold;
}

.modal-body input,
.modal-body select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 14px;
}

.modal-body input:focus,
.modal-body select:focus {
    border-color: #80bdff;
    outline: 0;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.field-required::after {
    content: " *";
    color: #dc3545;
}

.help-text {
    display: block;
    margin-top: 4px;
    color: #6c757d;
    font-size: 13px;
}

.help-section {
    margin: 12px 0;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #e9ecef;
}

.help-section summary {
    color: #007bff;
    cursor: pointer;
    font-weight: 500;
    padding: 5px 0;
}

.help-section summary:hover {
    color: #0056b3;
}

.help-content {
    margin-top: 10px;
    padding-left: 20px;
}

.help-content ol {
    margin: 0;
    padding-left: 20px;
}

.help-content li {
    margin-bottom: 5px;
}

.config-description {
    margin-bottom: 16px;
    color: #555;
    line-height: 1.5;
}

.modal-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid #e9ecef;
}

.status-message {
    padding: 8px 0;
    font-size: 14px;
    transition: opacity 0.3s ease;
    margin-right: auto;
}

.status-message.status-success {
    color: #28a745;
}

.status-message.status-error {
    color: #dc3545;
}

.status-message.status-progress {
    color: #0078d4;
}

/* Button styles */
.btn-primary {
    background-color: #007bff;
    border-color: #007bff;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    border: none;
    font-weight: 500;
}

.btn-primary:hover {
    background-color: #0069d9;
    border-color: #0062cc;
}

.btn-secondary {
    background-color: #6c757d;
    border-color: #6c757d;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    border: none;
    font-weight: 500;
    margin-right: 10px;
}

.btn-secondary:hover {
    background-color: #5a6268;
    border-color: #545b62;
}

.btn-secondary:disabled {
    background-color: #adb5bd;
    border-color: #adb5bd;
    cursor: not-allowed;
}

.small {
    font-size: 12px;
}

/* Responsive design */
@media (max-width: 768px) {
    .page-title {
        flex-direction: column;
        align-items: flex-start;
        padding: 1rem;
        gap: 15px;
    }
    
    .page-title h2 {
        width: 100%;
        margin-bottom: 10px;
    }
    
    .dynamics-connection-wrapper {
        width: 100%;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }
    
    .dynamics-connection-status {
        width: 100%;
        justify-content: center;
    }
    
    .disconnect-btn, 
    .dynamics-config-button {
        width: 100%;
        margin-left: 0;
        justify-content: center;
    }
    
    .button-group {
        width: 100%;
        margin-right: 0;
    }
    
    .action-button {
        width: 100%;
    }
    
    .user-info-container {
        width: 100%;
        max-width: 100%;
    }
    
    .transfer-btn {
        width: 100%;
        justify-content: center;
    }
    
    .modal-content {
        width: 95%;
        margin: 2% auto;
    }
    
    .config-required-notice,
    .auth-required-notice {
        flex-direction: column;
        text-align: center;
    }
    
    .notice-icon {
        margin-right: 0;
        margin-bottom: 12px;
    }
    
    .configure-now-btn,
    .auth-now-btn {
        margin-top: 12px;
        margin-left: 0;
    }
    
    .lead-info-grid {
        grid-template-columns: 1fr;
    }
    
    .attachments-preview {
        margin-top: 20px;
        padding: 15px;
    }
    
    .attachment-item {
        padding: 10px 12px;
    }
    
    .attachment-name {
        font-size: 0.9rem;
    }
}

@media (max-width: 480px) {
    .disconnect-btn, 
    .dynamics-config-button, 
    .action-button {
        padding: 12px 16px;
        font-size: 16px;
    }
    
    .dynamics-connection-status {
        padding: 10px 14px;
        font-size: 15px;
    }
}



/* Display WCE Lead Transfer Dynamics CSS */


/* Override and extend styles for transfer page */
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

/* Page Title Section */
.page-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.page-title h2 {
    color: #0078d4;
    margin: 0;
    flex: 1;
    text-align: center;
}

.button-group {
    display: flex;
    gap: 10px;
}

/* Dynamics Connection Wrapper */
.dynamics-connection-wrapper {
    display: flex;
    align-items: center;
    gap: 15px;
}

.dynamics-connection-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #333;
}

.status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
}

.status-indicator.not-connected {
    background: #d13438;
}

.status-indicator.configured {
    background: #ff8c00;
}

.status-indicator.connected {
    background: #107c10;
}

/* Button Styles */
.dynamics-config-button,
.disconnect-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.3s ease;
}

.dynamics-config-button {
    background: #0078d4;
    color: white;
}

.dynamics-config-button:hover {
    background: #106ebe;
}

.disconnect-btn {
    background: #d13438;
    color: white;
}

.disconnect-btn:hover {
    background: #b02a2e;
}

/* Configuration Required Notice */
.config-required-notice,
.auth-required-notice {
    display: flex;
    align-items: center;
    gap: 15px;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    color: #856404;
}

.auth-required-notice {
    background: #d1ecf1;
    border-color: #bee5eb;
    color: #0c5460;
}

.notice-icon {
    flex-shrink: 0;
    color: #ff8c00;
}

.auth-required-notice .notice-icon {
    color: #0078d4;
}

.notice-content,
.auth-required-notice-content {
    flex: 1;
}

.notice-content h3,
.auth-required-notice-content h4 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
}

.notice-content p,
.auth-required-notice-content p {
    margin: 0;
    font-size: 14px;
}

.configure-now-btn,
.auth-now-btn {
    background: #ff8c00;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.3s ease;
}

.auth-now-btn {
    background: #0078d4;
}

.configure-now-btn:hover {
    background: #e07600;
}

.auth-now-btn:hover {
    background: #106ebe;
}

/* Lead Preview Section */
.lead-preview {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 20px;
}

.preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 20px 0 20px;
    border-bottom: 1px solid #e1e1e1;
    margin-bottom: 20px;
}

.preview-header h3 {
    color: #0078d4;
    margin: 0;
}

.source-info {
    font-size: 14px;
    color: #666;
}

.source-info span:first-child {
    font-weight: 600;
}

.source-info span:last-child {
    color: #0078d4;
    font-weight: 500;
}

/* Lead Data Display */
.lead-data {
    padding: 0 20px 20px 20px;
}

.lead-fields-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
}

.field-item {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 6px;
    border-left: 4px solid #0078d4;
}

.field-item.full-width {
    grid-column: 1 / -1;
}

.field-label {
    font-weight: 600;
    color: #333;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    display: block;
}

.field-value {
    color: #555;
    font-size: 14px;
    line-height: 1.4;
    word-wrap: break-word;
}

.field-value.long-text {
    line-height: 1.6;
    white-space: pre-line;
}

/* Attachments Section */
.attachments-section {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #e1e1e1;
}

.attachments-section h4 {
    color: #0078d4;
    margin-bottom: 15px;
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.attachments-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 12px;
    margin-bottom: 15px;
}

.attachment-item {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #f8f9fa;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #e1e1e1;
    transition: background 0.2s ease;
}

.attachment-item:hover {
    background: #e9ecef;
}

.attachment-icon {
    font-size: 24px;
    flex-shrink: 0;
}

.attachment-info {
    flex: 1;
    min-width: 0;
}

.attachment-name {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
}

.attachment-size {
    font-size: 12px;
    color: #666;
}

.attachment-note {
    font-size: 13px;
    color: #666;
    font-style: italic;
    margin: 0;
    text-align: center;
}

/* Action Panel */
.action-panel {
    padding: 20px;
    border-top: 1px solid #e1e1e1;
    background: #f8f9fa;
    border-radius: 0 0 8px 8px;
    text-align: center;
}

.transfer-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #107c10;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 200px;
    justify-content: center;
}

.transfer-btn:hover:not(:disabled) {
    background: #0e6e0e;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 124, 16, 0.3);
}

.transfer-btn:disabled {
    background: #666;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

/* Transfer Results */
.transfer-results {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    padding: 20px;
}

.transfer-results h3 {
    color: #0078d4;
    margin-bottom: 20px;
}

.transfer-progress {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 6px;
}

.spinner {
    border: 3px solid #f3f3f3;
    border-top: 3px solid #0078d4;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
    flex-shrink: 0;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.progress-text {
    font-size: 14px;
    color: #333;
}

.transfer-success {
    display: flex;
    gap: 20px;
    align-items: flex-start;
}

.success-icon {
    font-size: 48px;
    flex-shrink: 0;
}

.success-content {
    flex: 1;
}

.success-content h4 {
    color: #107c10;
    margin: 0 0 15px 0;
    font-size: 18px;
}

.transfer-details {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 20px;
}

.transfer-details p {
    margin: 8px 0;
    font-size: 14px;
    color: #333;
}

.transfer-details strong {
    color: #0078d4;
}

.attachment-transfer-info {
    background: #e3f2fd;
    padding: 10px;
    border-radius: 4px;
    color: #0078d4;
    font-size: 13px;
    margin: 8px 0;
}

.transfer-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #0078d4;
    color: white;
    text-decoration: none;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.3s ease;
}

.btn-primary:hover {
    background: #106ebe;
    text-decoration: none;
    color: white;
}

/* Validation Summary */
.status-warning {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 20px;
    color: #856404;
}

.status-icon {
    flex-shrink: 0;
    margin-top: 2px;
}

.status-warning strong {
    color: #856404;
    font-size: 14px;
    margin-bottom: 8px;
    display: block;
}

.status-warning ul {
    margin: 0;
    padding-left: 20px;
}

.status-warning li {
    font-size: 13px;
    margin-bottom: 4px;
}

/* Loading State */
.loading {
    text-align: center;
    padding: 40px 20px;
    color: #666;
    font-style: italic;
}

.loading::before {
    content: "";
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #0078d4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 10px;
    vertical-align: middle;
}

.no-data {
    text-align: center;
    padding: 40px 20px;
    color: #999;
    font-style: italic;
}

/* Error and Success Messages */
.error-message {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: 6px;
    padding: 15px;
    margin: 20px 0;
    font-size: 14px;
    display: none;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.error-message.show {
    opacity: 1;
}

.success-message {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
    border-radius: 6px;
    padding: 15px 20px;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    max-width: 350px;
    display: none;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.success-message.show {
    opacity: 1;
}

/* Modal Styles - Enhanced from base */
.modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    backdrop-filter: blur(2px);
}

.modal-content {
    background-color: white;
    margin: 3% auto;
    padding: 0;
    border-radius: 8px;
    width: 90%;
    max-width: 700px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
    from {
        opacity: 0;
        transform: translateY(-30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.modal-header {
    background: #0078d4;
    color: white;
    padding: 20px;
    border-radius: 8px 8px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
    color: white;
    font-size: 18px;
}

.close-modal {
    color: white;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
    line-height: 1;
    transition: opacity 0.2s ease;
}

.close-modal:hover {
    opacity: 0.7;
}

.modal-body {
    padding: 25px;
}

.config-description {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 25px;
    border-left: 4px solid #0078d4;
    font-size: 14px;
    line-height: 1.5;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;
    color: #333;
    font-size: 14px;
}

.field-required::after {
    content: " *";
    color: #d13438;
}

.form-group input {
    width: 100%;
    padding: 12px;
    border: 2px solid #e1e1e1;
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.3s ease;
    box-sizing: border-box;
}

.form-group input:focus {
    outline: none;
    border-color: #0078d4;
    box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.1);
}

.help-text {
    font-size: 12px;
    color: #666;
    margin-top: 5px;
    line-height: 1.4;
}

.help-section {
    margin: 25px 0;
    border-top: 1px solid #e1e1e1;
    padding-top: 20px;
}

.help-section details {
    background: #f8f9fa;
    border-radius: 6px;
    padding: 15px;
    border: 1px solid #e9ecef;
}

.help-section summary {
    cursor: pointer;
    font-weight: 600;
    color: #0078d4;
    margin-bottom: 15px;
    user-select: none;
    outline: none;
}

.help-section summary:hover {
    color: #106ebe;
}

.help-content {
    margin-top: 15px;
    font-size: 14px;
    line-height: 1.5;
}

.help-content ol {
    padding-left: 20px;
    counter-reset: step-counter;
}

.help-content li {
    margin-bottom: 12px;
    counter-increment: step-counter;
}

.help-content ul {
    margin: 8px 0;
    padding-left: 20px;
}

.help-content ul li {
    margin-bottom: 6px;
    list-style-type: disc;
}

.help-content a {
    color: #0078d4;
    text-decoration: none;
}

.help-content a:hover {
    text-decoration: underline;
}

.modal-footer {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 0 0 8px 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #e1e1e1;
}

.status-message {
    font-size: 14px;
    padding: 8px 12px;
    border-radius: 4px;
    margin-right: 15px;
    flex: 1;
}

.status-success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.status-error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.status-info {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
}

.status-warning {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
}

.btn-secondary {
    background: #6c757d;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    margin-right: 10px;
    transition: background 0.3s ease;
}

.btn-secondary:hover {
    background: #5a6268;
}

/* User Info Container */
.user-info-container {
    position: fixed;
    top: 80px;
    right: 20px;
    background: white;
    border: 1px solid #e1e1e1;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999;
    max-width: 300px;
}

.user-info-container h4 {
    margin: 0 0 10px 0;
    color: #0078d4;
    font-size: 14px;
}

.user-info-details {
    font-size: 13px;
    color: #333;
}

.user-info-details p {
    margin: 5px 0;
}

/* Responsive Design */
@media (max-width: 1024px) {
    .page-title {
        flex-direction: column;
        gap: 15px;
        text-align: center;
    }
    
    .dynamics-connection-wrapper {
        justify-content: center;
        flex-wrap: wrap;
    }
    
    .lead-fields-grid {
        grid-template-columns: 1fr;
    }
    
    .attachments-list {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .container {
        padding: 15px;
    }
    
    .page-title {
        padding: 15px;
    }
    
    .lead-preview {
        margin-bottom: 15px;
    }
    
    .lead-data {
        padding: 15px;
    }
    
    .action-panel {
        padding: 15px;
    }
    
    .transfer-btn {
        width: 100%;
    }
    
    .modal-content {
        width: 95%;
        margin: 2% auto;
    }
    
    .modal-body {
        padding: 20px 15px;
    }
    
    .config-required-notice,
    .auth-required-notice {
        flex-direction: column;
        text-align: center;
        gap: 10px;
    }
    
    .success-message {
        position: fixed;
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
    }
}

@media (max-width: 480px) {
    .page-title h2 {
        font-size: 18px;
    }
    
    .dynamics-connection-wrapper {
        flex-direction: column;
        align-items: center;
        gap: 10px;
    }
    
    .dynamics-config-button,
    .disconnect-btn {
        width: 100%;
        justify-content: center;
    }
    
    .transfer-success {
        flex-direction: column;
        text-align: center;
    }
    
    .transfer-actions {
        justify-content: center;
    }
}