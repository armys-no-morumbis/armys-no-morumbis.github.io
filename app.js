(() => {
  const SUPABASE_URL = "https://gjyqwzseemmqlnovffqp.supabase.co";
  const SUPABASE_KEY = "sb_publishable_VfyRm7WtECRnxHIvI5dAzA_Cz5XMEmg";

  const RED = "#E0262F", PURPLE = "#9B5DE5", WHITE = "#F6F2EF", INK = "#0E0C0C";
  const PALETTE = [[RED,WHITE],[PURPLE,WHITE],[WHITE,INK],["#4A4141",WHITE],["#C9B3EE",INK],["#F2B8BB",INK],["#2F6E63",WHITE],["#D9A23B",INK]];
  const SHOW = "2026-10-30";
  const DAYS = ["2026-10-26","2026-10-27","2026-10-28","2026-10-29","2026-10-30","2026-10-31","2026-11-01"];
  const WD = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];
  const ST = {a_gravar:"A gravar", gravado:"Gravado", postado:"Postado"};
  const NEXT = {a_gravar:"gravado", gravado:"postado", postado:"a_gravar"};
  const VENUE = "Estádio do MorumBIS, Praça Roberto Gomes Pedrosa, 1, Morumbi, São Paulo - SP";
  const MAX_VIDEO = 50 * 1024 * 1024;

  const ICONS = {
    feed:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    agenda:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    nova:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    explorar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
    votacao:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 20V11M12 20V4M18 20v-6"/></svg>',
    videos:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>'
  };
  const G_LOGO = '<svg viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';

  // ——— Estado ———
  const S = {
    sb:null, uid:null, user:null, me:null, loaded:false,
    grupos:[], grupo:null, membros:[],
    pubs:[], reacoes:[], minhasDen:new Set(), myPubs:{}, exOrdem:"alta", exDia:"todos", exLoaded:false,
    profiles:{}, trends:[], votos:[], videos:[], videosMissing:false,
    screen:"feed", filter:"todas", day:null, toast:null,
    form:null, errors:{}, editing:null, sheet:null, viewer:null, busy:false
  };
  const store = { get:k => { try { return localStorage.getItem(k); } catch(e) { return null; } },
                  set:(k,v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch(e) {} } };
  { const s = store.get("trends-screen"); if (s && s !== "nova") S.screen = s; }
  S.grupo = store.get("trends-grupo");
  S.onlyMine = store.get("trends-minhas") === "1";
  // Link de convite: ?convite=CODIGO — guardado até a pessoa entrar com o Google
  { const c = new URLSearchParams(location.search).get("convite");
    if (c && /^[A-Za-z0-9]{6,12}$/.test(c)) { store.set("trends-convite", c.toUpperCase()); history.replaceState(null, "", location.pathname); } }

  // ——— Utilidades ———
  const $root = document.getElementById("root"), $toast = document.getElementById("toast");
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (k in n && typeof v !== "string") n[k] = v;
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : document.createTextNode(k));
    return n;
  };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)));
  let toastT;
  // O aviso fica fora da tela principal, para não recarregar os vídeos ao aparecer
  const showToast = (msg, stay) => { clearTimeout(toastT); $toast.textContent = msg || ""; $toast.hidden = !msg; if (msg && !stay) toastT = setTimeout(() => $toast.hidden = true, 2600); };
  const flash = msg => showToast(msg);
  const fail = (e, what) => flash(`${what}: ${e && e.message ? e.message : e}`);

  const dObj = iso => { const [y,m,d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m-1, d)); };
  const todaySP = () => new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const dd = iso => iso.slice(8);
  const wd = iso => WD[dObj(iso).getUTCDay()];
  const dayLabel = iso => `${wd(iso)} ${dd(iso)}/${iso.slice(5,7)}`;

  const tiktokId = l => { const s = safeTiktok(l); const m = s && s.match(/\/video\/(\d+)/); return m ? m[1] : null; };
  const tiktokHandle = l => { const m = (l || "").match(/tiktok\.com\/(@[\w.\-]+)/); return m ? m[1] : "TikTok"; };
  const isTiktok = l => /^https?:\/\/([\w-]+\.)?tiktok\.com\//i.test((l || "").trim());
  // Só aceita links https de verdade do TikTok (bloqueia "javascript:" e outros truques)
  const safeTiktok = l => { try { const u = new URL((l || "").trim()); return u.protocol === "https:" && /(^|\.)tiktok\.com$/i.test(u.hostname) ? u.href : null; } catch(e) { return null; } };
  const videoUrl = path => S.sb.storage.from("videos").getPublicUrl(path).data.publicUrl;
  const gcalUrl = t => {
    const d = t.dia.replace(/-/g,""), n = dObj(t.dia); n.setUTCDate(n.getUTCDate()+1);
    const p = new URLSearchParams({action:"TEMPLATE", text:`Trend: ${t.titulo}`, dates:`${d}/${n.toISOString().slice(0,10).replace(/-/g,"")}`, ctz:"America/Sao_Paulo"});
    if (t.local) p.set("location", t.local);
    p.set("details", [t.musica && "Música: " + t.musica, t.ref_link].filter(Boolean).join("\n"));
    return "https://calendar.google.com/calendar/render?" + p;
  };

  // Pessoas e cores
  const orderedPeople = () => Object.values(S.profiles).sort((a,b) => (a.created_at || "").localeCompare(b.created_at || "") || a.id.localeCompare(b.id));
  const colorOf = uid => { const i = orderedPeople().findIndex(p => p.id === uid); return PALETTE[(i < 0 ? 0 : i) % PALETTE.length]; };
  const nameOf = uid => (S.profiles[uid] && S.profiles[uid].nome) || "Alguém";
  const initial = uid => (nameOf(uid).trim()[0] || "?").toUpperCase();
  const av = (uid, extra = {}) => { const [bg, fg] = colorOf(uid); return el("div",{class:"av", title:nameOf(uid), style:{background:bg, color:fg, ...extra}, text:initial(uid)}); };
  const groupSize = () => Math.max(1, S.membros.length);
  const curGroup = () => S.grupos.find(g => g.id === S.grupo) || null;
  const showDate = () => (curGroup() && curGroup().show_dia) || SHOW;
  const inviteUrl = g => `${location.origin}${location.pathname}?convite=${g.codigo}`;

  // ——— Dados ———
  // Cada consulta só devolve o que é do grupo da pessoa: o banco bloqueia o resto
  let lastSig = "", loading = false;
  async function loadAll() {
    if (!S.uid || loading) return;
    loading = true;
    try {
      const [meQ, gq] = await Promise.all([
        S.sb.from("profiles").select("*").eq("id", S.uid).maybeSingle(),
        S.sb.from("grupos").select("*").order("created_at")
      ]);
      if (gq.error) { fail(gq.error, "Não carregou"); return; }
      S.me = meQ.data || null;
      S.grupos = gq.data;
      const convite = store.get("trends-convite");
      if (convite && S.me) {
        store.set("trends-convite", null);
        const r = await S.sb.rpc("entrar_grupo", {p_codigo: convite});
        if (r.error) flash(r.error.message);
        else {
          if (!S.grupos.some(g => g.id === r.data.id)) S.grupos.push(r.data);
          S.grupo = r.data.id; store.set("trends-grupo", S.grupo);
          flash(`Você entrou no grupo “${r.data.nome}” 💜`);
        }
      }
      if (!S.grupos.some(g => g.id === S.grupo)) { S.grupo = S.grupos.length ? S.grupos[0].id : null; store.set("trends-grupo", S.grupo); }
      if (!S.grupo) { S.membros = []; S.profiles = {}; S.trends = []; S.votos = []; S.videos = []; }
      else {
        const [m, i, v, vid] = await Promise.all([
          S.sb.from("membros").select("user_id, created_at").eq("grupo_id", S.grupo),
          S.sb.from("itens").select("*").eq("grupo_id", S.grupo).eq("categoria","trend").order("dia").order("created_at"),
          S.sb.from("votos").select("*"),
          S.sb.from("videos").select("*").eq("grupo_id", S.grupo).order("created_at", {ascending:false})
        ]);
        const err = m.error || i.error || v.error;
        if (err) { fail(err, "Não carregou"); return; }
        S.membros = m.data;
        const ids = m.data.map(x => x.user_id);
        const p = ids.length ? await S.sb.from("profiles").select("*").in("id", ids) : {data:[]};
        const joined = Object.fromEntries(m.data.map(x => [x.user_id, x.created_at]));
        S.profiles = Object.fromEntries((p.data || []).map(r => [r.id, {...r, created_at: joined[r.id] || r.created_at}]));
        S.trends = i.data;
        const itemIds = new Set(i.data.map(t => t.id));
        S.votos = v.data.filter(r => r.slot === r.item_id && itemIds.has(r.item_id));
        S.videosMissing = !!vid.error;
        S.videos = vid.error ? [] : vid.data;
      }
      S.loaded = true;
      const sig = JSON.stringify([S.me, S.grupos, S.grupo, S.membros, S.profiles, S.trends, S.votos, S.videos]);
      if (sig !== lastSig) { lastSig = sig; softRender(); }
    } finally { loading = false; }
  }
  // Explorar: trends publicadas por todos os grupos (sem nomes, grupos ou locais)
  let exLoading = false, exSig = "";
  async function loadExplorar() {
    if (!S.uid || exLoading) return;
    exLoading = true;
    try {
      const [p, mine, den] = await Promise.all([
        S.sb.from("publicacoes").select("id,item_id,owner,titulo,musica,ref_link,show_dia,usos,oculta,created_at").eq("oculta", false).order("created_at", {ascending:false}).limit(100),
        S.sb.from("publicacoes").select("id,item_id,oculta").eq("owner", S.uid),
        S.sb.from("denuncias").select("pub_id").eq("user_id", S.uid)
      ]);
      if (p.error) { S.exMissing = true; S.exLoaded = true; softRender(); return; }
      S.exMissing = false;
      S.pubs = p.data;
      S.myPubs = Object.fromEntries((mine.data || []).map(x => [x.item_id, x]));
      S.minhasDen = new Set((den.data || []).map(x => x.pub_id));
      const ids = p.data.map(x => x.id);
      const r = ids.length ? await S.sb.from("reacoes").select("pub_id,user_id,tipo").in("pub_id", ids) : {data:[]};
      S.reacoes = r.data || [];
      S.exLoaded = true;
      const sig = JSON.stringify([S.pubs, S.myPubs, [...S.minhasDen], S.reacoes]);
      if (sig !== exSig) { exSig = sig; softRender(); }
    } finally { exLoading = false; }
  }
  // Atualiza a cada 12 s com o app aberto (sem conexão ao vivo, que tem limite no plano grátis)
  const refresh = () => { loadAll(); if (S.screen === "explorar" || S.screen === "feed") loadExplorar(); };
  setInterval(() => { if (S.uid && !document.hidden) refresh(); }, 12000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && S.uid) refresh(); });
  async function setSession(session) {
    const uid = session && session.user ? session.user.id : null;
    if (uid === S.uid && (S.loaded || !uid)) { render(); return; }
    S.uid = uid; S.user = session ? session.user : null; S.loaded = false; S.me = null; lastSig = "";
    S.sheet = null; S.viewer = null; S.form = null;
    if (!uid) { render(); return; }
    render(); await loadAll(); loadExplorar();
  }
  function switchGroup(id) {
    S.grupo = id; store.set("trends-grupo", id); S.sheet = null; S.filter = "todas"; S.day = null;
    S.trends = []; S.votos = []; S.videos = []; S.membros = []; S.profiles = {}; lastSig = "";
    S.screen = "feed"; render(); loadAll();
  }
  async function shareInvite(g) {
    const url = inviteUrl(g), text = `Entra no nosso grupo “${g.nome}” no Roteiro de Trends:`;
    try { if (navigator.share) { await navigator.share({title:"Roteiro de Trends", text, url}); return; } } catch(e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); flash("Link de convite copiado"); }
    catch(e) { S.sheet = {type:"grupo", showLink:true}; render(); }
  }

  // ——— Ações ———
  const go = screen => {
    S.screen = screen; S.errors = {}; S.sheet = null;
    if (screen === "nova" && !S.form) S.form = blankForm();
    if (screen !== "nova") { S.editing = null; S.form = null; }
    try { localStorage.setItem("trends-screen", screen); } catch(e) {}
    if (screen === "explorar") loadExplorar();
    render(); const sc = document.querySelector(".scroll"); if (sc) sc.scrollTop = 0;
  };
  const blankForm = (day) => ({link:"", name:"", song:"", day: day || (DAYS.includes(todaySP()) ? todaySP() : DAYS[0]), place:"", people:[S.uid]});
  const canStatus = t => t.owner === S.uid || (t.participantes || []).includes(S.uid);
  async function cycle(t) {
    if (!canStatus(t)) return;
    const next = NEXT[t.status || "a_gravar"];
    t.status = next; render();
    const {error} = await S.sb.from("itens").update({status: next}).eq("id", t.id);
    if (error) { fail(error, "Status não salvo"); loadAll(); }
  }
  async function submitTrend() {
    const f = S.form, e = {};
    if (!safeTiktok(f.link)) e.link = "Cole um link do TikTok válido (começa com https://).";
    if (!f.name.trim()) e.name = 1;
    if (!f.place.trim()) e.place = 1;
    if (!f.people.length) e.people = "Escolha pelo menos uma amiga.";
    S.errors = e;
    if (Object.keys(e).length) return render();
    S.busy = true; render();
    const row = { dia:f.day, categoria:"trend", titulo:f.name.trim(), musica:f.song.trim() || null, local:f.place.trim(),
      participantes:f.people, ref_link:safeTiktok(f.link) };
    const r = S.editing
      ? await S.sb.from("itens").update(row).eq("id", S.editing)
      : await S.sb.from("itens").insert({id: uuid(), status:"a_gravar", grupo_id:S.grupo, ...row});
    S.busy = false;
    if (r.error) return fail(r.error, "Não salvou");
    const msg = S.editing ? "Trend atualizada" : `“${row.titulo}” entrou no roteiro de ${dayLabel(row.dia)}`;
    S.form = null; S.editing = null; S.screen = "feed"; S.filter = "todas";
    await loadAll(); flash(msg);
  }
  async function deleteTrend(t) {
    S.sheet = null; render();
    const {error} = await S.sb.from("itens").delete().eq("id", t.id);
    if (error) return fail(error, "Não apagou");
    flash("Trend apagada"); loadAll();
  }
  async function toggleVote(t) {
    const mine = S.votos.some(v => v.user_id === S.uid && v.item_id === t.id);
    S.votos = mine ? S.votos.filter(v => !(v.user_id === S.uid && v.item_id === t.id)) : [...S.votos, {user_id:S.uid, slot:t.id, item_id:t.id}];
    render();
    const q = mine ? S.sb.from("votos").delete().eq("user_id", S.uid).eq("slot", t.id)
                   : S.sb.from("votos").upsert({user_id:S.uid, slot:t.id, item_id:t.id});
    const {error} = await q;
    if (error) { fail(error, "Voto não salvo"); loadAll(); }
  }
  async function uploadVideo(file, itemId) {
    if (file.size > MAX_VIDEO) return flash(`Esse vídeo tem ${Math.round(file.size/1048576)} MB. O limite é 50 MB: grave em 1080p ou corte um pouco.`);
    S.sheet = null; render(); showToast("Enviando vídeo… não feche o app", true);
    const extn = ((file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "")) || "mp4";
    const path = `${S.uid}/${uuid()}.${extn}`;
    const up = await S.sb.storage.from("videos").upload(path, file, {contentType: file.type || "video/mp4"});
    if (up.error) return fail(up.error, "Vídeo não enviado");
    const trend = S.trends.find(t => t.id === itemId);
    const r = await S.sb.from("videos").insert({path, grupo_id:S.grupo, item_id: itemId || null, titulo: trend ? trend.titulo : file.name.replace(/\.[^.]+$/, "").slice(0, 80)});
    if (r.error) { await S.sb.storage.from("videos").remove([path]); return fail(r.error, "Vídeo não salvo"); }
    await loadAll(); flash("Vídeo enviado para o grupo");
  }
  async function deleteAccount() {
    S.busy = true; render();
    const paths = [
      ...S.videos.filter(v => v.owner === S.uid).map(v => v.path),
      ...S.trends.filter(t => t.owner === S.uid && t.video_path).map(t => t.video_path)
    ];
    if (paths.length) await S.sb.storage.from("videos").remove(paths);
    const {error} = await S.sb.rpc("delete_my_account");
    S.busy = false;
    if (error) { render(); return fail(error, "Não excluiu"); }
    S.sheet = null; S.nameDraft = null;
    await S.sb.auth.signOut();
    flash("Conta excluída. Até a próxima 💜");
  }
  async function publish(t) {
    S.sheet = null; render();
    const {error} = await S.sb.rpc("publicar", {p_item: t.id});
    if (error) return flash(error.message);
    flash("Trend publicada no Explorar 🔥"); loadExplorar();
  }
  async function unpublish(pubId) {
    S.sheet = null; render();
    const {error} = await S.sb.from("publicacoes").delete().eq("id", pubId).eq("owner", S.uid);
    if (error) return fail(error, "Não tirou");
    flash("A trend saiu do Explorar"); loadExplorar();
  }
  async function react(pub, tipo) {
    const mine = S.reacoes.some(r => r.pub_id === pub.id && r.user_id === S.uid && r.tipo === tipo);
    S.reacoes = mine ? S.reacoes.filter(r => !(r.pub_id === pub.id && r.user_id === S.uid && r.tipo === tipo)) : [...S.reacoes, {pub_id:pub.id, user_id:S.uid, tipo}];
    render();
    const {error} = mine
      ? await S.sb.from("reacoes").delete().eq("pub_id", pub.id).eq("user_id", S.uid).eq("tipo", tipo)
      : await S.sb.from("reacoes").insert({pub_id:pub.id, user_id:S.uid, tipo});
    if (error) { fail(error, "Reação não salva"); loadExplorar(); }
  }
  async function report(pub) {
    S.sheet = null; S.minhasDen.add(pub.id); render();
    const {error} = await S.sb.rpc("denunciar", {p_pub: pub.id});
    if (error) { S.minhasDen.delete(pub.id); render(); return flash(error.message); }
    flash("Denúncia enviada. Obrigada por cuidar do Explorar 💜"); loadExplorar();
  }
  async function usePub(pub, grupoId, dia) {
    S.busy = true; render();
    const {error} = await S.sb.rpc("usar_publicacao", {p_pub: pub.id, p_grupo: grupoId, p_dia: dia});
    S.busy = false; S.sheet = null;
    if (error) { render(); return flash(error.message); }
    const g = S.grupos.find(x => x.id === grupoId);
    if (grupoId !== S.grupo) switchGroup(grupoId); else { S.screen = "feed"; S.filter = "todas"; render(); }
    await loadAll(); loadExplorar();
    flash(`“${pub.titulo}” entrou no roteiro${g ? " de " + g.nome : ""} em ${dayLabel(dia)}`);
  }
  async function deleteVideo(v) {
    S.viewer = null; render();
    await S.sb.storage.from("videos").remove([v.path]);
    const {error} = await S.sb.from("videos").delete().eq("id", v.id);
    if (error) return fail(error, "Não apagou");
    flash("Vídeo apagado"); loadAll();
  }

  // ——— Telas ———
  function loginScreen() {
    return el("div",{class:"login"},
      el("div",{class:"tag eyebrow"}, el("i"), "SEMANA DO SHOW · SÃO PAULO"),
      el("div",{class:"mid"},
        el("div",{class:"tour",text:"MORUMBIS · 28, 30 E 31/10"}),
        el("div",{class:"big",html:"Roteiro<br>de<br><span>trends</span>"}),
        el("div",{class:"bar"}),
        el("p",{class:"lede",text:"Combinem, gravem e postem juntas até o dia do show. Cada grupo tem o seu espaço privado."})),
      el("div",{class:"stack",style:{gap:"14px"}},
        el("button",{class:"btn-white",disabled:S.busy,onclick:async () => {
          S.busy = true; render();
          const {error} = await S.sb.auth.signInWithOAuth({provider:"google", options:{redirectTo: location.origin + location.pathname}});
          if (error) { S.busy = false; fail(error, "Não entrou"); }
        }}, el("span",{class:"g",html:G_LOGO}), S.busy ? "Abrindo o Google…" : "Entrar com Google"),
        el("div",{class:"foot",text: store.get("trends-convite") ? "você recebeu um convite · entre para participar" : "grátis · só o seu grupo vê o que vocês planejam"})));
  }
  function nameScreen() {
    const suggestion = (S.user && S.user.user_metadata && (S.user.user_metadata.full_name || S.user.user_metadata.name) || "").split(" ")[0];
    if (S.nameDraft == null) S.nameDraft = S.me ? S.me.nome : suggestion;
    const input = el("input",{class:"input",id:"n-nome",maxlength:"40",value:S.nameDraft,placeholder:"Ex.: Ju",oninput:e => S.nameDraft = e.target.value});
    return el("div",{class:"login"},
      el("div",{class:"tag eyebrow"}, el("i"), "QUASE LÁ"),
      el("div",{class:"mid"},
        el("div",{class:"big",style:{fontSize:"52px"},html:"Como você<br>quer <span>aparecer?</span>"}),
        el("div",{class:"bar"}),
        el("p",{class:"lede",text:"É esse nome que o seu grupo vai ver nas trends, nos votos e nos vídeos."}),
        el("label",{class:"field"}, el("span",{class:"eyebrow",text:"Seu nome ou apelido"}), input)),
      el("button",{class:"btn-red",disabled:S.busy,onclick:async () => {
        const nome = (S.nameDraft || "").trim(); if (!nome) return input.focus();
        S.busy = true; render();
        const {error} = await S.sb.from("profiles").upsert({id:S.uid, nome});
        S.busy = false;
        if (error) return fail(error, "Nome não salvo");
        await loadAll(); flash(`Oi, ${nome}!`);
      }}, S.busy ? "Salvando…" : "Entrar no roteiro"));
  }

  // Primeiro acesso sem grupo: criar o grupo ou entrar com código
  const SHOW_DAYS = ["2026-10-28","2026-10-30","2026-10-31"];
  function groupForm(onDone) {
    if (!S.gform) S.gform = {nome:"", show:"2026-10-30", codigo:""};
    const f = S.gform;
    return [
      el("label",{class:"field"}, el("span",{class:"eyebrow",text:"Nome do grupo"}),
        el("input",{class:"input",id:"g-nome",maxlength:"40",value:f.nome,placeholder:"Ex.: Fila do portão B",oninput:e => f.nome = e.target.value})),
      el("div",{class:"field"}, el("span",{class:"eyebrow",text:"Dia do show de vocês"}),
        el("div",{class:"days",style:{gridTemplateColumns:"repeat(3,1fr)"}}, SHOW_DAYS.map(d =>
          el("button",{class:"day" + (f.show === d ? " on" : ""),onclick:() => { f.show = d; render(); }}, el("small",{text:wd(d)}), el("b",{text:`${dd(d)}/10`}))))),
      el("button",{class:"btn-red",disabled:S.busy,onclick:async () => {
        if (!f.nome.trim()) return document.getElementById("g-nome").focus();
        S.busy = true; render();
        const r = await S.sb.rpc("criar_grupo", {p_nome: f.nome.trim(), p_show: f.show});
        S.busy = false;
        if (r.error) { render(); return flash(r.error.message); }
        S.gform = null; S.grupos.push(r.data); switchGroup(r.data.id);
        S.sheet = {type:"grupo", novo:true}; render();
        if (onDone) onDone();
      }}, S.busy ? "Criando…" : "Criar grupo"),
      el("div",{class:"foot",style:{margin:"6px 0"},text:"— ou —"}),
      el("label",{class:"field"}, el("span",{class:"eyebrow",text:"Tenho um código de convite"}),
        el("div",{style:{display:"flex",gap:"8px"}},
          el("input",{class:"input",id:"g-codigo",maxlength:"12",value:f.codigo,placeholder:"Ex.: 7F3A9C21",style:{textTransform:"uppercase"},oninput:e => f.codigo = e.target.value}),
          el("button",{class:"btn-line",style:{flex:"none",padding:"0 18px"},disabled:S.busy,onclick:async () => {
            const c = f.codigo.trim(); if (!c) return document.getElementById("g-codigo").focus();
            S.busy = true; render();
            const r = await S.sb.rpc("entrar_grupo", {p_codigo: c});
            S.busy = false;
            if (r.error) { render(); return flash(r.error.message); }
            S.gform = null; if (!S.grupos.some(g => g.id === r.data.id)) S.grupos.push(r.data);
            switchGroup(r.data.id); flash(`Você entrou no grupo “${r.data.nome}” 💜`);
            if (onDone) onDone();
          }}, "Entrar")))
    ];
  }
  function noGroupScreen() {
    return el("div",{class:"scroll"}, el("div",{class:"stack",style:{gap:"18px"}},
      el("div",{}, el("div",{class:"eyebrow",style:{color:RED},text:`Oi, ${S.me.nome}!`}), el("h1",{class:"h1",text:"Seu grupo"})),
      el("p",{class:"lede",style:{margin:0,color:"#D8D1CD"},text:"Crie o grupo de vocês e mande o link de convite para as amigas. Só quem estiver no grupo vê as trends, os votos e os nomes."}),
      ...groupForm(),
      el("button",{class:"lnk",style:{alignSelf:"center",marginTop:"8px"},onclick:async () => { await S.sb.auth.signOut(); }},"Sair")));
  }
  const groupPill = () => { const g = curGroup(); if (!g) return null;
    return el("button",{class:"chip",style:{alignSelf:"flex-start",display:"flex",alignItems:"center",gap:"8px",height:"38px"},onclick:() => { S.sheet = {type:"grupo"}; render(); }},
      el("span",{style:{width:"8px",height:"8px",borderRadius:"50%",background:PURPLE}}), g.nome, el("span",{text:`${groupSize()} ${groupSize() === 1 ? "pessoa" : "pessoas"} · convidar ▾`})); };

  function daysLeftText() {
    const sd = showDate(), lbl = `${dd(sd)}/${sd.slice(5,7)}`, n = Math.round((dObj(sd) - dObj(todaySP())) / 864e5);
    return n > 1 ? `FALTAM ${n} DIAS · ${lbl}` : n === 1 ? `FALTA 1 DIA · ${lbl}` : n === 0 ? `É HOJE · ${lbl}` : `DEPOIS DO SHOW · ${lbl}`;
  }
  const meButton = () => { const [bg, fg] = colorOf(S.uid); return el("button",{class:"me",style:{background:bg,color:fg},"aria-label":"Minha conta",onclick:() => { S.sheet = {type:"conta"}; render(); }}, initial(S.uid)); };
  const statusBtn = t => el("button",{class:"st " + (t.status || "a_gravar"), disabled:!canStatus(t), title: canStatus(t) ? "Tocar para mudar o status" : "Só quem participa muda o status", onclick:() => cycle(t)}, ST[t.status || "a_gravar"]);
  const crew = (ids, size) => el("div",{class:"avs"}, ids.filter(u => S.profiles[u]).map(u => av(u, size ? {width:size+"px",height:size+"px"} : {})));

  // Player leve do TikTok: mostra a capa real, o @ e a música; toca dentro do card
  const tiktokPlayer = (id, cls) => el("div",{class:cls || "embed"}, el("iframe",{
    src:`https://www.tiktok.com/player/v1/${id}?autoplay=0&music_info=1&description=1&rel=0`,
    allow:"encrypted-media; fullscreen; picture-in-picture", allowfullscreen:true, loading:"lazy", title:"Vídeo do TikTok"}));
  function media(t) {
    const id = tiktokId(t.ref_link);
    if (id) return tiktokPlayer(id);
    const href = safeTiktok(t.ref_link);
    if (!href) return null;
    return el("a",{class:"poster", href, target:"_blank", rel:"noopener noreferrer"},
      el("div",{class:"playb",text:"▶"}),
      el("div",{class:"cap",text:`abrir no TikTok ↗ · ${tiktokHandle(t.ref_link)}`}));
  }

  function feedScreen() {
    const order = t => DAYS.indexOf(t.dia);
    const all = [...S.trends].filter(t => !S.onlyMine || t.owner === S.uid).sort((a,b) => order(a) - order(b));
    const list = all.filter(t => S.filter === "todas" || (t.status || "a_gravar") === S.filter);
    const counts = k => k === "todas" ? all.length : all.filter(t => (t.status || "a_gravar") === k).length;
    let installHint = null;
    try {
      const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
      if (!standalone && !localStorage.getItem("trends-install-ok")) {
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        installHint = el("div",{class:"install"},
          el("div",{}, el("b",{text:"Coloque na tela de início"}),
            ios ? "No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”." : "No Chrome, toque no menu ⋮ e depois em “Adicionar à tela inicial” ou “Instalar app”."),
          el("button",{class:"x","aria-label":"Fechar",onclick:() => { try { localStorage.setItem("trends-install-ok","1"); } catch(e) {} render(); }}, "✕"));
      }
    } catch(e) {}
    return el("div",{class:"stack"},
      el("div",{class:"head"},
        el("div",{}, el("div",{class:"eyebrow",style:{color:RED},text:daysLeftText()}), el("h1",{class:"h1",text:"Roteiro"})),
        meButton()),
      el("div",{style:{display:"flex",gap:"8px",flexWrap:"wrap"}}, groupPill(),
        curGroup() && curGroup().videos_liberados ? el("button",{class:"chip",style:{height:"38px"},onclick:() => go("videos")},"▶ Vídeos do grupo") : null),
      installHint,
      el("div",{class:"chips"},
        el("button",{class:"chip" + (S.onlyMine ? " on" : ""), style:{borderColor: S.onlyMine ? null : PURPLE}, "aria-pressed":String(!!S.onlyMine),
          onclick:() => { S.onlyMine = !S.onlyMine; store.set("trends-minhas", S.onlyMine ? "1" : null); render(); }}, "Só as minhas ",
          el("span",{text:String(S.trends.filter(t => t.owner === S.uid).length)})),
        [["todas","Todas"],["a_gravar","A gravar"],["gravado","Gravado"],["postado","Postado"]].map(([k,l]) =>
        el("button",{class:"chip" + (S.filter === k ? " on" : ""), onclick:() => { S.filter = k; render(); }}, l + " ", el("span",{text:String(counts(k))})))),
      list.length ? list.map(t => {
        const ids = (t.participantes || []).filter(u => S.profiles[u]);
        return el("article",{class:"card"},
          media(t),
          el("div",{class:"body"},
            el("div",{class:"title-row"},
              el("div",{style:{display:"flex",flexDirection:"column",gap:"4px",minWidth:0}},
                el("div",{class:"tname",text:t.titulo}),
                t.musica ? el("div",{class:"song",text:"♪ " + t.musica}) : null),
              statusBtn(t)),
            el("div",{class:"tags"}, el("span",{class:"tag mono",text:dayLabel(t.dia)}), t.local ? el("span",{class:"tag",text:t.local}) : null),
            el("div",{class:"crew"}, crew(ids), el("span",{text: ids.length && ids.length === groupSize() ? "o grupo todo" : `${ids.length} ${ids.length === 1 ? "vai" : "vão"} gravar · ideia de ${nameOf(t.owner)}`})),
            el("div",{class:"more"},
              el("a",{class:"lnk",href:gcalUrl(t),target:"_blank",rel:"noopener"},"+ Agenda"),
              t.local ? el("a",{class:"lnk",href:"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(t.local),target:"_blank",rel:"noopener"},"Mapa") : null,
              curGroup() && curGroup().videos_liberados ? el("button",{class:"lnk",onclick:() => { S.sheet = {type:"enviar", itemId:t.id}; render(); }},"Enviar vídeo") : null,
              t.owner === S.uid ? el("button",{class:"lnk",onclick:() => { S.sheet = {type:"trend", trend:t}; render(); }},"Editar") : null,
              t.copia_explorar ? el("span",{class:"lnk",style:{color:"#7A7270"},text:"veio do Explorar"}) : null,
              t.owner === S.uid && safeTiktok(t.ref_link) && !t.copia_explorar
                ? (S.myPubs[t.id]
                    ? el("button",{class:"lnk",style:{color: S.myPubs[t.id].oculta ? "#FF6B6B" : "#C9B3EE"},onclick:() => { S.sheet = {type:"publicada", trend:t}; render(); }}, S.myPubs[t.id].oculta ? "Oculta por denúncias" : "No Explorar ✓")
                    : el("button",{class:"lnk",style:{color:"#C9B3EE"},onclick:() => { S.sheet = {type:"publicar", trend:t}; render(); }},"Mostrar no Explorar"))
                : null)));
      }) : el("div",{class:"empty",text: all.length ? "Nenhuma trend com esse status." : "Nenhuma trend ainda. Toque no + para adicionar a primeira."}));
  }

  const REACOES = [["roxo","💜"],["fogo","🔥"],["riso","😂"]];
  function explorarScreen() {
    if (!S.exLoaded) loadExplorar();
    const count = (id, tipo) => S.reacoes.filter(r => r.pub_id === id && (!tipo || r.tipo === tipo)).length;
    let list = S.pubs.filter(p => S.exDia === "todos" || p.show_dia === S.exDia);
    if (S.exOrdem === "alta") list = [...list].sort((a,b) => (count(b.id) + 2 * b.usos) - (count(a.id) + 2 * a.usos) || b.created_at.localeCompare(a.created_at));
    const chip = (on, label, fn) => el("button",{class:"chip" + (on ? " on" : ""), onclick:fn}, label);
    return el("div",{class:"stack"},
      el("div",{class:"head"},
        el("div",{}, el("div",{class:"eyebrow",style:{color:PURPLE},text:"Trends de todos os grupos"}), el("h1",{class:"h1",text:"Explorar"})),
        meButton()),
      el("div",{class:"chips"},
        chip(S.exOrdem === "alta", "🔥 Em alta", () => { S.exOrdem = "alta"; render(); }),
        chip(S.exOrdem === "recentes", "Recentes", () => { S.exOrdem = "recentes"; render(); }),
        chip(S.exDia === "todos", "Todos os shows", () => { S.exDia = "todos"; render(); }),
        SHOW_DAYS.map(d => chip(S.exDia === d, `Show ${dd(d)}/10`, () => { S.exDia = d; render(); }))),
      S.exMissing ? el("div",{class:"empty",text:"O Explorar ainda não foi ativado no banco."})
      : !S.exLoaded ? el("div",{class:"empty",text:"Carregando as trends…"})
      : list.length ? list.map(p => {
          const id = tiktokId(p.ref_link), mine = p.owner === S.uid, denunciada = S.minhasDen.has(p.id);
          return el("article",{class:"card"},
            id ? tiktokPlayer(id) : media(p),
            el("div",{class:"body"},
              el("div",{style:{display:"flex",flexDirection:"column",gap:"4px"}},
                el("div",{class:"tname",text:p.titulo}),
                p.musica ? el("div",{class:"song",text:"♪ " + p.musica}) : null),
              el("div",{class:"tags"},
                el("span",{class:"tag mono",text:`grupo do show ${dd(p.show_dia)}/10`}),
                p.usos ? el("span",{class:"tag",text:`usada por ${p.usos} ${p.usos === 1 ? "grupo" : "grupos"}`}) : null,
                mine ? el("span",{class:"tag",style:{color:"#C9B3EE"},text:"sua publicação"}) : null),
              el("div",{style:{display:"flex",gap:"8px"}}, REACOES.map(([k, e]) => {
                const on = S.reacoes.some(r => r.pub_id === p.id && r.user_id === S.uid && r.tipo === k), n = count(p.id, k);
                return el("button",{class:"chip" + (on ? " on" : ""), style:{height:"40px",fontSize:"16px"}, "aria-pressed":String(on), onclick:() => react(p, k)}, e + " ", el("span",{text:String(n)}));
              })),
              el("button",{class:"btn-red",style:{height:"48px",fontSize:"15px"},onclick:() => { S.sheet = {type:"usar", pub:p, grupo:S.grupo, dia: DAYS.includes(todaySP()) ? todaySP() : showDate()}; render(); }},"Usar no meu grupo"),
              el("div",{class:"more"},
                mine ? el("button",{class:"lnk",onclick:() => unpublish(p.id)},"Tirar do Explorar")
                  : denunciada ? el("span",{class:"lnk",text:"Você denunciou"})
                  : el("button",{class:"lnk",onclick:() => { S.sheet = {type:"denunciar", pub:p}; render(); }},"Denunciar"))));
        })
      : el("div",{class:"empty",text:"Nenhuma trend publicada ainda. No Roteiro, toque em “Mostrar no Explorar” numa trend do seu grupo para ser a primeira!"}));
  }

  function novaScreen() {
    const f = S.form, e = S.errors, lid = tiktokId(f.link);
    const input = (key, id, ph, cls) => el("input",{class:"input " + (cls || ""), id, value:f[key], placeholder:ph, maxlength: key === "link" ? "500" : "120",
      oninput:ev => { const before = tiktokId(f.link) + "|" + isTiktok(f.link); f[key] = ev.target.value; if (e[key]) { e[key] = null; render(); } else if (key === "link" && before !== tiktokId(f.link) + "|" + isTiktok(f.link)) render(); }});
    return el("div",{class:"stack",style:{gap:"18px"}},
      el("div",{class:"head",style:{alignItems:"center"}},
        el("h1",{class:"h1",text: S.editing ? "Editar trend" : "Nova trend"}),
        el("button",{class:"close","aria-label":"Fechar",onclick:() => go("feed")},"✕")),
      el("label",{class:"field"}, el("span",{class:"eyebrow",text:"Link do TikTok"}),
        input("link","f-link","https://www.tiktok.com/@.../video/...", e.link ? "bad" : lid ? "good" : ""),
        e.link ? el("span",{class:"err",text:e.link}) : lid ? [el("span",{class:"ok",text:"Vídeo reconhecido · é assim que vai aparecer no card"}), tiktokPlayer(lid, "embed preview")]
          : f.link && safeTiktok(f.link) ? el("span",{class:"ok",text:"Link curto: vai abrir no TikTok. Para tocar no app, use o link completo com /video/."}) : null),
      el("label",{class:"field"}, el("span",{class:"eyebrow",text:"Nome da trend"}), input("name","f-name","Ex.: coreô do refrão na fila", e.name ? "bad" : "")),
      el("label",{class:"field"}, el("span",{class:"eyebrow",text:"Música"}), input("song","f-song","Ex.: SWIM — BTS")),
      el("div",{class:"field"}, el("span",{class:"eyebrow",text:"Dia"}),
        el("div",{class:"days"}, DAYS.map(d => el("button",{class:"day" + (f.day === d ? " on" : ""), onclick:() => { f.day = d; render(); }}, el("small",{text:wd(d)}), el("b",{text:dd(d)}))))),
      el("label",{class:"field"}, el("span",{class:"eyebrow",text:"Local"}), input("place","f-place","Ex.: Fila do portão B, MorumBIS", e.place ? "bad" : "")),
      el("div",{class:"field"}, el("span",{class:"eyebrow",text:"Quem vai gravar"}),
        el("div",{class:"people"}, orderedPeople().map(p => {
          const on = f.people.includes(p.id);
          return el("button",{class:"person" + (on ? " on" : ""), onclick:() => { f.people = on ? f.people.filter(x => x !== p.id) : [...f.people, p.id]; if (e.people) e.people = null; render(); }}, av(p.id), p.nome);
        })),
        e.people ? el("span",{class:"err",text:e.people}) : null),
      el("button",{class:"btn-red",disabled:S.busy,onclick:submitTrend,style:{marginTop:"4px"}}, S.busy ? "Salvando…" : S.editing ? "Salvar alterações" : "Adicionar ao roteiro"));
  }

  function videosScreen() {
    const file = el("input",{type:"file",accept:"video/*",hidden:true,onchange:ev => {
      const f = ev.target.files && ev.target.files[0]; ev.target.value = "";
      if (!f) return;
      if (S.trends.length) { S.sheet = {type:"qualtrend", file:f}; render(); } else uploadVideo(f, null);
    }});
    return el("div",{class:"stack"},
      el("div",{class:"head"},
        el("div",{}, el("div",{class:"eyebrow",style:{color:PURPLE},text:`${S.videos.length} ${S.videos.length === 1 ? "VÍDEO" : "VÍDEOS"} DO GRUPO`}), el("h1",{class:"h1",text:"Nossos vídeos"})),
        meButton()),
      S.videosMissing ? el("div",{class:"empty",text:"A galeria ainda não foi ativada no banco."}) : null,
      curGroup() && curGroup().videos_liberados
        ? [el("button",{class:"upload",disabled:S.videosMissing,onclick:() => file.click()},"+ Enviar vídeo"), file]
        : el("div",{class:"install",style:{background:"#1A1717",borderColor:"#2E2929"}}, el("div",{},
            el("b",{text:"Os vídeos de vocês ficam no TikTok"}),
            "Gravou? Poste no TikTok e mude o status da trend para “Postado”. Assim todo mundo do grupo acompanha.")),
      S.videos.length ? el("div",{class:"grid2"}, S.videos.map(v => {
        const [bg, fg] = colorOf(v.owner);
        return el("button",{class:"vtile",onclick:() => { S.viewer = v; render(); }},
          el("video",{src:videoUrl(v.path) + "#t=0.1", muted:true, playsInline:true, preload:"metadata"}),
          el("div",{class:"cap"}, el("div",{class:"av",style:{background:bg,color:fg},text:initial(v.owner)}), el("div",{text:v.titulo || "Vídeo"})));
      })) : (S.videosMissing || !(curGroup() && curGroup().videos_liberados) ? null : el("div",{class:"empty",text:"Nenhum vídeo ainda. Grave uma trend e envie aqui."})));
  }

  function votacaoScreen() {
    const n = groupSize();
    const rows = S.trends.map(t => ({t, voters:S.votos.filter(v => v.item_id === t.id).map(v => v.user_id)}))
      .sort((a,b) => b.voters.length - a.voters.length || DAYS.indexOf(a.t.dia) - DAYS.indexOf(b.t.dia));
    return el("div",{class:"stack"},
      el("div",{}, el("div",{class:"eyebrow",style:{color:RED},text:"Toque para votar · 1 voto por trend"}), el("h1",{class:"h1",text:"Votação"})),
      rows.length ? rows.map(({t, voters}, i) => {
        const mine = voters.includes(S.uid);
        return el("button",{class:"poll" + (mine ? " mine" : ""), onclick:() => toggleVote(t)},
          el("div",{class:"title-row"},
            el("div",{style:{display:"flex",flexDirection:"column",gap:"3px",minWidth:0}},
              el("span",{class:"pn",text:t.titulo}),
              el("span",{class:"song",style:{fontSize:"13px"},text:[t.musica && "♪ " + t.musica, dayLabel(t.dia)].filter(Boolean).join(" · ")})),
            el("span",{class:"cnt"}, String(voters.length), el("small",{text:"/" + n}))),
          el("div",{class:"track"}, el("i",{style:{width: Math.min(100, voters.length / n * 100) + "%", background: i === 0 && voters.length ? RED : PURPLE}})),
          el("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
            el("div",{class:"avs"}, voters.filter(u => S.profiles[u]).map(u => av(u))),
            el("span",{class:"mono",style:{fontSize:"11px",color: mine ? "#C9B3EE" : "#A39C98"},text: mine ? "SEU VOTO ✓" : "VOTAR"})));
      }) : el("div",{class:"empty",text:"Nenhuma trend para votar ainda. Toque no + para adicionar."}));
  }

  function agendaScreen() {
    if (!S.day) S.day = DAYS.includes(todaySP()) ? todaySP() : showDate();
    const items = S.trends.filter(t => t.dia === S.day);
    return el("div",{class:"stack"},
      el("div",{class:"head"},
        el("div",{}, el("div",{class:"eyebrow",style:{color:"#A39C98"},text:"26/10 — 01/11"}), el("h1",{class:"h1",text:"Agenda"})),
        meButton()),
      el("div",{class:"adays"}, DAYS.map(d => {
        const on = S.day === d, has = S.trends.some(t => t.dia === d), show = d === showDate();
        return el("button",{class:"aday" + (on ? " on" : "") + (show ? " show" : ""), onclick:() => { S.day = d; render(); }},
          el("small",{text:wd(d)}), el("b",{text:dd(d)}), el("i",{style:{background: has ? (on && !show ? INK : (show && on ? WHITE : PURPLE)) : "transparent"}}));
      })),
      S.day === showDate() ? el("div",{class:"showcard"},
        el("span",{class:"eyebrow",text:`${dayLabel(showDate())} · dia do show`}),
        el("span",{class:"big",html:"Dia do show<br>MorumBIS"}),
        el("span",{style:{fontSize:"14px"},text:"Portões 16h · show 20h · lightstick carregado"}),
        el("a",{href:"https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(VENUE),target:"_blank",rel:"noopener"},"Como chegar ↗")) : null,
      el("div",{class:"eyebrow",style:{color:"#A39C98"},text:`${dayLabel(S.day)} · ${items.length} ${items.length === 1 ? "trend" : "trends"}`}),
      items.map(t => el("div",{class:"arow"},
        el("div",{class:"bar " + (t.status || "a_gravar")}),
        el("div",{style:{display:"flex",flexDirection:"column",gap:"4px",minWidth:0}},
          el("span",{class:"n",text:t.titulo}),
          t.local ? el("span",{class:"p",text:t.local}) : null,
          el("div",{style:{marginTop:"4px"}}, crew(t.participantes || []))),
        statusBtn(t))),
      items.length ? null : el("button",{class:"freeday",onclick:() => { S.form = blankForm(S.day); go("nova"); }},"Dia livre · + adicionar trend"));
  }

  function navBar() {
    const def = [["feed","Roteiro"],["explorar","Explorar"],["nova","Nova"],["votacao","Votação"],["agenda","Agenda"]];
    return el("nav",{class:"nav"}, def.map(([k,l]) =>
      el("button",{class:(S.screen === k ? "on" : "") + (k === "nova" ? " plus" : ""), onclick:() => { if (k === "nova") { S.form = null; S.editing = null; } go(k); }},
        el("span",{class:"ic",html:ICONS[k]}), el("span",{text:l}))));
  }

  function sheetLayer() {
    const s = S.sheet; if (!s) return null;
    const close = () => { S.sheet = null; render(); };
    let content;
    if (s.type === "conta") {
      if (s.val == null) s.val = S.me.nome;
      content = [el("h3",{text:"Minha conta"}),
        el("label",{class:"field"}, el("span",{class:"eyebrow",text:"Seu nome no grupo"}), el("input",{class:"input",id:"c-nome",value:s.val,maxlength:"40",oninput:e => s.val = e.target.value})),
        el("button",{class:"btn-red",onclick:async () => {
          const nome = (s.val || "").trim(); if (!nome) return;
          const {error} = await S.sb.from("profiles").update({nome}).eq("id", S.uid);
          if (error) return fail(error, "Nome não salvo");
          S.sheet = null; await loadAll(); flash("Nome atualizado");
        }},"Salvar nome"),
        el("button",{class:"btn-line",onclick:() => { S.sheet = {type:"grupo"}; render(); }},"Meu grupo e convites"),
        el("button",{class:"btn-line",onclick:async () => { S.sheet = null; await S.sb.auth.signOut(); }},"Sair"),
        el("button",{class:"lnk danger",style:{alignSelf:"center",padding:"6px"},onclick:() => { S.sheet = {type:"excluir"}; render(); }},"Excluir minha conta")];
    } else if (s.type === "grupo") {
      const g = curGroup(); if (!g) { S.sheet = null; return null; }
      const dono = g.owner === S.uid;
      content = [
        el("h3",{text: s.novo ? "Grupo criado! 💜" : g.nome}),
        el("p",{style:{margin:0,fontSize:"14px",color:"#D8D1CD"},text: s.novo ? "Agora mande o link para as amigas. Só quem tiver o link entra, e só vocês veem o que está aqui." : `Show em ${dayLabel(g.show_dia)} · ${groupSize()} ${groupSize() === 1 ? "pessoa" : "pessoas"}`}),
        el("button",{class:"btn-red",onclick:() => shareInvite(g)},"Convidar amigas"),
        s.showLink ? el("input",{class:"input",readonly:true,value:inviteUrl(g),onfocus:e => e.target.select()}) : null,
        el("div",{class:"mono",style:{fontSize:"12px",color:"#A39C98",textAlign:"center"},text:`código do grupo: ${g.codigo}`}),
        el("div",{class:"people"}, orderedPeople().map(p =>
          dono && p.id !== S.uid
            ? el("button",{class:"person",title:"Remover do grupo",onclick:() => { S.sheet = {type:"remover", pessoa:p.id, apagar:false}; render(); }}, av(p.id), p.nome, el("span",{style:{color:"#FF6B6B",fontSize:"16px",marginLeft:"2px"},text:"×"}))
            : el("span",{class:"person",style:{cursor:"default"}}, av(p.id), p.nome + (p.id === g.owner ? " · admin" : "")))),
        dono ? el("p",{style:{margin:0,fontSize:"12.5px",color:"#A39C98",textAlign:"center"},text:"Você é admin: toque numa pessoa para remover do grupo."}) : null,
        dono ? el("button",{class:"lnk",style:{alignSelf:"center"},onclick:async () => {
          const r = await S.sb.rpc("novo_codigo", {p_grupo: g.id});
          if (r.error) return fail(r.error, "Não trocou");
          g.codigo = r.data; render(); flash("Novo link criado. O link antigo não funciona mais.");
        }},"Gerar novo link de convite") : null,
        S.grupos.length > 1 ? el("label",{class:"field"}, el("span",{class:"eyebrow",text:"Trocar de grupo"}),
          el("select",{class:"input",id:"g-troca",onchange:e => switchGroup(e.target.value)},
            S.grupos.map(x => el("option",{value:x.id,selected:x.id === g.id,text:x.nome})))) : null,
        el("button",{class:"btn-line",onclick:() => { S.sheet = {type:"novogrupo"}; render(); }},"Criar outro grupo ou entrar com código"),
        dono
          ? (s.confirm
              ? el("button",{class:"btn-line danger",onclick:async () => {
                  const {error} = await S.sb.from("grupos").delete().eq("id", g.id);
                  if (error) return fail(error, "Não excluiu");
                  S.grupos = S.grupos.filter(x => x.id !== g.id); switchGroup(S.grupos[0] ? S.grupos[0].id : null); flash("Grupo excluído");
                }},"Confirmar: excluir o grupo e tudo dele")
              : el("button",{class:"lnk danger",style:{alignSelf:"center",padding:"6px"},onclick:() => { s.confirm = true; render(); }},"Excluir grupo"))
          : el("button",{class:"lnk danger",style:{alignSelf:"center",padding:"6px"},onclick:async () => {
              const {error} = await S.sb.from("membros").delete().eq("grupo_id", g.id).eq("user_id", S.uid);
              if (error) return fail(error, "Não saiu");
              S.grupos = S.grupos.filter(x => x.id !== g.id); switchGroup(S.grupos[0] ? S.grupos[0].id : null); flash("Você saiu do grupo");
            }},"Sair deste grupo")];
    } else if (s.type === "publicar") {
      const t = s.trend;
      content = [el("h3",{text:"Mostrar no Explorar?"}),
        el("p",{style:{margin:0,fontSize:"15px",lineHeight:"1.45",color:"#D8D1CD"}},
          "Todos os grupos vão ver ", el("b",{text:`“${t.titulo}”`}), " com o vídeo do TikTok e a música. ",
          el("b",{text:"Não aparecem"}), " o nome do grupo, quem participa nem o local."),
        el("button",{class:"btn-red",onclick:() => publish(t)},"Publicar no Explorar")];
    } else if (s.type === "publicada") {
      const t = s.trend, pub = S.myPubs[t.id];
      content = [el("h3",{text: pub && pub.oculta ? "Trend oculta" : "No Explorar"}),
        el("p",{style:{margin:0,fontSize:"15px",lineHeight:"1.45",color:"#D8D1CD"},text: pub && pub.oculta
          ? "Essa trend recebeu 5 denúncias e saiu do Explorar. Ela continua normal no roteiro do seu grupo."
          : "Essa trend aparece para todos os grupos no Explorar."}),
        pub && !pub.oculta ? el("button",{class:"btn-line",onclick:() => publish(t)},"Atualizar com o nome e a música atuais") : null,
        pub ? el("button",{class:"btn-line danger",onclick:() => unpublish(pub.id)},"Tirar do Explorar") : null];
    } else if (s.type === "denunciar") {
      content = [el("h3",{text:"Denunciar trend?"}),
        el("p",{style:{margin:0,fontSize:"15px",lineHeight:"1.45",color:"#D8D1CD"},text:"Use para conteúdo ofensivo, golpe ou spam. Com 5 denúncias de pessoas diferentes, a trend sai do Explorar até ser revisada."}),
        el("button",{class:"btn-line danger",onclick:() => report(s.pub)},"Denunciar")];
    } else if (s.type === "usar") {
      const p = s.pub;
      content = [el("h3",{text:"Usar no meu grupo"}),
        el("p",{style:{margin:0,fontSize:"15px",color:"#D8D1CD"},text:`“${p.titulo}” entra no roteiro como “A gravar”, com você participando. Depois dá para editar.`}),
        S.grupos.length > 1 ? el("label",{class:"field"}, el("span",{class:"eyebrow",text:"Grupo"}),
          el("select",{class:"input",id:"u-grupo",onchange:e => s.grupo = e.target.value},
            S.grupos.map(g => el("option",{value:g.id,selected:g.id === s.grupo,text:g.nome})))) : null,
        el("div",{class:"field"}, el("span",{class:"eyebrow",text:"Dia para gravar"}),
          el("div",{class:"days"}, DAYS.map(d => el("button",{class:"day" + (s.dia === d ? " on" : ""), onclick:() => { s.dia = d; render(); }}, el("small",{text:wd(d)}), el("b",{text:dd(d)}))))),
        el("button",{class:"btn-red",disabled:S.busy,onclick:() => usePub(p, s.grupo, s.dia)}, S.busy ? "Adicionando…" : "Adicionar ao roteiro")];
    } else if (s.type === "remover") {
      const g = curGroup(), n = S.trends.filter(t => t.owner === s.pessoa).length;
      content = [el("h3",{text:`Remover ${nameOf(s.pessoa)}?`}),
        el("p",{style:{margin:0,fontSize:"15px",lineHeight:"1.45",color:"#D8D1CD"},text:`${nameOf(s.pessoa)} sai do grupo “${g ? g.nome : ""}”, os votos são apagados e não dá para voltar, nem com o link de convite.`}),
        n ? el("label",{class:"toggle",style:{display:"flex",gap:"10px",alignItems:"center",fontSize:"14px",color:"#D8D1CD"}},
              el("input",{type:"checkbox",checked:s.apagar,style:{width:"18px",height:"18px",accentColor:"#FF6B6B"},onchange:e => s.apagar = e.target.checked}),
              `Apagar também ${n === 1 ? "a trend criada" : `as ${n} trends criadas`} por ${nameOf(s.pessoa)}`) : null,
        el("button",{class:"btn-line danger",disabled:S.busy,onclick:async () => {
          S.busy = true; render();
          const {error} = await S.sb.rpc("remover_membro", {p_grupo: g.id, p_user: s.pessoa, p_apagar_trends: !!s.apagar});
          S.busy = false;
          if (error) { render(); return flash(error.message); }
          const nome = nameOf(s.pessoa);
          S.sheet = {type:"grupo"}; await loadAll(); render(); flash(`${nome} saiu do grupo`);
        }}, S.busy ? "Removendo…" : "Remover do grupo")];
    } else if (s.type === "novogrupo") {
      content = [el("h3",{text:"Novo grupo"}), ...groupForm()];
    } else if (s.type === "excluir") {
      const mineCount = S.trends.filter(t => t.owner === S.uid).length, vidCount = S.videos.filter(v => v.owner === S.uid).length;
      content = [el("h3",{text:"Excluir minha conta"}),
        el("p",{style:{margin:0,fontSize:"15px",lineHeight:"1.45",color:"#D8D1CD"}},
          "Isso apaga de vez o seu nome no grupo, ",
          el("b",{text:`${mineCount} ${mineCount === 1 ? "trend criada" : "trends criadas"}`}), " por você, os seus votos e ",
          el("b",{text:`${vidCount} ${vidCount === 1 ? "vídeo enviado" : "vídeos enviados"}`}), ". Não dá para desfazer."),
        el("button",{class:"btn-line danger",disabled:S.busy,onclick:deleteAccount}, S.busy ? "Excluindo…" : "Excluir de vez")];
    } else if (s.type === "trend") {
      const t = s.trend;
      content = [el("h3",{text:t.titulo}),
        el("button",{class:"btn-line",onclick:() => {
          S.form = {link:t.ref_link || "", name:t.titulo, song:t.musica || "", day:t.dia, place:t.local || "", people:(t.participantes || []).filter(u => S.profiles[u])};
          S.editing = t.id; S.sheet = null; S.screen = "nova"; S.errors = {}; render();
        }},"Editar trend"),
        s.confirm
          ? el("button",{class:"btn-line danger",onclick:() => deleteTrend(t)},"Confirmar: apagar de vez")
          : el("button",{class:"btn-line danger",onclick:() => { s.confirm = true; render(); }},"Apagar trend")];
    } else if (s.type === "enviar" || s.type === "qualtrend") {
      if (s.chosen == null) s.chosen = s.itemId || "";
      const pick = el("input",{type:"file",accept:"video/*",hidden:true,onchange:ev => { const file = ev.target.files && ev.target.files[0]; ev.target.value = ""; if (file) uploadVideo(file, s.chosen || null); }});
      content = [el("h3",{text: s.file ? "De qual trend é esse vídeo?" : "Enviar vídeo"}),
        el("label",{class:"field"}, el("span",{class:"eyebrow",text:"Trend"}),
          el("select",{class:"input",id:"v-trend",onchange:e => s.chosen = e.target.value},
            el("option",{value:"",text:"Sem trend específica"}),
            S.trends.map(t => el("option",{value:t.id,selected:t.id === s.chosen,text:t.titulo})))),
        el("p",{style:{margin:0,fontSize:"13px",color:"#A39C98"},text:"Até 50 MB. Grave em 1080p para caber."}),
        s.file ? el("button",{class:"btn-red",onclick:() => uploadVideo(s.file, s.chosen || null)},"Enviar") : el("button",{class:"btn-red",disabled:S.videosMissing,onclick:() => pick.click()},"Escolher vídeo"),
        pick];
    }
    return el("div",{class:"sheet-bg",onclick:e => { if (e.target === e.currentTarget) close(); }},
      el("div",{class:"sheet"}, ...content, el("button",{class:"btn-line",onclick:close},"Cancelar")));
  }

  function viewerLayer() {
    const v = S.viewer; if (!v) return null;
    return el("div",{class:"viewer"},
      el("div",{class:"bar"},
        el("div",{style:{display:"flex",alignItems:"center",gap:"10px",minWidth:0}}, av(v.owner), el("div",{style:{fontWeight:700,overflowWrap:"anywhere"},text:v.titulo || "Vídeo"})),
        el("button",{class:"close","aria-label":"Fechar",onclick:() => { S.viewer = null; render(); }},"✕")),
      el("video",{src:videoUrl(v.path), controls:true, autoplay:true, playsInline:true}),
      el("div",{class:"info"},
        el("span",{class:"mono",style:{fontSize:"12px",color:"#A39C98"},text:`enviado por ${nameOf(v.owner)}`}),
        el("div",{style:{display:"flex",gap:"16px"}},
          el("a",{class:"lnk",href:videoUrl(v.path),target:"_blank",rel:"noopener"},"Abrir em tela cheia"),
          v.owner === S.uid ? el("button",{class:"lnk danger",onclick:() => deleteVideo(v)},"Apagar") : null)));
  }

  // ——— Render ———
  // Atualizações que chegam do grupo esperam a pessoa sair do vídeo que está assistindo
  let pending = false;
  function softRender() {
    const a = document.activeElement;
    if (a && a.tagName === "IFRAME") { pending = true; return; }
    render();
  }
  addEventListener("focus", () => { if (pending) { pending = false; render(); } });
  function render() {
    pending = false;
    const sc = document.querySelector(".scroll"), top = sc ? sc.scrollTop : 0;
    const act = document.activeElement, focusId = act && act.id, sel = act && "selectionStart" in act ? [act.selectionStart, act.selectionEnd] : null;
    let nodes;
    if (!S.sb) nodes = [el("div",{class:"login"}, el("div",{class:"mid"}, el("div",{class:"big",style:{fontSize:"40px"},text:"Sem conexão"}), el("p",{class:"lede",text:"Confira a internet e abra o app de novo."})))];
    else if (!S.uid) nodes = [loginScreen()];
    else if (!S.loaded) nodes = [el("div",{class:"login"}, el("div",{class:"mid"}, el("div",{class:"tour",text:"CARREGANDO"}), el("div",{class:"big",html:"Roteiro<br>de<br><span>trends</span>"})))];
    else if (!S.me) nodes = [nameScreen(), sheetLayer()];
    else if (!S.grupo) nodes = [noGroupScreen()];
    else {
      if (S.screen === "nova" && !S.form) S.form = blankForm();
      const view = {feed:feedScreen, explorar:explorarScreen, nova:novaScreen, videos:videosScreen, votacao:votacaoScreen, agenda:agendaScreen}[S.screen] || feedScreen;
      nodes = [el("div",{class:"scroll"}, view()), navBar(), sheetLayer(), viewerLayer()];
    }
    $root.replaceChildren(...nodes.filter(Boolean));
    const sc2 = document.querySelector(".scroll"); if (sc2) sc2.scrollTop = top;
    if (focusId) { const f = document.getElementById(focusId); if (f) { f.focus({preventScroll:true}); if (sel && "setSelectionRange" in f) try { f.setSelectionRange(sel[0], sel[1]); } catch(e) {} } }
  }

  // ——— Início ———
  try { S.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {auth:{persistSession:true, autoRefreshToken:true}}); } catch(e) { S.sb = null; }
  render();
  if (S.sb) {
    S.sb.auth.getSession().then(({data}) => setSession(data.session));
    S.sb.auth.onAuthStateChange((_ev, session) => { setTimeout(() => setSession(session), 0); });
  }
  if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
})();
