// CORRIGIR DEV

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
var multi, idev;
var token = urlParams.get('a');
var iat = urlParams.get('b');
var mode = urlParams.get('c') || CONFIG.mode; 
var pass = urlParams.get('d') || CONFIG.pass;
if ((CONFIG && mode == CONFIG.mode)|| dev) idev = true;

var spre =  "../../_js/";
var ssuf =  ".js";
var git = "https://cdn.jsdelivr.net/gh/OorbitBR/OORBIT@";
if (!idev) spre = git+version.OORBIT+"/builds/";
if (version.min) ssuf =  ".min.js";
function headScript() {
    var src = arr[0];
    var scriptEl = document.createElement("script");
    scriptEl.src = src;
    arr.shift();
    //scriptEl.onreadystatechange = headScript(arr);
    scriptEl.onload = ()=>{
        if (dev) console.log('loaded',src);
        (src.includes('oorbit')) ? loadGroup(mode,iat,progress) : headScript(arr);       
    }
    document.head.appendChild(scriptEl);
}

var arr = []
var bc = mode.slice(-2);
if (bc == 85 || bc == 86) {

    arr.push('https://cdn.jsdelivr.net/npm/mind-ar@'+version.ARCARD+'/dist/mindar-image.prod.js');
    arr.push(spre+'aframe-v'+version.AFRAME+ssuf);
    arr.push('https://cdn.jsdelivr.net/npm/mind-ar@'+version.ARCARD+'/dist/mindar-image-aframe.prod.js');

} 
else if (bc == 87 || bc == 88) {

    arr.push('https://cdn.jsdelivr.net/npm/mind-ar@'+version.ARCARD+'/dist/mindar-face.prod.js');
    arr.push(spre+'aframe-v'+version.AFRAME+ssuf);
    arr.push('https://cdn.jsdelivr.net/npm/mind-ar@'+version.ARCARD+'/dist/mindar-face-aframe.prod.js');

} 
else {
    arr.push(spre+'aframe-v'+version.AFRAME+ssuf);
}

if (bc == 83 || bc == 84) {
    arr.push('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@'+version.ARPLACE+'/three.js/build/ar-threex-location-only.js');
    arr.push('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@'+version.ARPLACE+'/aframe/build/aframe-ar-new-location-only.js');
}
//TODO: AR 81 E 82

arr.push("https://cdn.jsdelivr.net/npm/aframe-troika-text@"+version.TEXT+"/dist/aframe-troika-text.min.js") //text component
arr.push(spre+'environment-v'+version.ENVIRONMENT+ssuf); // environment
arr.push("https://cdn.jsdelivr.net/npm/three-pathfinding@"+version.PATHFINDING+"/dist/three-pathfinding.umd.js"); // pathfinding

arr.push("https://cdn.jsdelivr.net/gh/c-frame/aframe-extras@"+version.EXTRAS+"/dist/aframe-extras.controls.min.js"); // extras controls
arr.push("https://cdn.jsdelivr.net/gh/c-frame/aframe-extras@"+version.EXTRAS+"/dist/aframe-extras.loaders.min.js"); // extras loaders

arr.push("https://cdn.jsdelivr.net/npm/aframe-event-set-component@"+version.EVENTSET+"/dist/aframe-event-set-component.min.js"); // eventset
arr.push("https://cdn.jsdelivr.net/npm/super-hands@"+version.SUPERHANDS+"/dist/super-hands.min.js"); // superhands

//arr.push("https://cdn.jsdelivr.net/gh/c-frame/physx@"+version.PHYSX+"/dist/physx.min.js");
arr.push(spre+'physx-v'+version.PHYSX+ssuf);
arr.push(spre+'physx-aframe-v'+version.PHYSX+ssuf);
var physxwasm = spre+'physx-v'+version.PHYSX+'.wasm';

//headScript("https://cdn.jsdelivr.net/npm/three-pathfinding@1.1.0/dist/three-pathfinding.umd.js"); // AWS

arr.push("https://cdn.jsdelivr.net/gh/faisalman/ua-parser-js@"+version.UAPARSER+"/dist/ua-parser.min.js"); // ua parser

if (idev) {
    arr.push('../../_js/components-a'+version.AFRAME+ssuf);
    arr.push('../../_js/oorbit-a'+version.AFRAME+ssuf);    
} else {
    arr.push('../_js/components-a'+version.AFRAME+ssuf);
    arr.push('../_js/oorbit-a'+version.AFRAME+ssuf);    
}

headScript()
     
function loadGroup(m, iat, callback){
    if (iat == 'GOOG' || iat == 'FACE' || iat == 'COGI') return
        
    let b = m.charAt(1)
    let c = m.charAt(2)
    var documentHead = document.head  || document.getElementsByTagName('head')[0];
    
    if (b == 6 || b == 7 || c == 2 || c == 4 || c == 6 || c == 8){
        multi = true;
        var script = document.createElement('script');
        script.type = 'text/javascript';
        //TODO
        script.src = "../_js/o-group.js";
        
        //script.onreadystatechange = callback;
        script.onload = callback;
        
        documentHead.appendChild(script);
    } else {
        pass = true;
        progress()
    }
}

var o, path, ap, error, url, logo, orb, geo, hide, exer;
var seats, form;
var ARmenu, ARstate, ARparams, ARmsg;
let medias = {
    audio:false,
    video:false
};
let userType = 'user';

var opath = "https://c6cimdp8rg.execute-api.us-east-1.amazonaws.com/";
var s3path = "https://aulas-oorbit-svls.s3.amazonaws.com/";

function progress () {
    if (!AFRAME || !AFRAME.components["super-hands"] || !AFRAME.components.environment || !AFRAME.systems.physx) {
        errorHandler("slow")    
    } else {
        if (!multi) {
            getWorld()    
        } else {
            (!urlParams && !idev)?errorHandler():getLocalMedia()   
        }
    }   
};       
function getWorld(){                
    if (!idev && (!token || token=='' || !iat || iat=='' || !mode || mode=='' || !pass || pass=='')) errorHandler();

    $.ajaxSetup({contentType: "application/json; charset=utf-8"});
    if (iat == 'GOOG' || iat == 'FACE' || iat == 'COG1' || iat == 'COG2') {
        token = decodeURI(token);
        if (document.referrer.indexOf(pass) > -1 || mode == AWS.config.credentials.identityId) {
            $.post(opath+"getview",JSON.stringify({
                a:token,
                b:iat,
                c:mode,
                d:pass
            }),function(data){
                showWorld(data.params)
                $.get(data.file, function(result) {
                    appendImport(result)
                    if (localStorage.getItem('res') != null ) updateRes(data.viat);
                }).fail(function(err) {
                    errorHandler(err)});
            }).fail(function(err) {
                errorHandler(err)});
        } else {
            errorHandler("view")
        }  
    } 
    else {
        if (!idev) {
            url = opath+"getfile/"+token+iat;
            $.get(url, function(data){
                if (data.token) token = data.token;
                showWorld(data.params)
                $.get(data.file, function(result) {
                    appendImport(result)
                    //if (localStorage.getItem('res') != null ) updateRes(data.viat);
                }).fail(function(err) {
                    errorHandler(err)});
            }).fail(function(err) {
                errorHandler(err)
            });
        } 
        else {
            $.get('../'+CONFIG.mod+'/'+CONFIG.mod+'.html', function(result) {
                showWorld(CONFIG)
                appendImport(result)
            }).fail(function(err) {
                errorHandler(err)
            });
        }
    }
} 
function showWorld(data) {
    mode = data.mode;
    logo = data.logo;
    orb = data.orb;
    geo = data.geo;
    hide = data.hide;
    exer = data.exer;
    if (!hide) $('#loader').css('display','flex')
    if (geo) $('#geo').show()
    if (!$("script[src*='oorbit']")[0]) $('#overlay').hide()   
}
function appendImport(data){
    $(document).ready(function() {
        ap = true;
        $("#loader section").css("margin-top", ($('#logo').height()+50)+"px")
        $('#logo').animate({opacity:1},600,function(){
            $('#logo').animate({top:40},500);
            setTimeout(function(){
                $("#loader section").css("margin-top", ($('#logo').height()+50)+"px")
                if (!$('#logo')[0] || $('#logo').height() == 0) $("#loader section").css("margin-top", "220px")
                $('#loader section').animate({opacity:1},400);
                $('#rota').animate({opacity:1},400);
                setTimeout(function(){  
                    if (idev) path = '';
                    orderImport($(data));
                }, 400);
            }, 500);
        });
    });  
}
function errorHandler(err){
    error = true;
    let msg ="00: Tente novamente.";
    
    if (err == "slow") msg = "01: Problema de conex??o com a internet."; 
    else if(err == "socket") msg = "02: Conex??o indispon??vel."; 
    else if(err == "ar") msg = "03: Sistema AR n??o carregou."; 
    else if(err == "view") msg = "12: Visualiza????o bloqueada."; 
    
    else if (err != null && err.responseJSON != null) msg = err.responseJSON.message;
    (msg == "Internal Server Error") ? msg = "E99: Servidor em Manuten????o." : msg = "E"+msg;
                    
    $('#logo').css('opacity',1)
    $('#logo').css('top',40)
    $('#loader section').css('opacity',1);
    $("#loading-msg").html(msg)
    $("#progress-bar p").html("")
    $('#ebar').css('width','0%')
    $('#ebar i').html('highlight_off');
    $('#ebar i').css('color','red');
    $('#circle-loader').hide();
    $("#buttons").remove();
    $("#sub").remove();
    $("#rota").remove();
    $('#loader').css('display','flex')
    $("#loader section").css("justify-content","center");
    $("#progress-bar").append('<b onClick="window.location.reload()" style="text-decoration: underline;color: blue;">Clique aqui para atualizar</b>')
    
    sendError(parseInt(msg.substring(4, 8)))
}
function inIframe() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}
function sendError(code) {
    if (!inIframe()) return
    window.addEventListener("message", function(e){
        if(!e.origin.includes(pass) && !idev) return
        let origin = e.origin;
        let source = e.source;
        if (e.data.simulation || !e.data.simulation.error) return
        e.data.simulation.error = code;   
        source.postMessage( JSON.stringify({ simulation: e.data.simulation}),origin)
    });
}
function updateRes(viat){
    let res = JSON.parse( localStorage.getItem('res'))
    res.result.ativos[token.substring(9)][token.substr(0, 9)].viat = viat;
    localStorage.setItem('res',JSON.stringify(res))
}   
function orderImport(arr) {
    let i;
    for (i=0;i<arr.length;i++){
        $('body').append(arr[i])
        /*
        if (arr[i].nodeName == "SCRIPT") {
            $('body').append(arr[i])
        }
        if (arr[i].nodeName == "A-SCENE") i = 
        */
    }
}
if (CONFIG.console) {
    $('body').append("<div id='debugdiv'></div>")
    if (typeof console  != "undefined") 
    if (typeof console.log != 'undefined')
        console.olog = console.log;
    else
        console.olog = function() {};

    console.log = function(message) {
        console.olog(message);
        $('#debugdiv').append('<p>' + message + '</p>');
    };
    console.error = console.debug = console.info =  console.log
} 