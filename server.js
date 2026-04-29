import express from 'express';

console.log("🚀 Starting server...");

const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send("Server is working ✅");
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Listening on port ${PORT}`);
});