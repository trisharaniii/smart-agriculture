import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.sql import func
import bcrypt
import google.generativeai as genai
from dotenv import load_dotenv

# Initialize basic app
app = Flask(__name__)
CORS(app)

# Load Environment Variables
# Try to load from inside python_backend first, fallback to upper directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

# Setup Database
DATABASE_URL = "sqlite:///agroi_db.sqlite"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    mobile = Column(String, unique=True, index=True)
    password = Column(String)

class SearchHistory(Base):
    __tablename__ = "search_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    problem_text = Column(String)
    disease = Column(String)
    confidence = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

Base.metadata.create_all(bind=engine)

@app.route("/")
def home():
    return jsonify({"status": "Flask API Running"})

@app.route("/api/register", methods=["POST"])
def register():
    db = SessionLocal()
    data = request.json
    try:
        if not data.get("name") or not data.get("mobile") or not data.get("password"):
            return jsonify({"error": "Missing fields"}), 400
            
        # Check if user exists
        existing = db.query(User).filter(User.mobile == data["mobile"]).first()
        if existing:
            return jsonify({"error": "User with this mobile already exists"}), 400
            
        hashed_pw = bcrypt.hashpw(data["password"].encode('utf-8'), bcrypt.gensalt()).decode()
        new_user = User(name=data["name"], mobile=data["mobile"], password=hashed_pw)
        
        db.add(new_user)
        db.commit()
        
        return jsonify({"message": "Registration successful"}), 201
    finally:
        db.close()

@app.route("/api/login", methods=["POST"])
def login():
    db = SessionLocal()
    data = request.json
    try:
        user = db.query(User).filter(User.name == data.get("name")).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        if bcrypt.checkpw(data.get("password", "").encode('utf-8'), user.password.encode('utf-8')):
            return jsonify({"message": "Login successful", "user": {"id": user.id, "name": user.name, "mobile": user.mobile}})
        else:
            return jsonify({"error": "Invalid password"}), 401
    finally:
        db.close()

@app.route("/api/check-mobile", methods=["POST"])
def check_mobile():
    db = SessionLocal()
    data = request.json
    try:
        mobile = data.get("mobile")
        if not mobile:
            return jsonify({"error": "Mobile number is required"}), 400
        user = db.query(User).filter(User.mobile == mobile).first()
        if not user:
            return jsonify({"error": "Mobile number not found in our records"}), 404
        return jsonify({"message": "Mobile number exists"})
    finally:
        db.close()

@app.route("/api/reset-password", methods=["POST"])
def reset_password():
    db = SessionLocal()
    data = request.json
    try:
        mobile = data.get("mobile")
        password = data.get("password")
        if not mobile or not password:
            return jsonify({"error": "Missing fields"}), 400
        user = db.query(User).filter(User.mobile == mobile).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode()
        user.password = hashed_pw
        db.commit()
        return jsonify({"message": "Password updated successfully"})
    finally:
        db.close()


@app.route("/api/analyze", methods=["POST"])
def analyze_image():
    if not os.getenv("GEMINI_API_KEY"):
        return jsonify({
            "disease": "Setup Required", "confidence": 0,
            "suggestion": "Please add your GEMINI_API_KEY to the backend/.env file and restart.",
            "summary": "API key missing"
        })

    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-3.5-flash')
    
    lang_code = request.form.get("language", "en")
    lang_map = { "en": "English", "te": "Telugu", "hi": "Hindi" }
    language = lang_map.get(lang_code, "English")
    
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
        
    image_file = request.files['image']
    image_data = image_file.read()
    
    image_parts = [{"mime_type": image_file.mimetype, "data": image_data}]
    
    prompt = f"""You are an expert AI Agricultural Assistant specialized in plant disease detection using leaf images.
Your tasks:
1. Analyze the uploaded plant/leaf image carefully.
2. Identify whether the leaf is healthy or diseased.
3. If diseased, detect the most likely disease name.
4. Provide a clear explanation of the disease.
5. Suggest practical treatment and prevention methods for farmers.

Respond EXACTLY in this JSON format. Respond purely with the JSON payload, no markdown backticks:
{{
  "disease": "Disease Name (or 'Healthy')",
  "confidence": 85,
  "summary": "Short description of the problem/situation.",
  "suggestion": "Detailed causes, treatment and prevention tips."
}}

Important Rules:
* Base your answer STRICTLY on visible symptoms in the image.
* Do not hallucinate. If unsure, state it's a possible disease.
* Respond ONLY in {language}. Ensure all text values in the JSON are translated to {language}."""

    try:
        response = model.generate_content([prompt, image_parts[0]])
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        import json
        output = json.loads(clean_text)
        return jsonify(output)
    except Exception as e:
        print("Analysis error:", str(e))
        return jsonify({
            "disease": "Analysis Error", "confidence": 0,
            "suggestion": "An error occurred: " + str(e),
            "summary": "Please try again."
        })

@app.route("/api/ask-ai", methods=["POST"])
def ask_ai():
    if not os.getenv("GEMINI_API_KEY"):
        return jsonify({
            "disease": "Setup Required", "confidence": 0,
            "suggestion": "Please add your GEMINI_API_KEY to the backend/.env file and restart.",
            "summary": "API key missing"
        })

    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-3.5-flash')
    
    data = request.json
    question = data.get("question", "")
    lang_code = data.get("language", "en")
    lang_map = { "en": "English", "te": "Telugu", "hi": "Hindi" }
    language = lang_map.get(lang_code, "English")

    prompt = f"""You are an expert AI Agricultural Assistant. A farmer is describing their plant/crop problem in text (transcribed from their voice or typed).
Their problem is: "{question}"

Analyze their problem description carefully.
1. Identify whether the plant is healthy or diseased.
2. If diseased, identify the most likely disease name.
3. Provide a clear explanation.
4. Suggest practical treatment and prevention methods.

Respond EXACTLY in this JSON format. Respond purely with the JSON payload, no markdown backticks:
{{
  "disease": "Disease Name (or 'Healthy' or 'Unrecognized problem')",
  "confidence": 85,
  "summary": "Short description of the problem/situation.",
  "suggestion": "Detailed causes, treatment and prevention tips."
}}

Important Rules:
* Base your answer on their text description. Do not hallucinate.
* Respond ONLY in {language}. All text values in the JSON MUST be translated to {language}."""

    try:
        response = model.generate_content(prompt)
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        import json
        output = json.loads(clean_text)
        return jsonify(output)
    except Exception as e:
        print("AI Text Analysis Error:", str(e))
        return jsonify({
            "disease": "Analysis Error", "confidence": 0,
            "suggestion": "An error occurred: " + str(e),
            "summary": "Please try again."
        })

@app.route("/api/weather", methods=["GET"])
def weather():
    import requests
    try:
        city = "Hyderabad"
        WEATHER_KEY = "42dd068dcb102be4b4af4515d1868562"
        res = requests.get(f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={WEATHER_KEY}&units=metric")
        data = res.json()
        return jsonify({
            "temperature": data["main"]["temp"],
            "humidity": data["main"]["humidity"],
            "weather": data["weather"][0]["main"]
        })
    except Exception as e:
        return jsonify({"error": "Weather fetch failed"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
