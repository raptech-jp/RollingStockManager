import os
import secrets


class Config:
    SQLALCHEMY_DATABASE_URI = 'sqlite:///rolling_stock.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = secrets.token_hex(32)
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static/uploads')
