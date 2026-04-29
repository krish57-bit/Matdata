import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

console.log("🚀 Starting server...");

process.on('uncaughtException', (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on('unhandledRejection', (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});