// Ümumi "cədvəl + forma" mühərriki. Yeni bölmə əlavə etmək üçün ent("ad", {...}) yazmaq kifayətdir.
const store={}, E={}, listQ={};
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const money=v=>(+v||0).toLocaleString("az",{minimumFractionDigits:2,maximumFractionDigits:2})+" ₼";
function ent(key,cfg){E[key]=cfg;store[key]=[]}
const recs=k=>k=="students"?db.studs:store[k];
const byId=(k,id)=>recs(k).find(r=>r.id==id);
const refLabel=(k,id)=>{const r=byId(k,id);return r?(r.ad||"#"+r.id):"(silinib)"};

function fmt(f,v){
  if(f.t=="check")return v?"✓":"";
  if(f.t=="img")return v?`<img src="media/${esc(v)}" style="height:56px;border-radius:6px;display:block">`:"—";
  if(v===undefined||v===""||v===null)return "—";
  if(f.t=="ref")return esc(refLabel(f.ref,v));
  if(f.t=="money")return money(v);
  if(f.t=="select"&&f.cls)return `<span class="tag ${f.cls[v]||""}">${esc(v)}</span>`;
  return esc(v);
}

function listView(key){
  const c=E[key];
  return `<div class="bar"><button class="btn" onclick="entForm('${key}')">+ ${c.add}</button>
  <input placeholder="Axtar…" value="${esc(listQ[key]||"")}" oninput="listQ['${key}']=this.value;relist('${key}')"></div>
  <div id="lst">${tableHtml(key)}</div>`;
}
function relist(key){$("#lst").innerHTML=tableHtml(key)}
function tableHtml(key){
  const c=E[key], q=(listQ[key]||"").toLowerCase();
  let rows=recs(key).filter(r=>!q||JSON.stringify(r).toLowerCase().includes(q));
  rows=rows.slice().sort(c.sort||((a,b)=>b.id-a.id));
  if(!rows.length)return `<div class="card empty">${recs(key).length?"Nəticə tapılmadı.":"Hələ qeyd yoxdur. “+ "+c.add+"” ilə əlavə edin."}</div>`;
  const F=Object.fromEntries(c.fields.map(f=>[f.k,f]));
  return `<div class="tw"><table><tr>${c.cols.map(k=>`<th>${F[k].l}</th>`).join("")}<th></th></tr>
  ${rows.map(r=>`<tr>${c.cols.map(k=>`<td>${fmt(F[k],r[k])}</td>`).join("")}
  <td style="white-space:nowrap">${c.actions?c.actions(r):""}<button class="btn ghost sm" onclick="entForm('${key}',${r.id})">Redaktə</button> <button class="btn danger sm" onclick="entDel('${key}',${r.id})">Sil</button></td></tr>`).join("")}</table></div>`;
}

function entForm(key,id,preset={}){
  const c=E[key], r=id?byId(key,id):{};
  const inp=f=>{
    let v=r[f.k]!==undefined?r[f.k]:(preset[f.k]!==undefined?preset[f.k]:(typeof f.def=="function"?f.def():f.def??""));
    const req=f.req?"required":"";
    if(f.t=="select")return `<select name="${f.k}" ${req}>${f.opts.map(o=>`<option ${v==o?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
    if(f.t=="ref")return `<select name="${f.k}" ${req}>${f.req?"":`<option value="">—</option>`}${recs(f.ref).map(o=>`<option value="${o.id}" ${v==o.id?"selected":""}>${esc(o.ad||"#"+o.id)}</option>`).join("")}</select>`;
    if(f.t=="textarea")return `<textarea name="${f.k}" rows="3">${esc(v)}</textarea>`;
    if(f.t=="check")return `<div class="chk"><input type="checkbox" name="${f.k}" ${v?"checked":""}> ${f.hint||""}</div>`;
    const type={date:"date",number:"number",money:"number"}[f.t]||"text";
    return `<input name="${f.k}" type="${type}" ${f.t=="money"?'step="0.01" min="0"':f.t=="number"?'min="0"':""} value="${esc(v)}" ${req}>`;
  };
  $("#dlg").innerHTML=`<form method="dialog" onsubmit="entSave(event,'${key}',${id||0});return false"><h3>${id?"Redaktə":c.add}</h3>
  ${c.fields.map(f=>`<label>${f.l}</label>${inp(f)}`).join("")}
  <div class="row"><button type="button" class="btn ghost" onclick="dlg.close()">Ləğv et</button><button class="btn">Yadda saxla</button></div></form>`;
  dlg.showModal();
}
const entSave=guard(async(e,key,id)=>{
  const c=E[key], fd=new FormData(e.target), rec=id?{...byId(key,id)}:{};
  for(const f of c.fields){
    if(f.t=="check")rec[f.k]=fd.has(f.k);
    else{let v=fd.get(f.k);if(["number","money","ref"].includes(f.t))v=v===""?"":+v;rec[f.k]=v}
  }
  if(c.prep)c.prep(rec);
  const body={...rec};delete body.id;
  if(id){await api("PUT",`/api/${key}/${id}`,body);Object.assign(byId(key,id),rec)}
  else{const r=await api("POST","/api/"+key,body);rec.id=r.id;recs(key).push(rec)}
  if(c.after)await c.after(rec,!id);
  dlg.close();render();
});
const entDel=guard(async(key,id)=>{
  if(!confirm("Silinsin?"))return;
  await api("DELETE",`/api/${key}/${id}`);
  const a=recs(key),i=a.findIndex(r=>r.id==id);a.splice(i,1);render();
});
async function patchRec(key,id,changes){
  const r=byId(key,id);Object.assign(r,changes);
  const b={...r};delete b.id;await api("PUT",`/api/${key}/${id}`,b);
}
const cards=a=>`<div class="grid">${a.map(([n,l,cls])=>`<div class="card stat"><b class="${cls||""}">${n}</b><span>${l}</span></div>`).join("")}</div>`;
