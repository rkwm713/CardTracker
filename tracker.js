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

    // Log the board ID to ensure it's correct
    console.log('Board ID:', boardId);

    // Fetch actions: filter updateCard:idList (card move events)
    // Use t.request rather than t.rest:
    const requestParams = {
      url: `/1/boards/${boardId}/actions`,
      method: 'GET',
      params: {
        filter: 'updateCard:idList',
        since: startDate,
        before: endDate,
        fields: 'id,date,data,memberCreator',
        memberCreator_fields: 'fullName'
      }
    };

    // Log the request parameters to ensure they are correct
    console.log('Request Parameters:', requestParams);

    const response = await t.request(requestParams);
    
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
