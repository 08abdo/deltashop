const express = require("express");
const router = express.Router();
const supabase = require("../supabase");

// 1. جلب كل المنتجات
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. إضافة منتج جديد (POST)
router.post("/", async (req, res) => {
  const { name, category, price, old_price, cost, images, sizes, desc_text } =
    req.body;

  if (!name || price === undefined || cost === undefined) {
    return res
      .status(400)
      .json({ error: "الاسم، سعر البيع، والتكلفة حقول إجبارية" });
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
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. تعديل منتج موجود (PUT)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, category, price, old_price, cost, images, sizes, desc_text } =
    req.body;

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
    res.json({ message: "تم حذف المنتج بنجاح" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
