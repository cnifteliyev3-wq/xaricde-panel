// ===== Əmrlər: Claude-suz düymə ilə post/Reels hazırlamaq və planlaşdırmaq =====
const CMD_PAL={royal:"Mavi",coral:"Qırmızı-narıncı",violet:"Bənövşəyi",mint:"Yaşıl-firuzəyi",ink:"Tünd mavi",sun:"Sarı (yalnız post)"};
const CMD_EMOJI=["🌍","🎓","📝","📋","✈️","💬","🎯","📅","💶","🛂","🗣️","🏫"];
let cmdTimer=null,cmdJobs=[];
const palOpts=(video)=>Object.entries(CMD_PAL).filter(([k])=>!(video&&k=="sun")).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
const emojiOpts=CMD_EMOJI.map(e=>`<option>${e}</option>`).join("");
function cmdDefaultWhen(){const d=new Date(Date.now()+3600e3*2);d.setMinutes(0,0,0);return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16)}

function vCmds(){
  setTimeout(cmdPoll,0);
  const w=cmdDefaultWhen();
  return `<div class="card"><b>Necə işləyir?</b><p class="muted">Aşağıdakı düymələr Claude-a ehtiyac olmadan işləyir. Hazırlanan post/Reels “Layihə” kimi qalır; Meta-ya yalnız “Planlaşdır” əmri ilə, sizin təsdiqinizlə göndərilir. Eyni anda bir iş icra olunur, qalanları növbədə gözləyir.</p></div>
  <div class="grid2">
  <div class="card"><h2>🖼️ Rəngarəng post yarat</h2>
   <form onsubmit="cmdRun(event,'post_yarat');return false">
    <label>Başlıq *</label><input name="title" maxlength="80" required style="width:100%">
    <label>Alt başlıq</label><input name="sub" maxlength="60" style="width:100%" placeholder="məs. Əvvəlcədən hazırlayın:">
    <label>Maddələr * (hər sətir bir maddə, ən çox 6)</label><textarea name="items" rows="5" style="width:100%" required></textarea>
    <div class="bar"><div><label>Bölmə nişanı</label><input name="badge" value="XARİCDƏ TƏHSİL" maxlength="24"></div>
     <div><label>Emoji</label><select name="emoji">${emojiOpts}</select></div>
     <div><label>Rəng</label><select name="palitra">${palOpts(false)}</select></div></div>
    <label>Paylaşım vaxtı (istəyə bağlı)</label><input type="datetime-local" name="when" value="${w}">
    <button class="btn" style="margin-top:10px">🖼️ Hazırla</button></form></div>
  <div class="card"><h2>🎬 Reels yarat</h2>
   <form onsubmit="cmdRun(event,'reels_yarat');return false">
    <label>Başlıq *</label><input name="title" maxlength="80" required style="width:100%">
    <label>Maddələr * (hər sətir bir maddə, ən çox 5)</label><textarea name="items" rows="5" style="width:100%" required></textarea>
    <div class="bar"><div><label>Emoji</label><select name="emoji">${emojiOpts}</select></div>
     <div><label>Rəng</label><select name="palitra">${palOpts(true)}</select></div></div>
    <label>Paylaşım vaxtı (istəyə bağlı)</label><input type="datetime-local" name="when" value="${w}">
    <p class="muted">Qapaq kadrı və musiqi avtomatik əlavə olunur. 1–2 dəqiqə çəkir.</p>
    <button class="btn">🎬 Hazırla</button></form></div></div>
  <h2>📂 Hazırlananlar (qaralamalar)</h2>${cmdDraftsView()}
  <h2>🚀 Planlaşdır (Meta)</h2>${cmdPlanView()}
  <h2>İşlərin gedişatı</h2><div id="cmdjobs"></div>`;
}

function cmdPlanView(){
  const now=Date.now()/1000+660;
  const L=(store.posts||[]).filter(p=>p.status=="Layihə"&&p.slot>now&&(p.img||p.video)&&!p.fb_id).sort((a,b)=>a.slot-b.slot);
  if(!L.length)return `<div class="card empty">Planlaşdırıla biləcək qaralama yoxdur (şəkil/video + gələcək vaxt lazımdır).</div>`;
  return `<div class="card"><div class="tw"><table><tr><th></th><th>Vaxt</th><th>Növ</th><th>Başlıq</th></tr>${L.map(p=>`<tr><td><input type="checkbox" class="cmdsel" value="${p.id}"></td>
   <td>${esc(new Date(p.slot*1000).toLocaleString("az",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}))}</td><td>${esc(p.tip)}</td><td>${esc(p.ad)}</td></tr>`).join("")}</table></div>
   <p class="muted">Facebook-u Meta özü paylaşır, Instagram platforma açıq olanda. Hər post ~4 Meta sorğusu istifadə edir, aralarında fasilə olur; xəta çıxsa qalanı dayanır.</p>
   <button class="btn" onclick="cmdPlan()">🚀 Seçilmişləri planlaşdır</button> <button class="btn ghost" onclick="document.querySelectorAll('.cmdsel').forEach(c=>c.checked=true)">Hamısını seç</button></div>`;
}

function cmdDraftsView(){
  const L=(store.posts||[]).filter(p=>p.status=="Layihə"&&(p.img||p.video)&&!p.fb_id&&p.ig_state!="pending").sort((a,b)=>b.id-a.id).slice(0,60);
  if(!L.length)return `<div class="card empty">Qaralama yoxdur.</div>`;
  return `<div class="grid3">${L.map(p=>`<div class="card" style="padding:10px">
   <div onclick="cmdPreview(${p.id})" style="cursor:pointer;position:relative">${p.video
     ?`<video src="media/reels/${esc(p.video)}#t=0.1" preload="metadata" muted playsinline style="width:100%;height:230px;object-fit:cover;border-radius:10px;background:#0002"></video><span class="tag warn" style="position:absolute;left:8px;top:8px">▶ Reels</span>`
     :`<img src="media/${esc(p.img)}" loading="lazy" style="width:100%;height:230px;object-fit:cover;border-radius:10px;background:#0002">`}</div>
   <div style="margin:8px 0 2px"><b>${esc(p.ad)}</b></div>
   <div class="muted">${p.slot?esc(new Date(p.slot*1000).toLocaleString("az",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})):"vaxt yoxdur"}</div>
   <div style="margin-top:8px"><button class="btn sm" onclick="cmdPreview(${p.id})">👁 Bax</button> <button class="btn ghost sm" onclick="cmdDelete(${p.id})">🗑 Sil</button></div></div>`).join("")}</div>`;
}
function cmdPreview(id){
  const p=byId("posts",id);if(!p)return;
  $("#dlg").innerHTML=`<form method="dialog"><h3>${esc(p.ad)}</h3>
   ${p.video?`<video src="media/reels/${esc(p.video)}" controls autoplay playsinline style="width:100%;max-height:70vh;border-radius:10px;background:#000"></video>`
     :`<img src="media/${esc(p.img)}" style="width:100%;max-height:70vh;object-fit:contain;border-radius:10px;background:#0001">`}
   <label>Mətn</label><textarea rows="6" readonly style="width:100%">${esc(p.metn)}</textarea>
   <div class="row"><button type="button" class="btn ghost" onclick="cmdDelete(${id},true)">🗑 Sil</button><button class="btn" onclick="dlg.close()">Bağla</button></div></form>`;
  dlg.showModal();
}
const cmdDelete=guard(async(id,fromDlg)=>{
  const p=byId("posts",id);
  if(!confirm('"'+(p?p.ad:id)+'" qaralaması silinsin? Şəkil/video faylı da silinə bilər.'))return;
  await api("POST","/api/cmd/delete",{id});
  if(fromDlg)dlg.close();
  await reloadPosts();render();
});
const cmdRun=guard(async(e,cmd)=>{
  const fd=new FormData(e.target),p=Object.fromEntries(fd.entries());
  p.when=p.when?Math.floor(new Date(p.when).getTime()/1000):"";
  await api("POST","/api/cmd/run",{cmd,params:p});
  e.target.querySelector("textarea").value="";e.target.querySelector("input[name=title]").value="";
  cmdPoll();
});
const cmdPlan=guard(async()=>{
  const ids=[...document.querySelectorAll(".cmdsel:checked")].map(c=>+c.value);
  if(!ids.length){alert("Post seçin");return}
  if(!confirm(ids.length+" post Meta-da planlaşdırılacaq (Facebook + Instagram). Meta sorğuları artacaq. Davam edilsin?"))return;
  await api("POST","/api/cmd/run",{cmd:"planla",params:{ids}});
  cmdPoll();
});

async function cmdPoll(){
  clearTimeout(cmdTimer);
  if(mod!="posts"||view!="cmds")return;
  try{cmdJobs=await api("GET","/api/cmd/jobs")}catch(e){return}
  const box=document.getElementById("cmdjobs");
  if(box)box.innerHTML=cmdJobs.length?cmdJobs.map(j=>`<div class="card"><b>${esc(j.name)}</b> · ${esc(j.title)}
    <span class="tag ${j.state=="done"?"ok":j.state=="error"?"bad":"warn"}">${{queued:"növbədə",running:"icra olunur…",done:"hazırdır",error:"xəta"}[j.state]}</span>
    <pre class="muted" style="white-space:pre-wrap;margin:6px 0 0">${esc(j.log.join("\n"))}</pre></div>`).join(""):`<div class="card empty">Hələ iş yoxdur.</div>`;
  const busy=cmdJobs.some(j=>j.state=="queued"||j.state=="running");
  if(!busy&&cmdBusyBefore){await reloadPosts();render()}
  cmdBusyBefore=busy;
  cmdTimer=setTimeout(cmdPoll,busy?3000:10000);
}
let cmdBusyBefore=false;
MODULES.posts.views.cmds=["⚡ Əmrlər",vCmds];
