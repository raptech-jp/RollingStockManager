document.addEventListener('DOMContentLoaded', function() {
    let count = 0;

    const counter = document.getElementById('counter');
    const increment = document.getElementById('increment');

    increment.addEventListener('click', function() {
        count++;
        counter.textContent = count;
    });
});

document.addEventListener('DOMContentLoaded', () => {
    function handleFormSubmission(formId, url, method, successCallback) {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                const formData = new FormData(form);
                fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.message) {
                        alert(data.message);
                        if (successCallback) successCallback(data);
                    } else {
                        alert("Failed: " + data.message);
                    }
                })
                .catch(error => console.error('Error:', error));
            });
        }
    }

    function registerUser(data) {
        fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === "User registered successfully") {
                alert("Registration successful!");
                window.location.href = '/login';
            } else {
                alert("Registration failed: " + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    }

    function loginUser(data) {
        fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === "Login successful") {
                localStorage.setItem('token', data.token);
                localStorage.setItem('refresh_token', data.refresh_token);
                window.location.href = '/manage';
            } else {
                alert("Login failed: " + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    }

    function fetchItems() {
        fetch('/items', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        .then(response => response.json())
        .then(items => {
            const itemsContainer = document.getElementById('items-container');
            if (itemsContainer) {
                itemsContainer.innerHTML = '';
                items.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.innerHTML = `
                        <p>Name: ${item.name}</p>
                        <p>Expiry Date: ${item.expiry_date}</p>
                        <p>Location: ${item.location}</p>
                        <p>Quantity: ${item.quantity}</p>
                        <p>Expiring Soon: ${item.is_expiring_soon ? 'Yes' : 'No'}</p>
                    `;
                    itemsContainer.appendChild(itemElement);
                });
            }
        })
        .catch(error => console.error('Error:', error));
    }

    function editItem(itemId, data) {
        fetch(`/items/${itemId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: data
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === "Item updated successfully") {
                alert("Item updated successfully!");
            } else {
                alert("Failed to update item: " + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    }

    function deleteItem(itemId) {
        fetch(`/items/${itemId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        .then(response => response.json())
        .then(data => {
            if (data.message === "Item deleted successfully") {
                alert("Item deleted successfully!");
            } else {
                alert("Failed to delete item: " + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    }

    // Initialize forms
    handleFormSubmission('registration-form', '/register', 'POST', registerUser);
    handleFormSubmission('login-form', '/login', 'POST', loginUser);
    handleFormSubmission('item-form', '/items', 'POST');
    handleFormSubmission('edit-item-form', `/items/${document.getElementById('item-id').value}`, 'PUT');
    handleFormSubmission('delete-item-form', `/items/${document.getElementById('delete-item-id').value}`, 'DELETE');
    
    // Fetch items on page load if required
    fetchItems();
});
