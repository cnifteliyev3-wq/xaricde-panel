// Əlavələr: lead skoru, dublikat yoxlaması, xatırlatmalar paneli, CSV ixracı, WhatsApp şablonları.
// Yalnız brauzer tərəfində işləyir və Meta/xarici xidmətlərə sorğu göndərmir.

if(!SOURCES.includes("Telegram"))SOURCES.splice(SOURCES.length-1,0,"Telegram");
if(typeof S_SOURCE!="undefined"&&!S_SOURCE.includes("Telegram"))S_SOURCE.splice(S_SOURCE.length-1,0,"Telegram");

const dayDiff=(a,b)=>Math.round((new Date(a)-new Date(b))/864e5);
const phoneKey=t=>{const n=waNumber(t);return n.length>=9?n.slice(-9):""};

// ---------- Lead skoru (0-100): kimə əvvəl zəng etməli ----------
function leadScore(l){
  if(["Müştəri","İtirilib"].includes(l.status))return 0;
  let s={"Yeni":30,"Əlaqə qurulub":40,"Maraqlanır":60,"Görüş":80}[l.status]||30;
  if(l.tel)s+=10;
  if(l.maraq)s+=5;
  if(["Tövsiyə","Zəng"].includes(l.menbe))s+=10;
  const calls=(store.calls||[]).filter(c=>c.lead==l.id);
  if(calls.some(c=>c.netice=="Razılaşdı"))s+=15;
  if(calls.filter(c=>["Cavab vermədi","Məşğul"].includes(c.netice)).length>=3)s-=20;
  const age=l.tarix?dayDiff(today(),l.tarix):0;
  if(l.status=="Yeni"&&age>=2)s-=Math.min(20,age*3);
  return Math.max(0,Math.min(100,s));
}
const scoreTag=n=>`<span class="tag ${n>=70?"ok":n>=40?"warn":""}" title="Lead skoru">${n}</span>`;

// siyahıda skor göstərilsin
(()=>{const old=E.leads.actions;E.leads.actions=r=>scoreTag(leadScore(r))+" "+(old?old(r):"")})();

// ---------- Dublikat yoxlaması (yeni lead eyni nömrə ilə) ----------
(()=>{
  const old=E.leads.prep;
  E.leads.prep=rec=>{
    if(!rec.id){
      const k=phoneKey(rec.tel);
      const d=k&&store.leads.find(l=>phoneKey(l.tel)==k);
      if(d)throw new Error(`Bu nömrə artıq mövcuddur: "${d.ad}" (${d.status}). Dublikat yaratmayın, həmin leadi redaktə edin.`);
    }
    if(old)old(rec);
  };
})();

// ---------- WhatsApp şablonları (status üzrə) ----------
const WA_TPL={
  "Yeni":l=>`Salam, ${l.ad||""}! Xaricdə Təhsil Global-dan yazırıq. ${l.maraq?l.maraq+" üzrə":"Xaricdə təhsil üzrə"} sorğunuz barədə sizə kömək etmək istəyirik. Zəng üçün uyğun vaxt nə vaxtdır?`,
  "Əlaqə qurulub":l=>`Salam, ${l.ad||""}! Danışdığımız mövzu üzrə əlavə məlumat göndərmək istəyirik. Sualınız varsa, yazın.`,
  "Maraqlanır":l=>`Salam, ${l.ad||""}! Sizə uyğun proqram və təqaüd variantlarını hazırlamışıq. Görüş üçün vaxt təyin edək?`,
  "Görüş":l=>`Salam, ${l.ad||""}! Görüşümüzü xatırladırıq. Sənədlərinizi (pasport, attestat/diplom) hazır saxlayın.`
};
waOpen=function(id){
  const l=byId("leads",id),n=waNumber(l.tel);
  if(!n){alert("Bu lead üçün telefon nömrəsi yoxdur. Redaktə edib nömrəni yazın.");return}
  const msg=(WA_TPL[l.status]||WA_TPL["Yeni"])(l);
  window.open("https://wa.me/"+n+"?text="+encodeURIComponent(msg),"_blank","noopener");
};

// ---------- CSV ixracı ----------
function exportCsv(key){
  const c=E[key],rows=store[key]||[];
  const q=v=>'"'+String(v==null?"":v).replace(/"/g,'""')+'"';
  const head=c.fields.map(f=>q(f.l)).join(";");
  const body=rows.map(r=>c.fields.map(f=>q(f.t=="ref"?refLabel(f.ref,r[f.k]):r[f.k])).join(";"));
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob(["﻿"+[head,...body].join("\r\n")],{type:"text/csv;charset=utf-8"}));
  a.download=key+"_"+today()+".csv";a.click();
}

// ---------- Xatırlatmalar ----------
function remindersData(){
  const t=today(),out=[];
  (store.leads||[]).forEach(l=>{
    if(["Müştəri","İtirilib"].includes(l.status))return;
    if(l.next&&l.next<=t)out.push({lv:l.next<t?"bad":"warn",kat:"Zəng",ad:l.ad,tel:l.tel,info:(l.next<t?"Gecikib: ":"Bu gün: ")+l.next,act:`entForm('calls',0,{lead:${l.id},tarix:'${t}'})`,wa:`waOpen(${l.id})`});
    else if(l.status=="Yeni"&&l.tarix&&dayDiff(t,l.tarix)>=1&&!(store.calls||[]).some(c=>c.lead==l.id))
      out.push({lv:"warn",kat:"Toxunulmayıb",ad:l.ad,tel:l.tel,info:dayDiff(t,l.tarix)+" gündür zəng edilməyib",act:`entForm('calls',0,{lead:${l.id},tarix:'${t}'})`,wa:`waOpen(${l.id})`});
  });
  (db.studs||[]).forEach(s=>{
    const d=s.docs&&!Array.isArray(s.docs)?s.docs:{};
    Object.entries(d).forEach(([k,x])=>{
      if(!x||!x.exp||x.st=="yoxdur")return;
      const left=dayDiff(x.exp,t);
      if(left<=60)out.push({lv:left<0?"bad":left<=30?"warn":"pri",kat:"Sənəd müddəti",ad:s.ad,tel:s.tel,info:`${k}: ${left<0?Math.abs(left)+" gün keçib":left+" gün qalıb"} (${x.exp})`,act:`studProfile(${s.id})`,wa:`waStud(${s.id})`});
    });
    if((s.status=="Sənəd toplayır")&&typeof sDocsDone=="function"&&sDocsDone(s)<(S_DOCS.length/2))
      out.push({lv:"pri",kat:"Sənəd çatışmır",ad:s.ad,tel:s.tel,info:`${sDocsDone(s)}/${S_DOCS.length} sənəd hazırdır`,act:`studProfile(${s.id})`,wa:`waStud(${s.id})`});
  });
  const rank={bad:0,warn:1,pri:2};
  return out.sort((a,b)=>rank[a.lv]-rank[b.lv]);
}
function vReminders(){
  const R=remindersData(),L=(store.leads||[]).filter(l=>!["Müştəri","İtirilib"].includes(l.status))
    .map(l=>[leadScore(l),l]).sort((a,b)=>b[0]-a[0]).slice(0,10);
  return cards([[R.length,"Gözləyən xatırlatma"],[R.filter(x=>x.lv=="bad").length,"Gecikmiş","bad"],[R.filter(x=>x.kat=="Zəng").length,"Zəng"],[R.filter(x=>x.kat=="Sənəd müddəti").length,"Sənəd müddəti"]])+
  `<h2>Bu gün nə etməli</h2>`+(R.length?`<div class="tw"><table><tr><th>Növ</th><th>Ad</th><th>Məlumat</th><th>Telefon</th><th></th></tr>
  ${R.map(x=>`<tr><td><span class="tag ${x.lv}">${esc(x.kat)}</span></td><td>${esc(x.ad)}</td><td>${esc(x.info)}</td><td>${esc(x.tel||"—")}</td>
  <td style="white-space:nowrap"><button class="btn sm" onclick="${x.act}">Aç</button> <button class="btn ghost sm keep" onclick="${x.wa}">💬</button></td></tr>`).join("")}</table></div>`:`<div class="card empty">Hər şey qaydasındadır, xatırlatma yoxdur. 🎉</div>`)+
  `<h2>Ən perspektivli leadlər (skor)</h2>`+(L.length?`<div class="tw"><table><tr><th>Skor</th><th>Ad</th><th>Status</th><th>Maraq</th><th>Mənbə</th></tr>
  ${L.map(([s,l])=>`<tr><td>${scoreTag(s)}</td><td>${esc(l.ad)}</td><td>${esc(l.status)}</td><td>${esc(l.maraq||"—")}</td><td>${esc(l.menbe||"—")}</td></tr>`).join("")}</table></div>`:`<div class="card empty">Aktiv lead yoxdur.</div>`)+
  `<h2>Excel (CSV) ixracı</h2><div class="bar"><button class="btn ghost keep" onclick="exportCsv('leads')">⬇ Lead-lər</button><button class="btn ghost keep" onclick="exportCsv('calls')">⬇ Zənglər</button><button class="btn ghost keep" onclick="exportCsv('transactions')">⬇ Maliyyə</button><button class="btn ghost keep" onclick="studExport()">⬇ Tələbələr</button></div>`;
}
MODULES.crm.views.rem=["🔔 Xatırlatmalar",vReminders];
MODULES.edu.views.rem=["🔔 Xatırlatmalar",vReminders];

// ---------- Telegram botu: vəziyyət səhifəsi ----------
let tgSt=null;
function vTelegram(){
  api("GET","/api/telegram/status").then(s=>{tgSt=s;const el=$("#tgbox");if(el)el.innerHTML=tgHtml()}).catch(()=>{});
  return `<div id="tgbox"><div class="card empty">Yüklənir…</div></div>`;
}
function tgHtml(){
  const s=tgSt||{};
  return `<div class="card"><h3>Telegram lead botu</h3>
  <p>Vəziyyət: ${s.running?'<span class="tag ok">işləyir</span>':s.configured?'<span class="tag warn">söndürülüb</span>':'<span class="tag">qurulmayıb</span>'}
   · Bu botla gələn lead-lər: <b>${s.count||0}</b></p>
  ${s.error?`<p class="tag bad">Xəta: ${esc(s.error)}</p>`:""}
  <p class="muted">Namizəd Telegram-da botdan ad, telefon, ölkə/proqram, dil səviyyəsini yazır. Bot onları Lead-lər bölməsinə yeni lead kimi əlavə edir və dublikat yoxlayır. Bot Facebook/Instagram/Meta ilə əlaqəli deyil.</p>
  <h4 class="sec">Qurmaq üçün</h4>
  <ol class="plan"><li>Telegram-da <b>@BotFather</b>-ə yazın, <code>/newbot</code> ilə bot yaradın və tokeni kopyalayın.</li>
  <li><code>telegram_config.example.json</code> faylını <code>telegram_config.json</code> adı ilə kopyalayın, <code>token</code> sahəsinə tokeni yazın və <code>"enabled": true</code> edin.</li>
  <li>Platformanı (start.bat) yenidən başladın. Botun adını Instagram/vizitkada paylaşın.</li></ol>
  <p class="muted">Tokeni heç kimlə bölüşməyin və bu söhbətə yazmayın.</p></div>`;
}
MODULES.bot.views.tg=["Telegram",vTelegram];

// ---------- Meta reklam hesabından oxuma (yalnız oxuma, düyməyə basanda) ----------
const adsSync=guard(async days=>{
  if(!confirm(`Meta reklam hesabından son ${days} günün xərc/klik/lead məlumatı oxunsun?
(Yalnız oxuma, 1 sorğu. Reklam yaradılmır və pul xərclənmir.)`))return;
  const r=await api("POST","/api/ads/sync",{days});
  store.ad_spend=await apiSoft("/api/ad_spend");store.ad_accounts=await apiSoft("/api/ad_accounts");
  alert(`Hazırdır: ${r.added} yeni, ${r.updated} yenilənmiş gün.`+(r.currency&&r.currency!="AZN"?`
Diqqət: hesab valyutası ${r.currency}. Rəqəmlər ${r.currency} ilə yazılıb, panel isə ₼ göstərir.`:""));
  render();
});
(()=>{
  const old=MODULES.ads.views.panel[1];
  MODULES.ads.views.panel=["Panel",()=>`<div class="bar"><button class="btn keep" onclick="adsSync(7)">⟳ Meta-dan yenilə (7 gün)</button><button class="btn ghost keep" onclick="adsSync(30)">30 gün</button>
  <span class="muted">Yalnız oxuma. Ən çox 30 dəqiqədən bir.</span></div>`+old()];
})();
