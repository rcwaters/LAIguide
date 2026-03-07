# DESC LAI Medication Standing Order Tool

Clinical decision support tool for early or late/overdue long-acting injectable (LAI) medication administration at DESC.

## Live URL

**https://rcwaters.github.io/LAIguide**

> If the page isn't accessible, enable GitHub Pages in the repo: **Settings → Pages → Branch: `main` → Save**

## Running Locally

The project uses [Vite](https://vitejs.dev/) to serve TypeScript — a simple file server (Python, Live Server, etc.) will **not** work.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)

### Steps

```bash
cd LAIguide
npm install
npm run dev
```

Open your browser to the URL shown in the terminal (typically **http://localhost:5173**).

To stop the server, press `Ctrl+C` in the terminal.

---

### Running Tests

```bash
npm test
```

## Project Structure

```
LAIguide/
├── index.html        # App entry point
└── src/
    ├── styles.css    # Styles (imported by app.ts)
    ├── types.ts      # TypeScript interfaces and type definitions
    ├── constants.ts  # Medication data (tier configs, guidance text)
    ├── logic.ts      # Business logic (guidance algorithms)
    └── app.ts        # UI and DOM interactions
```
