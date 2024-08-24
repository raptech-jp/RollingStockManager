function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('registration-form')) {
        const registerForm = document.getElementById('registration-form');

        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(registerForm);
            const data = {
                email: formData.get('email'),
                username: formData.get('username'),
                password: formData.get('password')
            };

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    alert('登録が完了しました。');
                    registerForm.reset();
                    window.location.href = '/login';
                } else {
                    alert('登録に失敗しました。');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('エラーが発生しました。');
            }
        });
    }

    if (document.getElementById('login-form')) {
        const loginForm = document.getElementById('login-form');

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(loginForm);
            const data = {
                email: formData.get('email'),
                password: formData.get('password')
            };

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    const responseData = await response.json();
                    alert('ログインに成功しました。');
                    loginForm.reset();
                    document.cookie = `token=${responseData.token}; path=/`;
                    document.cookie = `refresh_token=${responseData.refresh_token}; path=/`;

                    window.location.href = '/';
                } else {
                    alert('ログインに失敗しました。');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('エラーが発生しました。');
            }
        });
    }
});

async function fetchWithAuth(url, options = {}) {
    const token = getCookie('token');

    if (!token) {
        throw new Error('No token available');
    }

    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    try {
        const response = await fetch(url, options);

        if (response.ok) {
            return response.json();
        } else if (response.status === 401 || response.status === 403) {
            const newToken = await refreshToken();
            if (newToken) {
                document.cookie = `token=${newToken.token}; path=/`;
                return fetchWithAuth(url, options);
            } else {
                throw new Error('Unable to refresh token');
            }
        } else {
            throw new Error('Network response was not ok');
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function refreshToken() {
    const refreshToken = getCookie('refresh_token');

    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    try {
        const response = await fetch('/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            throw new Error('Failed to refresh token');
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
    }
}

async function getItems() {
    try {
        const items = await fetchWithAuth('/items');
        console.log('Items:', items);
    } catch (error) {
        console.error('Error fetching items:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/manage') {
        const token = getCookie('token');
        fetch('/items',{
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }) // APIのURLを指定
            .then(response => response.json())
            .then(data => {
                // Check if data is an array
                if (!Array.isArray(data)) {
                    console.error('Data is not an array:', data);
                    return;
                }

                const itemsContainer = document.getElementById('items-container');

                data.forEach(item => {
                    // カード要素を作成
                    const card = document.createElement('div');
                    card.className = 'col-md-4 item-card';
    
                    // 画像の処理
                    const imageUrl = item.image ? item.image : 'placeholder.png';
    
                    // 有効期限の日付形式を変換
                    const expiryDate = new Date(item.expiry_date).toLocaleDateString('ja-JP');
    
                    card.innerHTML = `
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">${item.name}</h5>
                                <img src="${imageUrl}" alt="${item.name}" class="img-fluid item-image">
                                <p class="card-text">使用期限: ${expiryDate}</p>
                                <p class="card-text">場所: ${item.location}</p>
                                <p class="card-text">個数: ${item.quantity}</p>
                                ${item.is_expiring_soon ? '<span class="badge badge-warning">まもなく期限切れ</span>' : ''}
                            </div>
                        </div>
                    `;
                    itemsContainer.appendChild(card);
                });
            })
            .catch(error => console.error('Error fetching data:', error));
        }
});

document.addEventListener('DOMContentLoaded', () => {
    const itemForm = document.getElementById('item-form');

    if (itemForm) {
        itemForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            // FormData オブジェクトの作成
            const formData = new FormData(itemForm);

            // ファイルが選択されている場合は FormData に追加
            const fileInput = document.getElementById('fileInput');
            if (fileInput.files.length > 0) {
                formData.append('file', fileInput.files[0]);
            }

            try {
                // /items へ POST リクエストを送信
                const response = await fetch('/items', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${getCookie('token')}`,
                    },
                    body: formData // FormData オブジェクトを送信
                });

                if (response.ok) {
                    alert('アイテムが正常に追加されました。');
                    itemForm.reset(); // フォームをリセット
                } else {
                    alert('アイテムの追加に失敗しました。');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('エラーが発生しました。');
            }
        });
    }
});
