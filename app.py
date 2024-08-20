from flask import Flask
from flask import request, jsonify, render_template
from models import db, User, Item
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

with app.app_context():
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
    data = request.json
    user = User.query.get(data['user_id'])
    item = Item(
        name=data['name'],
        image=data.get('image'),
        expiry_date=data['expiry_date'],
        location=data['location'],
        quantity=data['quantity'],
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
