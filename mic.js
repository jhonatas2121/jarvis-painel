(function(){
var go=document.getElementById("go");
if(!go)return;
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
var box=go.parentElement.querySelector("input,textarea")||document.querySelector("textarea,input[type=text]");
var b=document.createElement("button");
b.className="b";b.id="mic";b.type="button";b.textContent="MIC";
go.parentNode.insertBefore(b,go);
if(!SR||!box){b.textContent="MIC: sem suporte";return;}
var rec=new SR();
rec.lang="pt-BR";rec.interimResults=false;rec.continuous=false;
var on=false;
b.onclick=function(){
if(on){rec.stop();return;}
if(window.stopVoice)stopVoice();
try{rec.start();}catch(e){}
};
rec.onstart=function(){on=true;b.textContent="OUVINDO...";};
rec.onend=function(){on=false;b.textContent="MIC";};
rec.onerror=function(e){on=false;b.textContent="MIC: "+e.error;};
rec.onresult=function(e){
var t=e.results[0][0].transcript;
box.value=t;
box.dispatchEvent(new Event("input",{bubbles:true}));
setTimeout(function(){go.click();},300);
};
})();
