let currentTopicId = null;
let topics = [];
let currentMessages = [];
let allUsers = []; // 所有用户列表
let messagePollInterval = null; // 消息轮询定时器
let lastMessageId = null; // 最后一条消息的ID，用于检测新消息

// DOM 元素
const topicsList = document.getElementById('topicsList');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const chatForm = document.getElementById('chatForm');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const currentTopicTitle = document.getElementById('currentTopicTitle');
const deleteCurrentTopicBtn = document.getElementById('deleteCurrentTopicBtn');
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
const providerModelName = document.getElementById('providerModelName');
const testResult = document.getElementById('testResult');
const testProviderBtn = document.getElementById('testProvider');
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

// 页面卸载时停止轮询
window.addEventListener('beforeunload', () => {
    stopMessagePolling();
});

// 设置事件监听
function setupEventListeners() {
    if (!newChatBtn) {
        console.error('newChatBtn 元素未找到');
        return;
    }
    
    newChatBtn.addEventListener('click', showCreateTopicModal);
    chatForm.addEventListener('submit', handleSendMessage);
    if (deleteCurrentTopicBtn) {
        deleteCurrentTopicBtn.addEventListener('click', () => {
            if (currentTopicId) {
                deleteTopic(currentTopicId);
            }
        });
    }
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
    
    if (testProviderBtn) {
        testProviderBtn.addEventListener('click', testProviderConfig);
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
    // 停止之前的轮询
    stopMessagePolling();
    
    currentTopicId = topicId;
    const topic = topics.find(t => t.id === topicId);
    if (topic) {
        currentTopicTitle.textContent = topic.title;
        if (deleteCurrentTopicBtn) {
            deleteCurrentTopicBtn.style.display = topic.is_owner ? 'inline-flex' : 'none';
        }
    }
    
    // 所有有权限访问话题的用户都可以发送消息
    messageInput.disabled = false;
    sendBtn.disabled = false;
    // 构建提示信息，显示可用的配置名称
    let placeholderText = '输入消息...（使用@llm或@配置名称来调用AI）';
    if (providers && providers.length > 0) {
        const providerNames = providers.map(p => p.name).join('、');
        placeholderText = `输入消息...（使用@llm或@${providerNames}来调用AI）`;
    }
    messageInput.placeholder = placeholderText;
    messageInput.focus();
    
    // 强制更新（首次加载）
    await loadMessages(topicId, false, true);
    renderTopics();
    
    // 启动消息轮询
    startMessagePolling(topicId);
}

// 加载消息
async function loadMessages(topicId, preserveScroll = false, forceUpdate = false) {
    try {
        const response = await fetch(`/api/topics/${topicId}/messages`);
        if (response.ok) {
            const messages = await response.json();
            
            // 检测是否有新消息：比较最后一条消息的ID
            const latestMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
            const hasNewMessages = forceUpdate || (latestMessageId !== null && latestMessageId !== lastMessageId);
            
            // 只有在有新消息时才更新DOM
            if (hasNewMessages) {
                lastMessageId = latestMessageId;
                renderMessages(messages, preserveScroll);
            }
            
            return messages;
        }
    } catch (error) {
        console.error('加载消息失败:', error);
    }
    return null;
}

// 渲染消息
function renderMessages(messages, preserveScroll = false) {
    // 检查是否有新消息（通过比较消息ID）
    const hadNewMessages = currentMessages.length > 0 && messages.length > currentMessages.length;
    const wasAtBottom = isScrolledToBottom();
    
    // 如果消息数量相同且ID都匹配，说明没有新消息，不需要更新DOM
    if (currentMessages.length === messages.length && currentMessages.length > 0) {
        const currentLastId = currentMessages[currentMessages.length - 1].id;
        const newLastId = messages[messages.length - 1].id;
        if (currentLastId === newLastId) {
            // 没有新消息，不需要更新
            return;
        }
    }
    
    // 如果只是新增了消息，可以增量添加而不是重建整个DOM
    if (hadNewMessages && currentMessages.length > 0) {
        // 找到新增的消息
        const existingIds = new Set(currentMessages.map(m => m.id));
        const newMessages = messages.filter(m => !existingIds.has(m.id));
        
        if (newMessages.length > 0) {
            // 只添加新消息
            newMessages.forEach(msg => {
                const messageDiv = createMessageElement(msg);
                chatMessages.appendChild(messageDiv);
            });
            
            // 更新当前消息列表
            currentMessages = messages;
            
            // 如果用户在底部，自动滚动
            if (wasAtBottom) {
                scrollToBottom();
            }
            return;
        }
    }
    
    // 需要完全重建DOM（首次加载、消息被删除等情况）
    currentMessages = messages;
    chatMessages.innerHTML = '';
    
    if (messages.length === 0) {
        chatMessages.innerHTML = '<div class="welcome-message"><p>开始新的对话</p></div>';
        return;
    }
    
    messages.forEach(msg => {
        const messageDiv = createMessageElement(msg);
        chatMessages.appendChild(messageDiv);
    });
    
    // 只有在以下情况才自动滚动到底部：
    // 1. 用户原本就在底部（wasAtBottom）
    // 2. 有新消息（hadNewMessages）
    // 3. 不要求保持滚动位置（!preserveScroll）
    if (!preserveScroll || (wasAtBottom && hadNewMessages)) {
        scrollToBottom();
    }
}

// 创建消息元素
function createMessageElement(msg) {
    const messageDiv = document.createElement('div');
    const senderName = msg.username || (msg.role === 'assistant' ? 'LLM' : (window.currentUsername || 'U'));
    const isSelf = senderName === (window.currentUsername || '');
    messageDiv.className = `message ${isSelf ? 'self' : 'other'}`;
    
    // 获取头像文字：使用发送消息的用户名的前三个字符
    const avatarText = Array.from(senderName).slice(0, 3).join('').toUpperCase();
    
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
    return messageDiv;
}

// 检查是否滚动到底部
function isScrolledToBottom() {
    const threshold = 100; // 允许100px的误差
    return chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < threshold;
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
                stopMessagePolling();
                currentTopicId = null;
                chatMessages.innerHTML = '<div class="welcome-message"><p>👋 欢迎使用聊天网站</p><p>点击左侧"+"按钮创建新对话，或选择一个已有的话题</p></div>';
                currentTopicTitle.textContent = '选择一个话题开始聊天';
                messageInput.disabled = true;
                messageInput.placeholder = '输入消息...';
                sendBtn.disabled = true;
                if (deleteCurrentTopicBtn) {
                    deleteCurrentTopicBtn.style.display = 'none';
                }
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
            // 如果当前有选中的话题，更新输入框提示
            if (currentTopicId && messageInput && !messageInput.disabled) {
                let placeholderText = '输入消息...（使用@llm或@配置名称来调用AI）';
                if (providers && providers.length > 0) {
                    const providerNames = providers.map(p => p.name).join('、');
                    placeholderText = `输入消息...（使用@llm或@${providerNames}来调用AI）`;
                }
                messageInput.placeholder = placeholderText;
            }
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
        const modelInfo = provider.model_name ? ` | 模型: ${escapeHtml(provider.model_name)}` : '';
        item.innerHTML = `
            <div class="provider-item-info">
                <div class="provider-item-name">${escapeHtml(provider.name)} ${provider.is_default ? '(默认)' : ''}</div>
                <div class="provider-item-details">类型: ${escapeHtml(provider.provider_type)} | URL: ${escapeHtml(provider.base_url || '默认')}${modelInfo}</div>
            </div>
            <div class="provider-item-actions">
                <button class="btn-icon" onclick="testProviderFromList(${provider.id}, event)" title="测试连接" style="color: #4CAF50;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                </button>
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
    if (providerModelName) providerModelName.value = '';
    if (providerIsDefault) providerIsDefault.checked = false;
    if (testResult) {
        testResult.style.display = 'none';
        testResult.innerHTML = '';
    }
    loadProviders();
    providerConfigModal.classList.add('show');
}

function closeProviderConfigModal() {
    providerConfigModal.classList.remove('show');
    editingProviderId = null;
    providerName.value = '';
    providerApiKey.value = '';
    providerBaseUrl.value = '';
    if (providerModelName) providerModelName.value = '';
    providerIsDefault.checked = false;
    if (testResult) {
        testResult.style.display = 'none';
        testResult.innerHTML = '';
    }
}

function editProvider(providerId) {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
        editingProviderId = providerId;
        providerName.value = provider.name;
        providerApiKey.value = '***'; // 不显示真实密钥
        providerBaseUrl.value = provider.base_url || '';
        if (providerModelName) providerModelName.value = provider.model_name || '';
        providerIsDefault.checked = provider.is_default;
        if (testResult) {
            testResult.style.display = 'none';
            testResult.innerHTML = '';
        }
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

// 测试服务提供商配置
async function testProviderConfig() {
    const apiKey = providerApiKey.value.trim();
    const baseUrl = providerBaseUrl.value.trim() || null;
    // 使用配置的模型名称，如果没有则使用默认值
    const modelName = providerModelName ? providerModelName.value.trim() || 'gpt-3.5-turbo' : 'gpt-3.5-turbo';
    
    if (!apiKey || apiKey === '***') {
        showTestResult('请先输入API密钥', false);
        return;
    }
    
    // 显示测试中状态
    if (testResult) {
        testResult.style.display = 'block';
        testResult.style.backgroundColor = '#fff3cd';
        testResult.style.color = '#856404';
        testResult.style.border = '1px solid #ffc107';
        testResult.innerHTML = '🔄 正在测试连接...';
    }
    
    // 禁用测试按钮
    if (testProviderBtn) {
        testProviderBtn.disabled = true;
        testProviderBtn.textContent = '测试中...';
    }
    
    try {
        const response = await fetch('/api/providers/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_key: apiKey,
                base_url: baseUrl,
                provider_type: 'openai',
                model_name: modelName
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showTestResult(`✅ 测试成功！\n模型: ${result.model}\n回复: ${result.reply}`, true);
        } else {
            showTestResult(`❌ 测试失败: ${result.error || '未知错误'}`, false);
        }
    } catch (error) {
        console.error('测试失败:', error);
        showTestResult(`❌ 测试失败: 网络错误，请检查网络连接`, false);
    } finally {
        // 恢复测试按钮
        if (testProviderBtn) {
            testProviderBtn.disabled = false;
            testProviderBtn.textContent = '测试连接';
        }
    }
}

// 从列表测试服务提供商（使用已保存的配置）
async function testProviderFromList(providerId, event) {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) {
        alert('找不到该配置');
        return;
    }
    
    // 显示测试中提示
    let testBtn = null;
    let originalText = '';
    if (event && event.target) {
        testBtn = event.target.closest('button');
        if (testBtn) {
            originalText = testBtn.innerHTML;
            testBtn.disabled = true;
            testBtn.innerHTML = '测试中...';
        }
    }
    
    try {
        // 使用配置中保存的模型名称，如果没有则使用默认值
        const modelName = provider.model_name || 'gpt-3.5-turbo';
        const response = await fetch('/api/providers/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider_id: providerId,
                model_name: modelName
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            alert(`✅ 测试成功！\n\n模型: ${result.model}\n回复: ${result.reply}`);
        } else {
            alert(`❌ 测试失败: ${result.error || '未知错误'}`);
        }
    } catch (error) {
        console.error('测试失败:', error);
        alert('❌ 测试失败: 网络错误，请检查网络连接');
    } finally {
        if (testBtn) {
            testBtn.disabled = false;
            testBtn.innerHTML = originalText;
        }
    }
}

// 显示测试结果
function showTestResult(message, success) {
    if (!testResult) return;
    
    testResult.style.display = 'block';
    testResult.style.whiteSpace = 'pre-line';
    testResult.style.lineHeight = '1.6';
    
    if (success) {
        testResult.style.backgroundColor = '#d4edda';
        testResult.style.color = '#155724';
        testResult.style.border = '1px solid #c3e6cb';
    } else {
        testResult.style.backgroundColor = '#f8d7da';
        testResult.style.color = '#721c24';
        testResult.style.border = '1px solid #f5c6cb';
    }
    
    testResult.innerHTML = message;
}

async function saveProviderConfig() {
    const name = providerName.value.trim();
    const apiKey = providerApiKey.value.trim();
    const baseUrl = providerBaseUrl.value.trim() || null;
    const modelName = providerModelName ? providerModelName.value.trim() || null : null;
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
        
        const requestBody = {
            name: name,
            api_key: apiKey,
            base_url: baseUrl,
            provider_type: 'openai',
            is_default: isDefault
        };
        
        // 只有在编辑时如果API密钥是***，不发送api_key字段
        if (editingProviderId && apiKey === '***') {
            delete requestBody.api_key;
        }
        
        // 添加模型名称
        if (modelName) {
            requestBody.model_name = modelName;
        } else if (editingProviderId) {
            // 编辑时，如果清空了模型名称，也需要发送null
            requestBody.model_name = null;
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
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

            if (!currentTopicId) {
                alert('请先选择一个话题');
                return;
            }
            
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
                            image_data: imageData,
                            topic_id: currentTopicId
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
        username: window.currentUsername || 'U',
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
            
            // 更新最后一条消息ID
            lastMessageId = savedMessage.id;
            
            // 重新加载消息以获取服务器返回的完整消息（包括可能的AI回复）
            // forceUpdate = true，因为这是用户刚发送的消息，需要立即显示
            await loadMessages(currentTopicId, false, true);
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
        username: window.currentUsername || 'U',
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
            
            // 更新最后一条消息ID
            lastMessageId = savedMessage.id;
            
            // 重新加载消息以获取服务器返回的完整消息（包括可能的AI回复）
            // forceUpdate = true，因为这是用户刚发送的消息，需要立即显示
            await loadMessages(currentTopicId, false, true);
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

function shouldCallLlm(content) {
    if (!content) {
        return false;
    }
    const patterns = [
        /@\s*llm\b/i,
        /@模型/i,
        /@model/i,
        /@ai/i,
        /@assistant/i,
        /@助手/i
    ];
    if (patterns.some(pattern => pattern.test(content))) {
        return true;
    }
    if (providers && providers.length > 0) {
        return providers.some(provider => {
            if (!provider || !provider.name) {
                return false;
            }
            const escapedName = provider.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`@\\s*${escapedName}\\b`, 'i');
            return pattern.test(content);
        });
    }
    return false;
}

// 启动消息轮询
function startMessagePolling(topicId) {
    // 清除之前的轮询
    stopMessagePolling();
    
    if (!topicId) {
        return;
    }
    
    // 每2秒轮询一次新消息（只在有新消息时才更新DOM）
    messagePollInterval = setInterval(async () => {
        if (currentTopicId === topicId) {
            // preserveScroll = true，保持滚动位置；forceUpdate = false，只在有新消息时更新
            await loadMessages(topicId, true, false);
        } else {
            // 如果话题已切换，停止轮询
            stopMessagePolling();
        }
    }, 2000); // 2秒轮询一次
}

// 停止消息轮询
function stopMessagePolling() {
    if (messagePollInterval) {
        clearInterval(messagePollInterval);
        messagePollInterval = null;
    }
    lastMessageId = null;
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
