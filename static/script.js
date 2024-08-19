document.addEventListener('DOMContentLoaded', function() {
    let count = 0;

    const counter = document.getElementById('counter');
    const increment = document.getElementById('increment');

    increment.addEventListener('click', function() {
        count++;
        counter.textContent = count;
    });
});
