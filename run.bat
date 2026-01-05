@echo off
echo 正在初始化数据库...
python init_db.py
echo.
echo 正在启动服务器...
python app.py

