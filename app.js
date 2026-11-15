const $=id=>document.getElementById(id),
q=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"),
kv=(k,v)=>`<div class="kv"><span class="sub">${k}</span><b>${v}</b></div>`,
days=d=>Math.ceil((new Date(d)-new Date(new Date().toDateString()))/864e5),
sb=supabase.createClient(CFG.URL,CFG.KEY);
let me=null,uid="-",R=[];
function toast(t){const x=$("ts");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2600)}
function shrink(f){return new Promise((ok,no)=>{const r=new FileReader();r.onerror=no;r.onload=()=>{const i=new Image();i.onerror=no;i.onload=()=>{const s=Math.min(1,1000/Math.max(i.width,i.height)),c=document.createElement("canvas");c.width=i.width*s;c.height=i.height*s;c.getContext("2d").drawImage(i,0,0,c.width,c.height);c.toBlob(ok,"image/jpeg",.82)};i.src=r.result};r.readAsDataURL(f)})}

async function gallery(){
  const{data}=await sb.from("transformations").select("*").order("created_at",{ascending:false});
  if(!data||!data.length)return"";
  return`<div class="card"><h2>تحولات عملائنا</h2>${data.map(t=>`<div class="prog"><div class="two2"><figure class="fg"><img src="${q(t.before_url)}" alt="قبل"><figcaption>قبل</figcaption></figure><figure class="fg"><img src="${q(t.after_url)}" alt="بعد"><figcaption>بعد</figcaption></figure></div><b>${q(t.name)}</b> <span class="sub">${t.weeks?t.weeks+" أسبوع، ":""}${q(t.result)}</span></div>`).join("")}</div>`}

async function authView(){
  $("out").classList.add("hide");
  $("app").innerHTML=`<div class="card" style="text-align:center"><h2 dir="ltr" style="font-size:22px">Coach S7s</h2><p class="sub">ابدأ رحلتك مع مدربك: تمارين وتغذية ومتابعة أونلاين</p></div>`+await gallery()+`<div class="card"><div class="seg2"><button id="m0" onclick="mode(0)">دخول</button><button id="m1" onclick="mode(1)">حساب جديد</button></div><div id="af"></div></div>`;
  mode(0)}
function mode(n){
  $("m0").classList.toggle("on",!n);$("m1").classList.toggle("on",!!n);
  $("af").innerHTML=`<input id="em" type="email" dir="ltr" placeholder="الإيميل" autocomplete="email"><input id="pw" type="password" dir="ltr" placeholder="كلمة السر (6 حروف على الأقل)" autocomplete="${n?"new-password":"current-password"}">`+(n?`<input id="nm" placeholder="اسمك بالكامل"><input id="ph" type="tel" dir="ltr" placeholder="رقم الموبايل"><select id="gl"><option>نزول وزن</option><option>زيادة عضل</option><option>لياقة عامة</option></select><div class="two2"><input id="w0" type="number" step="0.1" placeholder="وزنك (كجم)"><input id="ht" type="number" placeholder="طولك (سم)"></div><div class="two2"><input id="wg" type="number" step="0.1" placeholder="الوزن المستهدف"><select id="dy"><option value="30">باقة شهر</option><option value="90">باقة 3 شهور</option><option value="180">باقة 6 شهور</option></select></div>`:"")+`<button class="btn" onclick="${n?"signUp()":"signIn()"}">${n?"سجّل دلوقتي":"دخول"}</button>`}
async function signIn(){
  const{error}=await sb.auth.signInWithPassword({email:$("em").value.trim(),password:$("pw").value});
  if(error)toast("الإيميل أو كلمة السر غلط")}
async function signUp(){
  const g=i=>$(i).value.trim();
  if(!g("nm")||!g("em")||$("pw").value.length<6)return toast("اكتب الاسم والإيميل وكلمة سر 6 حروف على الأقل");
  const{data,error}=await sb.auth.signUp({email:g("em"),password:$("pw").value,options:{data:{full_name:g("nm"),phone:g("ph"),goal:$("gl").value,w0:g("w0"),wg:g("wg"),height:g("ht"),days:$("dy").value}}});
  if(error)return toast("مقدرناش نسجلك: "+error.message);
  if(!data.session)toast("افتح إيميلك وأكد الحساب الأول")}

async function clientView(){
  const{data:c}=await sb.from("clients").select("*,subscriptions(end_date)").eq("user_id",me.id).maybeSingle();
  if(!c){$("app").innerHTML=`<div class="card"><h2>أهلاً ${q(me.full_name)}</h2><p class="sub">حسابك لسه مش مربوط بمدرب.</p></div>`;return}
  const end=(c.subscriptions||[]).map(s=>s.end_date).sort().pop(),d=end?days(end):0;
  const{data:ms}=await sb.from("measurements").select("*").eq("client_id",c.id).order("measured_at",{ascending:false}).limit(6);
  $("app").innerHTML=`<div class="card"><h2>أهلاً يا ${q(me.full_name.split(" ")[0])}</h2><div class="big">${Math.max(d,0)}</div><p class="sub">${d>0?"يوم متبقي في اشتراكك":"اشتراكك خلص، كلّم مدربك للتجديد"}</p></div>
<div class="card"><h2>وزنك</h2><div class="asg"><input id="mw" type="number" step="0.1" placeholder="وزنك النهاردة (كجم)" style="margin:0"><button class="btn" style="margin:0;flex:none" onclick="addW('${c.id}')">سجّل</button></div>${(ms||[]).map(m=>kv(m.measured_at,m.weight_kg+" كجم")).join("")}<p class="sub" style="margin-top:8px">بدأت بـ ${c.start_weight_kg??"-"} كجم، وهدفك ${c.target_weight_kg??"-"} كجم</p></div>`+await gallery()}
async function addW(id){
  const w=+$("mw").value;if(!w)return toast("اكتب وزنك الأول");
  const{error}=await sb.from("measurements").insert({client_id:id,weight_kg:w});
  if(error)return toast("حصلت مشكلة، جرب تاني");toast("اتسجل الوزن");clientView()}

async function coachView(){
  const{data:L}=await sb.from("clients").select("id,goal,start_weight_kg,target_weight_kg,created_at,profiles!clients_user_id_fkey(full_name,phone),subscriptions(end_date)");
  R=(L||[]).map(c=>{const e=(c.subscriptions||[]).map(s=>s.end_date).sort().pop();return{...c,end:e,d:e?days(e):-1}}).sort((a,b)=>a.d-b.d);
  $("app").innerHTML=`<div class="stats"><div class="stat"><b>${R.length}</b><span>عميل</span></div><div class="stat alert"><b>${R.filter(c=>c.d<=7).length}</b><span>اشتراك ينتهي أو خلص</span></div></div>
<div class="card"><h2>العملاء</h2>${R.map((c,i)=>`<button class="row" onclick="detail(${i})"><div class="av">${q((c.profiles?.full_name||"?")[0])}</div><div class="info"><b>${q(c.profiles?.full_name)}</b><span class="sub">${q(c.goal||"")}</span></div><span class="tag ${c.d<=0?"t-bad":c.d<=7?"t-warn":"t-ok"}">${c.d<=0?"منتهي":c.d+" يوم"}</span></button>`).join("")||'<p class="sub">لسه مفيش عملاء، ابعتلهم الرابط يسجلوا</p>'}</div><div id="dt"></div>
<div class="card"><h2>إضافة تحول للمعرض</h2><input id="tn" placeholder="اسم العميل (أو أول حرف)"><div class="two2"><input id="tw" type="number" placeholder="أسابيع"><input id="tx" placeholder="النتيجة، مثال: نزل 12 كجم"></div><div class="two2"><label class="up"><input id="fb" type="file" accept="image/*" onchange="lab(this,'قبل')"><span>صورة قبل</span></label><label class="up"><input id="fa" type="file" accept="image/*" onchange="lab(this,'بعد')"><span>صورة بعد</span></label></div><button class="btn" onclick="addTr()">احفظ التحول</button></div>`}
async function detail(i){
  const c=R[i],p=c.profiles||{};
  const{data:ms}=await sb.from("measurements").select("weight_kg,measured_at").eq("client_id",c.id).order("measured_at",{ascending:false}).limit(1);
  const w=ms&&ms[0],wk=Math.floor((Date.now()-new Date(c.created_at))/6048e5);
  let ph=(p.phone||"").replace(/\D/g,"");if(ph.startsWith("0"))ph="20"+ph.slice(1);
  $("dt").innerHTML=`<div class="card"><h2>${q(p.full_name)}</h2>${kv("متابع من",wk?wk+" أسبوع":"لسه جديد")}${kv("الهدف",q(c.goal||"-"))}${kv("الوزن","بدأ "+(c.start_weight_kg??"-")+"، دلوقتي "+(w?w.weight_kg:"-")+"، الهدف "+(c.target_weight_kg??"-"))}${kv("آخر قياس",w?w.measured_at:"لسه")}${kv("الاشتراك",c.d>0?"باقي "+c.d+" يوم":"منتهي")}${ph?`<a class="btn" style="display:inline-block;text-decoration:none;margin-top:10px" href="https://wa.me/${ph}" target="_blank" rel="noopener">واتساب</a>`:""}<p class="sub" style="margin:12px 0 6px">تجديد الاشتراك</p><div class="asg">${[30,90,180].map(n=>`<button class="sb" onclick="renew(${i},${n})">+${n} يوم</button>`).join("")}</div></div>`;
  $("dt").scrollIntoView({behavior:"smooth"})}
async function renew(i,n){
  const c=R[i],base=c.d>0?new Date(c.end):new Date(),e=new Date(base.getTime()+n*864e5);
  const{error}=await sb.from("subscriptions").insert({client_id:c.id,plan_name:n+" يوم",price:0,start_date:new Date().toISOString().slice(0,10),end_date:e.toISOString().slice(0,10)});
  if(error)return toast("حصلت مشكلة في التجديد");toast("اتجدد الاشتراك");coachView()}
function lab(el,t){el.nextElementSibling.textContent=el.files[0]?"اتختارت صورة "+t+" ✓":"صورة "+t}
async function up(f){
  const b=await shrink(f),p=Date.now()+"-"+Math.random().toString(36).slice(2)+".jpg";
  const{error}=await sb.storage.from("transformations").upload(p,b,{contentType:"image/jpeg"});
  if(error)throw error;return sb.storage.from("transformations").getPublicUrl(p).data.publicUrl}
async function addTr(){
  const b=$("fb").files[0],a=$("fa").files[0];if(!b||!a)return toast("ارفع صورة قبل وصورة بعد");
  toast("بنرفع الصور...");
  try{const[u1,u2]=await Promise.all([up(b),up(a)]);
    const{error}=await sb.from("transformations").insert({name:$("tn").value.trim(),weeks:+$("tw").value||null,result:$("tx").value.trim(),before_url:u1,after_url:u2});
    if(error)throw error;toast("اتضاف التحول");coachView()}catch(e){toast("حصلت مشكلة في الرفع")}}

async function route(){
  const{data:{session}}=await sb.auth.getSession();
  if(!session){me=null;return authView()}
  const{data:p}=await sb.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
  me=p;$("out").classList.remove("hide");
  if(!p){$("app").innerHTML='<div class="card"><p class="sub">الحساب لسه بيتجهز، حدّث الصفحة بعد ثواني.</p></div>';return}
  p.role==="coach"?coachView():clientView()}
sb.auth.onAuthStateChange((ev,s)=>{const u=s?s.user.id:"";if(ev!=="INITIAL_SESSION"&&u===uid)return;uid=u;route()});
