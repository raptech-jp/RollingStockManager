document.addEventListener('DOMContentLoaded', function() {
    let count = 0;

    const counter = document.getElementById('counter');
    const increment = document.getElementById('increment');

    increment.addEventListener('click', function() {
        count++;
        counter.textContent = count;
    });
});

function registerUser(username, email, password) {
    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username, email: email, password: password })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        if (data.message === "User registered successfully") {
            alert("Registration successful!");
        } else {
            alert("Registration failed: " + data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}
