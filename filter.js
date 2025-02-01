// filter.js
'use strict';

// Initialize the Trello Power-Up client library
var t = TrelloPowerUp.iframe();

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Show loading spinner while fetching board members
  var loadingEl = document.getElementById('loading');
  var errorEl = document.getElementById('error');
  loadingEl.classList.remove('hidden');

  try {
    // Fetch board data including members
    // This returns a promise that resolves with board data (see Trello docs)
    const boardData = await t.board('members');
    populateMembers(boardData.members);
  } catch (err) {
    console.error('Error fetching board members:', err);
    errorEl.textContent = 'Failed to load board members. Please try again later.';
    errorEl.classList.remove('hidden');
  } finally {
    loadingEl.classList.add('hidden');
  }

  // Setup form event listeners
  document.getElementById('filter-form').addEventListener('submit', onApplyFilter);
  document.getElementById('reset-btn').addEventListener('click', onResetFilter);
  
  // Render any pre-existing filter settings (optional)
  t.get('board', 'private', 'filterSettings')
    .then(function(filterSettings) {
      if (filterSettings) {
        if (filterSettings.date) {
          document.getElementById('filter-date').value = filterSettings.date;
        }
        if (filterSettings.member) {
          document.getElementById('filter-member').value = filterSettings.member;
        }
      }
    });
}

function populateMembers(members) {
  var memberSelect = document.getElementById('filter-member');

  // Sort members alphabetically by fullName
  members.sort(function(a, b) {
    return a.fullName.localeCompare(b.fullName);
  });

  // Create option elements for each member
  members.forEach(function(member) {
    var option = document.createElement('option');
    option.value = member.id;
    option.textContent = member.fullName;
    memberSelect.appendChild(option);
  });
}

function onApplyFilter(event) {
  event.preventDefault();
  var selectedDate = document.getElementById('filter-date').value;
  var selectedMember = document.getElementById('filter-member').value;

  // Save filter settings to board-level private storage
  t.set('board', 'private', 'filterSettings', {
    date: selectedDate,
    member: selectedMember
  })
  .then(function() {
    // Optionally, notify the main view to refresh filters (if implemented)
    // Close the pop-out once settings are saved
    t.closePopup();
  })
  .catch(function(err) {
    console.error('Error saving filter settings:', err);
    var errorEl = document.getElementById('error');
    errorEl.textContent = 'Failed to save settings. Please try again.';
    errorEl.classList.remove('hidden');
  });
}

function onResetFilter() {
  // Clear input fields
  document.getElementById('filter-date').value = '';
  document.getElementById('filter-member').value = '';

  // Remove stored filter settings
  t.set('board', 'private', 'filterSettings', null)
    .then(function() {
      // Optionally, update UI or inform the main view that filters have been reset
      t.closePopup();
    })
    .catch(function(err) {
      console.error('Error resetting filter settings:', err);
      var errorEl = document.getElementById('error');
      errorEl.textContent = 'Failed to reset settings. Please try again.';
      errorEl.classList.remove('hidden');
    });
}
