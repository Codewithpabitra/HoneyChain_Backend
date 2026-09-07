import express from "express";

const app = express();
const PORT = process.env.PORT || 5000;


// health check
app.get("/", (req, res) => {
  res.json({ success: true, message: "HoneyChain backend is running yehh" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});