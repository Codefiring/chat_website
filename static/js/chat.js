let currentTopicId = null;
let topics = [];
let currentMessages = [];
let allUsers = []; // 所有用户列表

// DOM 元素
const topicsList = document.getElementById('topicsList');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const chatForm = document.getElementById('chatForm');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const currentTopicTitle = document.getElementById('currentTopicTitle');
const editTopicModal = document.getElementById('editTopicModal');
const editTopicTitle = document.getElementById('editTopicTitle');
const editTopicPublic = document.getElementById('editTopicPublic');
const editUserSelectionGroup = document.getElementById('editUserSelectionGroup');
const editUserList = document.getElementById('editUserList');
const closeEditModal = document.getElementById('closeEditModal');
const cancelEdit = document.getElementById('cancelEdit');
const saveEdit = document.getElementById('saveEdit');

// 创建话题模态框元素
const createTopicModal = document.getElementById('createTopicModal');
const createTopicTitle = document.getElementById('createTopicTitle');
const createTopicPublic = document.getElementById('createTopicPublic');
const createUserSelectionGroup = document.getElementById('createUserSelectionGroup');
const createUserList = document.getElementById('createUserList');
const createEnableModel = document.getElementById('createEnableModel');
const createModelSelectionGroup = document.getElementById('createModelSelectionGroup');
const createModelName = document.getElementById('createModelName');
const closeCreateModal = document.getElementById('closeCreateModal');
const cancelCreate = document.getElementById('cancelCreate');
const saveCreate = document.getElementById('saveCreate');

// 编辑话题模态框元素（模型相关）
const editEnableModel = document.getElementById('editEnableModel');
const editModelSelectionGroup = document.getElementById('editModelSelectionGroup');
const editModelName = document.getElementById('editModelName');

// 服务提供商配置模态框元素
const providerConfigModal = document.getElementById('providerConfigModal');
const providerConfigBtn = document.getElementById('providerConfigBtn');
const providerList = document.getElementById('providerList');
const providerName = document.getElementById('providerName');
const providerApiKey = document.getElementById('providerApiKey');
const providerBaseUrl = document.getElementById('providerBaseUrl');
const providerIsDefault = document.getElementById('providerIsDefault');
const closeProviderModal = document.getElementById('closeProviderModal');
const cancelProvider = document.getElementById('cancelProvider');
const saveProvider = document.getElementById('saveProvider');

let editingProviderId = null;
let providers = [];

let editingTopicId = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadTopics();
    loadProviders();
    setupEventListeners();
    setupAutoResize();
});

// 设置事件监听
function setupEventListeners() {
    if (!newChatBtn) {
        console.error('newChatBtn 元素未找到');
        return;
    }
    
    newChatBtn.addEventListener('click', showCreateTopicModal);
    chatForm.addEventListener('submit', handleSendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });
    
    // 图片粘贴功能
    messageInput.addEventListener('paste', handlePasteImage);
    
    // 编辑话题模态框
    if (closeEditModal) closeEditModal.addEventListener('click', closeEditModalFunc);
    if (cancelEdit) cancelEdit.addEventListener('click', closeEditModalFunc);
    if (saveEdit) saveEdit.addEventListener('click', saveTopicEdit);
    if (editTopicPublic && editUserSelectionGroup) {
        editTopicPublic.addEventListener('change', () => {
            editUserSelectionGroup.style.display = editTopicPublic.checked ? 'none' : 'block';
        });
    }
    
    // 创建话题模态框
    if (closeCreateModal) closeCreateModal.addEventListener('click', closeCreateModalFunc);
    if (cancelCreate) cancelCreate.addEventListener('click', closeCreateModalFunc);
    if (saveCreate) saveCreate.addEventListener('click', saveCreateTopic);
    if (createTopicPublic && createUserSelectionGroup) {
        createTopicPublic.addEventListener('change', () => {
            createUserSelectionGroup.style.display = createTopicPublic.checked ? 'none' : 'block';
        });
    }
    
    // 点击模态框外部关闭
    if (editTopicModal) {
        editTopicModal.addEventListener('click', (e) => {
            if (e.target === editTopicModal) {
                closeEditModalFunc();
            }
        });
    }
    
    if (createTopicModal) {
        createTopicModal.addEventListener('click', (e) => {
            if (e.target === createTopicModal) {
                closeCreateModalFunc();
            }
        });
    }
    
    // 模型选择相关事件
    if (createEnableModel && createModelSelectionGroup) {
        createEnableModel.addEventListener('change', () => {
            createModelSelectionGroup.style.display = createEnableModel.checked ? 'block' : 'none';
        });
    }
    
    if (editEnableModel && editModelSelectionGroup) {
        editEnableModel.addEventListener('change', () => {
            editModelSelectionGroup.style.display = editEnableModel.checked ? 'block' : 'none';
        });
    }
    
    // 服务提供商配置
    if (providerConfigBtn) {
        providerConfigBtn.addEventListener('click', showProviderConfigModal);
    }
    if (closeProviderModal) {
        closeProviderModal.addEventListener('click', closeProviderConfigModal);
    }
    if (cancelProvider) {
        cancelProvider.addEventListener('click', closeProviderConfigModal);
    }
    if (saveProvider) {
        saveProvider.addEventListener('click', saveProviderConfig);
    }
    
    if (providerConfigModal) {
        providerConfigModal.addEventListener('click', (e) => {
            if (e.target === providerConfigModal) {
                closeProviderConfigModal();
            }
        });
    }
}

// 自动调整输入框高度
function setupAutoResize() {
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
    });
}

// 检查用户是否有权限访问话题
function hasTopicPermission(topic) {
    // 话题所有者总是有权限
    if (topic.is_owner) {
        return true;
    }
    // 公开话题所有用户都有权限
    if (topic.is_public) {
        return true;
    }
    // 私有话题：检查当前用户是否在允许的用户列表中
    // 注意：这里需要知道当前用户ID，但由于后端已经过滤，这里主要是双重检查
    // 如果后端返回了话题，说明用户有权限
    return true; // 后端已经过滤，这里信任后端的结果
}

// 加载话题列表
async function loadTopics() {
    try {
        const response = await fetch('/api/topics');
        if (response.ok) {
            const allTopics = await response.json();
            // 前端额外过滤：只显示有权限的话题（双重检查）
            topics = allTopics.filter(topic => hasTopicPermission(topic));
            renderTopics();
        }
    } catch (error) {
        console.error('加载话题失败:', error);
    }
}

// 渲染话题列表
function renderTopics() {
    topicsList.innerHTML = '';
    
    if (topics.length === 0) {
        topicsList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">暂无话题，点击 + 创建新对话</div>';
        return;
    }
    
    topics.forEach(topic => {
        const topicItem = document.createElement('div');
        topicItem.className = `topic-item ${topic.id === currentTopicId ? 'active' : ''} ${!topic.is_owner ? 'other-user' : ''}`;
        const ownerBadge = topic.is_owner ? '' : `<span class="topic-owner-badge">${escapeHtml(topic.username)}</span>`;
        const publicBadge = topic.is_public ? '<span class="topic-public-badge" title="所有用户可见">🌐</span>' : '';
        topicItem.innerHTML = `
            <div class="topic-item-content" onclick="selectTopic(${topic.id})">
                <div class="topic-item-header">
                    <div class="topic-item-title">${escapeHtml(topic.title)}</div>
                    ${ownerBadge}
                    ${publicBadge}
                </div>
                <div class="topic-item-time">${utils.formatTime(topic.updated_at)}</div>
            </div>
            ${topic.is_owner ? `
            <div class="topic-item-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); editTopic(${topic.id})" title="编辑">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn-icon" onclick="event.stopPropagation(); deleteTopic(${topic.id})" title="删除">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
            ` : ''}
        `;
        topicsList.appendChild(topicItem);
    });
}

// 选择话题
async function selectTopic(topicId) {
    currentTopicId = topicId;
    const topic = topics.find(t => t.id === topicId);
    if (topic) {
        currentTopicTitle.textContent = topic.title;
    }
    
    // 所有有权限访问话题的用户都可以发送消息
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.placeholder = '输入消息...（使用@模型来调用AI）';
    messageInput.focus();
    
    await loadMessages(topicId);
    renderTopics();
}

// 加载消息
async function loadMessages(topicId) {
    try {
        const response = await fetch(`/api/topics/${topicId}/messages`);
        if (response.ok) {
            const messages = await response.json();
            renderMessages(messages);
        }
    } catch (error) {
        console.error('加载消息失败:', error);
    }
}

// 渲染消息
function renderMessages(messages) {
    currentMessages = messages;
    chatMessages.innerHTML = '';
    
    if (messages.length === 0) {
        chatMessages.innerHTML = '<div class="welcome-message"><p>开始新的对话</p></div>';
        return;
    }
    
    messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.role}`;
        
        // 获取头像文字：用户消息显示当前用户名的首字母，助手消息显示'A'
        let avatarText = 'A';
        if (msg.role === 'user') {
            // 使用当前用户名的首字母（大写）
            const username = window.currentUsername || 'U';
            avatarText = username.charAt(0).toUpperCase();
        }
        
        let contentHtml = '';
        if (msg.image_url) {
            contentHtml += `<div class="message-image"><img src="${escapeHtml(msg.image_url)}" alt="图片" style="max-width: 100%; max-height: 400px; border-radius: 8px; cursor: pointer;" onclick="window.open('${escapeHtml(msg.image_url)}', '_blank')"></div>`;
        }
        if (msg.content) {
            contentHtml += `<div class="message-text">${escapeHtml(msg.content)}</div>`;
        }
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatarText}</div>
            <div class="message-content">${contentHtml}</div>
        `;
        chatMessages.appendChild(messageDiv);
    });
    
    scrollToBottom();
}

// 加载用户列表
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            allUsers = await response.json();
        }
    } catch (error) {
        console.error('加载用户列表失败:', error);
    }
}

// 渲染用户选择列表
function renderUserList(container, selectedUserIds = []) {
    container.innerHTML = '';
    
    if (allUsers.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">暂无其他用户</p>';
        return;
    }
    
    allUsers.forEach(user => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.style.marginBottom = '8px';
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '8px';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = user.id;
        checkbox.checked = selectedUserIds.includes(user.id);
        
        const span = document.createElement('span');
        span.textContent = user.username;
        
        label.appendChild(checkbox);
        label.appendChild(span);
        container.appendChild(label);
    });
}

// 获取选中的用户ID列表
function getSelectedUserIds(container) {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

// 显示创建话题模态框
function showCreateTopicModal() {
    if (!createTopicModal) {
        console.error('创建话题模态框元素未找到');
        return;
    }
    createTopicTitle.value = '新对话';
    createTopicPublic.checked = true;
    createUserSelectionGroup.style.display = 'none';
    createEnableModel.checked = false;
    createModelSelectionGroup.style.display = 'none';
    createModelName.value = 'gpt-3.5-turbo';
    renderUserList(createUserList, []);
    createTopicModal.classList.add('show');
    createTopicTitle.focus();
}

// 关闭创建话题模态框
function closeCreateModalFunc() {
    if (!createTopicModal) return;
    createTopicModal.classList.remove('show');
    createTopicTitle.value = '新对话';
    createTopicPublic.checked = true;
    createUserSelectionGroup.style.display = 'none';
    createEnableModel.checked = false;
    createModelSelectionGroup.style.display = 'none';
}

// 保存创建的话题
async function saveCreateTopic() {
    const title = createTopicTitle.value.trim();
    if (!title) {
        alert('话题标题不能为空');
        return;
    }
    
    const isPublic = createTopicPublic.checked;
    const allowedUserIds = isPublic ? [] : getSelectedUserIds(createUserList);
    const enableModel = createEnableModel.checked;
    const modelName = enableModel ? createModelName.value : null;
    
    try {
        const response = await fetch('/api/topics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                title: title,
                is_public: isPublic,
                allowed_user_ids: allowedUserIds,
                enable_model: enableModel,
                model_name: modelName
            })
        });
        
        if (response.ok) {
            const topic = await response.json();
            closeCreateModalFunc();
            await loadTopics();
            await selectTopic(topic.id);
        } else {
            const error = await response.json();
            alert(error.error || '创建话题失败');
        }
    } catch (error) {
        console.error('创建话题失败:', error);
        alert('创建话题失败，请重试');
    }
}

// 创建新话题（已废弃，改用 showCreateTopicModal）
async function createNewTopic() {
    showCreateTopicModal();
}

// 删除话题
async function deleteTopic(topicId) {
    if (!confirm('确定要删除这个话题吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/topics/${topicId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            if (currentTopicId === topicId) {
                currentTopicId = null;
                chatMessages.innerHTML = '<div class="welcome-message"><p>👋 欢迎使用聊天网站</p><p>点击左侧"+"按钮创建新对话，或选择一个已有的话题</p></div>';
                currentTopicTitle.textContent = '选择一个话题开始聊天';
                messageInput.disabled = true;
                messageInput.placeholder = '输入消息...';
                sendBtn.disabled = true;
            }
            await loadTopics();
        }
    } catch (error) {
        console.error('删除话题失败:', error);
    }
}

// 编辑话题
function editTopic(topicId) {
    const topic = topics.find(t => t.id === topicId);
    if (topic && topic.is_owner) {
        editingTopicId = topicId;
        editTopicTitle.value = topic.title;
        editTopicPublic.checked = topic.is_public;
        editUserSelectionGroup.style.display = topic.is_public ? 'none' : 'block';
        editEnableModel.checked = topic.enable_model || false;
        editModelSelectionGroup.style.display = editEnableModel.checked ? 'block' : 'none';
        editModelName.value = topic.model_name || 'gpt-3.5-turbo';
        renderUserList(editUserList, topic.allowed_user_ids || []);
        editTopicModal.classList.add('show');
        editTopicTitle.focus();
    }
}

// 保存话题编辑
async function saveTopicEdit() {
    if (!editingTopicId) return;
    
    const newTitle = editTopicTitle.value.trim();
    if (!newTitle) {
        alert('话题标题不能为空');
        return;
    }
    
    const isPublic = editTopicPublic.checked;
    const allowedUserIds = isPublic ? [] : getSelectedUserIds(editUserList);
    const enableModel = editEnableModel.checked;
    const modelName = enableModel ? editModelName.value : null;
    
    try {
        const response = await fetch(`/api/topics/${editingTopicId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                title: newTitle,
                is_public: isPublic,
                allowed_user_ids: allowedUserIds,
                enable_model: enableModel,
                model_name: modelName
            })
        });
        
        if (response.ok) {
            const updatedTopic = await response.json();
            closeEditModalFunc();
            await loadTopics();
            if (currentTopicId === editingTopicId) {
                currentTopicTitle.textContent = newTitle;
            }
        } else {
            const error = await response.json();
            alert(error.error || '更新话题失败');
        }
    } catch (error) {
        console.error('更新话题失败:', error);
        alert('更新话题失败，请重试');
    }
}

// 关闭编辑话题模态框
function closeEditModalFunc() {
    editTopicModal.classList.remove('show');
    editingTopicId = null;
    editTopicTitle.value = '';
    editTopicPublic.checked = true;
    editUserSelectionGroup.style.display = 'none';
    editEnableModel.checked = false;
    editModelSelectionGroup.style.display = 'none';
}

// 服务提供商配置相关函数
async function loadProviders() {
    try {
        const response = await fetch('/api/providers');
        if (response.ok) {
            providers = await response.json();
            renderProviderList();
        }
    } catch (error) {
        console.error('加载服务提供商失败:', error);
    }
}

function renderProviderList() {
    if (!providerList) return;
    providerList.innerHTML = '';
    
    if (providers.length === 0) {
        providerList.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">暂无配置，请添加服务提供商配置</p>';
        return;
    }
    
    providers.forEach(provider => {
        const item = document.createElement('div');
        item.className = 'provider-item';
        item.innerHTML = `
            <div class="provider-item-info">
                <div class="provider-item-name">${escapeHtml(provider.name)} ${provider.is_default ? '(默认)' : ''}</div>
                <div class="provider-item-details">类型: ${escapeHtml(provider.provider_type)} | URL: ${escapeHtml(provider.base_url || '默认')}</div>
            </div>
            <div class="provider-item-actions">
                <button class="btn-icon" onclick="editProvider(${provider.id})" title="编辑">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="btn-icon" onclick="deleteProvider(${provider.id})" title="删除">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
        providerList.appendChild(item);
    });
}

function showProviderConfigModal() {
    if (!providerConfigModal) {
        console.error('服务配置模态框元素未找到');
        return;
    }
    editingProviderId = null;
    if (providerName) providerName.value = '';
    if (providerApiKey) providerApiKey.value = '';
    if (providerBaseUrl) providerBaseUrl.value = '';
    if (providerIsDefault) providerIsDefault.checked = false;
    loadProviders();
    providerConfigModal.classList.add('show');
}

function closeProviderConfigModal() {
    providerConfigModal.classList.remove('show');
    editingProviderId = null;
    providerName.value = '';
    providerApiKey.value = '';
    providerBaseUrl.value = '';
    providerIsDefault.checked = false;
}

function editProvider(providerId) {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
        editingProviderId = providerId;
        providerName.value = provider.name;
        providerApiKey.value = '***'; // 不显示真实密钥
        providerBaseUrl.value = provider.base_url || '';
        providerIsDefault.checked = provider.is_default;
        providerConfigModal.classList.add('show');
    }
}

async function deleteProvider(providerId) {
    if (!confirm('确定要删除此配置吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/providers/${providerId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadProviders();
        }
    } catch (error) {
        console.error('删除配置失败:', error);
        alert('删除配置失败，请重试');
    }
}

async function saveProviderConfig() {
    const name = providerName.value.trim();
    const apiKey = providerApiKey.value.trim();
    const baseUrl = providerBaseUrl.value.trim() || null;
    const isDefault = providerIsDefault.checked;
    
    if (!name) {
        alert('配置名称不能为空');
        return;
    }
    
    if (!apiKey || apiKey === '***') {
        alert('API密钥不能为空');
        return;
    }
    
    try {
        const url = editingProviderId ? `/api/providers/${editingProviderId}` : '/api/providers';
        const method = editingProviderId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                api_key: apiKey,
                base_url: baseUrl,
                provider_type: 'openai',
                is_default: isDefault
            })
        });
        
        if (response.ok) {
            closeProviderConfigModal();
            await loadProviders();
        } else {
            const error = await response.json();
            alert(error.error || '保存配置失败');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        alert('保存配置失败，请重试');
    }
}

// 发送消息
// 处理图片粘贴
async function handlePasteImage(e) {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            
            const file = items[i].getAsFile();
            if (!file) return;
            
            // 检查文件大小（限制为10MB）
            if (file.size > 10 * 1024 * 1024) {
                alert('图片大小不能超过10MB');
                return;
            }
            
            // 转换为base64
            const reader = new FileReader();
            reader.onload = async (event) => {
                const imageData = event.target.result;
                
                try {
                    // 上传图片
                    const uploadResponse = await fetch('/api/upload-image', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            image_data: imageData
                        })
                    });
                    
                    if (uploadResponse.ok) {
                        const result = await uploadResponse.json();
                        const imageUrl = result.image_url;
                        
                        // 如果有当前话题，直接发送图片消息
                        if (currentTopicId) {
                            await sendImageMessage(imageUrl, '');
                        } else {
                            // 如果没有话题，提示用户先选择话题
                            alert('请先选择一个话题');
                        }
                    } else {
                        const error = await uploadResponse.json();
                        alert(error.error || '图片上传失败');
                    }
                } catch (error) {
                    console.error('图片上传失败:', error);
                    alert('图片上传失败，请重试');
                }
            };
            reader.readAsDataURL(file);
            break;
        }
    }
}

// 发送图片消息
async function sendImageMessage(imageUrl, textContent = '') {
    if (!currentTopicId) {
        alert('请先选择一个话题');
        return;
    }
    
    // 添加用户消息到界面
    const userMessage = {
        id: Date.now(),
        role: 'user',
        content: textContent,
        image_url: imageUrl,
        created_at: new Date().toISOString()
    };
    
    currentMessages.push(userMessage);
    renderMessages([...currentMessages]);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // 发送到服务器
    try {
        const response = await fetch(`/api/topics/${currentTopicId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                role: 'user',
                content: textContent,
                image_url: imageUrl
            })
        });
        
        if (response.ok) {
            const savedMessage = await response.json();
            userMessage.id = savedMessage.id;
            
            // 检查是否需要调用AI（如果消息包含@模型关键词）
            const shouldCallAI = textContent && (
                textContent.toLowerCase().includes('@模型') ||
                textContent.toLowerCase().includes('@model') ||
                textContent.toLowerCase().includes('@ai') ||
                textContent.toLowerCase().includes('@assistant') ||
                textContent.toLowerCase().includes('@助手')
            );
            
            if (shouldCallAI) {
                // AI回复逻辑会在后端处理
                await loadMessages(currentTopicId);
            }
        } else {
            const error = await response.json();
            alert(error.error || '发送消息失败');
            // 从界面移除失败的消息
            currentMessages = currentMessages.filter(m => m.id !== userMessage.id);
            renderMessages([...currentMessages]);
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        alert('发送消息失败，请重试');
        // 从界面移除失败的消息
        currentMessages = currentMessages.filter(m => m.id !== userMessage.id);
        renderMessages([...currentMessages]);
    }
}

async function handleSendMessage(e) {
    e.preventDefault();
    
    if (!currentTopicId) {
        alert('请先选择一个话题');
        return;
    }
    
    const content = messageInput.value.trim();
    if (!content) {
        return;
    }
    
    // 添加用户消息到界面
    const userMessage = {
        id: Date.now(),
        role: 'user',
        content: content,
        created_at: new Date().toISOString()
    };
    
    currentMessages.push(userMessage);
    renderMessages([...currentMessages]);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // 发送到服务器
    try {
        const response = await fetch(`/api/topics/${currentTopicId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                role: 'user',
                content: content
            })
        });
        
        if (response.ok) {
            const savedMessage = await response.json();
            // 更新消息 ID
            userMessage.id = savedMessage.id;
            
            // 模拟助手回复（实际应用中应该调用 AI API）
            setTimeout(async () => {
                const assistantResponse = generateAssistantResponse(content);
                
                const assistantMessage = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: assistantResponse,
                    created_at: new Date().toISOString()
                };
                
                currentMessages.push(assistantMessage);
                renderMessages([...currentMessages]);
                
                // 保存助手消息
                const assistantResponse_fetch = await fetch(`/api/topics/${currentTopicId}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        role: 'assistant',
                        content: assistantResponse
                    })
                });
                
                if (assistantResponse_fetch.ok) {
                    const savedAssistantMessage = await assistantResponse_fetch.json();
                    assistantMessage.id = savedAssistantMessage.id;
                }
            }, 500);
            
            await loadTopics(); // 更新话题列表（更新时间）
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        alert('发送消息失败，请重试');
        // 移除失败的消息
        currentMessages = currentMessages.filter(m => m.id !== userMessage.id);
        renderMessages([...currentMessages]);
    }
}



// 滚动到底部
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

