require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" })); // لدعم الصور الكبيرة Base64

// Import Routes
const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const categoriesRoutes = require("./routes/categories"); // ربط ملف الأقسام

// Use Routes
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/categories", categoriesRoutes); // تفعيل مسار الأقسام

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
const path = require("path");

// 1. تفعيل مجلد الملفات الثابتة (HTML, CSS, JS, Images)
app.use(express.static(path.join(__dirname, "..", "frontend")));

// 2. توجيه الصفحة الرئيسية لملف index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});
