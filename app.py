from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, ChatTopic, Message, ProviderConfig
from datetime import datetime
import os
from openai import OpenAI

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chat.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = '请先登录以访问此页面。'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('chat'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('chat'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password_hash, password):
            login_user(user, remember=True)
            return redirect(url_for('chat'))
        else:
            flash('用户名或密码错误', 'error')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('chat'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if not username or not password:
            flash('请填写所有字段', 'error')
            return render_template('register.html')
        
        if password != confirm_password:
            flash('两次输入的密码不一致', 'error')
            return render_template('register.html')
        
        if User.query.filter_by(username=username).first():
            flash('用户名已存在', 'error')
            return render_template('register.html')
        
        user = User(
            username=username,
            password_hash=generate_password_hash(password)
        )
        db.session.add(user)
        db.session.commit()
        
        flash('注册成功，请登录', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    if request.method == 'POST':
        old_password = request.form.get('old_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')
        
        if not old_password or not new_password or not confirm_password:
            flash('请填写所有字段', 'error')
            return render_template('change_password.html')
        
        if new_password != confirm_password:
            flash('两次输入的新密码不一致', 'error')
            return render_template('change_password.html')
        
        if not check_password_hash(current_user.password_hash, old_password):
            flash('原密码错误', 'error')
            return render_template('change_password.html')
        
        current_user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        flash('密码修改成功', 'success')
        return redirect(url_for('chat'))
    
    return render_template('change_password.html')

@app.route('/admin')
@login_required
def admin():
    # 检查是否为管理员
    if not current_user.is_admin:
        flash('您没有管理员权限', 'error')
        return redirect(url_for('chat'))
    return render_template('admin.html')

@app.route('/api/admin/users', methods=['GET'])
@login_required
def get_all_users():
    """获取所有用户（管理员功能）"""
    if not current_user.is_admin:
        return jsonify({'error': '无权访问'}), 403
    
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([{
        'id': user.id,
        'username': user.username,
        'is_admin': user.is_admin,
        'created_at': user.created_at.isoformat()
    } for user in users])

@app.route('/api/admin/users/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    """更新用户信息（管理员功能）"""
    if not current_user.is_admin:
        return jsonify({'error': '无权访问'}), 403
    
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    
    if 'is_admin' in data:
        # 不能取消自己的管理员权限
        if user_id == current_user.id and not data.get('is_admin'):
            return jsonify({'error': '不能取消自己的管理员权限'}), 400
        user.is_admin = data.get('is_admin')
    
    if 'password' in data and data.get('password'):
        user.password_hash = generate_password_hash(data.get('password'))
    
    db.session.commit()
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'is_admin': user.is_admin
    })

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    """删除用户（管理员功能）"""
    if not current_user.is_admin:
        return jsonify({'error': '无权访问'}), 403
    
    user = User.query.get_or_404(user_id)
    
    # 不能删除自己
    if user_id == current_user.id:
        return jsonify({'error': '不能删除自己的账户'}), 400
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/chat')
@login_required
def chat():
    return render_template('chat.html')

@app.route('/api/users', methods=['GET'])
@login_required
def get_users():
    """获取所有用户列表（用于权限选择）"""
    users = User.query.order_by(User.username.asc()).all()
    return jsonify([{
        'id': user.id,
        'username': user.username
    } for user in users])

@app.route('/api/topics', methods=['GET'])
@login_required
def get_topics():
    # 只返回用户有权限访问的话题：
    # 1. 公开话题 (is_public == True)
    # 2. 用户自己创建的话题 (user_id == current_user.id)
    # 3. 用户被明确授权访问的私有话题 (在 topic_permissions 表中)
    from sqlalchemy import or_, and_
    from models import topic_permissions
    
    # 获取用户有权限访问的私有话题ID列表
    allowed_topic_ids = [row[0] for row in db.session.query(topic_permissions.c.topic_id).filter(
        topic_permissions.c.user_id == current_user.id
    ).all()]
    
    # 构建查询条件：只显示有权限的话题
    conditions = [
        # 条件1: 公开话题（所有用户可见）
        ChatTopic.is_public == True,
        # 条件2: 用户自己创建的话题（所有者总是有权限）
        ChatTopic.user_id == current_user.id
    ]
    
    # 条件3: 用户被明确授权访问的私有话题
    if allowed_topic_ids:
        conditions.append(ChatTopic.id.in_(allowed_topic_ids))
    
    # 使用 OR 连接所有条件，确保只返回满足任一条件的话题
    topics = ChatTopic.query.filter(or_(*conditions)).order_by(ChatTopic.updated_at.desc()).all()
    
    # 额外过滤：确保返回的话题确实有权限（双重检查）
    filtered_topics = []
    for topic in topics:
        has_permission = (
            topic.is_public or  # 公开话题
            topic.user_id == current_user.id or  # 自己的话题
            current_user.id in [user.id for user in topic.allowed_users]  # 在授权列表中
        )
        if has_permission:
            filtered_topics.append(topic)
    
    return jsonify([{
        'id': topic.id,
        'title': topic.title,
        'user_id': topic.user_id,
        'username': topic.user.username,
        'is_public': topic.is_public,
        'is_owner': topic.user_id == current_user.id,
        'enable_model': topic.enable_model,
        'model_name': topic.model_name,
        'allowed_user_ids': [user.id for user in topic.allowed_users],
        'created_at': topic.created_at.isoformat(),
        'updated_at': topic.updated_at.isoformat()
    } for topic in filtered_topics])

@app.route('/api/topics', methods=['POST'])
@login_required
def create_topic():
    data = request.get_json()
    title = data.get('title', '新对话')
    is_public = data.get('is_public', True)  # 默认公开
    allowed_user_ids = data.get('allowed_user_ids', [])  # 允许访问的用户ID列表
    enable_model = data.get('enable_model', False)  # 是否启用模型
    model_name = data.get('model_name', None)  # 模型名称
    
    topic = ChatTopic(
        user_id=current_user.id,
        title=title,
        is_public=is_public,
        enable_model=enable_model,
        model_name=model_name
    )
    db.session.add(topic)
    db.session.flush()  # 获取 topic.id
    
    # 如果设置了特定用户权限，添加这些用户
    if not is_public and allowed_user_ids:
        for user_id in allowed_user_ids:
            user = User.query.get(user_id)
            if user and user.id != current_user.id:  # 不添加自己（所有者总是有权限）
                topic.allowed_users.append(user)
    
    db.session.commit()
    
    return jsonify({
        'id': topic.id,
        'title': topic.title,
        'user_id': topic.user_id,
        'username': topic.user.username,
        'is_public': topic.is_public,
        'is_owner': True,
        'enable_model': topic.enable_model,
        'model_name': topic.model_name,
        'allowed_user_ids': [user.id for user in topic.allowed_users],
        'created_at': topic.created_at.isoformat(),
        'updated_at': topic.updated_at.isoformat()
    }), 201

@app.route('/api/topics/<int:topic_id>', methods=['DELETE'])
@login_required
def delete_topic(topic_id):
    topic = ChatTopic.query.get_or_404(topic_id)
    
    if topic.user_id != current_user.id:
        return jsonify({'error': '无权访问'}), 403
    
    db.session.delete(topic)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/topics/<int:topic_id>', methods=['PUT'])
@login_required
def update_topic(topic_id):
    topic = ChatTopic.query.get_or_404(topic_id)
    
    if topic.user_id != current_user.id:
        return jsonify({'error': '无权访问'}), 403
    
    data = request.get_json()
    if 'title' in data:
        topic.title = data.get('title')
    if 'is_public' in data:
        topic.is_public = data.get('is_public')
    if 'enable_model' in data:
        topic.enable_model = data.get('enable_model')
    if 'model_name' in data:
        topic.model_name = data.get('model_name')
    
    # 更新允许访问的用户列表
    if 'allowed_user_ids' in data:
        allowed_user_ids = data.get('allowed_user_ids', [])
        # 清空现有权限
        topic.allowed_users.clear()
        # 添加新权限
        if not topic.is_public and allowed_user_ids:
            for user_id in allowed_user_ids:
                user = User.query.get(user_id)
                if user and user.id != current_user.id:  # 不添加自己
                    topic.allowed_users.append(user)
    
    db.session.commit()
    
    return jsonify({
        'id': topic.id,
        'title': topic.title,
        'user_id': topic.user_id,
        'username': topic.user.username,
        'is_public': topic.is_public,
        'is_owner': True,
        'enable_model': topic.enable_model,
        'model_name': topic.model_name,
        'allowed_user_ids': [user.id for user in topic.allowed_users],
        'updated_at': topic.updated_at.isoformat()
    })

@app.route('/api/topics/<int:topic_id>/messages', methods=['GET'])
@login_required
def get_messages(topic_id):
    topic = ChatTopic.query.get_or_404(topic_id)
    
    # 允许查看公开话题、自己的话题、或有权限访问的话题
    from models import topic_permissions
    has_permission = (
        topic.is_public or 
        topic.user_id == current_user.id or
        current_user.id in [user.id for user in topic.allowed_users]
    )
    
    if not has_permission:
        return jsonify({'error': '无权访问'}), 403
    
    messages = Message.query.filter_by(topic_id=topic_id).order_by(Message.created_at.asc()).all()
    return jsonify([{
        'id': msg.id,
        'role': msg.role,
        'content': msg.content,
        'created_at': msg.created_at.isoformat()
    } for msg in messages])

@app.route('/api/topics/<int:topic_id>/messages', methods=['POST'])
@login_required
def create_message(topic_id):
    topic = ChatTopic.query.get_or_404(topic_id)
    
    # 检查用户是否有权限访问此话题
    from models import topic_permissions
    has_permission = (
        topic.is_public or 
        topic.user_id == current_user.id or
        current_user.id in [user.id for user in topic.allowed_users]
    )
    
    if not has_permission:
        return jsonify({'error': '无权访问此话题'}), 403
    
    data = request.get_json()
    role = data.get('role', 'user')
    content = data.get('content', '')
    
    if not content:
        return jsonify({'error': '消息内容不能为空'}), 400
    
    message = Message(
        topic_id=topic_id,
        role=role,
        content=content
    )
    db.session.add(message)
    
    # 更新话题的更新时间
    topic.updated_at = datetime.utcnow()
    db.session.commit()
    
    # 检查是否@模型（消息中包含@模型或@model等关键词）
    should_call_ai = False
    if role == 'user' and topic.enable_model:
        # 检查消息中是否包含@模型相关的关键词
        content_lower = content.lower()
        ai_keywords = ['@模型', '@model', '@ai', '@assistant', '@助手']
        should_call_ai = any(keyword in content_lower for keyword in ai_keywords)
    
    # 只有@模型时才调用AI生成回复
    if should_call_ai:
        try:
            # 移除@关键词，只保留实际内容
            clean_content = content
            for keyword in ai_keywords:
                clean_content = clean_content.replace(keyword, '').replace(keyword.upper(), '').replace(keyword.capitalize(), '')
            clean_content = clean_content.strip()
            
            if clean_content:
                assistant_content = generate_ai_response(topic_id, clean_content, topic.model_name)
                if assistant_content:
                    assistant_message = Message(
                        topic_id=topic_id,
                        role='assistant',
                        content=assistant_content
                    )
                    db.session.add(assistant_message)
                    topic.updated_at = datetime.utcnow()
                    db.session.commit()
        except Exception as e:
            print(f"AI回复生成失败: {e}")
            # 即使AI失败，用户消息也已经保存
    
    return jsonify({
        'id': message.id,
        'role': message.role,
        'content': message.content,
        'created_at': message.created_at.isoformat()
    }), 201

def generate_ai_response(topic_id, user_message, model_name=None):
    """调用OpenAI API生成回复"""
    # 获取默认或指定的服务提供商配置
    provider = ProviderConfig.query.filter_by(is_default=True).first()
    if not provider:
        providers = ProviderConfig.query.all()
        if not providers:
            raise Exception("未配置服务提供商")
        provider = providers[0]
    
    # 如果指定了模型名称，使用指定的模型，否则使用默认模型
    if not model_name:
        model_name = "gpt-3.5-turbo"  # 默认模型
    
    # 获取历史消息
    messages = Message.query.filter_by(topic_id=topic_id).order_by(Message.created_at.asc()).all()
    
    # 构建消息列表（只包含最近的对话，避免token过多）
    conversation_messages = []
    # 保留最近的10轮对话
    recent_messages = messages[-20:] if len(messages) > 20 else messages
    
    for msg in recent_messages:
        conversation_messages.append({
            'role': msg.role,
            'content': msg.content
        })
    
    # 创建OpenAI客户端
    client_kwargs = {
        'api_key': provider.api_key
    }
    if provider.base_url:
        client_kwargs['base_url'] = provider.base_url
    
    client = OpenAI(**client_kwargs)
    
    # 调用API
    response = client.chat.completions.create(
        model=model_name,
        messages=conversation_messages,
        temperature=0.7,
        max_tokens=1000
    )
    
    return response.choices[0].message.content

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # 尝试迁移现有数据库
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            table_names = inspector.get_table_names()
            
            # 检查并添加 chat_topic 表的新字段
            if 'chat_topic' in table_names:
                columns = [col['name'] for col in inspector.get_columns('chat_topic')]
                
                # 添加 is_public 字段
                if 'is_public' not in columns:
                    if 'sqlite' in str(db.engine.url):
                        db.session.execute(text('ALTER TABLE chat_topic ADD COLUMN is_public BOOLEAN'))
                        db.session.execute(text('UPDATE chat_topic SET is_public = 1 WHERE is_public IS NULL'))
                    else:
                        db.session.execute(text('ALTER TABLE chat_topic ADD COLUMN is_public BOOLEAN DEFAULT 1'))
                    db.session.commit()
                    print("✓ 数据库已自动迁移：添加了 is_public 字段")
                
                # 添加 enable_model 字段
                if 'enable_model' not in columns:
                    if 'sqlite' in str(db.engine.url):
                        db.session.execute(text('ALTER TABLE chat_topic ADD COLUMN enable_model BOOLEAN'))
                        db.session.execute(text('UPDATE chat_topic SET enable_model = 0 WHERE enable_model IS NULL'))
                    else:
                        db.session.execute(text('ALTER TABLE chat_topic ADD COLUMN enable_model BOOLEAN DEFAULT 0'))
                    db.session.commit()
                    print("✓ 数据库已自动迁移：添加了 enable_model 字段")
                
                # 添加 model_name 字段
                if 'model_name' not in columns:
                    if 'sqlite' in str(db.engine.url):
                        db.session.execute(text('ALTER TABLE chat_topic ADD COLUMN model_name VARCHAR(100)'))
                    else:
                        db.session.execute(text('ALTER TABLE chat_topic ADD COLUMN model_name VARCHAR(100)'))
                    db.session.commit()
                    print("✓ 数据库已自动迁移：添加了 model_name 字段")
            
            # 检查并创建新表
            if 'topic_permissions' not in table_names:
                db.create_all()
                print("✓ 数据库已自动迁移：创建了 topic_permissions 表")
            
            if 'provider_config' not in table_names:
                db.create_all()
                print("✓ 数据库已自动迁移：创建了 provider_config 表")
            
            # 检查并添加 user 表的 is_admin 字段
            if 'user' in table_names:
                user_columns = [col['name'] for col in inspector.get_columns('user')]
                if 'is_admin' not in user_columns:
                    if 'sqlite' in str(db.engine.url):
                        db.session.execute(text('ALTER TABLE user ADD COLUMN is_admin BOOLEAN'))
                        db.session.execute(text('UPDATE user SET is_admin = 0 WHERE is_admin IS NULL'))
                        db.session.execute(text('UPDATE user SET is_admin = 1 WHERE username = "admin"'))
                    else:
                        db.session.execute(text('ALTER TABLE user ADD COLUMN is_admin BOOLEAN DEFAULT 0'))
                        db.session.execute(text('UPDATE user SET is_admin = 1 WHERE username = \'admin\''))
                    db.session.commit()
                    print("✓ 数据库已自动迁移：添加了 is_admin 字段")
                
        except Exception as e:
            print(f"数据库迁移检查完成（如果这是首次运行，这是正常的）")
            import traceback
            traceback.print_exc()
    app.run(debug=True, host='0.0.0.0', port=5000)

