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
rec.lang="pt-BR";rec.continuous=false;rec.interimResults=false;
var want=true,on=false,awake=false,blocked=false,hold=false,quiet=0,timer=null;
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
function pause(){hold=true;quiet=0;b.textContent="MIC: PAUSA";try{rec.abort();}catch(e){}}
function start(){if(!want||on||hold)return;try{rec.start();}catch(e){}}
rec.onstart=function(){on=true;b.textContent="MIC: ON";};
rec.onend=function(){
on=false;
if(hold){return;}
if(want){b.textContent="MIC: ...";setTimeout(start,800);}
else if(!blocked){b.textContent="MIC: OFF";}
};
rec.onerror=function(e){
if(e.error==="not-allowed"||e.error==="service-not-allowed"){
want=false;blocked=true;b.textContent="MIC: toque";
}
};
rec.addEventListener("error",function(e){window.lastErr=e.error;});
rec.addEventListener("speechstart",function(){window.lastErr="speechstart";});
rec.addEventListener("nomatch",function(){window.lastErr="nomatch";});
rec.addEventListener("start",function(){b.textContent="MIC: ON "+(window.lastErr||"");});
rec.onresult=function(e){
var t=e.results[e.results.length-1][0].transcript.trim();
b.textContent=(speaking()?"[fala] ":"")+"OUVI: "+t.slice(0,25);
if(!t)return;
var m=t.match(/j[aá]r?vi[sz]/i);
if(speaking()){
if(!m)return;
try{stopVoice();}catch(x){}
}
var cmd=t;
if(m){
cmd=t.slice(m.index+m[0].length).replace(/^[\s,.!?:;-]+/,"");
if(!cmd){wake();return;}
}else if(!awake){return;}
awake=false;clearTimeout(timer);
box.value=cmd;
box.dispatchEvent(new Event("input",{bubbles:true}));
pause();
setTimeout(function(){go.click();},200);
};
setInterval(function(){
if(!want)return;
if(window.busy){
quiet=0;
if(!hold)pause();
}else if(hold){
quiet+=300;
if(quiet>=1500){hold=false;quiet=0;start();}
}
},300);
b.onclick=function(){
if(want){
want=false;hold=false;sleep();
try{rec.stop();}catch(e){}
b.textContent="MIC: OFF";
}else{
want=true;blocked=false;hold=false;start();
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
