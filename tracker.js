'use strict';

const t = TrelloPowerUp.iframe();

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('range-form').addEventListener('submit', onLoadExport);
});

async function onLoadExport(event) {
  event.preventDefault();
  clearMessages();
  showElement('loading');

  // Get date range inputs
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  if (!startDate || !endDate) {
    showError('Both start and end dates are required.');
    hideElement('loading');
    return;
  }

  try {
    // Get board ID
    const boardData = await t.board('id');
    const boardId = boardData.id;

    // Fetch actions: filter updateCard:idList (card move events)
    // Use t.request rather than t.rest:
    const response = await t.request({
      url: `/1/boards/${boardId}/actions`,
      method: 'GET',
      params: {
        filter: 'updateCard:idList',
        since: startDate,
        before: endDate,
        fields: 'id,date,data,memberCreator',
        memberCreator_fields: 'fullName'
      }
    });
    
    // Ensure we have an array of actions. Some responses may wrap your array in an "actions" property.
    const actions = Array.isArray(response) ? response : response.actions;
    if (!actions || !Array.isArray(actions)) {
      throw new Error('Unexpected response structure');
    }

    // Process actions: group by card id and sort chronologically
    const processedData = processActions(actions);

    // Display results in table
    populateTable(processedData);

    // Trigger CSV export
    exportCSV(processedData);
  } catch (err) {
    console.error('Error fetching or processing actions:', err);
    showError('Failed to load card activities. Please try again.');
  } finally {
    hideElement('loading');
  }
}

/**
 * Process the actions into an array of records.
 * Each record contains:
 *  - cardName
 *  - movedBy (memberCreator.fullName)
 *  - fromList (data.listBefore.name)
 *  - toList (data.listAfter.name)
 *  - actionDate (action.date)
 *  - timeInList: computed as the difference between this move and the next move for the same card.
 *
 * For simplicity, we pair consecutive actions per card.
 */
function processActions(actions) {
  // Group actions by card id
  const groups = {};
  actions.forEach(action => {
    const cardId = action.data.card.id;
    if (!groups[cardId]) {
      groups[cardId] = [];
    }
    groups[cardId].push(action);
  });

  const records = [];
  Object.keys(groups).forEach(cardId => {
    // Sort actions for the card chronologically
    const sorted = groups[cardId].sort((a, b) => new Date(a.date) - new Date(b.date));
    // For each action (except the last), compute duration until next move.
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      let duration = '';
      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        const diffMs = new Date(next.date) - new Date(current.date);
        duration = formatDuration(diffMs);
      } else {
        // For the last action, calculate duration up to now.
        const diffMs = Date.now() - new Date(current.date);
        duration = formatDuration(diffMs);
      }
      records.push({
        cardName: current.data.card.name,
        movedBy: current.memberCreator.fullName,
        fromList: current.data.listBefore ? current.data.listBefore.name : 'N/A',
        toList: current.data.listAfter ? current.data.listAfter.name : 'N/A',
        actionDate: current.date,
        timeInList: duration
      });
    }
  });
  return records;
}

/**
 * Format a duration in milliseconds to HH:MM:SS.
 */
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds - hours * 3600) / 60);
  const seconds = totalSeconds - hours * 3600 - minutes * 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function pad(num) {
  return num.toString().padStart(2, '0');
}

/**
 * Populate the table with the processed records.
 */
function populateTable(records) {
  const tbody = document.querySelector('#activity-table tbody');
  tbody.innerHTML = ''; // Clear any existing rows
  records.forEach(record => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${record.cardName}</td>
      <td>${record.movedBy}</td>
      <td>${record.fromList}</td>
      <td>${record.toList}</td>
      <td>${record.timeInList}</td>
      <td>${new Date(record.actionDate).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
  showElement('results');
}

/**
 * Generate CSV from records and trigger a download.
 */
function exportCSV(records) {
  if (records.length === 0) {
    showError('No records found for the selected date range.');
    return;
  }
  const header = ['Card Name', 'Moved By', 'From List', 'To List', 'Time in Previous List', 'Action Date'];
  const rows = records.map(r => [
    `"${r.cardName}"`,
    `"${r.movedBy}"`,
    `"${r.fromList}"`,
    `"${r.toList}"`,
    `"${r.timeInList}"`,
    `"${new Date(r.actionDate).toLocaleString()}"`
  ].join(','));
  const csvContent = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link to trigger download
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'card_activity_log.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* Utility functions to show/hide messages */
function showElement(id) {
  document.getElementById(id).classList.remove('hidden');
}

function hideElement(id) {
  document.getElementById(id).classList.add('hidden');
}

function showError(message) {
  const errorEl = document.getElementById('error');
  errorEl.textContent = message;
  showElement('error');
}

function clearMessages() {
  hideElement('error');
}
