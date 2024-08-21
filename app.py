from flask import Flask, request, jsonify, render_template, session
from models import db, User, Item
from config import Config
from werkzeug.utils import secure_filename
import os
import jwt
import datetime

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

with app.app_context():
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    db.create_all()


@app.route('/')
def hello():
    return render_template('index.html')


@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    # Check if email already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email already exists"}), 400

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201


@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if user and user.check_password(data['password']):
        # JWTトークンを生成
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        }, app.secret_key, algorithm='HS256')
        return jsonify({"message": "Login successful", "token": token}), 200
    else:
        return jsonify({"message": "Invalid username or password"}), 401


@app.route('/add_item', methods=['POST'])
def add_item():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({"message": "Token is missing"}), 403

    try:
        data = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user_id = data['user_id']
    except jwt.ExpiredSignatureError:
        return jsonify({"message": "Token has expired"}), 403
    except jwt.InvalidTokenError:
        return jsonify({"message": "Invalid token"}), 403

    data = request.json
    name = data.get('name')
    expiry_date = data.get('expiry_date')
    location = data.get('location')
    quantity = data.get('quantity')

    image_file = request.files['image'] if 'image' in request.files else None
    if image_file:
        image_filename = secure_filename(image_file.filename)
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
        image_file.save(image_path)
    else:
        image_path = None

    user = User.query.get(user_id)
    item = Item(
        name=name,
        image=image_path,
        expiry_date=expiry_date,
        location=location,
        quantity=quantity,
        owner=user
    )
    db.session.add(item)
    db.session.commit()

    return jsonify({"message": "Item added successfully"}), 201


@app.route('/items', methods=['GET'])
def get_items():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({"message": "Token is missing"}), 403

    try:
        data = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user_id = data['user_id']
    except jwt.ExpiredSignatureError:
        return jsonify({"message": "Token has expired"}), 403
    except jwt.InvalidTokenError:
        return jsonify({"message": "Invalid token"}), 403

    items = Item.query.filter_by(user_id=user_id).all()
    return jsonify([{
        "name": item.name,
        "expiry_date": item.expiry_date,
        "location": item.location,
        "quantity": item.quantity,
        "is_expiring_soon": item.is_expiring_soon()
    } for item in items]), 200


if __name__ == '__main__':
    app.run(debug=True)
