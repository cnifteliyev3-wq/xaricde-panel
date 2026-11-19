/* Köhnə platformanın /api/* sorğularını Supabase-ə yönləndirir (interfeys dəyişməz qalır). */
(function () {
  const SB = supabase.createClient("https://myolkaddrtdnjcjvsihq.supabase.co", "sb_publishable_OAWjqMKYJD_8L6oSYhfOtA_Uc4D-8iy");
  window.SB = SB;
  const _fetch = window.fetch.bind(window);
  const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
  const OFFLINE = () => new Response("Bu əməliyyat hələlik yalnız kompüterdəki (yerli) platformada işləyir. Onlayn versiyada tezliklə əlavə olunacaq.", { status: 501 });
  const GROUPS = { edu: ["students", "applications"], crm: ["leads", "calls"], fin: ["transactions", "contracts"], ads: ["ad_accounts", "ad_spend", "ad_campaigns"], posts: ["posts"], bot: ["bot_rules", "bot_log"], claude: ["claude_tasks"] };
  const TITLES = { edu: "Təhsil", posts: "Məzmun", bot: "Bot", crm: "Zəng mərkəzi CRM", fin: "Maliyyə", ads: "Reklam", claude: "Claude tapşırıqları" };
  const MODS = new Set(Object.values(GROUPS).flat());
  let _me = null;
  async function getMe() {
    if (_me) return _me;
    const { data: { session } } = await SB.auth.getSession();
    if (!session) return null;
    const { data: st } = await SB.from("staff").select("name,role").eq("user_id", session.user.id).maybeSingle();
    if (!st) return null;
    const perms = {}; Object.keys(GROUPS).forEach(g => perms[g] = "edit");
    _me = { id: 1, uid: session.user.id, email: session.user.email, username: session.user.email, full_name: session.user.email, role: "admin", role_title: "Administrator", perms };
    return _me;
  }
  window.fetch = async (url, opt = {}) => {
    if (typeof url !== "string" || !url.startsWith("/api/")) return _fetch(url, opt);
    const method = (opt.method || "GET").toUpperCase();
    const body = opt.body ? JSON.parse(opt.body) : null;
    const me = await getMe();
    if (!me) return J({ error: "giriş" }, 401);
    const parts = url.split("?")[0].split("/").filter(Boolean);
    const mod = parts[1], id = parts[2];
    if (mod === "me" && parts[2] === "password") {
      const a = await SB.auth.signInWithPassword({ email: me.email, password: body.old });
      if (a.error) return J({ error: "Cari parol səhvdir" }, 400);
      const u = await SB.auth.updateUser({ password: body.new });
      return u.error ? J({ error: u.error.message }, 400) : J({ ok: true });
    }
    if (mod === "me") return J(me);
    if (mod === "logout") { await SB.auth.signOut(); _me = null; return J({ ok: true }); }
    if (mod === "status") return J({ logged_in: true });
    if (mod === "users" && method === "GET") {
      const { data } = await SB.from("staff").select("*");
      return J({ users: (data || []).map((u, i) => ({ id: i + 1, username: u.name, full_name: u.name, role: u.role || "admin", role_title: "Administrator", perms: me.perms, last_login: "", active: true })), roles: { admin: { title: "Administrator", perms: me.perms } }, groups: TITLES });
    }
    if (mod === "audit") return J([]);
    if (mod === "cmd" && parts[2] === "jobs") return J([]);
    if (mod === "bot" && parts[2] === "config" && method === "GET") return J({});
    if (["meta", "bot", "studio", "cmd", "telegram", "ads", "users", "setup", "login"].includes(mod)) {
      return method === "GET" ? J({}) : OFFLINE();
    }
    if (MODS.has(mod)) {
      if (method === "GET") {
        let all = [], from = 0;
        for (;;) {
          const { data, error } = await SB.from("records").select("id,data").eq("module", mod).order("id").range(from, from + 999);
          if (error) return new Response(error.message, { status: 500 });
          all = all.concat(data); if (data.length < 1000) break; from += 1000;
        }
        return J(all.map(r => ({ ...r.data, id: r.id })));
      }
      if (method === "POST") {
        const d = { ...body }; delete d.id;
        const { data, error } = await SB.from("records").insert({ module: mod, data: d }).select("id").single();
        return error ? new Response(error.message, { status: 500 }) : J({ id: data.id });
      }
      if (method === "PUT") {
        const d = { ...body }; delete d.id;
        const { error } = await SB.from("records").update({ data: d }).eq("id", +id).eq("module", mod);
        return error ? new Response(error.message, { status: 500 }) : J({ ok: true });
      }
      if (method === "DELETE") {
        const { error } = await SB.from("records").delete().eq("id", +id).eq("module", mod);
        return error ? new Response(error.message, { status: 500 }) : J({ ok: true });
      }
    }
    return J({}, 404);
  };
})();
