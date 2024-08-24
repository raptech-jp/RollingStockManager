// /manage/<int:id> にアクセスしたときに、そのIDを取得する
document.addEventListener('DOMContentLoaded', () => {
    const itemId = document.querySelector('#item-id').getAttribute('data-id');
    console.log('Item ID:', itemId);
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

    // ユーザー登録の関数
    function registerUser(username, email, password) {
        // POSTリクエストでデータをサーバーに送信
        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // データの形式を指定
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password
            })
        })
        .then(response => {
            if (!response.ok) {
                // ステータスコードが 200 以外の場合はエラーとして処理
                return response.json().then(data => {
                    throw new Error(data.message || 'Unknown error occurred');
                });
            }
            return response.json(); // 成功時は JSON データを返す
        })
        .then(data => {
            if (data.message === "User registered successfully") {
                alert("ユーザー登録が成功しました！");
                // 必要に応じて、登録後のリダイレクトやフォームのリセットなど
            } else {
                alert("ユーザー登録に失敗しました: " + data.message);
            }
        })
        .catch(error => {
            // エラー時の処理
            console.error('登録中にエラーが発生しました:', error);
            alert("登録中にエラーが発生しました: " + error.message);
        });
    }


    // ログイン関数
    function loginUser(email, password) {
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Unknown error occurred');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.message === "Login successful") {
                // トークンをローカルストレージに保存
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('refreshToken', data.refresh_token);
                alert("ログイン成功！");
            } else {
                alert("ログインに失敗しました: " + data.message);
            }
        })
        .catch(error => {
            console.error('ログイン中にエラーが発生しました:', error);
            alert("ログイン中にエラーが発生しました: " + error.message);
        });
    }
    function handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        loginUser(email, password);
    }


    // トークン検証関数
    function verifyToken() {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            alert("トークンが存在しません。ログインしてください。");
            return;
        }

        fetch('/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.message || 'Unknown error occurred');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.message === "Token is valid") {
                alert("トークンは有効です！");
                // トークンが有効な場合の処理
                // 例: ユーザーの情報を表示する
            } else {
                alert("トークンの検証に失敗しました: " + data.message);
            }
        })
        .catch(error => {
            console.error('トークン検証中にエラーが発生しました:', error);
            alert("トークン検証中にエラーが発生しました: " + error.message);
        });
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
            headers: {
                'Content-Type': 'application/json', // 必要に応じて Content-Type ヘッダーを追加
                'Authorization': `Bearer ${localStorage.getItem('authToken')}` // 認証トークンをヘッダーに追加
            }
        })
        .then(response => {
            if (!response.ok) {
                // ステータスコードが 200 でない場合はエラーとして処理
                return response.json().then(data => {
                    throw new Error(data.message || 'Unknown error occurred');
                });
            }
            return response.json(); // 成功時は JSON データを返す
        })
        .then(data => {
            if (data.message === "Item deleted successfully") {
                alert("アイテムが削除されました！");
                // 必要に応じて、削除後のUIの更新処理をここに追加
            } else {
                alert("アイテムの削除に失敗しました: " + data.message);
            }
        })
        .catch(error => {
            // エラー時の処理
            console.error('削除中にエラーが発生しました:', error);
            alert("削除中にエラーが発生しました: " + error.message);
        });
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
