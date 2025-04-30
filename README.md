# 🔍 Search Engine

A sleek, full-stack search engine powered by **FastAPI** on the backend and **Next.js** on the frontend. Designed for efficient querying and a modern UI experience.

🌐 **Live Demo**: [https://azizah-eight.vercel.app](https://azizah-eight.vercel.app)

---

## 📦 Tech Stack

- **Frontend**: Next.js, Tailwind CSS, TypeScript  
- **Backend**: FastAPI (Python)  
- **Styling**: Tailwind CSS  
- **Languages**: TypeScript, Python



## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/saiisback/search-engine.git
cd search-engine
```


### 2. 🚀 Start the Backend (FastAPI)

Navigate into the backend folder and run the FastAPI server:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

⚠️ Make sure Python 3.8+ and FastAPI are installed.

Your backend API will run at:
http://127.0.0.1:8000


### 3. 💻 Start the Frontend (Next.js)

In a new terminal (while in the project root, outside the backend folder):

```bash
cd ..
npm install
npm run dev
```
⚠️ Ensure you have Node.js and npm installed.

Frontend will run at:
http://localhost:3000

### 📁 Project Structure

```plaintext
search-engine/
├── backend/             # FastAPI backend (main.py, requirements.txt)
├── components/          # React UI components
├── app/                 # Next.js pages and routes
├── lib/                 # Utility functions
├── public/              # Static assets
├── styles/              # Global styles
├── package.json         # NPM config
└── README.md
```


### 📬 Contact

For questions or collaboration, feel free to reach out:
	•	GitHub: saiisback
	•	LinkedIn: Sai Karthik Ketha

⸻

### 📄 License

This project is licensed under the MIT License.
