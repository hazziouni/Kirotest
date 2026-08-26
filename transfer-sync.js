(function(){
const TRANSFER_PREFIX="dearesume=";
const SEEN_KEY="dea-c01-seen-v1";
function b64urlEncode(obj){
  const json=JSON.stringify(obj);
  const bytes=new TextEncoder().encode(json);
  let bin="";for(const b of bytes)bin+=String.fromCharCode(b);
  return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function b64urlDecode(str){
  str=str.replace(/-/g,"+").replace(/_/g,"/");while(str.length%4)str+="=";
  const bin=atob(str);const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
function remainingSeconds(){
  if(state.mode!=="timed")return null;
  const elapsed=Math.max(0,(Date.now()-state.startedAt)/1000);
  return Math.max(0,Math.floor(state.durationSec-elapsed));
}
function compactState(){
  return {
    v:1,m:state.mode,o:state.order,a:state.answers,f:state.flagged,c:state.choiceOrder,l:state.locked,h:state.hintsShown,
    i:state.current,r:remainingSeconds(),s:state.subset||null
  };
}
function makeResumeUrl(){
  const base=location.href.split("#")[0];
  return `${base}#${TRANSFER_PREFIX}${b64urlEncode(compactState())}`;
}
function mergeSeen(ids){
  try{
    const old=new Set(JSON.parse(localStorage.getItem(SEEN_KEY)||"[]").map(Number));
    ids.forEach(id=>old.add(Number(id)));
    localStorage.setItem(SEEN_KEY,JSON.stringify([...old]));
  }catch(e){}
}
function restoreSnapshot(x){
  if(!x||x.v!==1||!Array.isArray(x.o)||!x.o.length)return false;
  const validIds=new Set((window.QUESTIONS||[]).map(q=>q.id));
  const order=x.o.filter(id=>validIds.has(Number(id))).map(Number);
  if(!order.length)return false;
  const duration=x.m==="timed"?Math.max(1,Number(x.r)||10800):10800;
  state={
    mode:x.m==="timed"?"timed":"untimed",order,answers:x.a||{},flagged:x.f||{},choiceOrder:x.c||{},locked:x.l||{},hintsShown:x.h||{},
    current:Math.max(0,Math.min(order.length-1,Number(x.i)||0)),startedAt:Date.now(),durationSec:duration,finished:false,submittedAt:null,subset:x.s||null
  };
  mergeSeen(order);save();showExam();renderQuestion();startTimer();
  history.replaceState(null,"",location.href.split("#")[0]);
  toast(`Attempt restored — question ${state.current+1} of ${order.length}.`);
  return true;
}
function transferModal(){
  const url=makeResumeUrl();
  const left=remainingSeconds();
  const timing=state.mode==="timed"?`The transferred attempt will resume with <strong>${fmt(left)}</strong> remaining.`:"This is an untimed attempt.";
  const answered=Object.values(state.answers||{}).filter(a=>Array.isArray(a)&&a.length).length;
  $("#modalRoot").innerHTML=`<div class="modalback"><div class="modal transfer-modal">
    <h3>📱 Continue on another device</h3>
    <p>Your progress is packed into a private resume link: question <strong>${state.current+1}</strong>, ${answered} answered, flags, answer order and feedback state. ${timing}</p>
    <div class="transfer-warning">Anyone who has this link can see this practice attempt, so treat it like a private study link.</div>
    <textarea id="resumeLink" readonly>${url}</textarea>
    <div class="modal-actions transfer-actions">
      <button class="ghost" id="cancelTransfer">Close</button>
      <button class="secondary" id="copyTransfer">Copy link</button>
      <button class="primary" id="shareTransfer">Share to phone</button>
    </div>
  </div></div>`;
  $("#cancelTransfer").onclick=()=>$("#modalRoot").innerHTML="";
  $("#copyTransfer").onclick=async()=>{
    try{await navigator.clipboard.writeText(url);toast("Resume link copied.");}
    catch(e){const t=$("#resumeLink");t.select();document.execCommand("copy");toast("Resume link copied.");}
  };
  $("#shareTransfer").onclick=async()=>{
    if(navigator.share){
      try{await navigator.share({title:"DEA-C01 practice — resume attempt",text:`Resume my DEA-C01 practice at question ${state.current+1}.`,url});return;}catch(e){if(e&&e.name==="AbortError")return;}
    }
    try{await navigator.clipboard.writeText(url);toast("Link copied — send it to your phone.");}catch(e){toast("Copy the link shown above.");}
  };
}
function wireButtons(){
  document.querySelectorAll("[data-transfer-attempt]").forEach(b=>b.onclick=transferModal);
}
window.makeDEAResumeUrl=makeResumeUrl;
window.restoreDEAResume=function(payload){try{return restoreSnapshot(b64urlDecode(payload));}catch(e){return false;}};
wireButtons();
const hash=location.hash.slice(1);
if(hash.startsWith(TRANSFER_PREFIX)){
  const ok=window.restoreDEAResume(hash.slice(TRANSFER_PREFIX.length));
  if(!ok)toast("This resume link is invalid or no longer compatible.");
}
})();