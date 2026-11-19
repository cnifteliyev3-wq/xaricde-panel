// ---------- Universitet məlumatları (təxmini; rəsmi saytdan yoxlayın) ----------
const UNIS = [
 {id:1,ad:"Texniki Universitet Münhen (TUM)",olke:"Almaniya",seh:"Münhen",sah:["Mühəndislik","İT","Təbiət elmləri"],haz:"TestDaF/IELTS 6.5",pul:"~150 € / semestr",son:"31 yanvar",bur:"DAAD"},
 {id:2,ad:"Berlin Humboldt Universiteti",olke:"Almaniya",seh:"Berlin",sah:["Humanitar","Hüquq","İqtisadiyyat"],haz:"IELTS 6.5",pul:"~300 € / semestr",son:"15 iyul",bur:"DAAD"},
 {id:3,ad:"Varşava Universiteti",olke:"Polşa",seh:"Varşava",sah:["Hüquq","İqtisadiyyat","İT"],haz:"IELTS 6.0",pul:"~2 000–4 000 € / il",son:"30 iyun",bur:"Polşa hökuməti təqaüdü"},
 {id:4,ad:"Budapeşt Texnologiya Universiteti (BME)",olke:"Macarıstan",seh:"Budapeşt",sah:["Mühəndislik","İT"],haz:"IELTS 6.0",pul:"~3 000–6 000 € / il",son:"15 aprel",bur:"Stipendium Hungaricum"},
 {id:5,ad:"Çexiya Texniki Universiteti (ČVUT)",olke:"Çexiya",seh:"Praqa",sah:["Mühəndislik","İT"],haz:"IELTS 6.0",pul:"~4 000 € / il",son:"30 aprel",bur:"Çexiya hökuməti təqaüdü"},
 {id:6,ad:"İstanbul Texniki Universiteti (İTÜ)",olke:"Türkiyə",seh:"İstanbul",sah:["Mühəndislik","Memarlıq"],haz:"YÖS / IELTS 6.0",pul:"~1 500–3 000 € / il",son:"31 may",bur:"Türkiyə Bursları"},
 {id:7,ad:"Boğaziçi Universiteti",olke:"Türkiyə",seh:"İstanbul",sah:["İqtisadiyyat","Mühəndislik","Humanitar"],haz:"IELTS 6.5",pul:"~2 000–4 000 € / il",son:"15 may",bur:"Türkiyə Bursları"},
 {id:8,ad:"Tbilisi Dövlət Universiteti",olke:"Gürcüstan",seh:"Tbilisi",sah:["Humanitar","İqtisadiyyat","Hüquq"],haz:"Daxili imtahan",pul:"~2 250 € / il",son:"1 avqust",bur:"—"},
 {id:9,ad:"Oksford Universiteti",olke:"Böyük Britaniya",seh:"Oksford",sah:["Hüquq","Təbiət elmləri","Humanitar"],haz:"IELTS 7.0",pul:"~30 000 £ / il",son:"15 oktyabr",bur:"Chevening, Rhodes"},
 {id:10,ad:"Massaçusets Texnologiya İnstitutu (MIT)",olke:"ABŞ",seh:"Kembric",sah:["Mühəndislik","İT","Təbiət elmləri"],haz:"TOEFL 100 + SAT/GRE",pul:"~60 000 $ / il",son:"1 yanvar",bur:"Fulbright"}
];
const STATUS = ["Planlaşdırılır","Sənədlər toplanır","Göndərilib","Müsahibə","Qəbul olundu","Rədd edildi"];
const STAT_CLS = {"Qəbul olundu":"ok","Rədd edildi":"bad","Göndərilib":"pri","Müsahibə":"warn"};
const DOCS = ["Pasport surəti","Attestat / Diplom","Transkript","Dil sertifikatı","Motivasiya məktubu","CV","Tövsiyə məktubları","Viza sənədləri"];

// ---------- Köməkçilər ----------
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(method,path,body){
  const r=await fetch(path,{method,headers:{"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
  if(r.status==401){location="login.html";throw new Error("giriş")}
  if(!r.ok)throw new Error(await r.text());
  return r.json();
}
let me=null;
const canView=g=>!!me&&me.perms[g]!=="none"&&me.perms[g]!==undefined;
const canEdit=g=>!!me&&me.perms[g]==="edit";
async function apiSoft(path){
  const r=await fetch(path);
  if(r.status==401){location="login.html";throw new Error("giriş")}
  if(r.status==403)return [];
  if(!r.ok)throw new Error(await r.text());
  return r.json();
}
const ROLE_TITLES={admin:"Administrator",operator:"Zəng mərkəzi operatoru",accountant:"Mühasib",marketing:"Marketoloq",consultant:"Təhsil məsləhətçisi",custom:"Xüsusi"};
function pwDialog(){
  $("#dlg").innerHTML=`<form method="dialog" onsubmit="pwSave(event);return false"><h3>Parolu dəyiş</h3>
  <label>Cari parol</label><input type="password" name="old" required autocomplete="current-password">
  <label>Yeni parol (ən azı 8 simvol)</label><input type="password" name="new" required minlength="8" autocomplete="new-password">
  <div class="row"><button type="button" class="btn ghost" onclick="dlg.close()">Ləğv et</button><button class="btn">Dəyiş</button></div></form>`;
  dlg.showModal();
}
async function pwSave(e){
  const fd=new FormData(e.target);
  const r=await fetch("/api/me/password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({old:fd.get("old"),new:fd.get("new")})});
  const j=await r.json();
  if(!r.ok){alert(j.error||"Xəta");return}
  dlg.close();alert("Parol dəyişdirildi ✓");
}
async function logout(){await api("POST","/api/logout",{});location="login.html"}
function guard(fn){return async(...a)=>{try{await fn(...a)}catch(e){if(e.message!="giriş")alert("Xəta baş verdi: "+e.message)}}}

let db={studs:[],apps:[]};
const stud=id=>db.studs.find(s=>s.id==id), uni=id=>UNIS.find(u=>u.id==id);
async function loadAll(){
  const [s,a]=await Promise.all([api("GET","/api/students"),api("GET","/api/applications")]);
  db.studs=s;db.apps=a;
}

// ---------- Modullar ----------
// Yeni modul əlavə etmək: MODULES-a yeni açar yazın, views-də səhifələrini göstərin.
const MODULES={
  edu:{ad:"🎓 Təhsil",views:{panel:["Panel",vPanel],uni:["Universitetlər",vUni],stud:["Tələbələr",vStud],app:["Müraciətlər",vApp]}},
};
let mod="edu", view="panel", uniFilter={q:"",olke:"",sah:""};
function soon(t,d,items){
  return `<div class="card"><h2>${t} <span class="tag warn">Tezliklə</span></h2><p>${d}</p>
  <b>Planlaşdırılan imkanlar:</b><ul class="plan">${items.map(i=>`<li>${i}</li>`).join("")}</ul></div>`;
}
function visibleMods(){return Object.keys(MODULES).filter(k=>k=="users"?(me&&me.role=="admin"):canView(k))}
function goMod(m){mod=m;view=Object.keys(MODULES[m].views)[0];render()}
function go(v){view=v;render()}
const MOD_SUB={edu:"Tələbələr, universitetlər və müraciətlər",posts:"Postlar, şəkillər və paylaşım planı",crm:"Lead-lər və zəng mərkəzi",fin:"Gəlir, xərc və müqavilələr",ads:"Reklam hesabları və xərclər",bot:"Şərhlərə avtomatik cavab",claude:"Platforma haqqında Claude-a tapşırıqlar yazın",users:"İşçi hesabları, rollar və fəaliyyət jurnalı"};
function render(){
  const vm=visibleMods();
  if(me&&!vm.includes(mod)&&vm.length){mod=vm[0];view=Object.keys(MODULES[mod].views)[0]}
  if(me){$("#meinfo").textContent=(me.full_name||me.username)+" · "+(ROLE_TITLES[me.role]||me.role)}
  $("#mods").innerHTML=Object.entries(MODULES).filter(([k])=>vm.includes(k)).map(([k,m])=>{
    const i=m.ad.indexOf(" "),ic=m.ad.slice(0,i),nm=m.ad.slice(i+1);
    return `<button class="${k==mod?"on":""}" onclick="goMod('${k}')"><span class="ic">${ic}</span><span>${nm}</span></button>`;
  }).join("");
  const vs=MODULES[mod].views;
  const cur=MODULES[mod].ad;
  $("#ptitle").textContent=cur.slice(cur.indexOf(" ")+1);
  $("#psub").textContent=MOD_SUB[mod]||"";
  $("#nav").innerHTML=Object.keys(vs).length>1?Object.entries(vs).map(([k,[n]])=>`<button class="${k==view?"on":""}" onclick="go('${k}')">${n}</button>`).join(""):"";
  $("#app").classList.toggle("ro",mod!=="users"&&!canEdit(mod));
  $("#app").innerHTML=vs[view][1]();
}

// ---------- Panel ----------
function vPanel(){
  const cnt=s=>db.apps.filter(a=>a.status==s).length;
  const closed=["Göndərilib","Müsahibə","Qəbul olundu","Rədd edildi"];
  const soonList=db.apps.filter(a=>a.deadline&&!closed.includes(a.status))
    .map(a=>({...a,days:Math.ceil((new Date(a.deadline)-new Date().setHours(0,0,0,0))/864e5)})).sort((a,b)=>a.days-b.days).slice(0,6);
  return `<div class="grid">
    <div class="card stat"><b>${db.studs.length}</b><span>Tələbə</span></div>
    <div class="card stat"><b>${db.apps.length}</b><span>Müraciət</span></div>
    <div class="card stat"><b>${cnt("Göndərilib")+cnt("Müsahibə")}</b><span>Gözləyən nəticə</span></div>
    <div class="card stat"><b>${cnt("Qəbul olundu")}</b><span>Qəbul olunub</span></div>
  </div>
  <h2>Yaxınlaşan son tarixlər</h2>
  ${soonList.length?`<div class="tw"><table><tr><th>Tələbə</th><th>Universitet</th><th>Son tarix</th><th>Qalıb</th></tr>${soonList.map(a=>`<tr><td>${esc(stud(a.stud)?.ad)}</td><td>${esc(uni(a.uni)?.ad)}</td><td>${esc(a.deadline)}</td><td><span class="tag ${a.days<0?"bad":a.days<=14?"warn":""}">${a.days<0?"keçib":a.days+" gün"}</span></td></tr>`).join("")}</table></div>`
  :`<div class="card empty">Hələ son tarixi olan aktiv müraciət yoxdur.</div>`}
  <p class="muted" style="margin-top:24px">Məlumatlar onlayn bazada (Supabase) saxlanılır. Universitet məlumatları təxminidir.</p>`;
}

// ---------- Universitetlər ----------
function uniFiltered(){
  const f=uniFilter,q=f.q.toLowerCase();
  return UNIS.filter(u=>(!q||(u.ad+u.seh).toLowerCase().includes(q))&&(!f.olke||u.olke==f.olke)&&(!f.sah||u.sah.includes(f.sah)));
}
function vUni(){
  const olkes=[...new Set(UNIS.map(u=>u.olke))], sahs=[...new Set(UNIS.flatMap(u=>u.sah))], f=uniFilter;
  return `<div class="bar">
    <input placeholder="Axtar…" value="${esc(f.q)}" oninput="uniFilter.q=this.value;uniList()">
    <select onchange="uniFilter.olke=this.value;uniList()"><option value="">Bütün ölkələr</option>${olkes.map(o=>`<option ${f.olke==o?"selected":""}>${o}</option>`).join("")}</select>
    <select onchange="uniFilter.sah=this.value;uniList()"><option value="">Bütün sahələr</option>${sahs.map(o=>`<option ${f.sah==o?"selected":""}>${o}</option>`).join("")}</select>
  </div><div class="grid" id="ul">${uniCards(uniFiltered())}</div>`;
}
function uniCards(list){return list.length?list.map(u=>`<div class="card">
  <b>${esc(u.ad)}</b><div class="muted">${esc(u.seh)}, ${esc(u.olke)}</div>
  <p>${u.sah.map(s=>`<span class="tag">${esc(s)}</span>`).join(" ")}</p>
  <div class="muted">Dil: ${esc(u.haz)}<br>Qiymət: ${esc(u.pul)}<br>Son tarix: ${esc(u.son)}<br>Təqaüd: ${esc(u.bur)}</div>
  <div class="row" style="justify-content:flex-start"><button class="btn sm" onclick="appForm(${u.id})">Müraciət əlavə et</button></div></div>`).join(""):`<div class="empty">Nəticə tapılmadı.</div>`}
function uniList(){$("#ul").innerHTML=uniCards(uniFiltered())}

// ---------- Tələbələr ----------
function vStud(){
  return `<div class="bar"><button class="btn" onclick="studForm()">+ Yeni tələbə</button></div>
  ${db.studs.length?`<div class="tw"><table><tr><th>Ad</th><th>Əlaqə</th><th>Səviyyə / Sahə</th><th>Bal</th><th>Müraciət</th><th></th></tr>
  ${db.studs.map(s=>`<tr><td><b>${esc(s.ad)}</b></td><td>${esc(s.tel)}<br><span class="muted">${esc(s.email)}</span></td>
  <td>${esc(s.sev)}<br><span class="muted">${esc(s.sah)}</span></td><td>${esc(s.bal)}</td>
  <td>${db.apps.filter(a=>a.stud==s.id).length}</td>
  <td style="white-space:nowrap"><button class="btn ghost sm" onclick="studForm(${s.id})">Redaktə</button> <button class="btn danger sm" onclick="delStud(${s.id})">Sil</button></td></tr>`).join("")}</table></div>`
  :`<div class="card empty">Hələ tələbə yoxdur. “Yeni tələbə” ilə əlavə edin.</div>`}`;
}
function studForm(id){
  const s=id?stud(id):{ad:"",tel:"",email:"",sev:"Bakalavr",sah:"",bal:""};
  $("#dlg").innerHTML=`<form method="dialog" onsubmit="saveStud(event,${id||0});return false"><h3>${id?"Tələbəni redaktə et":"Yeni tələbə"}</h3>
  <label>Ad, soyad</label><input name="ad" required value="${esc(s.ad)}">
  <label>Telefon</label><input name="tel" value="${esc(s.tel)}">
  <label>E-poçt</label><input name="email" type="email" value="${esc(s.email)}">
  <label>Təhsil səviyyəsi</label><select name="sev">${["Bakalavr","Magistr","Doktorantura","Dil kursu"].map(x=>`<option ${s.sev==x?"selected":""}>${x}</option>`).join("")}</select>
  <label>Maraqlandığı sahə</label><input name="sah" value="${esc(s.sah)}">
  <label>Orta bal / GPA</label><input name="bal" value="${esc(s.bal)}">
  <div class="row"><button type="button" class="btn ghost" onclick="dlg.close()">Ləğv et</button><button class="btn">Yadda saxla</button></div></form>`;
  dlg.showModal();
}
const saveStud=guard(async(e,id)=>{
  const d=Object.fromEntries(new FormData(e.target));
  if(id){await api("PUT","/api/students/"+id,d);Object.assign(stud(id),d)}
  else{const r=await api("POST","/api/students",d);db.studs.push({id:r.id,...d})}
  dlg.close();render();
});
const delStud=guard(async id=>{
  if(!confirm("Tələbə və onun müraciətləri silinsin?"))return;
  for(const a of db.apps.filter(a=>a.stud==id))await api("DELETE","/api/applications/"+a.id);
  await api("DELETE","/api/students/"+id);
  db.apps=db.apps.filter(a=>a.stud!=id);db.studs=db.studs.filter(s=>s.id!=id);render();
});

// ---------- Müraciətlər ----------
function vApp(){
  return `<div class="bar"><button class="btn" onclick="appForm()">+ Yeni müraciət</button></div>
  ${db.apps.length?`<div class="tw"><table><tr><th>Tələbə</th><th>Universitet</th><th>Status</th><th>Son tarix</th><th>Sənədlər</th><th></th></tr>
  ${db.apps.map(a=>`<tr><td>${esc(stud(a.stud)?.ad)}</td><td>${esc(uni(a.uni)?.ad)}<br><span class="muted">${esc(uni(a.uni)?.olke)}</span></td>
  <td><span class="tag ${STAT_CLS[a.status]||""}">${esc(a.status)}</span></td><td>${esc(a.deadline)||"—"}</td>
  <td>${a.docs.length}/${DOCS.length}</td>
  <td style="white-space:nowrap"><button class="btn ghost sm" onclick="appEdit(${a.id})">Aç</button> <button class="btn danger sm" onclick="delApp(${a.id})">Sil</button></td></tr>`).join("")}</table></div>`
  :`<div class="card empty">Hələ müraciət yoxdur.</div>`}`;
}
function appForm(uniId){
  if(!db.studs.length){alert("Əvvəlcə tələbə əlavə edin.");mod="edu";go("stud");return}
  mod="edu";
  $("#dlg").innerHTML=`<form method="dialog" onsubmit="addApp(event);return false"><h3>Yeni müraciət</h3>
  <label>Tələbə</label><select name="stud">${db.studs.map(s=>`<option value="${s.id}">${esc(s.ad)}</option>`).join("")}</select>
  <label>Universitet</label><select name="uni">${UNIS.map(u=>`<option value="${u.id}" ${u.id==uniId?"selected":""}>${esc(u.ad)} (${u.olke})</option>`).join("")}</select>
  <label>Son tarix</label><input type="date" name="deadline">
  <div class="row"><button type="button" class="btn ghost" onclick="dlg.close()">Ləğv et</button><button class="btn">Əlavə et</button></div></form>`;
  dlg.showModal();
}
const addApp=guard(async e=>{
  const d=Object.fromEntries(new FormData(e.target));
  const rec={stud:+d.stud,uni:+d.uni,deadline:d.deadline,status:STATUS[0],docs:[],note:""};
  const r=await api("POST","/api/applications",rec);
  db.apps.push({id:r.id,...rec});dlg.close();go("app");
});
function appEdit(id){
  const a=db.apps.find(x=>x.id==id);
  $("#dlg").innerHTML=`<form method="dialog" onsubmit="saveApp(event,${id});return false"><h3>${esc(stud(a.stud)?.ad)} → ${esc(uni(a.uni)?.ad)}</h3>
  <label>Status</label><select name="status">${STATUS.map(s=>`<option ${a.status==s?"selected":""}>${s}</option>`).join("")}</select>
  <label>Son tarix</label><input type="date" name="deadline" value="${esc(a.deadline)}">
  <label>Sənəd siyahısı</label>${DOCS.map(d=>`<div class="chk"><input type="checkbox" name="docs" value="${esc(d)}" ${a.docs.includes(d)?"checked":""}> ${d}</div>`).join("")}
  <label>Qeyd</label><textarea name="note" rows="3">${esc(a.note)}</textarea>
  <div class="row"><button type="button" class="btn ghost" onclick="dlg.close()">Bağla</button><button class="btn">Yadda saxla</button></div></form>`;
  dlg.showModal();
}
const saveApp=guard(async(e,id)=>{
  const fd=new FormData(e.target), a=db.apps.find(x=>x.id==id);
  const upd={stud:a.stud,uni:a.uni,status:fd.get("status"),deadline:fd.get("deadline"),docs:fd.getAll("docs"),note:fd.get("note")};
  await api("PUT","/api/applications/"+id,upd);Object.assign(a,upd);dlg.close();render();
});
const delApp=guard(async id=>{
  if(!confirm("Müraciət silinsin?"))return;
  await api("DELETE","/api/applications/"+id);db.apps=db.apps.filter(a=>a.id!=id);render();
});

const dlg=$("#dlg");
