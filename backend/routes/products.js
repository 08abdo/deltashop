const express = require("express");
const router = express.Router();
const supabase = require("../supabase");
const sharp = require("sharp");

// ذاكرة تخزين مؤقت لسيرفر Node.js
let productsCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 3 * 60 * 1000;

const invalidateCache = () => {
  productsCache = null;
  lastCacheTime = 0;
};

// دالة مساعدة لضغط صور Base64 تلقائياً وتحويلها لـ WebP
const processImages = async (imagesList) => {
  if (!Array.isArray(imagesList) || imagesList.length === 0) return [];

  const processedImages = await Promise.all(
    imagesList.map(async (img) => {
      // ضغط الصورة فقط إذا كانت بصيغة Base64
      if (typeof img === "string" && img.startsWith("data:image")) {
        try {
          const parts = img.split(";base64,");
          const imageBuffer = Buffer.from(parts[1], "base64");

          const compressedBuffer = await sharp(imageBuffer)
            .resize({ width: 800, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

          return `data:image/webp;base64,${compressedBuffer.toString("base64")}`;
        } catch (err) {
          console.error("خطأ في ضغط الصورة:", err);
          return img; // في حالة وجود خطأ، احفظ الصورة الأصلية
        }
      }
      return img; // إذا كانت رابطاً عادياً اتركها كما هي
    })
  );

  return processedImages;
};

// 1. جلب المنتجات
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const full = req.query.full === "true";
    const now = Date.now();

    if (!page && !limit && !full && productsCache && (now - lastCacheTime < CACHE_DURATION)) {
      res.setHeader("X-Cache", "HIT");
      return res.json(productsCache);
    }

    const selectFields = full
      ? "*"
      : "id, name, category, price, old_price, images, sizes, created_at";

    let query = supabase
      .from("products")
      .select(selectFields)
      .order("created_at", { ascending: false });

    if (page && limit) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!page && !limit && !full) {
      productsCache = data;
      lastCacheTime = now;
    }

    res.setHeader("X-Cache", "MISS");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. إضافة منتج جديد (POST)
router.post("/", async (req, res) => {
  const { name, category, price, old_price, cost, images, sizes, desc_text } = req.body;

  if (!name || price === undefined || cost === undefined) {
    return res.status(400).json({ error: "الاسم، سعر البيع، والتكلفة حقول إجبارية" });
  }

  const profit = parseFloat(price) - parseFloat(cost);

  try {
    // ضغط الصور تلقائياً قبل الحفظ
    const optimizedImages = await processImages(images);

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name,
          category,
          price,
          old_price: old_price || null,
          cost,
          profit,
          sizes: sizes || [],
          images: optimizedImages,
          desc_text,
        },
      ])
      .select();

    if (error) throw error;

    invalidateCache();
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. تعديل منتج موجود (PUT)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, category, price, old_price, cost, images, sizes, desc_text } = req.body;

  const profit = parseFloat(price) - parseFloat(cost);

  try {
    // ضغط الصور الجديدة تلقائياً عند التعديل
    const optimizedImages = await processImages(images);

    const { data, error } = await supabase
      .from("products")
      .update({
        name,
        category,
        price,
        old_price: old_price || null,
        cost,
        profit,
        sizes: sizes || [],
        images: optimizedImages,
        desc_text,
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "المنتج غير موجود" });
    }

    invalidateCache();
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. حذف منتج (DELETE)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) throw error;

    invalidateCache();
    res.json({ message: "تم حذف المنتج بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
