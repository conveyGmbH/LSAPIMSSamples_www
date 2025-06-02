import ApiService from '../services/apiService.js';
import { clearTable, formatDate, parseDate, escapeODataValue, formatDateForOData } from '../utils/helper.js';

// Retrieve server information from sessionStorage
const serverName = sessionStorage.getItem('serverName');
const apiName = sessionStorage.getItem('apiName');
const credentials = sessionStorage.getItem('credentials');

/* Dynamic entity configuration.
 * Defines display names for fields, selectable entities, and date fields.
 */
const entityConfig = {
  activatingEntities: ['WCE_Event'], 
  defaultEntity: 'WCE_Country',      

  // User-friendly display names for columns
  displayNames: {
    'UserId': 'User ID',
    'EventId': 'Event ID',
    'LeadId': 'Lead ID',
    'CountryId': 'Country ID',
    'DisplayName': 'Name',
    'FirstName': 'First Name',
    'LastName': 'Last Name',
    'CreatedOn': 'Created Date',
    'ModifiedOn': 'Modified Date',
    'StartDate': 'Start Date',
    'EndDate': 'End Date',
    'Description': 'Description',
    'Type': 'Type',
    'EventSubtype': 'Event Subtype',
    'Email': 'Email',
    'Phone': 'Phone',
    'MobilePhone': 'Mobile Phone',
    'CompanyName': 'Company',
    'JobTitle': 'Job Title',
    'PostalCode': 'Postal Code',
    'City': 'City',
    'Country': 'Country',
    'CountryISOCode': 'Country Code',
    'Street': 'Street',
    'Topic': 'Topic'
  },

  // Fields that should be formatted as dates
  dateFields: ['CreatedOn', 'ModifiedOn', 'StartDate', 'EndDate', 'SystemModstamp', 'ModifiedBySystemOn']
};

/**
 * Filter configurations for specific entities.
 * Defines which fields are filterable and their type.
 */
const filterConfigs = {
  WCE_User: [
    { field: 'UserId', displayName: 'ID', type: 'text' },
    { field: 'FirstName', displayName: 'First Name', type: 'text' },
    { field: 'LastName', displayName: 'Last Name', type: 'text' },
    { field: 'EventId', displayName: 'Event ID', type: 'text' }
  ],
  WCE_Event: [
    { field: 'EventId', displayName: 'ID', type: 'text' },
    { field: 'DisplayName', displayName: 'Subject', type: 'text' },
    { field: 'StartDate', displayName: 'Start Date', type: 'date' },
    { field: 'EndDate', displayName: 'End Date', type: 'date' }
  ],
  WCE_Lead: [
    { field: 'LeadId', displayName: 'ID', type: 'text' },
    { field: 'FirstName', displayName: 'First Name', type: 'text' },
    { field: 'LastName', displayName: 'Last Name', type: 'text' },
    { field: 'CompanyName', displayName: 'Company', type: 'text' },
    { field: 'EventId', displayName: 'Event ID', type: 'text' },
    { field: 'CreatedOn', displayName: 'Created Date', type: 'date' }
  ]
};

/**
 * Global application state.
 * Manages UI state, selected items, and dynamic configurations.
 */
let state = {
  currentEntity: '',
  selectedEventId: null,
  lastSortedColumn: null,
  lastSortDirection: 'asc',
  nextUrl: '',
  columnWidths: {}, // Dynamic column widths per entity
  columnOrder: {},  // Dynamic column order per entity
  hiddenColumns: {} // Columns to hide per entity
};

// Redirect to login page if credentials are missing
if (!serverName || !apiName || !credentials) {
  window.location.href = '/index.html';
}

// Initialize the API service
const apiService = new ApiService(serverName, apiName);

/**
 * Initializes the application: loads state, sets up events, fetches data.
 */
function init() {
  loadAppState();
  populateApiSelector();

  // Event listener for 'View Leads' button
  document.getElementById("viewLeadsButton").addEventListener("click", () => {
    if (state.selectedEventId) {
      sessionStorage.setItem("selectedEventId", state.selectedEventId);
      window.location.href = "displayWceLead.html";
    } else {
      alert("Please select an event first.");
    }
  });

  // Event listener for 'Next' pagination button
  const nextButton = document.getElementById('nextButton');
  if (nextButton) {
    nextButton.addEventListener('click', loadNextRows);
    nextButton.disabled = true; // Initially disabled
  }
}

/**
 * Loads application state (column widths, order, hidden columns, selected entity) from localStorage.
 */
function loadAppState() {
  try {
    const savedColumnWidths = localStorage.getItem('columnWidths');
    if (savedColumnWidths) {
      state.columnWidths = JSON.parse(savedColumnWidths);
    }

    const savedColumnOrder = localStorage.getItem('columnOrder');
    if (savedColumnOrder) {
      state.columnOrder = JSON.parse(savedColumnOrder);
    }

    const savedHiddenColumns = localStorage.getItem('hiddenColumns');
    if (savedHiddenColumns) {
      state.hiddenColumns = JSON.parse(savedHiddenColumns);
    }

    const lastSelectedEntity = localStorage.getItem('selectedEntity');
    if (lastSelectedEntity) {
      state.currentEntity = lastSelectedEntity;
    }

    state.selectedEventId = sessionStorage.getItem('selectedEventId');
  } catch (error) {
    console.error('Error loading app state:', error);
    // Reset to default state if loading fails
    state.columnWidths = {};
    state.columnOrder = {};
    state.hiddenColumns = {};
  }
}

/* Saves current application state to localStorage. */
function saveAppState() {
  try {
    localStorage.setItem('columnWidths', JSON.stringify(state.columnWidths));
    localStorage.setItem('columnOrder', JSON.stringify(state.columnOrder));
    localStorage.setItem('hiddenColumns', JSON.stringify(state.hiddenColumns));

    if (state.currentEntity) {
      localStorage.setItem('selectedEntity', state.currentEntity);
    }

    if (state.selectedEventId) {
      sessionStorage.setItem('selectedEventId', state.selectedEventId);
    }
  } catch (error) {
    console.error('Error saving app state:', error);
  }
}

/* Adjusts page layout for responsive design.*/
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

/* Enhances table responsiveness by adding horizontal scrolling and dynamic sizing. */
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
      //table.style.minWidth = 'max-content';
    }
  } else {
    tableBody.style.minHeight = '300px';
    tableBody.style.overflowX = 'auto';

    const table = tableBody.querySelector('table');
    if (table) {
      table.style.tableLayout = 'auto';
      //table.style.width = 'max-content';
      table.style.minWidth = '100%';
    }
  }

  // Add dynamic CSS for table styling
  let style = document.getElementById('dynamic-table-styles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'dynamic-table-styles';
    document.head.appendChild(style);
  }
  style.textContent = `
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
}


/* Populates the API entity selector dropdown. */
async function populateApiSelector() {
  try {
    const response = await apiService.request('GET', '?$format=json');

    if (response && response.d && response.d.EntitySets) {
      const entities = response.d.EntitySets;
      const selector = document.getElementById('apiSelector');

      selector.innerHTML = '<option value="">Select an entity</option>';

      // Filter to only include the three specified entities
      const allowedEntities = ['WCE_Country', 'WCE_Event', 'WCE_User'];

      entities.forEach(entity => {
        if (allowedEntities.includes(entity)) {
          const option = document.createElement('option');
          option.value = entity;
          option.textContent = entity;
          selector.appendChild(option);
        }
      });

      selector.addEventListener('change', updateData);

      // Select previously chosen entity or default
      const lastSelectedEntity = localStorage.getItem('selectedEntity');
      if (lastSelectedEntity && allowedEntities.includes(lastSelectedEntity)) {
        selector.value = lastSelectedEntity;
      }
      else if (entities.includes(entityConfig.defaultEntity) && allowedEntities.includes(entityConfig.defaultEntity)) {
        selector.value = entityConfig.defaultEntity;
      }
      else if (allowedEntities.length > 0) {
        selector.value = allowedEntities[0];
      }

      updateData();
    } else {
      console.error('Unable to retrieve entity list from the API.');
      apiService.showError('Unable to load the list of entities.');
    }
  } catch (error) {
    console.error('Error retrieving entity list:', error);
    apiService.showError('Error loading the list of entities.');
  }
}

/* Fetches and displays data based on the selected entity. */
async function updateData() {
  const selector = document.getElementById('apiSelector');
  const selectedEntity = selector.value;

  if (state.currentEntity !== selectedEntity) {
    state.selectedEventId = null;
    sessionStorage.removeItem('selectedEventId');
    updateButtonState(false);
  }

  state.currentEntity = selectedEntity;
  saveAppState();

  const filterInputs = document.getElementById('filterInputs');
  filterInputs.innerHTML = '';
  filterInputs.style.display = 'none';

  clearTable();

  const noDataMessage = document.getElementById('noDataMessage');
  noDataMessage.textContent = '';

  const isActivatingEntity = entityConfig.activatingEntities.includes(state.currentEntity);
  const hasSelection = state.selectedEventId !== null;
  updateButtonState(isActivatingEntity && hasSelection);

  if (selectedEntity) {
    if (filterConfigs[selectedEntity]) {
      displayFilterInputs(selectedEntity);
    }

    const endpoint = `${selectedEntity}?$format=json`;
    try {
      const data = await apiService.request('GET', endpoint);

      if (data && data.d && data.d.results && data.d.results.length > 0) {
        calculateColumnWidths(data.d.results, selectedEntity);
        displayData(data.d.results);

        state.nextUrl = apiService.getNextUrl(data);

        const nextButton = document.getElementById('nextButton');
        if (nextButton) {
          nextButton.disabled = !state.nextUrl;
        }
      } else {
        displayData([]);
        noDataMessage.textContent = 'No data available.';
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      noDataMessage.textContent = 'Error fetching data.';
    }
  } else {
    noDataMessage.textContent = 'Please select an entity.';
  }

  initSearch();
}

/**
 * Calculates optimal column widths based on the content of the data.
 */
function calculateColumnWidths(data, entity) {
  if (!data || data.length === 0) return;

  state.columnWidths[entity] = state.columnWidths[entity] || {};
  state.columnOrder[entity] = state.columnOrder[entity] || [];
  state.hiddenColumns[entity] = state.hiddenColumns[entity] || [];

  // hide columns that are not need to be displayed
  const allColumns = Object.keys(data[0]).filter(column =>
    column !== '__metadata' && !column.endsWith('ViewId') && !column.endsWith('VIEWID')
  );

  if (state.columnOrder[entity].length === 0) {
    const priorityFields = ['Id', 'Name', 'DisplayName', 'FirstName', 'LastName'];
    state.columnOrder[entity] = [
      ...priorityFields.filter(field => allColumns.includes(field)),
      ...allColumns.filter(field => !priorityFields.includes(field))
    ];
  }

  allColumns.forEach(column => {
    if (state.columnWidths[entity][column]) return;

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
      width = Math.max(maxContentLength * 8, 400);
    } else if (column.includes('Name') || column.includes('Title') || column.includes('Description')) {
      width = Math.max(maxContentLength * 8, 200);
      width = Math.min(width, 600);
    } else if (column.includes('Date')) {
      width = 200;
    } else if (column.includes('Email')) {
      width = Math.max(maxContentLength * 8, 300);
    } else {
      width = Math.max(maxContentLength * 8, 150);
      width = Math.min(width, 500);
    }

    state.columnWidths[entity][column] = `${width}px`;
  });

  saveAppState();
}

/* Displays filter input fields for the selected entity. */
function displayFilterInputs(entity) {
  if (!entity) return;

  const filterConfig = filterConfigs[entity];
  if (!filterConfig) {
    console.log(`No filter configuration found for ${entity}, skipping filter display`);
    return;
  }

  const filterInputs = document.getElementById('filterInputs');
  filterInputs.style.display = 'flex';
  filterInputs.innerHTML = '';
  filterInputs.className = 'filter-container';

  const storedFilters = JSON.parse(localStorage.getItem(`${entity}_Filters`)) || {};
  const hasActiveFiltersWithValues = Object.values(storedFilters).some(value => value && value.trim() !== '');

  filterConfig.forEach(fieldConfig => {
    const { field, displayName, type } = fieldConfig;

    const inputGroup = document.createElement('div');
    inputGroup.classList.add('input-group-float');
    inputGroup.id = `input-group-${field.toLowerCase()}`;

    const input = document.createElement('input');
    input.id = `filter-${field}`;
    input.classList.add('filter-input');
    input.placeholder = " ";

    if (type === 'date') {
      input.type = 'date';
    } else {
      input.type = 'text';
    }

    const label = document.createElement('label');
    label.setAttribute('for', `filter-${field}`);
    label.textContent = displayName;

    if (storedFilters[field]) {
      input.value = storedFilters[field];
      if (input.type === 'date') {
        inputGroup.classList.add('has-value');
      }
    }

    input.addEventListener('input', () => {
      updateResetButtonState(entity);
      if (input.type === 'date') {
        if (input.value) {
          inputGroup.classList.add('has-value');
        } else {
          inputGroup.classList.remove('has-value');
        }
      }
    });

    inputGroup.appendChild(input);
    inputGroup.appendChild(label);
    filterInputs.appendChild(inputGroup);
  });

  // Create filter action buttons
  const buttonGroup = document.createElement('div');
  buttonGroup.classList.add('filter-buttons');

  const applyButton = document.createElement('button');
  applyButton.textContent = 'Apply Filters';
  applyButton.classList.add('filter-button');
  applyButton.addEventListener('click', () => applyFilters(entity));
  buttonGroup.appendChild(applyButton);

  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset Filters';
  resetButton.classList.add('filter-button', 'reset-button');
  resetButton.id = 'resetFiltersButton';
  resetButton.disabled = !hasActiveFiltersWithValues;
  resetButton.addEventListener('click', () => resetFilters(entity));
  buttonGroup.appendChild(resetButton);

  filterInputs.appendChild(buttonGroup);
  updateResetButtonState(entity);
}

/* Updates the disabled state of the 'Reset Filters' button. */
function updateResetButtonState(entity) {
  const resetButton = document.getElementById('resetFiltersButton');
  if (!resetButton) return;

  const filterConfig = filterConfigs[entity] || [];

  const hasValue = filterConfig.some(fieldConfig => {
    const input = document.getElementById(`filter-${fieldConfig.field}`);
    return input && input.value && input.value.trim() !== '';
  });

  resetButton.disabled = !hasValue;
}

/* Resets all filter inputs and clears saved filters, then re-fetches data. */
function resetFilters(entity) {
  localStorage.removeItem(`${entity}_Filters`);

  const filterConfig = filterConfigs[entity] || [];

  filterConfig.forEach(fieldConfig => {
    const input = document.getElementById(`filter-${fieldConfig.field}`);
    if (input) {
      input.value = '';
    }
  });

  const resetButton = document.getElementById('resetFiltersButton');
  if (resetButton) {
    resetButton.disabled = true;
  }

  updateData();
}

/* Applies the currently set filters and re-fetches data. */
async function applyFilters(entity) {
  if (!filterConfigs[entity]) {
    console.error(`No filter configuration found for ${entity}`);
    return;
  }

  const filterConfig = filterConfigs[entity];
  const filters = {};
  let hasFilters = false;

  filterConfig.forEach((fieldConfig) => {
    const element = document.getElementById(`filter-${fieldConfig.field}`);
    if (!element) {
      console.error(`Element filter-${fieldConfig.field} not found`);
      return;
    }

    const value = element.value.trim();

    if (value) {
      filters[fieldConfig.field] = value;
      hasFilters = true;
    }
  });

  localStorage.setItem(`${entity}_Filters`, JSON.stringify(filters));

  if (!hasFilters) {
    return updateData();
  }

  const filterParts = [];

  // Add EventId filter if available for relevant entities
  if (entity === "WCE_User" || entity === "WCE_Lead") {
    const eventId = sessionStorage.getItem('selectedEventId');
    if (eventId) {
      filterParts.push(`EventId eq '${escapeODataValue(eventId)}'`);
    }
  }

  filterConfig.forEach(fieldConfig => {
    const { field, type } = fieldConfig;
    const value = filters[field];

    if (!value) return;

    if (type === 'text') {
      filterParts.push(`substringof('${escapeODataValue(value)}', ${field}) eq true`);
    } else if (type === 'date') {
      const date = parseDate(value);

      if (!date) {
        alert(`Invalid date format for ${fieldConfig.displayName}. Use DD.MM.YYYY, YYYY-MM-DD, or DD/MM/YYYY.`);
        return;
      }

      const formattedDate = formatDateForOData(date);

      if (field.toLowerCase().includes('start')) {
        filterParts.push(`${field} ge datetime'${formattedDate}T00:00:00'`);
      } else if (field.toLowerCase().includes('end')) {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const formattedNextDay = formatDateForOData(nextDay);

        filterParts.push(`${field} lt datetime'${formattedNextDay}T00:00:00'`);
      } else {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        const formattedNextDay = formatDateForOData(nextDay);

        filterParts.push(`${field} ge datetime'${formattedDate}T00:00:00' and ${field} lt datetime'${formattedNextDay}T00:00:00'`);
      }
    }
  });

  let endpoint = `${entity}?$format=json`;

  if (filterParts.length > 0) {
    const filterQuery = filterParts.join(" and ");
    endpoint += `&$filter=${encodeURIComponent(filterQuery)}`;
  }

  try {
    const data = await fetchData(endpoint);

    if (data && data.length > 0) {
      displayData(data);
    } else {
      displayData([]);
      const noDataMessage = document.getElementById("noDataMessage");
      noDataMessage.textContent = "No data found with the provided filters.";
    }
  } catch (error) {
    console.error("Error applying filters:", error);
    alert("An error occurred while fetching data. Please try again later.");
  }
}

/* Fetches data from the API. */
async function fetchData(endpoint) {
  if (!endpoint) {
    console.error('No endpoint provided.');
    return [];
  }

  try {
    const response = await apiService.request('GET', endpoint);
    if (response && response.d && response.d.results) {
      return response.d.results;
    } else {
      console.error('No data returned by the API.');
      return [];
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

/* Sorts the table data by a specified column. */
async function sortTable(columnName, th) {
  const previousSelectedEventId = state.selectedEventId;

  let sortAsc;

  if (state.lastSortedColumn !== columnName) {
    sortAsc = true;
    state.lastSortedColumn = columnName;
  } else {
    sortAsc = state.lastSortDirection === 'desc';
  }

  state.lastSortDirection = sortAsc ? 'asc' : 'desc';

  // Update sorting UI
  const allHeaders = document.querySelectorAll('thead th');
  allHeaders.forEach(header => {
    header.classList.remove('asc', 'desc', 'active');
  });

  th.classList.add(state.lastSortDirection, 'active');

  const sortOrder = sortAsc ? columnName : `${columnName} desc`;

  try {
    const noDataMessage = document.getElementById('noDataMessage');
    if (noDataMessage) noDataMessage.textContent = 'Loading...';

    let endpoint = `${state.currentEntity}?$orderby=${sortOrder}&$format=json`;

    const response = await apiService.request('GET', endpoint);

    if (response && response.d && response.d.results) {
      displayData(response.d.results);

      state.nextUrl = apiService.getNextUrl(response);

      const nextButton = document.getElementById('nextButton');
      if (nextButton) {
        nextButton.disabled = !state.nextUrl;
      }

      if (previousSelectedEventId && entityConfig.activatingEntities.includes(state.currentEntity)) {
        restoreRowSelection(previousSelectedEventId);
      } else {
        updateButtonState(false);
      }
    } else {
      displayData([]);
      if (noDataMessage) noDataMessage.textContent = 'No data available.';
      updateButtonState(false);
    }
  } catch (error) {
    console.error('Sorting error:', error);
    alert('Error during sorting. Check the console for more details.');
  }
}

/* Restores the selection of a table row after data re-rendering. */
function restoreRowSelection(eventId) {
  if (!eventId) return;

  state.selectedEventId = eventId;

  const rows = document.querySelectorAll('tbody tr');
  let rowFound = false;

  rows.forEach(row => {
    row.classList.remove('selected');

    const idCell = getIdCellForEntity(row, state.currentEntity);
    if (idCell && idCell.textContent.trim() === eventId) {
      row.classList.add('selected');
      rowFound = true;
    }
  });

  const isActivatingEntity = entityConfig.activatingEntities.includes(state.currentEntity);
  updateButtonState(rowFound && isActivatingEntity);
}

/* Finds the ID cell for a given entity row. */
function getIdCellForEntity(row, entity) {
  const cells = row.querySelectorAll('td');
  if (!cells || cells.length === 0) return null;

  const idFieldMap = {
    'WCE_Event': 'EventId',
    'WCE_Lead': 'LeadId',
    'WCE_User': 'UserId',
    'WCE_Country': 'CountryId'
  };

  const idField = idFieldMap[entity];
  if (!idField) return cells[0];

  const headerRow = document.querySelector('thead tr');
  if (!headerRow) return cells[0];

  const headers = headerRow.querySelectorAll('th');
  let idIndex = -1;

  for (let i = 0; i < headers.length; i++) {
    const headerText = headers[i].textContent.trim();
    if (headerText === idField || headerText === entityConfig.displayNames[idField]) {
      idIndex = i;
      break;
    }
  }

  if (idIndex >= 0 && idIndex < cells.length) {
    return cells[idIndex];
  }

  return cells[0];
}

/**
 * Displays data in the HTML table.
 * @param {Array} data - The array of objects to display.
 * @param {boolean} [append=false] - If true, appends data to existing rows; otherwise, clears and re-renders.
 */
function displayData(data, append = false) {
  const tableHead = document.getElementById('tableHead');
  const tableBody = document.getElementById('tableBody');
  const noDataMessage = document.getElementById('noDataMessage');

  if (!append) {
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
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

  if (state.columnOrder[state.currentEntity] && state.columnOrder[state.currentEntity].length > 0) {
    displayColumns = state.columnOrder[state.currentEntity].filter(column => allColumns.includes(column));
    const newColumns = allColumns.filter(column => !displayColumns.includes(column));
    displayColumns = [...displayColumns, ...newColumns];
  }

  const hiddenColumns = state.hiddenColumns[state.currentEntity] || [];
  displayColumns = displayColumns.filter(column => !hiddenColumns.includes(column));

  if (!append) {
    const headerRow = document.createElement('tr');

    displayColumns.forEach(column => {
      const th = document.createElement('th');

      if (state.columnWidths[state.currentEntity] && state.columnWidths[state.currentEntity][column]) {
        th.style.minWidth = state.columnWidths[state.currentEntity][column];
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
      th.style.position = 'sticky';
      th.style.top = '0';
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

      const cellContent = item[column] || 'N/A';

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

      if (isDate && item[column]) {
        td.textContent = formatDate(item[column]);
      } else {
        td.textContent = cellContent;
      }

      row.appendChild(td);
    });

    if (entityConfig.activatingEntities.includes(state.currentEntity)) {
      row.style.cursor = 'pointer';
      row.classList.add('event-row');

      let idField;
      if (state.currentEntity === 'WCE_Event') {
        idField = 'EventId';
      } else if (state.currentEntity === 'WCE_Lead') {
        idField = 'LeadId';
      } else {
        idField = 'Id';
      }

      const idValue = item[idField];

      if (idValue) {
        row.addEventListener('click', (event) => {
          handleRowClick(idValue, event);
        });

        if (idValue === state.selectedEventId) {
          row.classList.add('selected');
        }
      }
    } else {
      row.style.cursor = 'default';
    }

    tableBody.appendChild(row);
  });

  const nextButton = document.getElementById('nextButton');
  if (nextButton) {
    nextButton.disabled = !state.nextUrl;
  }
}

/* Handles a click on a table row, selecting or deselecting it. */
function handleRowClick(id, event) {
  if (!id) return;

  const row = event.currentTarget;
  const tbody = document.querySelector('tbody');

  if (row.classList.contains('selected')) {
    row.classList.remove('selected');
    state.selectedEventId = null;
    sessionStorage.removeItem('selectedEventId');
    updateButtonState(false);
  } else {
    const previouslySelected = tbody.querySelector('tr.selected');
    if (previouslySelected) {
      previouslySelected.classList.remove('selected');
    }

    row.classList.add('selected');
    state.selectedEventId = id;
    sessionStorage.setItem('selectedEventId', state.selectedEventId);

    const isActivatingEntity = entityConfig.activatingEntities.includes(state.currentEntity);
    updateButtonState(isActivatingEntity);
  }

  saveAppState();
}

/* Updates the disabled state of action buttons based on row selection. */
function updateButtonState(enabled) {
  const viewLeadsButton = document.getElementById('viewLeadsButton');

  if (viewLeadsButton) {
    viewLeadsButton.disabled = !enabled;
  }
}

/* Initializes client-side search functionality for the displayed table. */
function initSearch() {
  const searchInput = document.getElementById('search');
  const tableRows = document.querySelectorAll('tbody tr');
  const noDataMessage = document.getElementById('noDataMessage');

  if (!searchInput || !tableRows) {
    console.error('Search elements not found in the DOM.');
    return;
  }

  searchInput.addEventListener('input', () => {
    const searchValue = searchInput.value.toLowerCase();
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

    if (!found) {
      noDataMessage.textContent = 'No results found.';
    } else {
      noDataMessage.textContent = '';
    }
  });
}

/* Loads the next set of rows (for pagination). */
async function loadNextRows() {
  if (!state.nextUrl) {
    console.error('No next URL found.');
    return;
  }

  try {
    document.getElementById('nextButton').textContent = 'Loading...';

    const data = await apiService.fetchNextRows(state.nextUrl);

    if (data && data.d && data.d.results && data.d.results.length > 0) {
      displayData(data.d.results, false);

      state.nextUrl = apiService.getNextUrl(data);

      document.getElementById('nextButton').disabled = !state.nextUrl;
      document.getElementById('nextButton').textContent = 'Next';

      if (state.selectedEventId && entityConfig.activatingEntities.includes(state.currentEntity)) {
        restoreRowSelection(state.selectedEventId);
      }
    } else {
      state.nextUrl = '';
      document.getElementById('nextButton').disabled = true;
      document.getElementById('nextButton').textContent = 'Next';
    }
  } catch (error) {
    console.error("Error loading next rows:", error);
    document.getElementById('nextButton').textContent = 'Next';
    document.getElementById('nextButton').disabled = false;
  }
}

// Event listener for window resize to handle responsive layout
window.addEventListener('resize', handleResponsiveLayout);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  handleResponsiveLayout();

  // Setup mutation observer to handle dynamic DOM changes
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        handleResponsiveLayout();
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  init();
});