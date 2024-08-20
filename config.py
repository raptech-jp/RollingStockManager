import os


class Config:
    SQLALCHEMY_DATABASE_URI = 'sqlite:///rolling_stock.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.urandom(24)
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static/uploads')
