require("dotenv").config();
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const path = require("path");

const app = express();

// تفعيل ضغط البيانات المنقولة عبر الشبكة (يقلل حجم الاستجابات بنسبة تصل لـ 70%)
app.use(compression());

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Import Routes
const productsRoutes = require("./routes/products");
const ordersRoutes = require("./routes/orders");
const categoriesRoutes = require("./routes/categories");

// Use Routes
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/categories", categoriesRoutes);

// تفعيل مجلد الملفات الثابتة مع التخزين المؤقت للمتصفح
app.use(
  express.static(path.join(__dirname, "..", "frontend"), {
    maxAge: "1d", // تخزين الملفات الثابتة في كاش المتصفح لمدة يوم
  })
);

// توجيه الصفحات
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "admin", "admin.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
