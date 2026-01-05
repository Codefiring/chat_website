from app import app, db
from models import User
from werkzeug.security import generate_password_hash

with app.app_context():
    # 创建所有表
    db.create_all()
    
    # 创建默认管理员账户
    if not User.query.filter_by(username='admin').first():
        admin = User(
            username='admin',
            password_hash=generate_password_hash('admin123')
        )
        db.session.add(admin)
        db.session.commit()
        print("默认管理员账户已创建：")
        print("用户名: admin")
        print("密码: admin123")
    else:
        print("数据库已初始化")

