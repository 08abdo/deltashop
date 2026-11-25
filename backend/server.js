require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// تفعيل مجلد الملفات الثابتة إذا كنت رافع الموقع والسيرفر مع بعض
app.use(express.static(path.join(__dirname)));

// Import Routes
const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const categoriesRoutes = require("./routes/categories");

// Use Routes
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/categories", categoriesRoutes);

// توجيه الصفحة الرئيسية (صلحتلك المسار باش يقرأ ملف index.html مباشرة)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
