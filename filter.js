// filter.js
var t = TrelloPowerUp.iframe();

t.render(function(){
  // Fetch board members to populate the member filter dropdown.
  t.board('members')
    .then(function(boardData) {
      var memberSelect = document.getElementById('filter-member');
      // boardData.members contains an array of member objects.
      boardData.members.forEach(function(member) {
        var option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.fullName;
        memberSelect.appendChild(option);
      });
    });

  // Listen for the filter form submission.
  document.getElementById('filter-form').addEventListener('submit', function(event) {
    event.preventDefault();  // Prevent form from submitting normally.

    var selectedDate = document.getElementById('filter-date').value;
    var selectedMember = document.getElementById('filter-member').value;

    // Store the filter settings using Trello's client storage (e.g., board-level storage).
    t.set('board', 'private', 'filterSettings', { 
      date: selectedDate, 
      member: selectedMember 
    })
    .then(function(){
      // Optionally, signal to the main window to refresh with new filters or simply close the popout.
      t.closePopup();
    });
  });
});
