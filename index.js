const dotenv = require("dotenv");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const index = express();
const authRoutes = require("./routes/authRoutes");


dotenv.config({ path: "./config.env" });
require("./db/conn");


const PORT = process.env.PORT
// middleware
index.use(express.static('public'));
index.use(express.json());
index.use(cors());
index.use(cookieParser());

// view engine
index.set('view engine', 'ejs');

// routes
index.use(authRoutes);

index.listen(PORT, () => {
  console.log("Server is running on port " + PORT);
});
