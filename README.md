# 聊天网站

一个基于 Flask 的现代化聊天网站，风格模仿 OpenWebUI。

## 功能特性

- 用户注册和登录
- 多话题聊天管理
- 实时聊天界面
- 响应式设计
- **对话权限管理**：可以设置对话的可见权限（默认所有用户可见）
- **共享对话**：所有登录用户可以看到有权限的对话

## 安装和运行

1. 安装依赖：
```bash
pip install -r requirements.txt
```

2. 初始化数据库：
```bash
python init_db.py
```

3. （可选）如果已有数据库，运行迁移脚本：
```bash
python migrate_db.py
```

4. 运行应用：
```bash
python app.py
```

5. 访问网站：
打开浏览器访问 http://localhost:5000

## 默认账户

首次运行后，可以使用以下默认账户登录：
- 用户名: admin
- 密码: admin123

建议首次登录后修改密码。

