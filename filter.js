// filter.js
'use strict';

// Initialize the Trello Power-Up client library
var t = TrelloPowerUp.iframe();

document.addEventListener('DOMContentLoaded', init);

async function init() {
  var loadingEl = document.getElementById('loading');
  var errorEl = document.getElementById('error');
  loadingEl.classList.remove('hidden');

  try {
    // Fetch board data including members
    const boardData = await t.board('members');
    populateMembers(boardData.members);
  } catch (err) {
    console.error('Error fetching board members:', err);
    errorEl.textContent = 'Failed to load board members. Please try again later.';
    errorEl.classList.remove('hidden');
  } finally {
    loadingEl.classList.add('hidden');
  }

  document.getElementById('filter-form').addEventListener('submit', onApplyFilter);
  document.getElementById('reset-btn').addEventListener('click', onResetFilter);
  
  // Render any pre-existing filter settings (optional)
  t.get('board', 'private', 'filterSettings')
    .then(function(filterSettings) {
      if (filterSettings) {
        if (filterSettings.startDate) {
          document.getElementById('filter-start-date').value = filterSettings.startDate;
        }
        if (filterSettings.endDate) {
          document.getElementById('filter-end-date').value = filterSettings.endDate;
        }
        if (filterSettings.member) {
          document.getElementById('filter-member').value = filterSettings.member;
        }
        // Automatically display cards on load if settings exist
        fetchAndDisplayFilteredCards(filterSettings.member, filterSettings.startDate, filterSettings.endDate);
      }
    });
}

function populateMembers(members) {
  var memberSelect = document.getElementById('filter-member');

  // Sort members alphabetically by fullName
  members.sort(function(a, b) {
    return a.fullName.localeCompare(b.fullName);
  });

  members.forEach(function(member) {
    var option = document.createElement('option');
    option.value = member.id;
    option.textContent = member.fullName;
    memberSelect.appendChild(option);
  });
}

function onApplyFilter(event) {
  event.preventDefault();
  
  var startDate = document.getElementById('filter-start-date').value;
  var endDate = document.getElementById('filter-end-date').value;
  var member = document.getElementById('filter-member').value;
  
  // Save filter settings to board-level private storage
  t.set('board', 'private', 'filterSettings', {
    startDate: startDate,
    endDate: endDate,
    member: member
  })
  .then(function() {
    // After saving settings, fetch and display filtered cards
    fetchAndDisplayFilteredCards(member, startDate, endDate);
  })
  .catch(function(err) {
    console.error('Error saving filter settings:', err);
    var errorEl = document.getElementById('error');
    errorEl.textContent = 'Failed to save settings. Please try again.';
    errorEl.classList.remove('hidden');
  });
}

function onResetFilter() {
  document.getElementById('filter-start-date').value = '';
  document.getElementById('filter-end-date').value = '';
  document.getElementById('filter-member').value = '';

  t.set('board', 'private', 'filterSettings', null)
    .then(function() {
      // Clear filtered results on reset
      document.getElementById('results').innerHTML = '';
      t.closePopup();
    })
    .catch(function(err) {
      console.error('Error resetting filter settings:', err);
      var errorEl = document.getElementById('error');
      errorEl.textContent = 'Failed to reset settings. Please try again.';
      errorEl.classList.remove('hidden');
    });
}

async function fetchAndDisplayFilteredCards(memberId, startDate, endDate) {
  var resultsEl = document.getElementById('results');
  resultsEl.innerHTML = 'Loading cards…';

  try {
    // Fetch board cards
    const boardData = await t.board('cards');
    let cards = boardData.cards;
    
    // Convert date strings to Date objects for comparison
    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;
    
    // Filter cards by member assignment and last activity date within range
    const filteredCards = cards.filter(card => {
      // If member is selected, ensure the card's idMembers contains that member
      if (memberId && !card.idMembers.includes(memberId)) {
        return false;
      }
      
      // Use card.dateLastActivity to filter by date range
      let cardDate = new Date(card.dateLastActivity);
      
      if (start && cardDate < start) {
        return false;
      }
      if (end && cardDate > end) {
        return false;
      }
      return true;
    });

    if (filteredCards.length === 0) {
      resultsEl.innerHTML = 'No cards found for the selected criteria.';
      return;
    }
    
    // Render the filtered cards list
    var list = document.createElement('ul');
    filteredCards.forEach(card => {
      var listItem = document.createElement('li');
      listItem.textContent = card.name + ' (Last activity: ' + new Date(card.dateLastActivity).toLocaleString() + ')';
      list.appendChild(listItem);
    });
    resultsEl.innerHTML = '';
    resultsEl.appendChild(list);
  } catch (err) {
    console.error('Error fetching board cards:', err);
    resultsEl.innerHTML = 'Error loading cards. Please try again.';
  }
}
