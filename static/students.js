// ===== Tələbə qeydiyyatı (genişləndirilmiş) =====
const S_STATUS=["Yeni müraciət","Görüşdük","Müqavilə bağlandı","Sənəd toplayır","Müraciət göndərilib","Qəbul alıb","Viza prosesi","Yola düşüb","Dayandırılıb"];
const S_CLS={"Yeni müraciət":"pri","Görüşdük":"pri","Müqavilə bağlandı":"warn","Sənəd toplayır":"warn","Müraciət göndərilib":"warn","Qəbul alıb":"ok","Viza prosesi":"warn","Yola düşüb":"ok","Dayandırılıb":"bad"};
const S_LEVELS=["Bakalavr","Magistr","Doktorantura","Hazırlıq / Dil kursu","Digər"];
const S_LANG=["Yoxdur","IELTS","TOEFL","TestDaF","Türk dili (TÖMER/YÖS)","Rus dili","Digər"];
const S_SOURCE=["Instagram","Facebook","Google","TikTok","Tövsiyə","Zəng","WhatsApp","Ofis","Digər"];
const S_DOCS=[...DOCS,"Fotoşəkil","Tibbi arayış","Valideyn razılığı (18 yaşadək)"];
const S_DOC_ST=["yoxdur","alındı","təsdiqləndi"];
const sf={q:"",status:"",olke:"",mesul:""};
const ssum=(a,f)=>a.reduce((s,x)=>s+(+f(x)||0),0);
const STUD_ID=id=>db.studs.find(s=>s.id==id);

function sDocsDone(s){const d=s.docs&&!Array.isArray(s.docs)?s.docs:{};return S_DOCS.filter(k=>d[k]&&d[k].st&&d[k].st!="yoxdur").length}
function sFin(id){
  const cs=(store.contracts||[]).filter(c=>c.stud==id);
  const tot=ssum(cs,c=>c.mebleg);
  const paid=ssum((store.transactions||[]).filter(t=>t.nov=="Gəlir"&&cs.some(c=>c.id==t.muq)),t=>t.mebleg);
  return {cs,tot,paid,debt:tot-paid};
}
const maskPass=p=>p?("•••"+String(p).slice(-3)):"";
function sNow(){return new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16).replace("T"," ")}

// ---------- Siyahı ----------
function studFiltered(){
  const q=sf.q.toLowerCase().trim();
  return db.studs.filter(s=>{
    if(sf.status&&(s.status||"Yeni müraciət")!=sf.status)return false;
    if(sf.olke&&!(s.olkeler||"").toLowerCase().includes(sf.olke.toLowerCase()))return false;
    if(sf.mesul&&(s.mesul||"")!=sf.mesul)return false;
    if(q){const hay=[s.ad,s.ata,s.tel,s.wa,s.email,s.sah,s.olkeler,s.cari,s.sheher,s.mesul].join(" ").toLowerCase();
      if(!hay.includes(q)&&!(waNumber(s.tel)&&waNumber(s.tel).includes(q.replace(/\D/g,""))&&q.replace(/\D/g,"").length>=4))return false}
    return true;
  });
}
function studRows(list){
  if(!list.length)return `<div class="card empty">${db.studs.length?"Nəticə tapılmadı.":"Hələ tələbə yoxdur. “+ Yeni tələbə” ilə qeydiyyatdan keçirin."}</div>`;
  const edit=canEdit("edu"),fin=canView("fin");
  return `<div class="tw"><table><tr><th>Tələbə</th><th>Status</th><th>Hədəf</th><th>Məsul</th><th>Sənədlər</th>${fin?"<th>Maliyyə</th>":""}<th>Müraciət</th><th></th></tr>
  ${list.map(s=>{
    const done=sDocsDone(s),pct=Math.round(done/S_DOCS.length*100),f=sFin(s.id),n=db.apps.filter(a=>a.stud==s.id).length;
    return `<tr><td><b style="cursor:pointer;color:var(--pri)" onclick="studProfile(${s.id})">${esc(s.ad)}</b><br><span class="muted">${esc(s.tel)||"—"}${s.sheher?" · "+esc(s.sheher):""}</span></td>
    <td><span class="tag ${S_CLS[s.status||"Yeni müraciət"]||""}">${esc(s.status||"Yeni müraciət")}</span></td>
    <td>${esc(s.sev)||"—"}<br><span class="muted">${esc(s.olkeler||s.sah||"")}</span></td>
    <td>${esc(s.mesul)||"—"}</td>
    <td style="min-width:110px"><div style="height:8px;border-radius:99px;background:var(--line);overflow:hidden"><div style="height:100%;width:${pct}%;background:${pct==100?"var(--ok)":"var(--pri)"}"></div></div><span class="muted">${done}/${S_DOCS.length}</span></td>
    ${fin?`<td>${f.tot?`<span class="muted">${money(f.paid)} / ${money(f.tot)}</span>${f.debt>0.004?`<br><span class="tag bad">borc ${money(f.debt)}</span>`:`<br><span class="tag ok">ödənilib</span>`}`:'<span class="muted">—</span>'}</td>`:""}
    <td>${n}</td>
    <td style="white-space:nowrap"><button class="btn sm keep" onclick="studProfile(${s.id})">Profil</button> <button class="btn ghost sm keep" title="WhatsApp" onclick="waStud(${s.id})">💬</button>${edit?` <button class="btn ghost sm" onclick="studReg(${s.id})">Redaktə</button> <button class="btn danger sm" onclick="studDel(${s.id})">Sil</button>`:""}</td></tr>`}).join("")}</table></div>`;
}
function vStudents(){
  const mesuls=[...new Set(db.studs.map(s=>s.mesul).filter(Boolean))];
  const counts=S_STATUS.map(st=>[st,db.studs.filter(s=>(s.status||"Yeni müraciət")==st).length]).filter(x=>x[1]);
  return `<div class="bar"><button class="btn" onclick="studReg()">+ Yeni tələbə</button>
  <input placeholder="Axtar: ad, nömrə, ölkə, ixtisas…" value="${esc(sf.q)}" oninput="sf.q=this.value;studRelist()" style="min-width:230px">
  <select onchange="sf.status=this.value;studRelist()"><option value="">Bütün statuslar</option>${S_STATUS.map(x=>`<option ${sf.status==x?"selected":""}>${x}</option>`).join("")}</select>
  <input placeholder="Ölkə" value="${esc(sf.olke)}" oninput="sf.olke=this.value;studRelist()" style="width:120px">
  ${mesuls.length?`<select onchange="sf.mesul=this.value;studRelist()"><option value="">Bütün məsullar</option>${mesuls.map(x=>`<option ${sf.mesul==x?"selected":""}>${esc(x)}</option>`).join("")}</select>`:""}
  <button class="btn ghost keep" onclick="studExport()">⬇ Excel (CSV)</button></div>
  ${counts.length?`<div class="bar" style="margin-top:-6px">${counts.map(([st,n])=>`<span class="tag ${S_CLS[st]||""}" style="cursor:pointer" onclick="sf.status='${st}';render()">${st}: ${n}</span>`).join(" ")}</div>`:""}
  <div id="slst">${studRows(studFiltered())}</div>`;
}
function studRelist(){$("#slst").innerHTML=studRows(studFiltered())}
function waStud(id){const s=STUD_ID(id),n=waNumber(s.wa||s.tel);if(!n){alert("Telefon nömrəsi yoxdur.");return}
  window.open("https://wa.me/"+n+"?text="+encodeURIComponent("Salam, "+s.ad+"! Xaricdə Təhsil Global-dan yazırıq."),"_blank","noopener")}

// ---------- Qeydiyyat formu ----------
function sel(name,opts,v,blank){return `<select name="${name}">${blank?`<option value="">—</option>`:""}${opts.map(o=>`<option ${v==o?"selected":""}>${esc(o)}</option>`).join("")}</select>`}
function studReg(id){
  if(!canEdit("edu")){alert("Bu əməliyyat üçün icazəniz yoxdur.");return}
  const s=id?STUD_ID(id):{status:"Yeni müraciət",sev:"Bakalavr",dil:"Yoxdur",menbe:"Ofis",mesul:me?me.username:""};
  const f=(k,l,extra="")=>`<div><label>${l}</label><input name="${k}" value="${esc(s[k])}" ${extra}></div>`;
  $("#dlg").className="wide";
  $("#dlg").innerHTML=`<form method="dialog" onsubmit="studSave(event,${id||0});return false"><h3>${id?"Tələbəni redaktə et":"Yeni tələbə qeydiyyatı"}</h3>
  <h4 class="sec">1. Şəxsi məlumat</h4>
  <div class="fgrid">${f("ad","Ad, soyad *","required")}${f("ata","Ata adı")}
   <div><label>Doğum tarixi</label><input type="date" name="dogum" value="${esc(s.dogum)}"></div>${f("sheher","Şəhər / rayon")}
   <div><label>Pasport / ŞV nömrəsi <span class="muted">(həssas, yalnız lazım olduqda)</span></label><input name="pasport" value="${esc(s.pasport)}" autocomplete="off"></div></div>
  <h4 class="sec">2. Əlaqə</h4>
  <div class="fgrid">${f("tel","Telefon *",'required placeholder="050 123 45 67"')}${f("wa","WhatsApp (fərqlidirsə)")}
   <div><label>E-poçt</label><input type="email" name="email" value="${esc(s.email)}"></div>
   ${f("valideyn","Valideyn adı")}${f("valtel","Valideyn telefonu")}</div>
  <h4 class="sec">3. Təhsil və dil</h4>
  <div class="fgrid">${f("cari","Hazırkı məktəb / universitet")}${f("bal","Orta bal / GPA")}
   <div><label>Dil sertifikatı</label>${sel("dil",S_LANG,s.dil)}</div>${f("dilbal","Dil balı / səviyyəsi")}</div>
  <h4 class="sec">4. Hədəf</h4>
  <div class="fgrid"><div><label>Təhsil səviyyəsi</label>${sel("sev",S_LEVELS,s.sev)}</div>${f("sah","İxtisas / sahə")}
   ${f("olkeler","Hədəf ölkələr (vergüllə)",'placeholder="Türkiyə, Almaniya"')}
   <div><label>Büdcə (₼ / il)</label><input type="number" min="0" name="budce" value="${esc(s.budce)}"></div></div>
  <h4 class="sec">5. İdarəetmə</h4>
  <div class="fgrid"><div><label>Status</label>${sel("status",S_STATUS,s.status||"Yeni müraciət")}</div>
   <div><label>Mənbə</label>${sel("menbe",S_SOURCE,s.menbe)}</div>${f("mesul","Məsul məsləhətçi (istifadəçi adı)")}</div>
  <label>Qeyd</label><textarea name="qeyd" rows="3" style="width:100%">${esc(s.qeyd)}</textarea>
  <div class="row"><button type="button" class="btn ghost" onclick="dlg.close()">Ləğv et</button><button class="btn">${id?"Yadda saxla":"Qeydiyyatdan keçir"}</button></div></form>`;
  dlg.showModal();
}
const studSave=guard(async(e,id)=>{
  const fd=new FormData(e.target),d=Object.fromEntries(fd);
  d.ad=(d.ad||"").trim().replace(/\s+/g," ");
  if(d.ad.length<3){alert("Ad və soyadı yazın.");return}
  const num=waNumber(d.tel);
  if(num.length<11){alert("Telefon nömrəsi düzgün deyil (məs. 050 123 45 67).");return}
  if(d.budce!==undefined&&d.budce!=="")d.budce=+d.budce;
  const dup=db.studs.find(s=>s.id!=id&&(waNumber(s.tel)==num||(d.pasport&&s.pasport&&s.pasport.toUpperCase()==d.pasport.toUpperCase())));
  if(dup&&!confirm("Diqqət: eyni nömrə/pasport ilə tələbə artıq var: "+dup.ad+" ("+(dup.status||"Yeni müraciət")+"). Yenə də yadda saxlansın?"))return;
  if(id){
    const old=STUD_ID(id),log=[...(old.log||[])];
    if(d.status&&d.status!=(old.status||"Yeni müraciət"))log.push({t:sNow(),u:me.username,text:"Status: "+(old.status||"Yeni müraciət")+" → "+d.status});
    await studPut(id,{...d,log});
  }else{
    const rec={...d,docs:{},log:[{t:sNow(),u:me.username,text:"Qeydiyyatdan keçdi"}],yaradilma:sNow().slice(0,10)};
    const r=await api("POST","/api/students",rec);db.studs.push({id:r.id,...rec});
  }
  dlg.close();render();
});
async function studPut(id,changes){
  const s=STUD_ID(id);Object.assign(s,changes);
  const b={...s};delete b.id;await api("PUT","/api/students/"+id,b);
}
const studDel=guard(async id=>{
  const s=STUD_ID(id);
  if(!confirm(`"${s.ad}" və onun müraciətləri silinsin? Bu geri qaytarılmır.`))return;
  for(const a of db.apps.filter(a=>a.stud==id))await api("DELETE","/api/applications/"+a.id);
  await api("DELETE","/api/students/"+id);
  db.apps=db.apps.filter(a=>a.stud!=id);db.studs=db.studs.filter(x=>x.id!=id);render();
});

// ---------- Profil ----------
function studProfile(id){
  const s=STUD_ID(id);if(!s)return;
  const edit=canEdit("edu"),d=s.docs&&!Array.isArray(s.docs)?s.docs:{},f=sFin(id),apps=db.apps.filter(a=>a.stud==id);
  const kv=(l,v)=>v?`<div><span class="muted">${l}</span><br>${esc(v)}</div>`:"";
  const done=sDocsDone(s);
  $("#dlg").className="wide";
  $("#dlg").innerHTML=`<div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap"><div style="flex:1;min-width:220px"><h3 style="margin:0">${esc(s.ad)}</h3>
   <div class="muted">${esc([s.ata&&"ata: "+s.ata,s.dogum,s.sheher].filter(Boolean).join(" · "))}</div></div>
   <div>${edit?`<select onchange="studStatus(${id},this.value)">${S_STATUS.map(x=>`<option ${(s.status||"Yeni müraciət")==x?"selected":""}>${x}</option>`).join("")}</select>`:`<span class="tag ${S_CLS[s.status||"Yeni müraciət"]||""}">${esc(s.status||"Yeni müraciət")}</span>`}</div></div>
   <div class="bar" style="margin:12px 0 4px"><button class="btn sm keep" onclick="waStud(${id})">💬 WhatsApp</button>${s.tel?` <a class="btn ghost sm keep" href="tel:${esc(s.tel)}" style="text-decoration:none">📞 ${esc(s.tel)}</a>`:""}${edit?` <button class="btn ghost sm" onclick="studReg(${id})">Redaktə</button>`:""}</div>
   <div class="fgrid" style="margin:10px 0">${kv("E-poçt",s.email)}${kv("WhatsApp",s.wa)}${kv("Valideyn",[s.valideyn,s.valtel].filter(Boolean).join(" · "))}${kv("Pasport/ŞV",maskPass(s.pasport))}
   ${kv("Hazırkı təhsil",s.cari)}${kv("Orta bal",s.bal)}${kv("Dil",[s.dil,s.dilbal].filter(x=>x&&x!="Yoxdur").join(" "))}${kv("Səviyyə / ixtisas",[s.sev,s.sah].filter(Boolean).join(" · "))}
   ${kv("Hədəf ölkələr",s.olkeler)}${kv("Büdcə",s.budce?money(s.budce)+" / il":"")}${kv("Mənbə",s.menbe)}${kv("Məsul",s.mesul)}${kv("Qeydiyyat",s.yaradilma)}</div>
   ${s.qeyd?`<div class="card" style="padding:12px;margin-bottom:10px"><span class="muted">Qeyd</span><br>${esc(s.qeyd)}</div>`:""}
   <h4 class="sec">Sənədlər <span class="muted">(${done}/${S_DOCS.length})</span></h4>
   <div class="doclist">${S_DOCS.map((k,i)=>{const x=d[k]||{st:"yoxdur",exp:""};
     return `<div class="docrow"><span>${esc(k)}</span>${edit?`<select onchange="studDoc(${id},${i},'st',this.value)">${S_DOC_ST.map(o=>`<option ${x.st==o?"selected":""}>${o}</option>`).join("")}</select>
     <input type="date" title="Bitmə tarixi (pasport, viza, sertifikat)" value="${esc(x.exp)}" onchange="studDoc(${id},${i},'exp',this.value)">`
     :`<span class="tag ${x.st=="təsdiqləndi"?"ok":x.st=="alındı"?"pri":""}">${x.st}</span>${x.exp?` <span class="muted">${esc(x.exp)}</span>`:""}`}${x.exp&&x.exp<=today()&&x.st!="yoxdur"?' <span class="tag bad">vaxtı keçib</span>':""}</div>`}).join("")}</div>
   <h4 class="sec">Müraciətlər <span class="muted">(${apps.length})</span></h4>
   ${apps.length?apps.map(a=>`<div class="docrow"><span>${esc(uni(a.uni)?.ad||"?")} <span class="muted">${esc(uni(a.uni)?.olke||"")}</span></span><span class="tag ${STAT_CLS[a.status]||""}">${esc(a.status)}</span>${a.deadline?`<span class="muted">${esc(a.deadline)}</span>`:""}</div>`).join(""):'<p class="muted">Hələ müraciət yoxdur (Təhsil → Müraciətlər).</p>'}
   ${canView("fin")?`<h4 class="sec">Maliyyə</h4>${f.cs.length?`<div class="docrow"><span>Müqavilə cəmi</span><b>${money(f.tot)}</b></div><div class="docrow"><span>Ödənilib</span><b style="color:var(--ok)">${money(f.paid)}</b></div><div class="docrow"><span>Qalıq borc</span><b style="color:${f.debt>0.004?"var(--bad)":"var(--ok)"}">${money(Math.max(0,f.debt))}</b></div>`:'<p class="muted">Müqavilə yoxdur (Maliyyə → Müqavilələr).</p>'}`:""}
   <h4 class="sec">Qeydlər jurnalı</h4>
   ${edit?`<div style="display:flex;gap:8px"><input id="snote" placeholder="Qeyd yazın (zəng, görüş, razılaşma…)" style="flex:1"><button class="btn sm" onclick="studNote(${id})">Əlavə et</button></div>`:""}
   <div class="loglist">${[...(s.log||[])].reverse().map(l=>`<div><span class="muted">${esc(l.t)} · ${esc(l.u||"")}</span><br>${esc(l.text)}</div>`).join("")||'<p class="muted">Qeyd yoxdur.</p>'}</div>
   <div class="row"><button class="btn ghost" onclick="dlg.close()">Bağla</button></div>`;
  dlg.showModal();
}
const studStatus=guard(async(id,v)=>{
  const s=STUD_ID(id),log=[...(s.log||[]),{t:sNow(),u:me.username,text:"Status: "+(s.status||"Yeni müraciət")+" → "+v}];
  await studPut(id,{status:v,log});studProfile(id);
});
const studDoc=guard(async(id,i,k,v)=>{
  const s=STUD_ID(id),d={...(s.docs&&!Array.isArray(s.docs)?s.docs:{})},name=S_DOCS[i];
  const prev=d[name]||{st:"yoxdur",exp:""};d[name]={...prev,[k]:v};
  const log=[...(s.log||[])];
  if(k=="st")log.push({t:sNow(),u:me.username,text:`Sənəd: ${name} → ${v}`});
  await studPut(id,{docs:d,log});studProfile(id);
});
const studNote=guard(async id=>{
  const v=($("#snote").value||"").trim();if(!v)return;
  const s=STUD_ID(id);await studPut(id,{log:[...(s.log||[]),{t:sNow(),u:me.username,text:v}]});studProfile(id);
});

// ---------- Excel (CSV) ----------
function studExport(){
  const rows=studFiltered();
  const cols=[["ad","Ad, soyad"],["ata","Ata adı"],["dogum","Doğum"],["tel","Telefon"],["wa","WhatsApp"],["email","E-poçt"],["sheher","Şəhər"],["status","Status"],["sev","Səviyyə"],["sah","İxtisas"],["olkeler","Hədəf ölkələr"],["budce","Büdcə"],["cari","Hazırkı təhsil"],["bal","Orta bal"],["dil","Dil"],["dilbal","Dil balı"],["menbe","Mənbə"],["mesul","Məsul"],["yaradilma","Qeydiyyat"]];
  const q=v=>'"'+String(v==null?"":v).replace(/"/g,'""')+'"';
  const head=[...cols.map(c=>q(c[1])),q("Sənədlər")].join(";");
  const body=rows.map(s=>[...cols.map(c=>q(c[0]=="status"?(s.status||"Yeni müraciət"):s[c[0]])),q(sDocsDone(s)+"/"+S_DOCS.length)].join(";"));
  const csv="\ufeff"+[head,...body].join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="telebeler_"+today()+".csv";a.click();
}

// modul bağlantısı
MODULES.edu.views.stud=["Tələbələr",vStudents];
dlg.addEventListener("close",()=>{dlg.className=""});
