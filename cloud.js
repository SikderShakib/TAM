/* TAM — Cloud Mode: Firebase Auth + Firestore real-time sync
   Same role model as OTW: admin = full edit + team management,
   viewer = read-only, pending = no access until an admin assigns a role.
   Whole app state syncs as one document: appdata/tam-main */
(function(){
'use strict';
var CFG_KEY='tam_fb_config', SKIP_KEY='tam_skip_cloud', SDK_VERSION='10.12.2';
var auth=null, store=null, currentUser=null, myRole=null, started=false;
var pushTimer=null, applyingRemote=false, lastPushStamp='', lastSeenStamp='', firstSnapshot=true, unsubData=null, unsubOwnRole=null, unsubRoles=null, authMode='signin', rolesList=[];
function $(id){return document.getElementById(id)}
function localCfg(){try{var r=localStorage.getItem(CFG_KEY);return r?JSON.parse(r):null}catch(e){return null}}
function fileCfg(){try{return (typeof FIREBASE_CONFIG!=='undefined'&&FIREBASE_CONFIG)?FIREBASE_CONFIG:null}catch(e){return null}}
function getCfg(){return fileCfg()||localCfg()}
function validCfg(c){return !!(c&&c.apiKey&&c.projectId&&c.appId)}
function canWrite(){return myRole==='admin'}
window.TAMCloud={enabled:false,schedulePush:schedulePush,renderSettingsCard:renderSettingsCard,signOut:doSignOut,getRole:function(){return myRole}};
window.TAMCloudSetRole=function(uid,role){if(!store||myRole!=='admin')return;store.collection('roles').doc(uid).update({role:role}).then(function(){alert('সেভ হয়েছে।')}).catch(function(e){console.warn(e);alert('সেভ হয়নি।')})};
var cfg=getCfg(), skip=false; try{skip=sessionStorage.getItem(SKIP_KEY)==='1'}catch(e){}
if(!validCfg(cfg)||skip){markReady();renderSettingsCard();return}
bindLoginUI();
loadSdk().then(function(){firebase.initializeApp(cfg);auth=firebase.auth();store=firebase.firestore();try{store.enablePersistence({synchronizeTabs:true}).catch(function(){})}catch(e){} window.TAMCloud.enabled=true;auth.onAuthStateChanged(onAuthChanged)}).catch(function(err){console.warn('[TAM Cloud] SDK failed',err);markReady();renderSettingsCard()});
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
function loadSdk(){var b='https://www.gstatic.com/firebasejs/'+SDK_VERSION+'/';return loadScript(b+'firebase-app-compat.js').then(function(){return loadScript(b+'firebase-auth-compat.js')}).then(function(){return loadScript(b+'firebase-firestore-compat.js')})}
function markReady(){window.__tamCloudReady=true}
function showOverlay(id){var n=$(id);if(n)n.classList.remove('hidden')}
function hideOverlay(id){var n=$(id);if(n)n.classList.add('hidden')}
function revealApp(){markReady();hideOverlay('loginOverlay');hideOverlay('pendingOverlay')}
function showLogin(){markReady();hideOverlay('pendingOverlay');renderLoginMode();showOverlay('loginOverlay')}
function showPending(){markReady();hideOverlay('loginOverlay');var em=$('pendingEmail');if(em&&currentUser)em.textContent=currentUser.email||'';showOverlay('pendingOverlay')}
function onAuthChanged(user){
 if(!user){currentUser=null;myRole=null;started=false;stopSync();showLogin();return}
 currentUser=user; var ref=store.collection('roles').doc(user.uid);
 ref.get().then(function(snap){if(snap.exists)return snap;return ref.set({email:user.email||'',role:'pending',createdAt:new Date().toISOString()}).then(function(){return ref.get()})})
 .then(function(snap){myRole=(snap&&snap.exists&&snap.data().role)||'pending';watchOwnRole(ref);if(myRole==='pending')showPending();else enterApp()})
 .catch(function(err){console.warn('[TAM Cloud] role lookup failed',err);showPending()});
}
function watchOwnRole(ref){if(unsubOwnRole)unsubOwnRole();unsubOwnRole=ref.onSnapshot(function(snap){if(!snap.exists)return;var r=snap.data().role;if(!r||r===myRole)return;if(myRole==='pending'&&r!=='pending'){myRole=r;enterApp()}else if(started)location.reload()},function(){})}
function enterApp(){revealApp();started=true;firstSnapshot=true;renderHeader();if(myRole==='admin')startRolesWatch();startDataSync();renderSettingsCard()}
function doSignOut(){if(!auth)return;auth.signOut().then(function(){location.reload()}).catch(function(){location.reload()})}
function renderLoginMode(){var isIn=authMode==='signin';var s=$('loginSubmit'),t=$('loginToggle'),tt=$('loginToggleText'),ti=$('loginTitleText');if(s)s.textContent=isIn?'লগইন':'সাইন আপ';if(t)t.textContent=isIn?'সাইন আপ':'লগইন';if(tt)tt.textContent=isIn?'অ্যাকাউন্ট নেই?':'অ্যাকাউন্ট আছে?';if(ti)ti.textContent=isIn?'লগইন':'সাইন আপ';hideLoginError()}
function showLoginError(m){var n=$('loginError');if(!n)return;n.textContent=m;n.classList.remove('hidden')}
function hideLoginError(){var n=$('loginError');if(n)n.classList.add('hidden')}
function bindLoginUI(){var f=$('loginForm');if(!f||f.__bound)return;f.__bound=true;
 f.addEventListener('submit',function(e){e.preventDefault();if(!auth)return;var email=$('loginEmail').value.trim(),pass=$('loginPass').value,btn=$('loginSubmit');btn.disabled=true;hideLoginError();var p=authMode==='signin'?auth.signInWithEmailAndPassword(email,pass):auth.createUserWithEmailAndPassword(email,pass);p.catch(function(err){showLoginError('লগইন হয়নি। ইমেইল/পাসওয়ার্ড ঠিক আছে কি না দেখুন।')}).then(function(){btn.disabled=false})});
 var tg=$('loginToggle');if(tg)tg.addEventListener('click',function(){authMode=authMode==='signin'?'signup':'signin';renderLoginMode()});
 var dm=$('loginDemoLink');if(dm)dm.addEventListener('click',function(){try{sessionStorage.setItem(SKIP_KEY,'1')}catch(e){}hideOverlay('loginOverlay')});
 renderLoginMode()}
function startDataSync(){if(unsubData)return;var ref=store.collection('appdata').doc('tam-main');unsubData=ref.onSnapshot(function(snap){if(!snap.exists){if(canWrite())pushNow();return}var data=snap.data(),stamp=data._meta?data._meta.updatedAt:'';if(stamp&&stamp===lastPushStamp){lastSeenStamp=stamp;firstSnapshot=false;return}if(stamp&&stamp===lastSeenStamp)return;lastSeenStamp=stamp||'';applyRemote(data);firstSnapshot=false},function(err){console.warn('[TAM Cloud] sync error',err);setSync('error')})}
function applyRemote(data){if(!data||!Array.isArray(data.members))return;applyingRemote=true;db={members:data.members};try{localStorage.setItem('tam_db_v1',JSON.stringify(db))}catch(e){}applyingRemote=false;render()}
function schedulePush(){if(!started||applyingRemote||!store||!canWrite())return;setSync('syncing');clearTimeout(pushTimer);pushTimer=setTimeout(pushNow,800)}
function pushNow(){if(!store||!currentUser||!canWrite())return;var stamp=new Date().toISOString();lastPushStamp=stamp;store.collection('appdata').doc('tam-main').set({members:db.members,_meta:{updatedAt:stamp,updatedBy:currentUser.uid,updatedByEmail:currentUser.email||''}}).then(function(){setSync('synced')}).catch(function(err){console.warn('[TAM Cloud] push failed',err);setSync('error')})}
function stopSync(){if(unsubData){unsubData();unsubData=null}if(unsubRoles){unsubRoles();unsubRoles=null}if(unsubOwnRole){unsubOwnRole();unsubOwnRole=null}}
function startRolesWatch(){if(unsubRoles)return;unsubRoles=store.collection('roles').onSnapshot(function(qs){rolesList=qs.docs.map(function(d){var o=d.data()||{};o.uid=d.id;return o}).sort(function(a,b){return String(a.email||'').localeCompare(String(b.email||''))});renderTeamRows()},function(){})}
function renderTeamRows(){var tb=$('teamTableBody');if(!tb)return;tb.innerHTML=rolesList.map(function(u){var self=currentUser&&u.uid===currentUser.uid;var sel='<select '+(self?'disabled':'')+' onchange="TAMCloudSetRole(\''+u.uid+'\',this.value)">'+['pending','viewer','admin'].map(function(o){return '<option value="'+o+'"'+(u.role===o?' selected':'')+'>'+o+'</option>'}).join('')+'</select>';return '<tr><td>'+esc(u.email||u.uid)+'</td><td>'+sel+'</td></tr>'}).join('')||'<tr><td colspan="2">কেউ নেই</td></tr>'}
function renderHeader(){var chip=$('userChip'),btn=$('logoutBtn');if(btn)btn.classList.remove('hidden');if(chip&&currentUser)chip.innerHTML='<span class="pill pill-green">'+esc(currentUser.email)+' • '+myRole+'</span>';setSync('synced')}
function setSync(state){var si=$('sync');if(!si)return;si.textContent=state==='syncing'?'সিঙ্ক হচ্ছে…':state==='error'?'সিঙ্কে সমস্যা!':'☁️ সিঙ্ক হয়েছে'}
function renderSettingsCard(){
 var body=$('cloudCardBody');if(!body)return;
 if(!window.TAMCloud.enabled){var ex=localCfg();body.innerHTML='<span class="pill pill-gray">লোকাল মোড</span> <small>ডেটা শুধু এই ব্রাউজারে থাকবে।</small><br><br><label>Firebase Config (JSON)</label><br><textarea id="fbConfigText" rows="5" style="width:100%" placeholder=\'{"apiKey":"...","projectId":"...","appId":"..."}\'>'+esc(ex?JSON.stringify(ex,null,2):'')+'</textarea><br><button onclick="TAMCloud.saveLocalConfig()" style="margin-top:8px">ক্লাউডে কানেক্ট করুন</button>';return}
 var html='<span class="pill pill-green">☁️ ক্লাউড মোড</span> '+esc(currentUser?currentUser.email:'')+' • '+myRole;
 if(myRole==='admin'){html+='<h4>টিম অ্যাকসেস</h4><table><thead><tr><th style="text-align:left">ইমেইল</th><th style="text-align:left">Role</th></tr></thead><tbody id="teamTableBody"></tbody></table>'}
 body.innerHTML=html; if(myRole==='admin')renderTeamRows();
}
window.TAMCloud.saveLocalConfig=function(){var ta=$('fbConfigText');if(!ta)return;var parsed=null;try{parsed=JSON.parse(ta.value)}catch(e){try{var m=String(ta.value).match(/\{[\s\S]*\}/);if(m)parsed=(new Function('return ('+m[0]+')'))()}catch(e2){}} if(!validCfg(parsed)){alert('ভুল config।');return} try{localStorage.setItem(CFG_KEY,JSON.stringify(parsed))}catch(e){} setTimeout(function(){location.reload()},400)};
})();
