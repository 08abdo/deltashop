const express = require("express");
const router = express.Router();
const supabase = require("../supabase");

// ذاكرة تخزين مؤقت لسيرفر Node.js
let productsCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 3 * 60 * 1000; // حفظ المنتجات في الكاش لمدة 3 دقائق

// دالة تفريغ الكاش عند التعديل/الإضافة/الحذف
const invalidateCache = () => {
  productsCache = null;
  lastCacheTime = 0;
};

// 1. جلب المنتجات (محسّن وسريع جداً)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const full = req.query.full === "true"; // للأدمن إذا كان يحتاج التفاصيل الكاملة
    const now = Date.now();

    // استخدام الكاش إذا لم يتم طلب صفحة معينة ولم تكن طلباً كاملاً للأدمن
    if (!page && !limit && !full && productsCache && (now - lastCacheTime < CACHE_DURATION)) {
      res.setHeader("X-Cache", "HIT");
      return res.json(productsCache);
    }

    // تحديد الحقول المطلوب جلبها لتسريع النقل (تجاهل الوصف الثقيل في القائمة)
    const selectFields = full
      ? "*"
      : "id, name, category, price, old_price, images, sizes, created_at";

    let query = supabase
      .from("products")
      .select(selectFields)
      .order("created_at", { ascending: false });

    // تفعيل الـ Pagination إذا تم تمرير page و limit
    if (page && limit) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) throw error;

    // حفظ النتيجة في الكاش للطلبات العامة
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
          images: images || [],
          desc_text,
        },
      ])
      .select();

    if (error) throw error;

    invalidateCache(); // تفريغ الكاش لتحديث القائمة فوراً
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
        images: images || [],
        desc_text,
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "المنتج غير موجود" });
    }

    invalidateCache(); // تفريغ الكاش لتحديث البيانات فوراً
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

    invalidateCache(); // تفريغ الكاش
    res.json({ message: "تم حذف المنتج بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
