from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)  # 是否为管理员
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    topics = db.relationship('ChatTopic', backref='user', lazy=True, cascade='all, delete-orphan')

# 话题权限关联表（多对多关系）
topic_permissions = db.Table('topic_permissions',
    db.Column('topic_id', db.Integer, db.ForeignKey('chat_topic.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True)
)

class ChatTopic(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False, default='新对话')
    is_public = db.Column(db.Boolean, default=True, nullable=False)  # 默认所有用户可见
    enable_model = db.Column(db.Boolean, default=False, nullable=False)  # 是否启用模型
    model_name = db.Column(db.String(100), nullable=True)  # 模型名称
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    messages = db.relationship('Message', backref='topic', lazy=True, cascade='all, delete-orphan')
    allowed_users = db.relationship('User', secondary=topic_permissions, lazy='subquery',
                                   backref=db.backref('accessible_topics', lazy=True))

class ProviderConfig(db.Model):
    """服务提供商配置"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)  # 配置名称
    provider_type = db.Column(db.String(50), nullable=False, default='openai')  # 提供商类型
    api_key = db.Column(db.String(500), nullable=False)  # API密钥
    base_url = db.Column(db.String(500), nullable=True)  # API基础URL（可选，用于自定义端点）
    is_default = db.Column(db.Boolean, default=False, nullable=False)  # 是否为默认配置
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(db.Integer, db.ForeignKey('chat_topic.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'user' or 'assistant'
    content = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(500), nullable=True)  # 图片URL（如果消息包含图片）
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

