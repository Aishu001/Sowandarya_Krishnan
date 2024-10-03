document.getElementById('searchButton').addEventListener('click', async () => {
    const name = document.getElementById('nameInput').value;
    const resultsDiv = document.getElementById('results');
    
    // Clear previous results
    resultsDiv.innerHTML = '';

    try {
        // Make a request to the backend to search by name
        const response = await fetch(`http://localhost:3000/search?name=${encodeURIComponent(name)}`);
        const data = await response.json();
        
        // Display results
        if (data.length > 0) {
            data.forEach(employee => {
                const employeeDiv = document.createElement('div');
                employeeDiv.textContent = `ID: ${employee._id}, Name: ${employee._source.name}, Department: ${employee._source.department}, Gender: ${employee._source.gender}`;
                resultsDiv.appendChild(employeeDiv);
            });
        } else {
            resultsDiv.textContent = 'No employees found.';
        }
    } catch (error) {
        console.error('Error searching for employees:', error);
        resultsDiv.textContent = 'Error occurred while searching.';
    }
});
