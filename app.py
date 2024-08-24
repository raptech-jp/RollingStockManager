from flask import Flask, request, jsonify, render_template, session
from models import db, User, Item
from config import Config
from werkzeug.utils import secure_filename
import os
import jwt
from datetime import datetime, timedelta
import secrets

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

with app.app_context():
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    db.create_all()


def generate_refresh_token():
    return secrets.token_hex(32)


def save_refresh_token(user):
    refresh_token = generate_refresh_token()
    user.refresh_token = refresh_token
    user.token_expiration = datetime.utcnow() + timedelta(days=7)
    db.session.commit()
    return refresh_token


@app.route('/')
def hello():
    return render_template('index.html')


@app.route('/signup', methods=['GET'])
def signup_page():
    return render_template('signup.html')


@app.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')


@app.route('/register', methods=['GET'])
def register_page():
    return render_template('register.html')


@app.route('/manage', methods=['GET'])
def manage_page():
    return render_template('manage.html')


@app.route("/manage/<int:id>", methods=['GET'])
def detail_page(id):
    return render_template('detailsmanage.html', id=id)


@app.route('/notice', methods=['GET'])
def notice_page():
    return render_template('notice.html')


@app.route('/manual', methods=['GET'])
def manual_page():
    return render_template('manual.html')
# API Endpoints


@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

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
    user = User.query.filter_by(email=data['email']).first()
    if user and user.check_password(data['password']):
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(hours=1)
        }, app.secret_key, algorithm='HS256')
        refresh_token = save_refresh_token(user)

        return jsonify({
            "message": "Login successful",
            "token": token,
            "refresh_token": refresh_token
        }), 200
    else:
        return jsonify({"message": "Invalid email or password"}), 401


def verify_token():
    token = request.headers.get('Authorization')
    if not token:
        return None, jsonify({"message": "Token is missing"}), 403

    if token.startswith("Bearer "):
        token = token[len("Bearer "):]

    try:
        data = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user_id = data['user_id']
        user = User.query.get(user_id)
        if not user:
            return None, jsonify({"message": "User not found"}), 404
        return user, None, 200
    except jwt.ExpiredSignatureError:
        return None, jsonify({"message": "Token has expired"}), 403
    except jwt.InvalidTokenError:
        return None, jsonify({"message": "Invalid token"}), 403


@app.route('/refresh', methods=['POST'])
def refresh_token():
    data = request.json
    refresh_token = data.get('refresh_token')
    if not refresh_token:
        return jsonify({"message": "Refresh token is missing"}), 403

    user = User.query.filter_by(refresh_token=refresh_token).first()
    if not user:
        return jsonify({"message": "Invalid refresh token"}), 403

    if user.token_expiration < datetime.utcnow():
        return jsonify({"message": "Refresh token has expired"}), 403

    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(hours=1)
    }, app.secret_key, algorithm='HS256')

    return jsonify({
        "message": "Token refreshed successfully",
        "token": token
    }), 200


@app.route('/items', methods=['POST'])
def add_item():
    user, error, status = verify_token()
    if error:
        return error, status

    data = request.json
    name = data.get('name')
    expiry_date_str = data.get('expiry_date')
    location = data.get('location')
    quantity = data.get('quantity')

    try:
        expiry_date_obj = datetime.strptime(expiry_date_str, '%Y-%m-%d').date()
    except ValueError as e:
        return jsonify({"error": f"Invalid date format: {e}"}), 400

    image_file = request.files['image'] if 'image' in request.files else None
    if image_file:
        image_filename = secure_filename(image_file.filename)
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
        image_file.save(image_path)
    else:
        image_path = None

    item = Item(
        name=name,
        image=image_path,
        expiry_date=expiry_date_obj,
        location=location,
        quantity=quantity,
        owner=user
    )
    db.session.add(item)
    db.session.commit()

    return jsonify({"message": "Item added successfully"}), 201


@app.route('/items', methods=['GET'])
def get_items():
    user, error, status = verify_token()
    if error:
        return error, status

    items = Item.query.filter_by(user_id=user.id).all()
    return jsonify([{
        "id": item.id,
        "name": item.name,
        "expiry_date": item.expiry_date,
        "location": item.location,
        "quantity": item.quantity,
        "is_expiring_soon": item.is_expiring_soon()
    } for item in items]), 200


@app.route('/items/<int:item_id>', methods=['PUT'])
def edit_item(item_id):
    user, error, status = verify_token()
    if error:
        return error, status

    item = Item.query.get(item_id)
    if not item or item.user_id != user.id:
        return jsonify({"message": "Item not found or unauthorized"}), 404

    data = request.json
    item.name = data.get('name', item.name)

    expiry_date_str = data.get('expiry_date')
    if expiry_date_str:
        try:
            item.expiry_date = datetime.strptime(
                expiry_date_str, '%Y-%m-%d').date()
        except ValueError as e:
            return jsonify({"message": f"Invalid date format: {e}"}), 400

    item.location = data.get('location', item.location)
    item.quantity = data.get('quantity', item.quantity)

    image_file = request.files['image'] if 'image' in request.files else None
    if image_file:
        image_filename = secure_filename(image_file.filename)
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
        image_file.save(image_path)
        item.image = image_path

    db.session.commit()

    return jsonify({"message": "Item updated successfully"}), 200


@app.route('/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    user, error, status = verify_token()
    if error:
        return error, status

    item = Item.query.get(item_id)
    if not item or item.user_id != user.id:
        return jsonify({"message": "Item not found or unauthorized"}), 404

    db.session.delete(item)
    db.session.commit()

    return jsonify({"message": "Item deleted successfully"}), 200


if __name__ == '__main__':
    app.run(debug=True)
