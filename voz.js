var VK="jarvis-voz",voiceOn=true,curAudio=null;
try{voiceOn=localStorage.getItem(VK)!=="0"}catch(e){}
function vlabel(){$("vz").textContent=voiceOn?"VOZ: ON":"VOZ: OFF"}
$("go").insertAdjacentHTML("beforebegin",'<button class="b" id="vz" type="button"></button>');
vlabel();
function clean(t){return String(t).replace(/https?:\/\/\S+/g," link ").replace(/[*#`_>~]/g,"").slice(0,450)}
function browserSpeak(t){
  if(!window.speechSynthesis)return;
  var u=new SpeechSynthesisUtterance(clean(t));u.lang="pt-BR";u.pitch=.9;
  var v=speechSynthesis.getVoices().filter(function(x){return /^pt[-_]BR/i.test(x.lang)});
  if(v.length)u.voice=v[0];
  speechSynthesis.cancel();speechSynthesis.speak(u);
}
function stopVoice(){if(curAudio){curAudio.pause();curAudio=null}if(window.speechSynthesis)speechSynthesis.cancel()}
function speak(t){
  if(!voiceOn||!t||String(t).indexOf("Processando")===0)return;
  stopVoice();
  fetch("/api/speak",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:clean(t),pin:getPin()})})
    .then(function(r){if(!r.ok)throw new Error("voz");return r.blob()})
    .then(function(b){var a=new Audio(URL.createObjectURL(b));curAudio=a;a.play().catch(function(){browserSpeak(t)})})
    .catch(function(){browserSpeak(t)});
}
$("vz").onclick=function(){voiceOn=!voiceOn;try{localStorage.setItem(VK,voiceOn?"1":"0")}catch(e){}vlabel();if(!voiceOn)stopVoice()};
var _say=say;
say=function(t){_say(t);speak(t)};
