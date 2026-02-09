import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    
    # 缓存配置
    CACHE_TYPE = 'simple'
    CACHE_DEFAULT_TIMEOUT = 300
    
    # 静态文件版本控制
    STATIC_VERSION = '1.0.0'
    
    # 文件上传配置
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
    # 数据库配置
    DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    
    # CSV文件路径
    SSQ_DATA_PATH = os.path.join(DATA_DIR, 'ssq', 'ssqhistory.csv')
    DLT_DATA_PATH = os.path.join(DATA_DIR, 'dlt', 'dlthistory.csv')

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}