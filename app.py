import os
from flask import Flask
from flask import request, jsonify, render_template
from models import db, User, Item
from config import Config
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

with app.app_context():
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    db.create_all()


@app.route('/')
def hello():
    return 'Hello, World!'


@app.route('/test')
def home():
    return render_template('test.html')


@app.route('/register', methods=['POST'])
def register():
    data = request.json
    user = User(username=data['username'], email=data['email'])
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201


@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if user and user.check_password(data['password']):
        return jsonify({"message": "Login successful"}), 200
    else:
        return jsonify({"message": "Invalid username or password"}), 401


@app.route('/add_item', methods=['POST'])
def add_item():
    data = request.json  # JSONデータの取得
    user_id = data.get('user_id')
    name = data.get('name')
    expiry_date = data.get('expiry_date')
    location = data.get('location')
    quantity = data.get('quantity')

    # 画像ファイルの処理
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
    user_id = request.args.get('user_id')
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
