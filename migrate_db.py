"""
数据库迁移脚本：为 ChatTopic 表添加新字段
"""
from app import app, db
from models import ChatTopic, ProviderConfig
from sqlalchemy import text, inspect

with app.app_context():
    try:
        inspector = db.inspect(db.engine)
        table_names = inspector.get_table_names()
        
        # 检查 chat_topic 表
        if 'chat_topic' in table_names:
            columns = [col['name'] for col in inspector.get_columns('chat_topic')]
            
            # 添加 is_public 字段
            if 'is_public' not in columns:
                print("正在添加 is_public 字段...")
                if 'sqlite' in str(db.engine.url):
                    db.session.execute(text('ALTER TABLE chat_topic ADD COLUMN is_public BOOLEAN'))
                    db.session.execute(text('UPDATE chat_topic SET is_public = 1 WHERE is_public IS NULL'))
                else:
                    db.session.execute(text('ALTER TABLE chat_topic ADD COLUMN is_public BOOLEAN DEFAULT 1'))
                    db.session.execute(text('UPDATE chat_topic SET is_public = 1 WHERE is_public IS NULL'))
                db.session.commit()
                print("✓ 已添加 is_public 字段")
            
            # 添加 enable_model 字段
            if 'enable_model' not in columns:
                print("正在添加 enable_model 字段...")
                if 'sqlite' in str(db.engine.url):
                    db.session.execute(text('ALTER TABLE chat_topic ADD COLUMN enable_model BOOLEAN'))
                    db.session.execute(text('UPDATE chat_topic SET enable_model = 0 WHERE enable_model IS NULL'))
                else:
                    db.session.execute(text('ALTER TABLE chat_topic ADD COLUMN enable_model BOOLEAN DEFAULT 0'))
                    db.session.execute(text('UPDATE chat_topic SET enable_model = 0 WHERE enable_model IS NULL'))
                db.session.commit()
                print("✓ 已添加 enable_model 字段")
            
            # 添加 model_name 字段
            if 'model_name' not in columns:
                print("正在添加 model_name 字段...")
                if 'sqlite' in str(db.engine.url):
                    db.session.execute(text('ALTER TABLE chat_topic ADD COLUMN model_name VARCHAR(100)'))
                else:
                    db.session.execute(text('ALTER TABLE chat_topic ADD COLUMN model_name VARCHAR(100)'))
                db.session.commit()
                print("✓ 已添加 model_name 字段")
        
        # 检查 provider_config 表
        if 'provider_config' not in table_names:
            print("正在创建 provider_config 表...")
            db.create_all()
            print("✓ 已创建 provider_config 表")
        
        # 检查 topic_permissions 表
        if 'topic_permissions' not in table_names:
            print("正在创建 topic_permissions 表...")
            db.create_all()
            print("✓ 已创建 topic_permissions 表")
        
        print("✓ 数据库迁移完成！")
        
    except Exception as e:
        print(f"迁移过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        print("如果这是首次运行，请先运行 python init_db.py 初始化数据库")

