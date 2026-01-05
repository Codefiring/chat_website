from app import app, db
from models import User
from werkzeug.security import generate_password_hash

with app.app_context():
    # 创建所有表
    db.create_all()
    
    # 创建默认管理员账户
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(
            username='admin',
            password_hash=generate_password_hash('admin123'),
            is_admin=True
        )
        db.session.add(admin)
        db.session.commit()
        print("默认管理员账户已创建：")
        print("用户名: admin")
        print("密码: admin123")
    else:
        # 确保admin是管理员
        if not admin.is_admin:
            admin.is_admin = True
            db.session.commit()
            print("已将admin账户设置为管理员")
        print("数据库已初始化")

