const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, data } = req.body;

  try {
    // Salva un ristorante e una gemma
    if (action === "save_gem") {
      const { restaurant_name, city, wine_name, vintage, restaurant_price, retail_price, markup_factor, gem_score, classification, user_name } = data;

      // Cerca o crea il ristorante
      let { data: existing } = await supabase
        .from("restaurants")
        .select("id")
        .ilike("name", restaurant_name)
        .limit(1);

      let restaurant_id;
      if (existing && existing.length > 0) {
        restaurant_id = existing[0].id;
      } else {
        const { data: newRest } = await supabase
          .from("restaurants")
          .insert({ name: restaurant_name, city })
          .select("id")
          .single();
        restaurant_id = newRest.id;
      }

      // Salva la gemma
      await supabase.from("gems").insert({
        restaurant_id,
        wine_name,
        vintage,
        restaurant_price,
        retail_price,
        markup_factor,
        gem_score,
        classification,
        user_name: user_name || "Anonimo",
      });

      return res.status(200).json({ success: true, restaurant_id });
    }

    // Salva una visita
    if (action === "save_visit") {
      const { restaurant_name, city, food_ordered, wine_ordered, experience, user_name } = data;

      let { data: existing } = await supabase
        .from("restaurants")
        .select("id")
        .ilike("name", restaurant_name)
        .limit(1);

      let restaurant_id;
      if (existing && existing.length > 0) {
        restaurant_id = existing[0].id;
      } else {
        const { data: newRest } = await supabase
          .from("restaurants")
          .insert({ name: restaurant_name, city })
          .select("id")
          .single();
        restaurant_id = newRest.id;
      }

      await supabase.from("visits").insert({
        restaurant_id,
        food_ordered,
        wine_ordered,
        experience,
        user_name: user_name || "Anonimo",
      });

      return res.status(200).json({ success: true });
    }

    // Cerca ristoranti con gemme
    if (action === "search_restaurants") {
      const { query } = data;

      const { data: restaurants } = await supabase
        .from("restaurants")
        .select(`
          id, name, city, address,
          gems (id, wine_name, vintage, gem_score, classification, user_name, created_at),
          visits (id, experience, user_name, created_at)
        `)
        .ilike("name", `%${query}%`)
        .limit(10);

      return res.status(200).json({ restaurants: restaurants || [] });
    }

    // Carica le gemme di un ristorante specifico
    if (action === "get_restaurant") {
      const { restaurant_name } = data;

      const { data: restaurants } = await supabase
        .from("restaurants")
        .select(`
          id, name, city, address,
          gems (id, wine_name, vintage, restaurant_price, gem_score, classification, user_name, created_at),
          visits (id, food_ordered, wine_ordered, experience, user_name, created_at)
        `)
        .ilike("name", `%${restaurant_name}%`)
        .limit(1);

      if (!restaurants || restaurants.length === 0) {
        return res.status(200).json({ restaurant: null });
      }

      return res.status(200).json({ restaurant: restaurants[0] });
    }

    // Top ristoranti con più gemme
    if (action === "top_restaurants") {
      const { data: gems } = await supabase
        .from("gems")
        .select(`
          restaurant_id, gem_score,
          restaurants (id, name, city)
        `)
        .order("gem_score", { ascending: false })
        .limit(20);

      // Raggruppa per ristorante
      const map = {};
      for (const g of gems || []) {
        const rid = g.restaurant_id;
        if (!map[rid]) {
          map[rid] = { ...g.restaurants, gem_count: 0, avg_score: 0, scores: [] };
        }
        map[rid].gem_count++;
        map[rid].scores.push(g.gem_score);
      }
      const top = Object.values(map).map(r => ({
        ...r,
        avg_score: Math.round(r.scores.reduce((a, b) => a + b, 0) / r.scores.length),
      })).sort((a, b) => b.avg_score - a.avg_score).slice(0, 10);

      return res.status(200).json({ restaurants: top });
    }

    return res.status(400).json({ error: "Azione non valida" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
