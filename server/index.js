const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
console.log("ENV CHECK MONGO_URI:", process.env.MONGO_URI);
console.log("ENV CHECK PORT:", process.env.PORT);

const app = express();


// Middleware
app.use(cors());
app.use(express.json());

// Route imports
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

const taskRoutes = require("./routes/taskRoutes");
app.use("/api/tasks", taskRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Nova AI Backend Running");
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");

    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });