# ⌨️ Typing Speed Test

A real-time typing speed test web application with live multiplayer support, user authentication, and score tracking — built with Node.js, Express, MongoDB, and WebSockets.

## 🚀 Features

- **Typing Speed Test** — Measure your typing speed (WPM) and accuracy
- **Real-time Multiplayer** — Compete with other users live using WebSockets
- **User Authentication** — Secure signup/login with JWT and password hashing (bcrypt)
- **Score Tracking** — Save and view your typing test history and scores
- **Responsive Frontend** — Clean, simple UI built with HTML, CSS, and JavaScript

## 🛠️ Tech Stack

**Backend:**
- Node.js
- Express.js
- MongoDB with Mongoose
- WebSocket (`ws`)
- JSON Web Token (JWT) for authentication
- bcrypt.js for password hashing

**Frontend:**
- HTML5, CSS3, JavaScript

## 📂 Project Structure

```
Typing Speed Test/
├── backend/
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── Score.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── typing.js
│   ├── websocket.js
│   └── index.js
├── frontend/
│   ├── css/
│   │   └── style.css
│   ├── home.html
│   ├── games.html
│   ├── index.html
│   └── register.html
├── index.js
├── package.json
└── .gitignore
```

## ⚙️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/aniketsakpal26/Typing-Speed-Test.git
   cd Typing-Speed-Test
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory with the following:
   ```
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   (or `nodemon index.js` if using nodemon for development)

5. **Open the app**

   Visit `http://localhost:5000` in your browser.

## 🎮 How to Use

1. Register a new account or log in
2. Start a typing test and see your Words Per Minute (WPM) and accuracy in real time
3. Compete with other online users through the multiplayer/games mode
4. Track your past scores and improvement over time

## 📸 Screenshots

*(Add screenshots of your app here to showcase the UI)*

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Feel free to fork the repo and submit a pull request.

## 📄 License

This project currently has no license specified.

## 👤 Author

**Aniket Sakpal**
- GitHub: [@aniketsakpal26](https://github.com/aniketsakpal26)
