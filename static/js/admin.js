let users = [];
let editingUserId = null;

// DOM 元素
const usersList = document.getElementById('usersList');
const editUserModal = document.getElementById('editUserModal');
const editUserName = document.getElementById('editUserName');
const editUserIsAdmin = document.getElementById('editUserIsAdmin');
const editUserPassword = document.getElementById('editUserPassword');
const closeEditUserModal = document.getElementById('closeEditUserModal');
const cancelEditUser = document.getElementById('cancelEditUser');
const saveEditUser = document.getElementById('saveEditUser');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    setupEventListeners();
});

// 设置事件监听
function setupEventListeners() {
    if (closeEditUserModal) {
        closeEditUserModal.addEventListener('click', closeEditUserModalFunc);
    }
    if (cancelEditUser) {
        cancelEditUser.addEventListener('click', closeEditUserModalFunc);
    }
    if (saveEditUser) {
        saveEditUser.addEventListener('click', saveUserEdit);
    }
    
    if (editUserModal) {
        editUserModal.addEventListener('click', (e) => {
            if (e.target === editUserModal) {
                closeEditUserModalFunc();
            }
        });
    }
}

// 加载用户列表
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
            users = await response.json();
            renderUsers();
        } else if (response.status === 403) {
            alert('您没有管理员权限');
            window.location.href = '/chat';
        }
    } catch (error) {
        console.error('加载用户列表失败:', error);
    }
}

// 渲染用户列表
function renderUsers() {
    if (!usersList) return;
    usersList.innerHTML = '';
    
    if (users.length === 0) {
        usersList.innerHTML = '<p style="color: var(--text-secondary); padding: 20px;">暂无用户</p>';
        return;
    }
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div class="user-item-info">
                <div class="user-item-name">
                    ${escapeHtml(user.username)}
                    ${user.is_admin ? '<span class="admin-badge">管理员</span>' : ''}
                </div>
                <div class="user-item-details">
                    注册时间: ${new Date(user.created_at).toLocaleString('zh-CN')}
                </div>
            </div>
            <div class="user-item-actions">
                <button class="btn btn-secondary" onclick="editUser(${user.id})">编辑</button>
                <button class="btn btn-secondary" onclick="deleteUser(${user.id})" style="background: var(--error);">删除</button>
            </div>
        `;
        usersList.appendChild(userItem);
    });
}

// 编辑用户
function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        editingUserId = userId;
        editUserName.value = user.username;
        editUserIsAdmin.checked = user.is_admin;
        editUserPassword.value = '';
        editUserModal.classList.add('show');
    }
}

// 关闭编辑用户模态框
function closeEditUserModalFunc() {
    if (!editUserModal) return;
    editUserModal.classList.remove('show');
    editingUserId = null;
    editUserName.value = '';
    editUserIsAdmin.checked = false;
    editUserPassword.value = '';
}

// 保存用户编辑
async function saveUserEdit() {
    if (!editingUserId) return;
    
    const isAdmin = editUserIsAdmin.checked;
    const password = editUserPassword.value.trim();
    
    try {
        const data = {
            is_admin: isAdmin
        };
        
        if (password) {
            data.password = password;
        }
        
        const response = await fetch(`/api/admin/users/${editingUserId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeEditUserModalFunc();
            await loadUsers();
        } else {
            const error = await response.json();
            alert(error.error || '更新用户失败');
        }
    } catch (error) {
        console.error('更新用户失败:', error);
        alert('更新用户失败，请重试');
    }
}

// 删除用户
async function deleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    if (!confirm(`确定要删除用户 "${user.username}" 吗？此操作不可恢复！`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadUsers();
        } else {
            const error = await response.json();
            alert(error.error || '删除用户失败');
        }
    } catch (error) {
        console.error('删除用户失败:', error);
        alert('删除用户失败，请重试');
    }
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


