(function(){
var go=document.getElementById("go");
var box=document.getElementById("in");
var core=document.getElementById("core");
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(!go||!box)return;
var b=document.createElement("button");
b.className="b";b.id="mic";b.type="button";b.textContent="MIC";
go.parentNode.insertBefore(b,go);
if(!SR){b.textContent="MIC: sem suporte";return;}
var rec=new SR();
rec.lang="pt-BR";rec.continuous=true;rec.interimResults=false;
var want=true,on=false,awake=false,blocked=false,timer=null;
function speaking(){
try{if(window.curAudio&&!window.curAudio.paused)return true;}catch(e){}
try{if(window.speechSynthesis&&speechSynthesis.speaking)return true;}catch(e){}
return false;
}
function sleep(){awake=false;clearTimeout(timer);if(core)core.classList.remove("think");}
function wake(){
awake=true;if(core)core.classList.add("think");
clearTimeout(timer);timer=setTimeout(sleep,8000);
}
function start(){if(!want||on)return;try{rec.start();}catch(e){}}
rec.onstart=function(){on=true;b.textContent="MIC: ON";};
rec.onend=function(){
on=false;
if(want){b.textContent="MIC: ...";setTimeout(start,800);}
else if(!blocked){b.textContent="MIC: OFF";}
};
rec.onerror=function(e){
if(e.error==="not-allowed"||e.error==="service-not-allowed"){
want=false;blocked=true;b.textContent="MIC: toque";
}
};
rec.onresult=function(e){
if(speaking())return;
var t=e.results[e.results.length-1][0].transcript.trim();
if(!t)return;
var m=t.match(/j[aá]r?vi[sz]/i);
var cmd=t;
if(m){
cmd=t.slice(m.index+m[0].length).replace(/^[\s,.!?:;-]+/,"");
if(!cmd){wake();return;}
}else if(!awake){return;}
awake=false;clearTimeout(timer);
box.value=cmd;
box.dispatchEvent(new Event("input",{bubbles:true}));
setTimeout(function(){go.click();},200);
};
b.onclick=function(){
if(want){
want=false;sleep();
try{rec.stop();}catch(e){}
b.textContent="MIC: OFF";
}else{
want=true;blocked=false;start();
}
};
document.addEventListener("click",function(){
if(blocked){blocked=false;want=true;start();}
});
function lock(){
try{navigator.wakeLock.request("screen").catch(function(){});}catch(e){}
}
lock();
document.addEventListener("visibilitychange",function(){if(!document.hidden)lock();});
start();
})();
