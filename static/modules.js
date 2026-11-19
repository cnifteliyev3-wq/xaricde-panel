// CRM, Maliyyə və Reklam modulları (generic.js üzərində)
const SOURCES=["Instagram","Facebook","Google","TikTok","Tövsiyə","Zəng","Digər"];
const LEAD_ST=["Yeni","Əlaqə qurulub","Maraqlanır","Görüş","Müştəri","İtirilib"];
const LEAD_CLS={"Müştəri":"ok","İtirilib":"bad","Yeni":"pri","Görüş":"warn"};
const PLATFORMS={Meta:["Instagram","Facebook"],Google:["Google"],TikTok:["TikTok"],Digər:["Digər"]};
const sum=(a,f)=>a.reduce((s,x)=>s+(+f(x)||0),0);
const monthOf=d=>(d||"").slice(0,7);


// WhatsApp: nömrəni beynəlxalq formata salır (994XXXXXXXXX)
function waNumber(t){
  let d=String(t||"").replace(/\D/g,"");
  if(!d)return "";
  if(d.startsWith("00"))d=d.slice(2);
  if(d.startsWith("994"))return d;
  if(d.startsWith("0"))return "994"+d.slice(1);
  if(d.length==9)return "994"+d;
  return d;
}
function waOpen(id){
  const l=byId("leads",id),n=waNumber(l.tel);
  if(!n){alert("Bu lead üçün telefon nömrəsi yoxdur. Redaktə edib nömrəni yazın.");return}
  const msg="Salam, "+(l.ad||"")+"! Xaricdə Təhsil Global-dan yazırıq. Xaricdə təhsil üzrə sorğunuz barədə sizə kömək etmək istəyirik.";
  window.open("https://wa.me/"+n+"?text="+encodeURIComponent(msg),"_blank","noopener");
}
// ===== CRM =====
ent("leads",{add:"Yeni lead",
  fields:[
    {k:"ad",l:"Ad, soyad",req:1},{k:"tel",l:"Telefon"},
    {k:"menbe",l:"Mənbə",t:"select",opts:SOURCES},
    {k:"kampaniya",l:"Kampaniya / reklam adı"},
    {k:"maraq",l:"Maraqlandığı ölkə / proqram"},
    {k:"status",l:"Status",t:"select",opts:LEAD_ST,cls:LEAD_CLS},
    {k:"operator",l:"Operator"},
    {k:"next",l:"Növbəti zəng tarixi",t:"date"},
    {k:"note",l:"Qeyd",t:"textarea"},
    {k:"tarix",l:"Yaranma tarixi",t:"date",def:today}],
  cols:["ad","tel","menbe","maraq","status","next"],
  actions:r=>`<button class="btn sm" onclick="entForm('calls',0,{lead:${r.id},tarix:'${today()}'})">☎ Zəng</button> <button class="btn ghost sm keep" onclick="waOpen(${r.id})" title="WhatsApp-da aç">💬 WhatsApp</button> `+
    (r.student?`<span class="tag ok">Tələbədir</span> `:`<button class="btn ghost sm" onclick="toStudent(${r.id})">→ Tələbə</button> `)});
ent("calls",{add:"Zəng qeyd et",
  fields:[
    {k:"lead",l:"Lead",t:"ref",ref:"leads",req:1},
    {k:"tarix",l:"Tarix",t:"date",def:today},
    {k:"yon",l:"İstiqamət",t:"select",opts:["Gedən","Gələn"]},
    {k:"netice",l:"Nəticə",t:"select",opts:["Cavab verdi","Cavab vermədi","Məşğul","Yanlış nömrə","Razılaşdı","İmtina etdi"]},
    {k:"note",l:"Qeyd",t:"textarea"},
    {k:"next",l:"Növbəti zəng tarixi",t:"date"}],
  cols:["tarix","lead","yon","netice","note","next"],sort:(a,b)=>(b.tarix||"").localeCompare(a.tarix||"")||b.id-a.id,
  after:async(r,isNew)=>{
    const ch={};if(r.next)ch.next=r.next;
    const l=byId("leads",r.lead);
    if(l&&l.status=="Yeni"&&r.netice=="Cavab verdi")ch.status="Əlaqə qurulub";
    if(l&&r.netice=="İmtina etdi")ch.status="İtirilib";
    if(Object.keys(ch).length)await patchRec("leads",r.lead,ch);
  }});
const toStudent=guard(async id=>{
  const l=byId("leads",id);if(!confirm(`"${l.ad}" tələbə kimi əlavə edilsin?`))return;
  const s={ad:l.ad,tel:l.tel||"",email:"",sev:"Bakalavr",sah:l.maraq||"",bal:"",status:"Yeni müraciət",menbe:l.menbe||"",lead:l.id,docs:{},
    yaradilma:today(),log:[{t:today()+" 00:00",u:(me&&me.username)||"",text:"Lead-dən çevrildi ("+(l.menbe||"?")+")"}]};
  const r=await api("POST","/api/students",s);db.studs.push({id:r.id,...s});
  await patchRec("leads",id,{student:r.id,status:"Müştəri"});render();
});
function crmPanel(){
  const L=store.leads,t=today(),C=store.calls;
  const due=L.filter(l=>l.next&&l.next<=t&&!["Müştəri","İtirilib"].includes(l.status)).sort((a,b)=>a.next.localeCompare(b.next));
  const won=L.filter(l=>l.status=="Müştəri").length;
  return cards([[L.length,"Cəmi lead"],[L.filter(l=>l.status=="Yeni").length,"Yeni (toxunulmayıb)"],
    [C.filter(c=>c.tarix==t).length,"Bugünkü zənglər"],[L.length?Math.round(won/L.length*100)+"%":"—","Müştəriyə çevrilmə"]])+
  `<h2>Bu gün və gecikmiş zənglər</h2>`+(due.length?`<div class="tw"><table><tr><th>Lead</th><th>Telefon</th><th>Tarix</th><th>Status</th><th></th></tr>
  ${due.map(l=>`<tr><td>${esc(l.ad)}</td><td>${esc(l.tel)}</td><td><span class="tag ${l.next<t?"bad":"warn"}">${esc(l.next)}</span></td><td>${esc(l.status)}</td>
  <td><button class="btn sm" onclick="entForm('calls',0,{lead:${l.id},tarix:'${t}'})">☎ Zəng qeyd et</button> <button class="btn ghost sm keep" onclick="waOpen(${l.id})">💬 WhatsApp</button></td></tr>`).join("")}</table></div>`:`<div class="card empty">Bu gün zəng gözləyən lead yoxdur.</div>`)+
  `<h2>Mənbə üzrə</h2>`+(L.length?`<div class="tw"><table><tr><th>Mənbə</th><th>Lead</th><th>Müştəri</th></tr>${SOURCES.map(s=>{const a=L.filter(l=>l.menbe==s);return a.length?`<tr><td>${s}</td><td>${a.length}</td><td>${a.filter(l=>l.status=="Müştəri").length}</td></tr>`:""}).join("")}</table></div>`:`<div class="card empty">Məlumat yoxdur.</div>`);
}

// ===== Maliyyə =====
ent("contracts",{add:"Yeni müqavilə",
  fields:[{k:"stud",l:"Tələbə",t:"ref",ref:"students",req:1},{k:"xidmet",l:"Xidmət",req:1,def:"Təhsil məsləhəti"},
    {k:"mebleg",l:"Razılaşdırılmış məbləğ",t:"money",req:1},{k:"tarix",l:"Tarix",t:"date",def:today},{k:"note",l:"Qeyd",t:"textarea"}],
  cols:["stud","xidmet","mebleg","tarix"],
  prep:r=>{r.ad=refLabel("students",r.stud)+" — "+r.xidmet},
  actions:r=>`<button class="btn sm" onclick="entForm('transactions',0,{nov:'Gəlir',kateqoriya:'Xidmət haqqı',muq:${r.id}})">+ Ödəniş</button> `});
const TX_CATS=["Xidmət haqqı","Komissiya","Reklam","Maaş","İcarə","Kommunal","Vergi","Digər"];
ent("transactions",{add:"Yeni əməliyyat",
  fields:[{k:"tarix",l:"Tarix",t:"date",def:today,req:1},{k:"nov",l:"Növ",t:"select",opts:["Gəlir","Xərc"],cls:{"Gəlir":"ok","Xərc":"bad"}},
    {k:"kateqoriya",l:"Kateqoriya",t:"select",opts:TX_CATS},{k:"mebleg",l:"Məbləğ (₼)",t:"money",req:1},
    {k:"muq",l:"Müqavilə (ödənişdirsə)",t:"ref",ref:"contracts"},{k:"note",l:"Qeyd",t:"textarea"}],
  cols:["tarix","nov","kateqoriya","mebleg","muq","note"],sort:(a,b)=>(b.tarix||"").localeCompare(a.tarix||"")||b.id-a.id});
function finPanel(){
  const T=store.transactions,m=today().slice(0,7);
  const inc=a=>sum(a.filter(t=>t.nov=="Gəlir"),t=>t.mebleg), exp=a=>sum(a.filter(t=>t.nov=="Xərc"),t=>t.mebleg);
  const M=T.filter(t=>monthOf(t.tarix)==m);
  const debts=store.contracts.map(c=>({c,paid:sum(T.filter(t=>t.nov=="Gəlir"&&t.muq==c.id),t=>t.mebleg)})).filter(x=>x.c.mebleg-x.paid>0.004);
  const cats=TX_CATS.map(k=>[k,exp(T.filter(t=>t.kateqoriya==k))]).filter(x=>x[1]>0);
  return `<p class="muted">Bu ay (${m})</p>`+cards([[money(inc(M)),"Gəlir","ok"],[money(exp(M)),"Xərc","bad"],[money(inc(M)-exp(M)),"Xalis mənfəət"],[money(sum(debts,x=>x.c.mebleg-x.paid)),"Ümumi qalıq borc"]])+
  `<h2>Ödənilməmiş müqavilələr</h2>`+(debts.length?`<div class="tw"><table><tr><th>Müqavilə</th><th>Məbləğ</th><th>Ödənilib</th><th>Qalıq</th></tr>${debts.map(x=>`<tr><td>${esc(x.c.ad)}</td><td>${money(x.c.mebleg)}</td><td>${money(x.paid)}</td><td><b>${money(x.c.mebleg-x.paid)}</b></td></tr>`).join("")}</table></div>`:`<div class="card empty">Borc yoxdur.</div>`)+
  `<h2>Xərclər kateqoriya üzrə (bütün dövr)</h2>`+(cats.length?`<div class="tw"><table><tr><th>Kateqoriya</th><th>Cəmi</th></tr>${cats.map(x=>`<tr><td>${x[0]}</td><td>${money(x[1])}</td></tr>`).join("")}</table></div>`:`<div class="card empty">Xərc qeydi yoxdur.</div>`);
}

ent("claude_tasks",{add:"Yeni tapşırıq",
  fields:[{k:"ad",l:"Qısa başlıq",req:1},{k:"metn",l:"Tapşırıq (nə edilməlidir?)",t:"textarea",req:1},
    {k:"muhim",l:"Vaciblik",t:"select",opts:["Adi","Təcili"],cls:{"Təcili":"bad"}},
    {k:"status",l:"Status",t:"select",opts:["Yeni","İcrada","Hazırdır","Sualım var"],def:"Yeni",cls:{"Yeni":"pri","İcrada":"warn","Hazırdır":"ok","Sualım var":"bad"}},
    {k:"cavab",l:"Claude-un cavabı / nəticə",t:"textarea"},{k:"tarix",l:"Tarix",t:"date",def:today}],
  cols:["ad","muhim","status","tarix"],sort:(a,b)=>(b.tarix||"").localeCompare(a.tarix||"")||b.id-a.id});
function claudeView(){
  const T=store.claude_tasks||[],n=s=>T.filter(t=>t.status==s).length;
  return `<div class="card"><b>Necə işləyir?</b><ol class="muted"><li>“Yeni tapşırıq” ilə nəyi istədiyinizi yazın.</li><li>Claude ilə söhbətdə <b>“tapşırıqlara bax”</b> yazın. Claude yeni tapşırıqları oxuyub icra edir və nəticəni buraya yazır.</li><li>Claude yalnız söhbət açıq olanda işləyir. Pul, parol, hesab yaratmaq kimi işləri sizdən soruşar.</li></ol></div>`+
  cards([[n("Yeni"),"Yeni","pri"],[n("İcrada"),"İcrada"],[n("Sualım var"),"Sualım var","bad"],[n("Hazırdır"),"Hazırdır","ok"]])+listView("claude_tasks");
}
// ===== Reklam =====
ent("ad_accounts",{add:"Yeni hesab",
  fields:[{k:"ad",l:"Hesab adı",req:1},{k:"platforma",l:"Platforma",t:"select",opts:Object.keys(PLATFORMS)},{k:"hid",l:"Hesab ID (istəyə bağlı)"},
    {k:"status",l:"Status",t:"select",opts:["Aktiv","Dayandırılıb"],cls:{"Aktiv":"ok","Dayandırılıb":"bad"}},{k:"budce",l:"Aylıq büdcə (₼)",t:"money"},{k:"note",l:"Qeyd",t:"textarea"}],
  cols:["ad","platforma","hid","status","budce"]});
ent("ad_campaigns",{add:"Yeni kampaniya",
  fields:[{k:"ad",l:"Kampaniya adı",req:1},{k:"meta_ad",l:"Meta-dakı kampaniya adı (lead-ləri bağlamaq üçün)",hint:"Boşdursa yuxarıdakı ad ilə eynidir"},
    {k:"platforma",l:"Platforma",t:"select",opts:Object.keys(PLATFORMS)},
    {k:"maqsed",l:"Məqsəd",t:"select",opts:["Lead (müraciət toplamaq)","Mesaj","Trafik","Tanınma"]},
    {k:"olke",l:"Hədəf ölkə / proqram"},
    {k:"hedef",l:"Hədəf auditoriya",hint:"məs. Azərbaycan, 17-35 yaş, tələbə və abituriyent"},
    {k:"yas1",l:"Yaş (min)",t:"number"},{k:"yas2",l:"Yaş (max)",t:"number"},
    {k:"budce",l:"Günlük büdcə (₼)",t:"money"},
    {k:"bas",l:"Başlama tarixi",t:"date"},{k:"son",l:"Bitmə tarixi",t:"date"},
    {k:"forma",l:"Lead forması"},
    {k:"status",l:"Status",t:"select",opts:["Plan","Aktiv","Dayandırılıb","Bitib"],cls:{"Aktiv":"ok","Plan":"pri","Dayandırılıb":"warn","Bitib":"bad"}},
    {k:"note",l:"Yaradıcı / mətn planı və qeydlər",t:"textarea"}],
  cols:["ad","platforma","olke","budce","bas","status"],sort:(a,b)=>(b.bas||"").localeCompare(a.bas||"")||b.id-a.id});
function campStats(c){
  const key=(c.meta_ad||c.ad||"").trim().toLowerCase(),S=store.ad_spend.filter(x=>x.kampaniya==c.id);
  const L=key?store.leads.filter(l=>(l.kampaniya||"").trim().toLowerCase()==key):[];
  const spend=sum(S,x=>x.xerc),cust=L.filter(l=>l.status=="Müştəri").length;
  return {spend,clicks:sum(S,x=>x.klik),leads:L.length,cust,cpl:L.length?spend/L.length:null};
}
function campView(){
  const C=store.ad_campaigns||[],act=C.filter(c=>c.status=="Aktiv");
  const rows=C.map(c=>({c,s:campStats(c)}));
  const tot=rows.reduce((a,r)=>a+r.s.spend,0),tl=rows.reduce((a,r)=>a+r.s.leads,0);
  return cards([[act.length,"Aktiv kampaniya"],[sum(act,c=>c.budce),"Günlük büdcə (aktiv, ₼)"],[tl,"CRM-də lead (kampaniyalar üzrə)"],[tl?money(tot/tl):"—","1 lead dəyəri"]])+
  (rows.length?`<h2>Nəticələr</h2><div class="tw"><table><tr><th>Kampaniya</th><th>Status</th><th>Xərc</th><th>Klik</th><th>Lead</th><th>Müştəri</th><th>1 lead</th></tr>
  ${rows.map(({c,s})=>`<tr><td><b>${esc(c.ad)}</b></td><td>${esc(c.status||"")}</td><td>${money(s.spend)}</td><td>${s.clicks}</td><td>${s.leads}</td><td>${s.cust}</td><td>${s.cpl==null?"—":money(s.cpl)}</td></tr>`).join("")}</table></div>
  <p class="muted">Xərc “Xərclər” bölməsində həmin kampaniyaya bağlanan qeydlərdən, lead isə Meta kampaniya adı üzrə CRM-dən hesablanır.</p>`:"")+
  `<h2>Kampaniya planı</h2>`+listView("ad_campaigns");
}
ent("ad_spend",{add:"Xərc qeydi",
  fields:[{k:"tarix",l:"Tarix",t:"date",def:today,req:1},{k:"hesab",l:"Hesab",t:"ref",ref:"ad_accounts",req:1},{k:"kampaniya",l:"Kampaniya (istəyə bağlı)",t:"ref",ref:"ad_campaigns"},{k:"xerc",l:"Xərc (₼)",t:"money",req:1},
    {k:"gosterme",l:"Göstərmə (impression)",t:"number"},{k:"klik",l:"Klik",t:"number"},{k:"lead",l:"Gələn lead sayı",t:"number"},
    {k:"fin",l:"Maliyyə",t:"check",hint:"Maliyyəyə də xərc kimi yaz (yalnız yeni qeyddə)"}],
  cols:["tarix","hesab","xerc","gosterme","klik","lead"],sort:(a,b)=>(b.tarix||"").localeCompare(a.tarix||"")||b.id-a.id,
  prep:r=>{r.ad=refLabel("ad_accounts",r.hesab)+" "+r.tarix},
  after:async(r,isNew)=>{
    if(isNew&&r.fin){
      const t={tarix:r.tarix,nov:"Xərc",kateqoriya:"Reklam",mebleg:r.xerc,muq:"",note:"Reklam: "+refLabel("ad_accounts",r.hesab)};
      const x=await api("POST","/api/transactions",t);store.transactions.push({id:x.id,...t});
      await patchRec("ad_spend",r.id,{fin:false});
    }
  }});
function adsPanel(){
  const S=store.ad_spend,m=today().slice(0,7),M=S.filter(s=>monthOf(s.tarix)==m);
  const rows=Object.keys(PLATFORMS).map(p=>{
    const ids=store.ad_accounts.filter(a=>a.platforma==p).map(a=>a.id), s=S.filter(x=>ids.includes(x.hesab));
    const spend=sum(s,x=>x.xerc),clicks=sum(s,x=>x.klik),crm=store.leads.filter(l=>PLATFORMS[p].includes(l.menbe)),cust=crm.filter(l=>l.status=="Müştəri").length;
    return {p,spend,clicks,imp:sum(s,x=>x.gosterme),crm:crm.length,cust,has:ids.length||spend};
  }).filter(r=>r.has);
  return `<p class="muted">Bu ay (${m})</p>`+cards([[money(sum(M,s=>s.xerc)),"Reklam xərci"],[sum(M,s=>s.klik),"Klik"],[sum(M,s=>s.lead),"Lead (reklam hesabatı)"],
    [sum(M,s=>s.lead)?money(sum(M,s=>s.xerc)/sum(M,s=>s.lead)):"—","1 lead dəyəri"]])+
  `<h2>Platforma üzrə (bütün dövr)</h2>`+(rows.length?`<div class="tw"><table><tr><th>Platforma</th><th>Xərc</th><th>Klik</th><th>CRM-də lead</th><th>Müştəri</th><th>1 lead (CRM)</th><th>1 müştəri</th></tr>
  ${rows.map(r=>`<tr><td>${r.p}</td><td>${money(r.spend)}</td><td>${r.clicks}</td><td>${r.crm}</td><td>${r.cust}</td><td>${r.crm?money(r.spend/r.crm):"—"}</td><td>${r.cust?money(r.spend/r.cust):"—"}</td></tr>`).join("")}</table></div>
  <p class="muted">“CRM-də lead” həmin platformanın mənbələrindən (məs. Meta = Instagram + Facebook) CRM-ə düşən lead-lərdir.</p>`:`<div class="card empty">Əvvəlcə “Hesablar” bölməsində reklam hesabı əlavə edin.</div>`);
}

// ===== Məzmun =====
const POST_ST=["Layihə","Hazırdır","Planlaşdırılıb","Paylaşılıb"];
ent("posts",{add:"Yeni post",
  fields:[{k:"img",l:"Şəkil",t:"img"},{k:"video",l:"Video (Reels): media\reels qovluğundakı fayl adı, məs. ses_01_x.mp4"},{k:"ad",l:"Başlıq",req:1},{k:"plat",l:"Platforma",t:"select",opts:["Hər ikisi","Instagram","Facebook"]},
    {k:"tip",l:"Növ",t:"select",opts:["Şəkil","Karusel","Reels","Məqalə","Story"]},
    {k:"tarix",l:"Planlanan tarix",t:"date",def:today},
    {k:"status",l:"Status",t:"select",opts:POST_ST,cls:{"Paylaşılıb":"ok","Planlaşdırılıb":"pri","Hazırdır":"warn"}},
    {k:"metn",l:"Mətn",t:"textarea"}],
  cols:["img","tarix","ad","plat","status"],sort:(a,b)=>(a.tarix||"").localeCompare(b.tarix||"")||a.id-b.id,
  actions:r=>`<button class="btn sm" onclick="copyPost(${r.id})">📋 Kopyala</button> `+(r.status!="Paylaşılıb"&&r.status!="Planlaşdırılıb"?`<button class="btn sm" onclick="pubDialog(${r.id})">🚀 Paylaş</button> `:"")});
function postInfo(p){
  const a=[];
  if(p.fb_id)a.push("FB: "+(p.fb_mode=="schedule"?"planlaşdırılıb":p.fb_mode=="draft"?"qaralama":"paylaşılıb"));
  if(p.ig_state=="pending")a.push("IG: növbədə");
  if(p.ig_state=="done")a.push("IG: paylaşılıb");
  if(p.ig_state=="error"||p.ig_state=="missed")a.push("IG xətası");
  return a.join(" · ");
}
function pubDialog(id,opts){
  opts=opts||{};
  const p=byId("posts",id);
  const base=opts.when?opts.when*1000:Date.now()+3600e3*2;
  const d=new Date(base-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16);
  const hasImg=!!p.img||!!p.video;
  const tg=p.plat=="Facebook"?"fb":p.plat=="Instagram"?"ig":"both";
  const md=opts.mode||"draft";
  $("#dlg").innerHTML=`<form method="dialog" onsubmit="pubSend(event,${id});return false"><h3>Paylaş</h3>
  ${hasImg?`<img src="media/${esc(p.img)}" style="width:100%;max-height:260px;object-fit:contain;border-radius:10px;background:#0001">`:'<p class="tag warn">Bu postun şəkli yoxdur (yalnız Facebook mətn postu mümkündür).</p>'}
  <label>Mətn (istəsəniz dəyişin)</label><textarea name="metn" rows="8">${esc(p.metn)}</textarea>
  ${/\[NÖMRƏNİZ\]/.test(p.metn||"")?'<p class="tag bad">Mətndə [NÖMRƏNİZ] qalıb. Əvvəl redaktə edin!</p>':""}
  <label>Hara?</label>
  <select name="target"><option value="fb" ${tg=="fb"?"selected":""}>Facebook Page</option>
    <option value="ig" ${tg=="ig"?"selected":""} ${hasImg?"":"disabled"}>Instagram</option>
    <option value="both" ${tg=="both"&&hasImg?"selected":""} ${hasImg?"":"disabled"}>Facebook + Instagram</option></select>
  <label>Necə?</label>
  <select name="mode" onchange="document.getElementById('fbw').hidden=this.value!='schedule'">
    <option value="draft" ${md=="draft"?"selected":""}>Qaralama (yalnız Facebook, yalnız adminlər görür)</option>
    <option value="schedule" ${md=="schedule"?"selected":""}>Planlaşdır (Facebook-u Meta özü paylaşır; Instagram platforma açıq olanda)</option>
    <option value="now">İndi paylaş (hamıya görünəcək!)</option>
  </select>
  <div id="fbw" ${md=="schedule"?"":"hidden"}><label>Tarix və saat (10 dəq. – 30 gün)</label><input type="datetime-local" name="when" value="${d}"></div>
  <div class="row"><button type="button" class="btn ghost" onclick="dlg.close()">Ləğv et</button><button class="btn">Göndər</button></div></form>`;
  dlg.showModal();
}
let pubBusy=false;
async function pubRequest(id,target,mode,when){
  const r=await fetch("/api/meta/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({post_id:id,target,mode,when})});
  const j=await r.json();
  return {ok:r.ok,j};
}
async function reloadPosts(){store.posts=await api("GET","/api/posts")}
const pubSend=guard(async(e,id)=>{
  if(pubBusy)return;
  const fd=new FormData(e.target),mode=fd.get("mode"),target=fd.get("target");
  const p=byId("posts",id);
  const newText=fd.get("metn");
  if(newText!==null&&newText!==p.metn){await patchRec("posts",id,{metn:newText})}
  if(p.fb_id&&p.fb_mode!="draft"){alert("Bu post artıq göndərilib ("+p.status+"). Təkrar göndərmək təkrar post yaradar.");return}
  let when=null;
  if(mode=="schedule"){when=Math.floor(new Date(fd.get("when")).getTime()/1000);if(!when){alert("Tarix seçin");return}}
  if(mode=="draft"&&target=="ig"){alert("Instagram üçün qaralama yoxdur.");return}
  if(mode=="now"&&!confirm("Bu post "+(target=="fb"?"Facebook":target=="ig"?"Instagram":"Facebook və Instagram")+"-da HAMIYA görünəcək. Davam edilsin?"))return;
  if(/\[NÖMRƏNİZ\]/.test(p.metn||"")&&mode!="draft"&&!confirm("Mətndə [NÖMRƏNİZ] qalıb. Yenə də göndərilsin?"))return;
  pubBusy=true;const btn=e.target.querySelector("button:not([type])");if(btn){btn.disabled=true;btn.textContent="Göndərilir…"}
  let res;
  try{res=await pubRequest(id,target,mode,when)}finally{pubBusy=false}
  if(!res.ok){if(btn){btn.disabled=false;btn.textContent="Göndər"}alert("Meta xətası: "+(res.j.error||"naməlum"));return}
  await reloadPosts();dlg.close();render();
  alert((mode=="now"?"Paylaşıldı ✓":mode=="schedule"?"Planlaşdırıldı ✓":"Qaralama yaradıldı ✓")+(res.j.warning?"\n\nDiqqət: Facebook xətası: "+res.j.warning:""));
});
const copyPost=guard(async id=>{await navigator.clipboard.writeText(byId("posts",id).metn||"");alert("Mətn kopyalandı. İndi Instagram/Facebook-da yapışdırın.")});
const markPosted=guard(async id=>{await patchRec("posts",id,{status:"Paylaşılıb"});render()});
const loadSeed=guard(async()=>{
  if(!confirm(SEED_POSTS.length+" nümunə post yüklənsin? (hər 2 gündən bir tarix veriləcək)"))return;
  let d=new Date();
  for(const p of SEED_POSTS){
    d=new Date(d.getTime()+2*864e5);
    const rec={...p,tarix:new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10),status:"Layihə"};
    const r=await api("POST","/api/posts",rec);store.posts.push({id:r.id,...rec});
  }
  render();
});

const PLAN_HOUR=20;
const tgOf=p=>p.plat=="Facebook"?"fb":p.plat=="Instagram"?"ig":"both";
function planCandidates(){
  const now=Date.now();
  return store.posts.filter(p=>p.status=="Layihə"&&p.tarix&&!/\[NÖMRƏNİZ\]/.test(p.metn||"")&&(tgOf(p)=="fb"||p.img)&&!(p.fb_id&&p.fb_mode!="draft"))
    .map(p=>({p,when:Math.floor(new Date(p.tarix+"T"+String(PLAN_HOUR).padStart(2,"0")+":00:00").getTime()/1000)}))
    .filter(x=>x.when*1000>now+15*60e3&&x.when*1000<now+29*864e5).sort((a,b)=>a.when-b.when);
}
const planAll=guard(async()=>{
  const c=planCandidates();
  if(!c.length){alert("Planlaşdırılacaq uyğun post yoxdur (Layihə statuslu, tarixi 15 dəq.–30 gün arası, [NÖMRƏNİZ] olmayan).");return}
  const NL=String.fromCharCode(10);
  const nm={fb:"FB",ig:"IG",both:"FB+IG"};
  const list=c.map(x=>"• "+x.p.tarix+" saat "+PLAN_HOUR+":00 — "+x.p.ad+" ["+nm[tgOf(x.p)]+"]").join(NL);
  const igNote=c.some(x=>tgOf(x.p)!="fb")?NL+NL+"Qeyd: Instagram hissəsini platforma özü paylaşır, ona görə həmin vaxtda start.bat (qara pəncərə) AÇIQ olmalıdır. Facebook hissəsini Meta özü paylaşır.":"";
  if(!confirm("Aşağıdakı "+c.length+" post PLANLAŞDIRILACAQ:"+NL+NL+list+igNote+NL+NL+"Davam edilsin?"))return;
  let ok=0,err=[];
  for(const x of c){
    const res=await pubRequest(x.p.id,tgOf(x.p),"schedule",x.when);
    if(res.ok){ok++}else{err.push(x.p.ad+": "+(res.j.error||"xəta"));break}
  }
  await reloadPosts();render();
  alert("Planlaşdırıldı: "+ok+" / "+c.length+(err.length?NL+NL+"Xəta: "+err.join(NL):""));
});

function postsPanel(){
  const P=store.posts,t=today();
  const week=P.filter(p=>p.status!="Paylaşılıb"&&p.tarix&&p.tarix<=new Date(Date.now()+7*864e5).toISOString().slice(0,10)).sort((a,b)=>a.tarix.localeCompare(b.tarix));
  return cards([[P.length,"Cəmi post"],[P.filter(p=>p.status=="Paylaşılıb").length,"Paylaşılıb"],[P.filter(p=>p.status!="Paylaşılıb").length,"Gözləyən"],[week.filter(p=>p.tarix<t).length,"Gecikmiş","bad"]])+
  (P.length?"":`<div class="card" style="margin-top:14px"><b>Başlamaq üçün</b><p>12 hazır Azərbaycanca post paketi (təqdimat, sənədlər, təqaüdlər, IELTS, viza və s.) yükləyə bilərsiniz. Paylaşmazdan əvvəl məlumatları rəsmi saytdan yoxlayın və <b>[NÖMRƏNİZ]</b> yerinə öz nömrənizi yazın.</p><button class="btn" onclick="loadSeed()">Nümunə paketini yüklə</button></div>`)+
  (planCandidates().length?`<div class="card" style="margin-top:14px"><b>Hamısını planlaşdır</b><p>${planCandidates().length} layihə postu öz tarixində, saat ${PLAN_HOUR}:00-da Facebook Page-ə planlaşdırıla bilər. Meta özü paylaşacaq, kompüter açıq olmalı deyil. Göndərməzdən əvvəl siyahı göstəriləcək və təsdiqiniz soruşulacaq.</p><button class="btn" onclick="planAll()">📅 Hamısını planlaşdır</button></div>`:"")+
  `<h2>Növbəti 7 gün və gecikmişlər</h2>`+(week.length?`<div class="tw"><table><tr><th>Tarix</th><th>Başlıq</th><th>Platforma</th><th>Status</th><th></th></tr>${week.map(p=>`<tr><td><span class="tag ${p.tarix<t?"bad":p.tarix==t?"warn":""}">${esc(p.tarix)}</span></td><td>${esc(p.ad)}</td><td>${esc(p.plat)}</td><td>${esc(p.status)}</td><td><button class="btn sm" onclick="copyPost(${p.id})">📋 Kopyala</button> <button class="btn sm" onclick="pubDialog(${p.id})">🚀 Paylaş</button></td></tr>`).join("")}</table></div>`:`<div class="card empty">Bu həftə üçün plan yoxdur.</div>`);
}

// ===== Studiya =====
let studioPhoto="";
function vStudio(){
  return `<div class="card"><h2>✨ Studiya</h2>
  <p class="muted">Materialı atın (mətn və istəyə görə foto). Sistem başlıq, maddələr, hashtag və CTA ilə postu hazırlayır, brend şəklini çıxarır və növbəti boş axşam slotunu tapır. Sonra önizləməyə baxıb bir düymə ilə planlaşdırırsınız.</p>
  <form onsubmit="studioGo(event);return false">
    <label>Başlıq (boş qoysanız, mətnin ilk sətrindən götürülür)</label><input name="title" style="width:100%">
    <label>Mətn *</label><textarea name="text" rows="9" style="width:100%" placeholder="Məs.:&#10;Polşada təhsil&#10;Təhsil haqqı aşağıdır&#10;Avropa diplomu&#10;İngilis dilində proqramlar var&#10;&#10;(Hər sətir bir maddə olur. Və ya bir abzas yazın, cümlələrə bölünür.)" required></textarea>
    <label>Foto (istəyə bağlı, şəkil fonda istifadə olunur)</label>
    <input type="file" accept="image/*" onchange="studioFile(this)">
    <div id="stprev" style="margin-top:8px"></div>
    <div class="bar" style="margin-top:12px">
      <div><label>Hara?</label><select name="target"><option value="both">Facebook + Instagram</option><option value="fb">Yalnız Facebook</option><option value="ig">Yalnız Instagram</option></select></div>
      <div><label>Dizayn üslubu</label><select name="style"><option value="auto">Avtomatik (növbələşən)</option><option value="navy">Tünd mavi</option><option value="light">Açıq</option><option value="ocean">Okean</option><option value="ru">Rusiya rəngləri</option><option value="tr">Türkiyə rəngləri</option><option value="de">Almaniya rəngləri</option><option value="pl">Polşa rəngləri</option><option value="hu">Macarıstan rəngləri</option><option value="cz">Çexiya rəngləri</option><option value="ge">Gürcüstan rəngləri</option><option value="uk">Britaniya rəngləri</option><option value="us">ABŞ rəngləri</option></select></div>
      <div><label>Mətnin formatı</label><select name="mode"><option value="auto">Avtomatik (maddələr + CTA + hashtag)</option><option value="asis_cta">Olduğu kimi + CTA + hashtag</option><option value="asis">Tam olduğu kimi</option></select></div>
    </div>
    <button class="btn" id="stbtn" style="margin-top:12px">✨ Hazırla</button>
  </form></div>`;
}
function studioFile(inp){
  const f=inp.files[0];studioPhoto="";$("#stprev").innerHTML="";
  if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{const im=new Image();im.onload=()=>{
    const m=Math.min(1,1600/Math.max(im.width,im.height));
    const c=document.createElement("canvas");c.width=Math.round(im.width*m);c.height=Math.round(im.height*m);
    c.getContext("2d").drawImage(im,0,0,c.width,c.height);
    studioPhoto=c.toDataURL("image/jpeg",0.85);
    $("#stprev").innerHTML=`<img src="${studioPhoto}" style="height:90px;border-radius:8px"> <span class="muted">${Math.round(studioPhoto.length*0.75/1024)} KB</span>`;
  };im.src=rd.result};
  rd.readAsDataURL(f);
}
const studioGo=guard(async e=>{
  const fd=new FormData(e.target),btn=$("#stbtn");
  btn.disabled=true;btn.textContent="Hazırlanır… (5–10 san.)";
  try{
    const r=await fetch("/api/studio/compose",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({title:fd.get("title"),text:fd.get("text"),target:fd.get("target"),mode:fd.get("mode"),style:fd.get("style"),photo:studioPhoto})});
    const j=await r.json();
    if(!r.ok){alert("Xəta: "+(j.error||r.status));return}
    await reloadPosts();
    mod="posts";view="studio";render();
    pubDialog(j.id,{mode:"schedule",when:j.when});
  }finally{btn.disabled=false;btn.textContent="✨ Hazırla"}
});

// ===== Bot (şərh cavabları) =====
let botCfg={};
ent("bot_rules",{add:"Yeni qayda",
  fields:[{k:"acar",l:"Açar sözlər (vergüllə ayırın)",req:1},{k:"cavab",l:"Cavab (bir neçə variant üçün || ilə ayırın)",t:"textarea",req:1},{k:"aktiv",l:"Aktiv",t:"check",def:true,hint:"Qayda işləsin"}],
  cols:["acar","cavab","aktiv"],sort:(a,b)=>a.id-b.id});
ent("bot_log",{add:"—",
  fields:[{k:"tarix",l:"Vaxt"},{k:"platform",l:"Platforma"},{k:"user",l:"İstifadəçi"},{k:"text",l:"Şərh"},{k:"reply",l:"Cavab"},{k:"status",l:"Status",t:"select",opts:["göndərildi","test (göndərilmədi)","ötürüldü","xəta"],cls:{"göndərildi":"ok","test (göndərilmədi)":"warn","xəta":"bad"}},{k:"note",l:"Qeyd"}],
  cols:["tarix","platform","user","text","reply","status","note"],sort:(a,b)=>b.id-a.id});

let guardSt={};
const guardReset=guard(async()=>{
  if(!confirm("Qoruyucu açılsın? Əvvəl Meta panelində blok/xəbərdarlıq olmadığına əmin olun."))return;
  guardSt=await api("POST","/api/meta/guard/reset",{});render();
});
async function botReload(){
  botCfg=await api("GET","/api/bot/config");
  try{guardSt=await api("GET","/api/meta/guard")}catch(e){guardSt={}}
  store.bot_rules=await api("GET","/api/bot_rules");store.bot_log=await api("GET","/api/bot_log");
}
const botSet=guard(async(k,v)=>{botCfg=await api("POST","/api/bot/config",{[k]:v});render()});
const botRun=guard(async()=>{
  const b=$("#botrun");if(b){b.disabled=true;b.textContent="Yoxlanılır…"}
  try{const j=await api("POST","/api/bot/run",{});await botReload();render();alert(j.info)}
  finally{const b2=$("#botrun");if(b2){b2.disabled=false}}
});
const botDefaults=guard(async()=>{await api("POST","/api/bot/defaults",{});await botReload();render()});
function vBot(){
  const c=botCfg,chk=(k,l,h)=>`<label class="chk"><input type="checkbox" ${c[k]?"checked":""} onchange="botSet('${k}',this.checked)"> <span><b>${l}</b>${h?`<br><span class="muted">${h}</span>`:""}</span></label>`;
  const last=c.last_run?new Date(c.last_run*1000).toLocaleString("az"):"hələ yoxlanmayıb";
  const logN=store.bot_log.length,sent=store.bot_log.filter(x=>x.status=="göndərildi").length,test=store.bot_log.filter(x=>x.status.startsWith("test")).length;
  return cards([[c.enabled?(c.dry_run?"TEST":"AKTİV"):"SÖNÜLÜ","Bot vəziyyəti",c.enabled&&!c.dry_run?"ok":""],[sent,"Göndərilən cavab"],[test,"Test cavabları"],[store.bot_rules.filter(r=>r.aktiv).length,"Aktiv qayda"]])+
  `<div class="card" style="margin-top:16px"><h3>Ayarlar</h3>
   ${chk("enabled","Bot işləsin","Hər dəqiqə yeni şərhləri yoxlayır (platforma açıq olanda).")}
   ${chk("dry_run","Test rejimi","AÇIQ olanda heç nə göndərilmir, yalnız Jurnal-da nə cavab verəcəyi göstərilir. Əvvəl bununla yoxlayın.")}
   ${chk("fb","Facebook şərhləri")}
   ${chk("ig","Instagram şərhləri","Bunun üçün tətbiqdə instagram_manage_comments icazəsi lazımdır.")}
   ${chk("create_leads","Maraqlananı CRM-ə lead kimi yaz","Qayda işləyəndə şərh yazan Lead-lər bölməsinə düşür.")}
   ${chk("fallback_question","Sual işarəli şərhlərə ümumi cavab ver","Qayda tapılmasa da ? olan şərhlərə.")}
   <div class="bar" style="margin-top:12px"><div><label>Saatda maksimum cavab</label><input type="number" min="1" max="60" value="${c.max_per_hour}" onchange="botSet('max_per_hour',+this.value)" style="width:120px"></div>
   <div><label>Yoxlama tezliyi (saniyə, ən azı 300)</label><input type="number" min="300" max="3600" value="${Math.max(300,c.poll_seconds||300)}" onchange="botSet('poll_seconds',+this.value)" style="width:120px"></div>
   <div><label>Neçə saat əvvələ qədər şərhlər</label><input type="number" min="1" max="168" value="${c.max_age_hours}" onchange="botSet('max_age_hours',+this.value)" style="width:120px"></div></div>
   <label>Ümumi cavab (variantlar || ilə)</label><textarea rows="3" style="width:100%" onchange="botSet('fallback',this.value)">${esc(c.fallback)}</textarea>
   <div class="bar" style="margin-top:14px"><button class="btn" id="botrun" onclick="botRun()">▶ İndi yoxla</button>
   ${store.bot_rules.length?"":'<button class="btn ghost" onclick="botDefaults()">Standart qaydaları yüklə</button>'}
   ${c.rate_limited?'<span class="tag bad">Meta limiti: bot müvəqqəti yavaşlayıb</span> ':""}<span class="muted">Son yoxlama: ${last}${c.last_info?" · "+esc(c.last_info):""}</span></div>
   ${c.ig_error?`<p class="tag bad" style="white-space:normal">Instagram: ${esc(c.ig_error)}</p>`:""}</div>
   <div class="card" style="margin-top:16px;${guardSt.tripped?"border-color:var(--bad)":""}"><h3>🛡 Meta qoruyucusu</h3>
   <p class="muted">Botun və paylaşımların hər Meta sorğusu buradan keçir. Limit aşılsa və ya Meta blok/limit xətası qaytarsa, sorğular avtomatik dayandırılır və bot söndürülür.</p>
   ${guardSt.tripped?`<p class="tag bad" style="white-space:normal">DAYANDIRILIB: ${esc(guardSt.reason||"Meta xətası")}</p>${me&&me.role=="admin"?'<button class="btn" onclick="guardReset()">Qoruyucunu aç</button>':'<p class="muted">Administrator açmalıdır.</p>'}`:
   `<p><span class="tag ok">Aktiv, normaldır</span> <span class="tag">Son saatda cəmi: ${guardSt.used_total??0} / ${guardSt.limit_total??"?"}</span> <span class="tag">Bot: ${guardSt.used_bot??0} / ${guardSt.limit_bot??"?"}</span></p>`}
   <p class="muted">Bot yalnız ${c.hours_from??9}:00–${c.hours_to??22}:00 arası, hər ${Math.round(Math.max(300,c.poll_seconds||300)/60)} dəqiqədən bir yoxlayır; saatda ən çox ${c.max_per_hour} cavab.</p></div>
   <div class="card" style="margin-top:16px"><h3>⚡ Anında cavab (webhook)</h3>
   <p class="muted">Webhook olmadan bot hər dəqiqə yoxlayır (gecikmə ≤ 1 dəq.). Webhook ilə Meta yeni mesaj/şərhi dərhal bildirir və bot 2–5 saniyəyə cavab yazır.</p>
   <p>${c.webhook_ready?'<span class="tag ok">Verify token hazırdır</span>':'<span class="tag warn">Hələ qurulmayıb (webhook_qur.bat)</span>'}
   ${c.webhook_count?`<span class="tag ok">${c.webhook_count} hadisə alınıb · son: ${new Date(c.webhook_last*1000).toLocaleTimeString("az")}</span>`:'<span class="tag">Hələ hadisə gəlməyib</span>'}
   ${c.webhook_bad?`<span class="tag bad">${c.webhook_bad} imzasız/saxta sorğu rədd edildi</span>`:""}</p>
   <p class="muted">Quraşdırma: ngrok (pulsuz sabit domen) → <b>webhook_qur.bat</b> → Meta paneldə Webhooks → <b>tunel.bat</b> açıq qalır.</p></div>
   <div class="card" style="margin-top:16px"><h3>💬 Şəxsi mesajlar (DM)</h3>
   <p class="muted">Facebook Messenger və Instagram DM-ə avtomatik cavab. Şərh qaydalarından istifadə edir; yeni yazana salam verir, "operator" deyəni CRM-ə yönləndirir, nömrə yazanı lead edir.</p>
   ${chk("dm_fb","Facebook Messenger","Tətbiqdə pages_messaging icazəsi lazımdır.")}
   ${chk("dm_ig","Instagram DM","Tətbiqdə instagram_manage_messages icazəsi lazımdır.")}
   <label>İlk salam (yeni yazana)</label><textarea rows="2" style="width:100%" onchange="botSet('dm_greeting',this.value)">${esc(c.dm_greeting)}</textarea>
   <label>Qayda tapılmayanda cavab</label><textarea rows="2" style="width:100%" onchange="botSet('dm_fallback',this.value)">${esc(c.dm_fallback)}</textarea>
   <label>"Operator istəyirəm" deyənə cavab</label><textarea rows="2" style="width:100%" onchange="botSet('dm_operator',this.value)">${esc(c.dm_operator)}</textarea>
   ${c.dm_error?`<p class="tag bad" style="white-space:normal;margin-top:10px">DM: ${esc(c.dm_error)}</p>`:""}
   <div class="tag warn" style="white-space:normal;margin-top:12px;display:block;line-height:1.5"><b>Vacib məhdudiyyət:</b> Tətbiq <i>Development</i> rejimində olduğu müddətdə bot DM-də yalnız <b>tətbiqdə rolu olan adamlara</b> (admin, developer, tester) cavab yaza bilir. Hamıya cavab üçün Meta-da <i>Advanced Access</i> (App Review + Live rejim) lazımdır. Bu arada Meta Business Suite → <i>Inbox → Automations</i> (Instant reply, FAQ, Away message) ictimaiyyət üçün icazəsiz işləyir.</div></div>`;
}
function vBotLog(){return `<p class="muted">Ən yeni yuxarıda. Test rejimində "test (göndərilmədi)" görürsünüz.</p><div id="lst">${tableHtml("bot_log")}</div>`}

// ===== İstifadəçilər (yalnız administrator) =====
let USERS={users:[],roles:{},groups:{}};
const LV={none:"yoxdur",view:"baxış",edit:"dəyişiklik"};
function vUsers(){
  setTimeout(loadUsers,0);
  return `<div class="bar"><button class="btn" onclick="userForm()">+ Yeni istifadəçi</button>
  <span class="muted">Hər işçiyə ayrı giriş. Rol və ya bölmə üzrə icazə verin; server hər sorğuda yoxlayır.</span></div><div id="usr"><div class="card empty">Yüklənir…</div></div>`;
}
async function loadUsers(){
  USERS=await api("GET","/api/users");
  const el=$("#usr");if(!el)return;
  el.innerHTML=`<div class="tw"><table><tr><th>İstifadəçi</th><th>Rol</th><th>İcazələr</th><th>Son giriş</th><th>Status</th><th></th></tr>
  ${USERS.users.map(u=>`<tr><td><b>${esc(u.full_name||u.username)}</b><br><span class="muted">@${esc(u.username)}</span></td>
  <td>${esc(u.role_title)}</td>
  <td>${u.role=="admin"?'<span class="tag pri" style="white-space:nowrap">Hamısı: tam icazə</span>':Object.entries(u.perms).filter(([g,l])=>l!="none").map(([g,l])=>`<span class="tag ${l=="edit"?"pri":""}" style="white-space:nowrap;margin:2px 0" title="${LV[l]}">${USERS.groups[g]}: ${LV[l]}</span>`).join(" ")||'<span class="muted">heç nə</span>'}</td>
  <td>${esc(u.last_login)||"—"}</td>
  <td><span class="tag ${u.active?"ok":"bad"}">${u.active?"aktiv":"deaktiv"}</span></td>
  <td style="white-space:nowrap"><button class="btn ghost sm" onclick="userForm(${u.id})">Redaktə</button> ${u.id==me.id?"":`<button class="btn danger sm" onclick="userDel(${u.id})">Sil</button>`}</td></tr>`).join("")}</table></div>`;
}
function genPw(){const c="abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";let p="";const a=new Uint32Array(12);crypto.getRandomValues(a);a.forEach(x=>p+=c[x%c.length]);return p}
function userForm(id){
  const u=id?USERS.users.find(x=>x.id==id):{username:"",full_name:"",role:"operator",active:true,perms:USERS.roles.operator.perms};
  const roles=Object.entries(USERS.roles);
  $("#dlg").innerHTML=`<form method="dialog" onsubmit="userSave(event,${id||0});return false"><h3>${id?"İstifadəçini redaktə et":"Yeni istifadəçi"}</h3>
  <label>İstifadəçi adı (giriş üçün)</label><input name="username" value="${esc(u.username)}" ${id?"disabled":"required"} pattern="[A-Za-z0-9_.\\-]{3,32}" placeholder="məs. aysel">
  <label>Ad, soyad</label><input name="full_name" value="${esc(u.full_name)}">
  <label>Rol</label><select name="role" onchange="roleChange(this.value)">${roles.map(([k,r])=>`<option value="${k}" ${u.role==k?"selected":""}>${esc(r.title)}</option>`).join("")}</select>
  <label>Bölmə icazələri <span class="muted">(yalnız "Xüsusi" rolunda əl ilə dəyişir)</span></label>
  <div class="perm-grid" id="pg">${Object.entries(USERS.groups).map(([g,t])=>`<label>${esc(t)}<select name="p_${g}">${["none","view","edit"].map(l=>`<option value="${l}" ${u.perms[g]==l?"selected":""}>${LV[l]}</option>`).join("")}</select></label>`).join("")}</div>
  <label>${id?"Yeni parol (boş qoysanız dəyişmir)":"Parol (ən azı 8 simvol)"}</label>
  <div style="display:flex;gap:8px"><input name="password" type="text" ${id?"":"required"} minlength="8" autocomplete="off" style="flex:1"><button type="button" class="btn ghost sm" onclick="this.previousElementSibling.value=genPw()">Yarat</button></div>
  <label class="chk"><input type="checkbox" name="active" ${u.active?"checked":""}> Aktivdir (deaktiv hesab daxil ola bilmir)</label>
  <p class="muted">Parolu işçiyə özünüz çatdırın. O, daxil olandan sonra “Parolu dəyiş” ilə öz parolunu qoya bilər.</p>
  <div class="row"><button type="button" class="btn ghost" onclick="dlg.close()">Ləğv et</button><button class="btn">Yadda saxla</button></div></form>`;
  roleChange($("#dlg select[name=role]").value);
  dlg.showModal();
}
function roleChange(r){
  const custom=r=="custom",pr=USERS.roles[r].perms;
  for(const g of Object.keys(USERS.groups)){
    const s=$("#dlg select[name=p_"+g+"]");
    if(!custom)s.value=pr[g]||"none";
    s.disabled=!custom;
  }
}
const userSave=guard(async(e,id)=>{
  const fd=new FormData(e.target),role=fd.get("role"),perms={};
  for(const g of Object.keys(USERS.groups)){perms[g]=$("#dlg select[name=p_"+g+"]").value}
  const body={full_name:fd.get("full_name"),role,perms,active:fd.has("active")};
  if(fd.get("password"))body.password=fd.get("password");
  if(id){await api("PUT","/api/users/"+id,body)}else{body.username=fd.get("username");await api("POST","/api/users",body)}
  dlg.close();await loadUsers();
});
const userDel=guard(async id=>{
  if(!confirm("İstifadəçi silinsin? (Geri qaytarılmır. Yalnız müvəqqəti dayandırmaq üçün Redaktə → deaktiv seçin.)"))return;
  await api("DELETE","/api/users/"+id);await loadUsers();
});
function vAudit(){
  setTimeout(async()=>{
    const rows=await api("GET","/api/audit");const el=$("#aud");if(!el)return;
    el.innerHTML=rows.length?`<div class="tw"><table><tr><th>Vaxt</th><th>İstifadəçi</th><th>Əməliyyat</th><th>Təfərrüat</th></tr>
    ${rows.map(r=>`<tr><td style="white-space:nowrap">${esc(r.vaxt)}</td><td><b>${esc(r.user)}</b></td><td><span class="tag">${esc(r.action)}</span></td><td>${esc(r.detail)}</td></tr>`).join("")}</table></div>`:'<div class="card empty">Hələ qeyd yoxdur.</div>';
  },0);
  return `<p class="muted">Son 300 əməliyyat: kim nə vaxt nə etdi.</p><div id="aud"><div class="card empty">Yüklənir…</div></div>`;
}

Object.assign(MODULES,{
  crm:{ad:"☎️ Zəng mərkəzi CRM",views:{panel:["Panel",crmPanel],leads:["Lead-lər",()=>listView("leads")],calls:["Zənglər",()=>listView("calls")]}},
  fin:{ad:"💰 Maliyyə",views:{panel:["Panel",finPanel],tx:["Gəlir / Xərc",()=>listView("transactions")],contracts:["Müqavilələr",()=>listView("contracts")]}},
  posts:{ad:"📝 Məzmun",views:{panel:["Panel",postsPanel],studio:["✨ Studiya",vStudio],list:["Bütün postlar",()=>listView("posts")]}},
  bot:{ad:"🤖 Bot",views:{panel:["Panel",vBot],rules:["Qaydalar",()=>listView("bot_rules")],log:["Jurnal",vBotLog]}},
  claude:{ad:"🧠 Claude tapşırıqları",views:{main:["Tapşırıqlar",claudeView]}},
  users:{ad:"👥 İstifadəçilər",views:{list:["İstifadəçilər",vUsers],audit:["Fəaliyyət jurnalı",vAudit]}},
  ads:{ad:"📣 Reklam",views:{panel:["Panel",adsPanel],camp:["Kampaniyalar",campView],spend:["Xərclər",()=>listView("ad_spend")],acc:["Hesablar",()=>listView("ad_accounts")]}}
});
// sıra: Təhsil, CRM, Maliyyə, Reklam
const _m=MODULES;["edu","posts","bot","crm","fin","ads","claude","users"].forEach(k=>{const v=_m[k];delete _m[k];_m[k]=v});

async function boot(){
  me=await api("GET","/api/me");
  const keys=Object.keys(E);
  const [s,a,...rest]=await Promise.all([apiSoft("/api/students"),apiSoft("/api/applications"),...keys.map(k=>apiSoft("/api/"+k))]);
  db.studs=s;db.apps=a;keys.forEach((k,i)=>store[k]=rest[i]);
  botCfg=canView("bot")?await apiSoft("/api/bot/config"):{};
  if(Array.isArray(botCfg))botCfg={};
  render();
}
boot().catch(()=>{});
