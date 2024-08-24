document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('preview');
    
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            previewContainer.innerHTML = ''; // 以前のプレビューをクリア
            previewContainer.appendChild(img);
        };
        
        reader.readAsDataURL(file);
    } else {
        previewContainer.innerHTML = 'Please select a valid image file.';
    }
});