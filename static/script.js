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
        fetch('/items', {
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

                    // 期限が切れているかどうかをチェック
                    const today = new Date();
                    const itemExpiryDate = new Date(item.expiry_date);
                    let expiryStatus = '';

                    if (itemExpiryDate < today) {
                        expiryStatus = '<span class="badge badge-danger">期限切れ</span>';
                        card.style.backgroundColor = '#f8d7da'; // 赤背景
                    } else if (item.is_expiring_soon) {
                        expiryStatus = '<span class="badge badge-warning">まもなく期限切れ</span>';
                    }

                    card.innerHTML = `
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">${item.name}</h5>
                                <a href="/manage/${item.id}">
                                    <img src="${imageUrl}" alt="${item.name}" class="img-fluid item-image">
                                </a>
                                <p class="card-text">使用期限: ${expiryDate}</p>
                                <p class="card-text">場所: ${item.location}</p>
                                <p class="card-text">個数: ${item.quantity}</p>
                                ${expiryStatus}
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
                    window.location.href = '/manage';
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

document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('edit-form');

    if (editForm) {
        editForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const itemId = document.querySelector('#item-id').getAttribute('data-id');

            // FormData オブジェクトの作成
            const formData = new FormData(editForm);

            // ファイルが選択されている場合は FormData に追加
            const fileInput = document.getElementById('fileInput');
            if (fileInput.files.length > 0) {
                formData.append('image', fileInput.files[0]);
            }

            try {
                // /items へ POST リクエストを送信
                const response = await fetch(`/items/${itemId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${getCookie('token')}`,
                    },
                    body: formData // FormData オブジェクトを送信
                });

                if (response.ok) {
                    alert('正常に変更されました');
                    window.location.href = '/manage';
                } else {
                    alert('変更に失敗しました');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('エラーが発生しました。');
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // 削除ボタンが存在するかチェック
    const deleteButton = document.getElementById('delete-button');
    if (deleteButton) {
        deleteButton.addEventListener('click', function() {
            const itemId = document.querySelector('#item-id').getAttribute('data-id');
            
            const token = getCookie('token');

            fetch(`/items/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('削除に失敗しました');
                }
            })
            .then(data => {
                alert('正常に削除されました');
                window.location.href = '/manage';
            })
            .catch(error => {
                console.error('エラー:', error);
                alert('削除に失敗しました。もう一度お試しください。');
            });
        });
    }
});


document.addEventListener('DOMContentLoaded', function () {
    if (window.location.pathname === '/notice') {
        const token = getCookie('token');
        fetch('/items', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                const noticeContainer = document.getElementById('notice-container');
                noticeContainer.innerHTML = ''; // 既存の内容をクリア

                // 点検日を定義
                const checkDates = ['03/01', '06/01', '09/01', '12/01'];
                const today = new Date();

                // 点検日が1週間以内かどうかを確認するヘルパー関数
                function isCheckDateNear(date) {
                    const checkDate = new Date(date);
                    checkDate.setFullYear(today.getFullYear());

                    const oneWeekBefore = new Date(checkDate);
                    oneWeekBefore.setDate(checkDate.getDate() - 7);

                    const oneWeekAfter = new Date(checkDate);
                    oneWeekAfter.setDate(checkDate.getDate() + 7);

                    return today >= oneWeekBefore && today <= oneWeekAfter;
                }

                // 通知リストを作成
                const notifications = [];

                data.forEach(item => {
                    const expiryDate = new Date(item.expiry_date);
                    const timeDiff = expiryDate - today;
                    const daysToExpire = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                    if (item.is_expiring_soon) {
                        // 有効期限が迫っているアイテムを通知リストに追加
                        notifications.push({
                            name: item.name,
                            daysToExpire: daysToExpire > 0 ? daysToExpire : '期限切れ',
                            expiryDate: expiryDate,
                            className: daysToExpire > 0 ? 'alert-warning' : 'alert-danger'
                        });
                    } else if (daysToExpire < 0) {
                        // 期限切れのアイテムを通知リストに追加
                        notifications.push({
                            name: item.name,
                            daysToExpire: '期限切れ',
                            expiryDate: expiryDate,
                            className: 'alert-danger'
                        });
                    }
                });

                // 点検日の通知をリストに追加
                checkDates.forEach(checkDateStr => {
                    const checkDate = new Date(`${today.getFullYear()}/${checkDateStr}`);
                    if (isCheckDateNear(checkDate)) {
                        notifications.push({
                            name: '防災用品点検',
                            daysToExpire: null,
                            checkDate: checkDate,
                            className: 'alert-warning'
                        });
                    }
                });

                // 有効期限日で降順にソート
                notifications.sort((a, b) => {
                    if (b.expiryDate && a.expiryDate) {
                        return b.expiryDate - a.expiryDate;
                    }
                    return (b.checkDate || 0) - (a.checkDate || 0);
                });

                // 通知をコンテナに追加
                notifications.forEach(notification => {
                    const noticeElement = document.createElement('div');
                    noticeElement.className = `alert ${notification.className}`;
                    let message;

                    if (notification.daysToExpire === '期限切れ') {
                        message = `<strong>${notification.name}</strong> - 期限切れです`;
                    } else if (notification.daysToExpire !== null) {
                        message = `<strong>${notification.name}</strong> - 残り ${notification.daysToExpire} 日です`;
                    } else if (notification.checkDate) {
                        message = `<strong>${notification.name}</strong> - ${notification.checkDate.getMonth() + 1}/${notification.checkDate.getDate()} は防災用品点検の日です`;
                    }

                    noticeElement.innerHTML = message;
                    noticeContainer.appendChild(noticeElement);
                });
            })
            .catch(error => console.error('アイテムの取得エラー:', error));
    }
});
