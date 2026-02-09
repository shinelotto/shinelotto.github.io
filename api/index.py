# api/index.py - 最小化测试
from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return "✅ 应用正常运行"

@app.route('/health')
def health():
    return {"status": "healthy"}

# 直接导出 app 对象
application = app