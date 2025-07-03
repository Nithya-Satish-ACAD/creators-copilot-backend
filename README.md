# Creators Copilot (Frontend)

A modular, production-ready React app for course management, content creation, and AI-powered features. Includes authentication, dashboard, course management, studio/chat interface, and a knowledge base with file upload and reference management.

---

## 🚀 Features
- User authentication (login/register)
- Dashboard with course and knowledge base management
- File upload and reference management
- Studio/chat interface for content creation
- Modular, clean codebase ready for backend integration

---

## 🛠️ Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

---

## 📦 Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd <repo-folder>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

---

## 🏃 Running the App (Development)

```bash
npm start
```
- The app will run at [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Building for Production

```bash
npm run build
```
- Builds the app for production to the `build` folder.

---

## 🔗 Backend Integration
- This project is ready for backend integration. See `// backend integration` comments in the codebase for where to connect your API.
- Example backend repo: [creators-copilot-backend](https://github.com/Nithya-Satish-ACAD/creators-copilot-backend.git)

---

## 📁 Project Structure

```
public/           # Static files
src/
  components/     # Reusable UI components
  context/        # React context for global state
  pages/          # App pages (Dashboard, Login, Studio, etc.)
  services/       # API/service logic (auth, etc.)
  App.js          # Main app component
  index.js        # Entry point
```

---

## 🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License
[MIT](LICENSE) 