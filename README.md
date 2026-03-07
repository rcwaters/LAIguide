# DESC LAI Medication Standing Order Tool

Clinical decision support tool for early or late/overdue long-acting injectable (LAI) medication administration at DESC.

## Running Locally

### Option 1 — Python (no install required)

```bash
cd LAIguide
python3 -m http.server 8000
```

Open your browser to: **http://localhost:8000**

To stop the server, press `Ctrl+C` in the terminal.

---

### Option 2 — VS Code Live Server

1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code
2. Open the project folder in VS Code
3. Right-click `index.html` → **Open with Live Server**
4. Browser opens automatically at `http://127.0.0.1:5500` and reloads on file save

---

> **Note:** Do not open `index.html` by double-clicking — browsers restrict local file loading which will prevent scripts from running correctly. Always use one of the server options above.

## Project Structure

```
LAIguide/
├── index.html     # App markup
├── styles.css     # Styles
└── js/
    ├── logic.js   # Business logic (guidance algorithms, data)
    └── app.js     # UI and DOM interactions
```
