const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let recipes=[], category='Alle', tags=new Set(), current=null, servings=1;
const cats=['Frühstück','Hauptspeise vegetarisch','Hauptspeise vegan','Hauptspeise Fleisch','Hauptspeise Fisch','Beilage & Salat','Suppe','Kuchen & Gebäck','Dessert','Snack','Saucen & Dips'];

function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function n(v){return v==null||v===''?null:Number(v)}
function fmt(v,d=1){const x=n(v);return x==null?'–':new Intl.NumberFormat('de-DE',{maximumFractionDigits:d}).format(x)}
function initials(t){return (String(t).match(/\b\p{L}/gu)||['R']).slice(0,2).join('').toUpperCase()}

async function load(){
  try{
    recipes=await fetch('recipes.json?'+Date.now()).then(r=>{if(!r.ok)throw Error();return r.json()});
    $('#loadingState').classList.add('hidden');
    render();
  }catch(e){
    $('#loadingState').classList.add('hidden');
    $('#errorState').classList.remove('hidden');
  }
}
function allTags(){return [...new Set(recipes.flatMap(r=>r.tags||[]))].sort()}
function filter(){
  const q=$('#searchInput').value.trim().toLowerCase();
  const maxC=n($('#maxCalories').value), minP=n($('#minProtein').value), maxT=n($('#maxTime').value);
  let out=recipes.filter(r=>{
    const hay=[r.title,r.description,r.category,...(r.tags||[]),...(r.ingredients||[]).map(i=>i.ingredient)].join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(category==='Alle'||r.category===category)&&[...tags].every(t=>(r.tags||[]).includes(t))&&(maxC==null||r.calories==null||r.calories<=maxC)&&(minP==null||r.proteinG==null||r.proteinG>=minP)&&(maxT==null||r.totalMinutes==null||r.totalMinutes<=maxT);
  });
  const s=$('#sortSelect').value;
  out.sort((a,b)=>s==='az'?a.title.localeCompare(b.title,'de'):s==='za'?b.title.localeCompare(a.title,'de'):s==='protein'?(b.proteinG||-1)-(a.proteinG||-1):s==='calories'?(a.calories??Infinity)-(b.calories??Infinity):s==='time'?(a.totalMinutes??Infinity)-(b.totalMinutes??Infinity):new Date(b.createdAt||0)-new Date(a.createdAt||0));
  return out;
}
function render(){
  $('#recipeCount').textContent=recipes.length+' '+(recipes.length===1?'Rezept':'Rezepte');
  const usedCats=cats.filter(c=>recipes.some(r=>r.category===c));
  $('#categoryChips').innerHTML=['Alle',...usedCats].map(c=>'<button class="chip '+(category===c?'active':'')+'" data-c="'+esc(c)+'">'+esc(c)+'</button>').join('');
  $$('#categoryChips [data-c]').forEach(b=>b.onclick=()=>{category=b.dataset.c;render()});
  $('#tagChips').innerHTML=allTags().map(t=>'<button class="chip '+(tags.has(t)?'active':'')+'" data-t="'+esc(t)+'">#'+esc(t)+'</button>').join('');
  $$('#tagChips [data-t]').forEach(b=>b.onclick=()=>{tags.has(b.dataset.t)?tags.delete(b.dataset.t):tags.add(b.dataset.t);render()});
  const rows=filter();
  $('#resultTitle').textContent=category==='Alle'?'Alle Rezepte':category;
  $('#resultMeta').textContent=rows.length+' von '+recipes.length+' Rezepten';
  $('#recipeGrid').innerHTML=rows.map(card).join('');
  $$('.recipe-card').forEach(c=>c.onclick=()=>openDetail(c.dataset.id));
  $('#emptyState').classList.toggle('hidden',rows.length>0);
  if(!recipes.length){$('#emptyTitle').textContent='Noch keine Rezepte';$('#emptyText').textContent='Sobald das erste Rezept gespeichert ist, erscheint es hier automatisch.'}
}
function card(r){
  const img=r.imageUrl?'<img src="'+esc(r.imageUrl)+'" alt="'+esc(r.title)+'">':'<div class="placeholder">'+esc(initials(r.title))+'</div>';
  return '<article class="recipe-card" data-id="'+esc(r.id)+'"><div class="media">'+img+'<span>'+esc(r.category||'')+'</span></div><div class="body"><small>'+(r.totalMinutes?fmt(r.totalMinutes,0)+' Min.':'')+'</small><h3>'+esc(r.title)+'</h3><p>'+esc(r.description||'')+'</p><div class="stats"><b>'+fmt(r.calories,0)+'<small>kcal</small></b><b>'+(r.proteinG==null?'–':fmt(r.proteinG)+' g')+'<small>Protein</small></b><b>'+fmt(r.servings,1)+'<small>Portionen</small></b></div><div class="tags">'+(r.tags||[]).slice(0,3).map(t=>'<i>#'+esc(t)+'</i>').join('')+'</div></div></article>';
}
function openDetail(id){
  const r=recipes.find(x=>x.id===id); if(!r)return; current=r; servings=r.servings||1; detail(); $('#recipeDialog').showModal();
}
function detail(){
  const r=current, factor=servings/(r.servings||1);
  const ing=(r.ingredients||[]).map(i=>'<li><b>'+((n(i.amount)!=null?fmt(n(i.amount)*factor,2):esc(i.amountText||''))+(i.unit?' '+esc(i.unit):''))+'</b><span>'+esc(i.ingredient||'')+(i.note?'<small>'+esc(i.note)+'</small>':'')+'</span></li>').join('');
  const steps=(r.instructions||[]).map(s=>'<li>'+esc(typeof s==='string'?s:s.instruction||'')+'</li>').join('');
  $('#recipeDetail').innerHTML='<div class="detailHead"><h2>'+esc(r.title)+'</h2><p>'+esc(r.description||'')+'</p></div><div class="detailBody"><div class="macro"><span><b>'+fmt(r.calories,0)+'</b> kcal</span><span><b>'+fmt(r.proteinG)+'</b> g Protein</span><span><b>'+fmt(r.carbsG)+'</b> g KH</span><span><b>'+fmt(r.fatG)+'</b> g Fett</span></div><div class="serv"><button data-s="-">−</button><strong>'+fmt(servings,2)+' Portionen</strong><button data-s="+">+</button></div><div class="cols"><section><h3>Zutaten</h3><ul class="ingredients">'+ing+'</ul></section><section><h3>Zubereitung</h3><ol>'+steps+'</ol></section></div>'+(r.sourceUrl?'<a class="source" href="'+esc(r.sourceUrl)+'" target="_blank" rel="noopener">Originalquelle öffnen ↗</a>':'')+'</div>';
  $$('[data-s]').forEach(b=>b.onclick=()=>{servings=Math.max(.25,servings+(b.dataset.s==='+'?1:-1));detail()});
}
$('#searchInput').oninput=render; ['maxCalories','minProtein','maxTime'].forEach(id=>$('#'+id).oninput=render); $('#sortSelect').onchange=render;
$('#resetFilters').onclick=()=>{category='Alle';tags.clear();$('#searchInput').value='';$('#maxCalories').value='';$('#minProtein').value='';$('#maxTime').value='';render()};
$('#filterToggle').onclick=()=>$('#filters').classList.toggle('open');
$('#randomBtn').onclick=()=>{const r=filter();if(r.length)openDetail(r[Math.floor(Math.random()*r.length)].id)};
$$('[data-close-dialog]').forEach(b=>b.onclick=()=>$('#recipeDialog').close());
$('#retryBtn').onclick=load;
const th=localStorage.getItem('rezeptbuch.theme')||'light';document.documentElement.dataset.theme=th;$('#themeToggle').textContent=th==='dark'?'☀':'☾';
$('#themeToggle').onclick=()=>{const x=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=x;localStorage.setItem('rezeptbuch.theme',x);$('#themeToggle').textContent=x==='dark'?'☀':'☾'};
load();