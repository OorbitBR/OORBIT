//Os Termos de Uso da Oorbit se aplicam na utilização deste programa. Acesso o termo em https://drive.google.com/file/d/1-7H0-xvh_AJkA2nK2jKVuQgbnv93JUew/view 

AFRAME.registerSystem('oorbit', {
    schema: {
        hasCursor:{type: "boolean", default: true}, //ok

        has3DMenu:{type: "boolean", default: true}, // if 3d menu will be used or not
        hasARMenu:{type: "boolean", default: true}, // if AR menu will be used or not
        has2DMenu:{type: "boolean", default: true}, // if 2d menu will be used or not
        
        hasIntro: {type: "boolean", default: false}, // if intro will be used or not
        
        hasLogos:{type: "boolean", default: false}, // if logos will be used or not
        
        cursorColor: { type: "color", default: "white" }, //ok
        loadingColor: { type: "color", default: "green" }, //ok
        
        menuColor: { type: "color", default: "#2EF9FF" }, // "#2EF9FF" , "#90EE90", "#FFCBDB"
        textColor: { type: "color", default: "black" },
        buttonColor: { type: "color", default: "#493889" },
        buttonDetailColor: { type: "color", default: "white" },
        questionBackColor: { type: "color", default: "#493889" },
        questionTextColor: { type: "color", default: "white" },
        
        controlCollider:{type: "boolean", default: true}, // control has collider
        
        targetClass: { type: "string", default: "mclickable", oneOf: ["any", "mclickable", "aclickable", "qclickable"] }, //ok
        
        targets: { type: "array", default: ['[hoverable]','[grabbable]', '[clickable]','[stretchable]','[draggable]','[droppable]','[pinchable]','[collidable]','[selectable]','[turnable]']}, //ok
        
        hoverTime: { type: "int", default: 4000}, //ok
        showRay:{type: "boolean", default: true}, //ok
        
        hasZoom:{type: "boolean", default: true}, // if show zoom btns
        cursorZoom:{type: "boolean", default: false}, // if zoom at cursor
        cursorFly:{type: "boolean", default: false}, // if cursor height affects camera height
        turnAxis:{type: "string", default: 'z', oneOf: ["x", "y", "z"] }, //ok,
        
        precision:{type: "int", default: 3}, // decimal places of models.  
        
        lightType:{type:'string',default: 'realistic', oneOf: ["realistic","default","none",'corner']}
    },
    init: function () {  
        // Variables
        o = this; // this system
        this.icons = []; // icons needed to change mode
        this.stream; // this media stream (mic and webcam)        
        this.media = []; // main media elements
        this.questions = []; // local copy of questions
        this.dur = []; // user actions durations
        this.results = [0,0]; // questions results
        this.form = []; // data to be sent as form response
        this.wasPlaying = []; // assets were playing when o paused
        this.timeline = {}; // local copy of timeline
        this.baseline = []; // inicial state of scene
        this.environment = {}; // local copy of environment
        this.physics = {}; // local copy of physics
        this.delay = 0; // wait time to count for pause periods
        this.run = 0; // actual runtime
        this.last = 0.0; // last timeline key
        this.end; // if user reached the end of simulation
        this.replay; // if user pressed replay button
        this.offset = 0.005; // cursor offset from surface
        this.timeout1 = 0; // timeout waiting for selection
        this.clicking; // element being clicked in mouse mode
        this.selected = []; // selected elements
        this.zoom = [1,0]; // zoom level and fov
        this.multi; // if this is a group room
        this.econtrol = document.createElement('a-entity');
        this.ARsystem = [];
        this.ARvideo = document.createElement('video');
        this.ARwires = {all:[]} // created wires
        this.ARmarks = [];
        this.ARparts = {};
        this.ARcameras = [];
        this.usedPins = []; // wired pins
        this.audioCtx // buzzer sound
        this.triggers = []  // created triggers
        this.geo = [];
        
        // Msg Variables
        this.iframe = {
            owner:"",
            source:"",
            origin:"",
            firstMsg: false,
            newMsg: false
        };
        
        // Definitors
        this.mode = !mode?"g10":mode; //g10
        this.status = 0; // 0 - loading, 1 - ready, 2 - intro, 3 - play, 4 - pause, 5 - replay, 6 - mute, 7 - questions, 8 - user action, 9 - exit
        this.permissions = {
            gyro:false,
            vr:false,
            ar:false,
            
            mic:false,
            vid:false,
            micmute:false,
            vidmute:false,
            
            gps: false,
            //no icons
            fix: false,
            msg:false,
            mute: false,
            sios: false
        };
        this.collisionGroups = {any: 1, mclickable: 2, qclickable: 4, aclickable: 8}

        // Defaults
        this.sceneEl.setAttribute('vr-mode-ui','enabled',false)       
        this.sceneEl.setAttribute('loading-screen','enabled',false)
        this.sceneEl.setAttribute('device-orientation-permission-ui','enabled',false)
        this.sceneEl.setAttribute('keyboard-shortcuts','enterVR',false)
        if (dev) this.sceneEl.setAttribute('stats',"")
        
        // Corrections
        this.corrections()
        
        // Build Overlay
        this.checkMode(this.mode)
        /*
        2D Modes
        0 - XR only                 -> movementType: none
        f - fixed (touch)           -> movementType: none
        p - pan (touch)             -> movementType: checkpoint
        g - gyro (360)              -> movementType: checkpoint
        r - route (route)           -> movementType: none
        w - walking (games)         -> movementType: free
        c - click (touch and gyro)  -> movementType: checkpoint

        XR Modes
        00 - None (2D)
        10 - locutor (mic)
        20 - maker (build)
        30 - maker encadeado (insights)
        40 - problem to solve (engineering)
        50 - viagem (card_travel) 
        
        60 - video group - lider 
        61 - video group - viewer
        62 - video group - slave (video_camera_front)
        
        70 - mic group - lider 
        71 - mic group - viewer
        72 - mic group - slave (interpreter_mode)

        80 - AR No-Cards (AR) - AFRAME (view_in_ar)

        81 - AR Marker (AR) - AR.js
        82 - AR Marker (AR) - group AR.js

        83 - AR Location (AR) - AR.js
        84 - AR Location (AR) - group AR.js

        85 - AR Cards (AR) - MINDAR.js
        86 - AR Cards (AR) - group MINDAR.js

        87 - AR Faces (AR) - MINDAR.js
        88 - AR Faces (AR) - group MINDAR.js

        90 - VR (VR)
        */
        
        if (this.inIframe()) this.msgSystem() // Load MsgSystem
        this.loadLogos() // Load Logos
        this.showIntro() // Load Intro

        // Load Assets
        this.Cache = {
           enabled: true,
           files: {},
           loading: {},
           add: function ( key, file ) {
               if ( this.enabled === false ) return;
               this.files[ key ] = file;
           },
           get: function ( key ) {
               if ( this.enabled === false ) return;
               return this.files[ key ];
           },
           remove: function ( key ) {delete this.files[ key ];},
           clear: function () {this.files = {};this.loading = {};}
        };
        this.crypto();
        this.loader(assets);
        this.oorbitComponents();
        this.loadsvgs();
        this.mod={};
        this.loading={};
        
        // Setup Cursor
        this.setupCursor();
        this.clickListener();
        
        // Setup Controllers
        this.setupControllers();
        
        // Setup turn and zoom Btns
        this.setupTurnBtn();
        
        // Actions after Scene load
        this.sceneEl.addEventListener('loaded', function () {
            console.log('scene Loaded')  
            AFRAME.scenes[0].renderer.debug.checkShaderError = true
            o.lights = document.querySelectorAll('[light]') 
            o.camera = document.querySelector('a-camera')
            o.canvas = o.sceneEl.querySelector('canvas')
            o.cameraRig = document.querySelector('#cameraRig')
            o.dim3 = document.getElementById('dim3')
            o.wires = document.getElementById('wires')
                       
            if (dev) {
                $(".rs-base").addClass("a-hidden")
                this.removeAttribute('inspector'); 
                this.setAttribute('inspector', "https://unpkg.com/aframe-inspector@1.3.x/dist/aframe-inspector.min.js");
                //o.sceneEl.components.inspector.openInspector()
                THREE.Math = THREE.MathUtils
            }
                        
            // Load AR Menu
            o.setARSystem()
            if (o.data.hasARMenu && ARstate && !jQuery.isEmptyObject(ARstate)) {
                o.translator(ARstate)
                o.loadARMenu()
            }
            
            // SetupCamera
            o.setupCamera()
            o.zoom[1] = o.camera.components.camera.camera.fov
            o.camera.setAttribute('look-controls',{
                touchEnabled: false,
                mouseEnabled: false
            })
            o.navigation()
            
            // Remove movimentação da camera se for modo fixo
            if (o.permissions.fix) o.camera.setAttribute('look-controls','enabled',false)
            
            // Load Questions
            if (questions!=null) Object.assign(o.questions, questions);
            
            // SetupEnviroment
            o.setupEnvironment();
            
            for (i==0;i<$('[ammo-body]').length;i++){
                $('[ammo-body]')[i].emit('physics')
            }

            // SetupOnline
            if (o.multi) o.setupOnline()

            // Assign Timeline
            if (timeline!=null) Object.assign(o.timeline, timeline);
            
            // Return Point
            o.registerIniState();
            
            // initial raycaster
            o.checkController();
            
            // Pause on leave
            document.addEventListener('visibilitychange',function(){
                if (!o.menu3DIsOpenOpen && o.status == 3) {
                    $('#playmsg').show();
                    o.sessionHandler("pause");
                }
            })

            document.addEventListener("keydown",(e)=>{
                if(e.key == "m"){ // m key
                    o.pauseSession();
                    o.toggleMenu(o.status<=2)
                } else if(e.key == "n"){
                    if (!o.sceneEl.components["stats"]) return
                    if($(".rs-base").hasClass("a-hidden")){
                        $(".rs-base").removeClass("a-hidden")   
                    } else {
                        $(".rs-base").addClass("a-hidden")   
                    }
                } else if(e.key == "b"){
                    //o.fadeTo("#000",'10 0 10',function(){console.log('teste')})
                } else if (e.key == "Escape"){
                    if (o.sceneEl.is("vr-mode")) o.changeMode('2d-mode')
                }
            }); 
            
            window.addEventListener("wheel", event => {
                o.setZoom(-Math.sign(event.wheelDelta), event.clientX,event.clientY)    
            })
            
            if (hide && o.status!=0) $('#mode2D').click()
        })
        this.sceneEl.addEventListener('timeout', function () {
            errorHandler('slow')
        })
           
        this.sceneEl.addEventListener('stateremoved', function (evt) {
            if (evt.detail === 'vr-mode' || evt.detail === 'ar-mode'){
                //o.changeMode('2d-mode')    
            }
            if (evt.detail === 'grabbed' || evt.detail === 'dragged'){
                if (o.sceneEl.is('2d-mode') && !o.permissions.fix) o.camera.setAttribute('look-controls','enabled',true)
            }
        })
        this.sceneEl.addEventListener('stateadded', function (evt) {
            if (evt.detail === 'grabbed' || evt.detail === 'dragged'){
                if (o.sceneEl.is('2d-mode') && !AFRAME.utils.device.isMobile()) o.camera.setAttribute('look-controls','enabled',false)   
            }
        })
        
        this.sceneEl.addEventListener("ended",function(){
            console.log('ended')
            o.sessionHandler(7)
        }, {once : true})
                  
        // Resize
        window.onresize = function () {
            o.setupTurnBtn();
            this.orientation;
            
            if (o.ARsystem[0] >= 5) {
                if (o.ARsystem[1].video) {
                    o.ARsystem[1].pause()
                    o.ARsystem[1].processingImage = false;
                    o.ARsystem[1].stop()
                    $("#ar_loading").show()
                    
                    clearTimeout(o.timeout1);
                    
                    o.timeout1 = setTimeout(()=>{
                        //o.ARsystem[1].unpause()   
                        
                        o.getARMedia()
                        
                    }, 1000);
                }
            } else if (o.ARsystem[0] == 1){
                o.arResize()
            }
            o.arResize()
        }  
    },
    update: function (oldData) {
        if (o.status<1) return
        let obj = AFRAME.utils.diff(oldData,this.data) 
        // if (obj.targets || obj.showRay) this.changeRaycaster(1)
    },
    tick: (function(){
        let position = new THREE.Vector3()
        return function(time, timeDelta){
            // pre correction
            if (o.timeline.pre!=null && this.status != 5) {
                this.timeline.pre();
                delete this.timeline.pre;
            }

            if (this.run != 0 && jQuery.isEmptyObject(this.timeline) && !jQuery.isEmptyObject(timeline)) return this.sceneEl.emit("ended")

            if (this.status == 5) {
                this.delay = time;
            } else if (this.status != 3) {
                this.delay += timeDelta;
            } else {
                this.run = time - this.delay;
            }
            //console.log('time', o.run.toFixed(0),o.delay.toFixed(0),time.toFixed(0))
            
            if (this.run != 0 && this.timeline.play!=null){
                this.timeline.play();
                delete this.timeline.play;
            }
            
            // runtime execution
            //let ti = (this.run/1000).toFixed(1)
            let ti = o.round(this.run/1000,1).toFixed(1)
            //if (dev && this.last != ti) console.log(ti, timeDelta)
            if (this.timeline[ti]!= null) {
                if (this.last != ti) {
                    this.last = ti
                    if (!this.timeline[ti]()) delete this.timeline[ti];
                }
            }
            
            // low fps warning
            //if (timeDelta)
            //console.warn('low fps',timeDelta)

            if ((document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) && $('#fsc').text()!= 'fullscreen_exit') {
                $('#fsc').text('fullscreen_exit');
            } else if (!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) && $('#fsc').text()!= 'fullscreen') {
                $('#fsc').text('fullscreen');
            }
            
            // correc menu position to camera height
            if (this.menuSphere) {
                this.menuSphere.object3D.position.copy( this.camera.object3D.position)
                if (this.fixMenu) {
                    this.menuSphere.object3D.rotation.copy(this.camera.object3D.rotation)
                }
            }
            
            // 6DOF headset start height correction
            if (this.status<3 && this.camera.object3D.position.y != 1.6 && this.camera.object3D.position.y != 0 && !this.dof6height) {
                this.cameraRig.object3D.position.y += (1.6 - this.camera.object3D.position.y);
                this.dof6height = true
            }

            // ios camera correction
            if (AFRAME.utils.device.isIOS() && o.camera && o.camera.getAttribute('position').y != 1.6){
                o.camera.setAttribute('position','0 1.6 0')             
            }
            
            // store interaction duration
            if (o.status == 7 || o.status == 8) {
                o.dur[o.dur.length-1] += timeDelta/1000;
            }
        }
    })(),
    
    //Overlay
    checkMode: function(m){
        let a = m.charAt(0)
        let b = m.charAt(1)
        let c = m.charAt(2)
        let bc = m.slice(-2);
        let arr = [];
        
        // adding IOS sound unmute
        if (AFRAME.utils.device.isIOS()) {
            arr.push('sios');
            this.permissions.mute = true;
            this.permissions.sios = false;
        }
        
        // setting media permissions
        this.permissions.mic = medias.audio;
        if (medias.video) this.permissions.vid = true;
        
        this.toggleButtons("2D")
        if (geo) {
            $('#buttons').css('opacity',0)
            $('#buttons').css('z-index',-10)
        }
        if ($('#warnings').length) AFRAME.utils.device.isMobile()?$('#warnings p').last().show():$('#warnings p').last().hide();
        
        if (geo) arr.push("gps")
        
        if (a == 'f') this.permissions.fix = true;
        if (b == 0) {
            $('#mode2D').html("Iniciar")
            if (a == "g"||a == "r"||a == "w"||a == "c"){
                arr.push("gyro")
                this.setIcons(arr,"Para efeito 360 os círculos abaixo precisam estar verdes.")
            }
            if (geo) this.setIcons(arr,"Para iniciar os círculos abaixo precisam estar verdes.")
        } 
        else if (b == 6){
            $('#multi').css('display',"flex")
            this.multi = true;
            if (master) {
                c = 0;
            } else if (userType  == 'spectator') {
                c = 1;
            } else {
                c = 2;
            }
            switch (c){
                case 0:
                    arr.push("mic","vid")
                    this.setIcons(arr,"Você é o líder do grupo,para usar áudio e vídeo os ícones abaixo precisam estar verdes.")
                break
                case 1:
                    arr.push("mic","vid")
                    this.setIcons(arr,"Você é espectador do grupo,para usar áudio e vídeo os ícones abaixo precisam estar verdes.") 
                break
                default:
                    arr.push("vr","gyro","mic")
                    this.setIcons(arr,"Para realidade virtual em grupo os círculos abaixo precisam estar verdes.")
            } 
        } 
        else if (b == 7){    
            $('#multi').css('display',"flex")
            this.multi = true;
            if (master) {
                c = 0;
            } else if (userType  == 'spectator') {
                c = 1;
            } else {
                c = 2;
            }
            switch (c){
                case 0:
                    arr.push("mic")
                    this.setIcons(arr,"Você é o líder do grupo,para usar áudio o ícone abaixo precisa estar verde.")
                break
                case 1:
                    arr.push("mic")
                    this.setIcons(arr,"Você é espectador do grupo,para usar áudio o ícone abaixo precisa estar verde.") 
                break
                default:
                    arr.push("vr","gyro","mic")
                    this.setIcons(arr,"Para realidade virtual em grupo os círculos abaixo precisam estar verdes.")
            }
        } 
        else if (b == 8){ 
            if (c == 0 || c == 1 || c == 5 || c == 7){
                arr.push("ar")
                this.setIcons(arr,"Para realidade aumentada o círculo abaixo precisa estar verde.")
            } else if (c == 2 || c == 6 || c == 8){
                $('#multi').css('display',"flex")
                this.multi = true;
                arr.push("ar","mic")
                this.setIcons(arr,"Para realidade aumentada em grupo os círculos abaixo precisam estar verdes.")
            } else if (c == 4){
                $('#multi').css('display',"flex")
                this.multi = true;
                (geo)?arr.push("ar","gyro","mic"):arr.push("ar","gyro","mic","gps");
                this.setIcons(arr,"Para realidade aumentada com GPS em grupo os círculos abaixo precisam estar verdes.") 
            } else if (c == 3){
                (geo)?arr.push("gyro","ar"):arr.push("gyro","ar","gps");
                this.setIcons(arr,"Para realidade aumentada com GPS os círculos abaixo precisam estar verdes.")
            }
        } 
        else if (bc == 10 || bc == 20 || bc == 30 || bc == 40 || bc == 50 || bc == 90){
            arr.push("gyro","vr")
            this.setIcons(arr,"Para realidade virtual os círculos abaixo precisam estar verdes.")
        }
    },
    toggleButtons: function(m){
        if (m == "2D"){
            if ($('#mode2D').is(":hidden")){
                $('#mode2D').css('display',"inline-block");
                $('#buttons').css('align-items',"center");
                this.buttonClick($('#mode2D'),"2d-mode")
            }
            return
        } else if (m == "VR"){
            if ($('#modeVR').is(":hidden")){
                $('#modeVR').css('display',"inline-block");
                this.buttonClick($('#modeVR'),"vr-mode")
            }
        } else if (m == "AR"){
            if ($('#modeAR').is(":hidden")){
                if (this.mode.charAt(2) == 0) this.sceneEl.setAttribute('vr-mode-ui',{enabled:true,enterARButton:'#modeAR'})
                $('#modeAR').css('display',"inline-block"); 
                $('#modeAR').removeClass('a-hidden');
                this.buttonClick($('#modeAR'),"ar-mode")    
            }
        } 
        this.buttonClick($('#buttonError'),"2d-mode")
        $('#mode2D').hide();
        $('#buttons').css('align-items',"baseline")
        if (mode.charAt(0) != 0) $('#buttonError').show();
    },
    setIcons: function(arr,msg) {
        if ($('#sub')[0]!=null) $('#sub').css('display', 'flex');
        this.icons = arr; 
        for (i=0;i<arr.length;i++){
            $('#'+arr[i]).css('background-color',"red");
            $('#'+arr[i]).css('display', 'flex');
            switch (arr[i]) {
                case "sios":
                    o.siosAllow()
                    $('#'+arr[i]).on("click",()=>{o.siosAllow(true)});
                break;
                case "gyro":
                    o.gyroAllow()
                    $('#'+arr[i]).on("click",()=>{o.gyroAllow()});
                break;
                case "vr":
                    o.vrAllow('vr')
                    $('#'+arr[i]).on("click",()=>{o.vrAllow('vr')});
                break;
                case "ar":
                    o.streamAllow("ar")
                    $('#'+arr[i]).on("click",(e)=>{o.streamAllow("ar",e)});
                break;
                case "mic":
                    (this.permissions[arr[i]])?o.toggleIcons(arr[i],true):o.streamAllow("mic");
                    $('#'+arr[i]).on("click",(e)=>{o.streamAllow("mic",e)});
                break;
                case "vid":
                    (this.permissions[arr[i]])?o.toggleIcons(arr[i],true):o.streamAllow("vid");
                    $('#'+arr[i]).on("click",(e)=>{o.streamAllow("vid",e)});
                break;
                case "gps":
                    //o.gpsAllow("gps")
                    $('#'+arr[i]).on("click",(e)=>{o.gpsAllow("gps",e)});
                break;
                default:
            }
        }
        if ($('#hint h4')[0]!=null) $('#hint h4').html(msg)
    },
    toggleIcons: function(icon,bol){
        if (!$('#'+icon)[0] || !$('#advice')[0]) return;
        let msg;
        let code;
        let error;
        switch (icon) {
            case "sios":
                msg = 'Auto falante liberado.';
                code = 'volume_up';
                error = 'Auto falante bloqueado.';
            break;
            case "gyro":
                msg = 'Seu giroscópio está liberado.';
                code = 'mobile_friendly';
                error = 'Giroscópio bloqueado ou inexistente.';
            break;
            case "vr":
                msg = 'É compatível com Realidade Virtual.';
                code = 'visibility';
                error = 'Não é compatível com Realidade Virtual.';
            break;
            case "ar":
                msg = 'Realidade Aumentada liberada.';
                code = 'photo_camera';
                error = 'Câmera bloqueada ou inexistente.';
            break;
            case "mic":
                msg = 'Microfone liberado.';
                code = 'mic';
                error = 'Microfone bloqueado ou desativado.';
            break;
            case "vid":
                msg = 'Câmera liberada.';
                code = 'videocam';
                error = 'Câmera bloqueada ou desativada.';
            break;
            case "gps":
                msg = 'Seu local está liberado.';
                code = 'my_location';
                error = 'GPS bloqueado ou inexistente.';
            break;
            default:
        }
        if (bol) {
            $('#'+icon).html(code);
            $('#'+icon).css('background-color','forestgreen');
            if (!(icon == 'vid' || icon == "mic")) {
                $('#'+icon).off("click");
                $('#'+icon).on("click",()=>{ $('#advice').html(msg)});
                this.permissions[icon] = true;
            } else if (this.permissions[icon+'mute']){
                if (typeof getLocalMedia === "function") getLocalMedia(icon)
            }
            $('#advice').html(msg)
        } else {
            $('#'+icon).css('background-color',"red");
            $('#advice').html(error)
            if (icon == 'vid' || icon == "mic") {
                $('#'+icon).html(code+"_off");
                if (!localStream) return
                let tracks = (icon=='vid')?localStream.getVideoTracks():localStream.getAudioTracks();
                tracks.forEach(function(track) {
                    track.stop();
                });
            }
        }
        if(this.permissions.gyro && this.permissions.vr) this.toggleButtons("VR")
        if(this.permissions.ar) this.toggleButtons("AR")
    },    
    gyroAllow: function() {
        window.addEventListener("devicemotion", function(event){
            if(event.rotationRate.alpha || event.rotationRate.beta || event.rotationRate.gamma) {
                o.permissions.gyro = true;
            }
        });
        if (window.DeviceMotionEvent && typeof window.DeviceMotionEvent.requestPermission === 'function'){
            DeviceMotionEvent.requestPermission().then(response => {
                if (response == 'granted') o.toggleIcons("gyro",true)
            }).catch(function(error){o.toggleIcons("gyro")})
        } else {
            if (AFRAME.utils.device.isMobile()){
                (!window.DeviceMotionEvent)?o.toggleIcons("gyro"):o.toggleIcons("gyro",true);
            } else {
                if(this.permissions.vr || AFRAME.utils.device.checkHeadsetConnected()){
                    o.vrAllow("gyro")
                } else {
                    o.toggleIcons("gyro");
                }
            }
        }
    },
    vrAllow: function(icon) { 
        if ("xr" in window.navigator) {
            if (navigator.xr.isSessionSupported) {
                navigator.xr.isSessionSupported('immersive-vr').then(
                    function(supported){(AFRAME.utils.device.checkHeadsetConnected())?o.toggleIcons(icon,true):o.toggleIcons(icon)}).catch( 
                    function(error){o.toggleIcons(icon)}
                );
            } else if (navigator.xr.supportsSession) {
                navigator.xr.supportsSession('immersive-vr').then(
                    function(supported){(AFRAME.utils.device.checkHeadsetConnected())?o.toggleIcons(icon,true):o.toggleIcons(icon)}).catch(
                    function (error){o.toggleIcons(icon)}
                );
            }   
        } else {
            navigator.getVRDisplays().then(displays => (displays.length > 0)?o.toggleIcons(icon,true):o.toggleIcons(icon)) 
        }        
    },
    siosAllow: function(bol){
        if (!bol) return this.toggleIcons('sios')
        if (!this.permissions.mute) {
            this.toggleIcons('sios',true)
        } else {
            this.sessionHandler('mute')
            this.toggleIcons('sios',true)
            this.permissions.sios = true;
        }
    },
    streamAllow: function(icon,e){
        if (this.permissions[icon] && icon != "ar"){ 
            o.toggleIcons(icon,this.permissions[icon+'mute'])
            this.permissions[icon+'mute'] = !this.permissions[icon+'mute']
            return
        } else {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return o.toggleIcons(icon)
            o.checkDevicesPermission(icon)
        }
    }, // ok 
    checkDevicesPermission: async function(icon){
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        let bol;
        for (i=0;i<mediaDevices.length;i++){
            let type = "audioinput"
            if (icon != "mic") type = "videoinput"
            if (mediaDevices[i].kind != type) continue;
            //if (!(!mediaDevices[i].deviceId || mediaDevices[i].deviceId == '')) 
            bol = true;
        }
        if (bol) {
            if (typeof getLocalMedia === "function") getLocalMedia(icon)
            // if camera is available, wait to accept
            if (icon == "ar") {
                o.getARMedia()
                o.pauseload('Libere a câmera para AR');
                //o.sessionHandler(1);
                return o.toggleIcons(icon) 
            } 
        } else {
            // if ar work in 2D
            if (icon == "ar") {
                o.sceneEl.addEventListener('loaded', function () {
                    o.sceneEl.emit('arReady')
                    //$('#sub').hide()
                },{once:true});
            }
            return o.toggleIcons(icon)
        }
    }, // ok
    pauseload: function(msg){
        $('#circle-loader').hide();
        $('#progress-bar p').hide();
        $('#ebar i').html('error_outline');
        $('#ebar i').removeClass("rotate90");
        $('#ebar i').css('color','yellow');
        $('#loading-msg').html(msg);
    },
    resumeload: function(msg){
        $('#circle-loader').show();
        $('#progress-bar p').show();
        $('#ebar i').html('arrow_circle_up');
        $('#ebar i').addClass("rotate90");
        $('#ebar i').css('color','#F6F5F9');
        $('#loading-msg').html(msg);
    },
    gpsAllow: function(){
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(supported){
                    o.toggleIcons("gps",true)
                    $('#buttons').css('opacity',1)
                    $('#buttons').css('z-index',1)
                    o.geo.push(supported.coords.latitude)
                    o.geo.push(supported.coords.longitude)

                    o.sceneEl.emit('gpsReady')

                    if (o.geo.length == 0 || geo) o.geo.push(o.geolocate(supported))

                    if (o.ARsystem[0] == 1){
                        o.camera.setAttribute('gps-new-camera',{
                            gpsMinDistance:5,
                            positionMinAccuracy:5e3,
                        })
                        /*o.camera.setAttribute('gps-camera',{
                            gpsMinDistance:5,
                            positionMinAccuracy:5e3,
                        })*/
                    }
                },
                function(error){
                    console.log(3,error)
                    o.toggleIcons("gps")
                });
          } else {
            o.toggleIcons("gps")
          }    
    },
    buttonClick(el,mode){
        el[0].addEventListener("click",function(e){
            if (AFRAME.utils.device.isIOS() && !o.permissions.sios) {
                e.target.style.color = "#F6F5F9";
                e.target.style.backgroundImage = "linear-gradient(to bottom , #493889, #7963ba, #493889)";
                e.target.removeEventListener("click",function(){})
                o.buttonClick([e.target],mode)
                return
            }
            if (o.status != 1) return
            if (o.multi) {
                $('#loader').empty();
                $('#av-pick').attr("mode",mode)
                $('#av-pick').css('display','flex');  
                return
            }
            $('a-scene canvas').hide()
            
            $('#overlay').fadeOut("slow");
            setTimeout(()=>{
                $('#overlay').hide();    
            },500)
            
            
            o.changeMode(mode);
            if (!hide){
                //o.openFullscreen()
                //screen.orientation.lock("landscape").then((v)=>{}, (m)=>{});
                o.startMedia();
            }
            o.tryKeepScreenAlive(10);
            o.sessionHandler(2)
            
            // ground physics correction
            if (o.econtrol && o.econtrol.getAttribute('econtrol').groundPhysics) {
                let ground = o.econtrol.components.econtrol.ground;
                if (ground.components['ammo-body'].isLoaded){
                    ground.removeAttribute('ammo-shape')
                    ground.setAttribute('ammo-shape','type','mesh')    
                } else {
                    o.econtrol.addEventListener('body-loaded',function(){
                        ground.removeAttribute('ammo-shape')
                        ground.setAttribute('ammo-shape','type','mesh')      
                    })   
                }
            }
        },{once:true})
    },
    changeMode: function(mode){
        if (this.status == 3) {
            this.pauseSession();
            $('#playmsg').show();
        }
        mode = mode.toLowerCase()
        $('#oo').hide()
        $('#zoom-btn').hide();
        $('ar').hide();
        $('#ar_slider').hide();
        $('#playmsg').css('top','13px');
        
        //removing states
        if (o.sceneEl.is('2d-mode')) {
            o.sceneEl.removeState("2d-mode")
        }
        else if (o.sceneEl.is('ar-mode')) {
            o.unloadAR()
            o.sceneEl.removeState("ar-mode")
        }
        else if (o.sceneEl.is('vr-mode')) {            
            this.screenMsg('Retire o seu óculos.')
            setTimeout(function(){
                o.fadeTo('#000')
                o.sceneEl.exitVR() 
                o.sceneEl.removeState("vr-mode")
                o.deleteSphere()
                o.return2D()
                //if (o.data.hasARMenu && !o.data.hasIntro) $('ar').css('display','flex')
                o.logo2d(true)
                o.toggleZoom(true)
                o.setZoom(null,0,0)
                o.zoom[1] = o.camera.components.camera.camera.fov
            },5000)
            return
        }
        
        this.fadeTo('#000')
        
        //adding states
        if (mode == "2d-mode"){
            this.return2D()          
            if (!this.data.hasIntro) o.showARMenu()
        } 
        else if (mode == "ar-mode") {
            o.canvas.style.backgroundColor = "transparent";
            o.loadAR()
            
            // hide 2d menu
            if (o.menu2DIsOpen) o.overlayMenu();
            
            o.sceneEl.addState('ar-mode')   
            
            this.toggleZoom(false)
             
            if (!this.data.hasIntro) o.showARMenu()
            o.showARSlider('AR',true)
        } 
        else if (mode == "vr-mode") {
            o.sceneEl.enterVR() 
            o.sceneEl.addState('vr-mode')
            if (!o.data.hasIntro) o.toggleMenu(o.status<=2);
            if (o.menu2DIsOpen) o.overlayMenu();
            this.logo2d(false)
            this.toggleZoom(false)
        }
        o.checkController()
        this.setZoom(null,0,0)
        this.zoom[1] = o.camera.components.camera.camera.fov;
    },
    return2D: function(){
        if(this.permissions.gyro && this.permissions.vr) {
            $('#oo').text('VR')
            $('#oo').show()
            o.showARSlider('VR')
            $('#playmsg').css('top','-8px');
        } else if(this.permissions.ar) {
            $('#oo').text('AR')
            $('#oo').show() 
            o.showARSlider('AR')
            $('#playmsg').css('top','-8px');
        }
        o.canvas.style.backgroundColor = o.data.menuColor;//'#D0D0D0'
        o.sceneEl.addState("2d-mode")
        if (this.menu3DIsOpen) o.toggleMenu(o.status<=2);
        if (!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement)) $('#fsc').text('fullscreen');
        if (!this.menu2DIsOpen && !this.data.hasIntro) o.overlayMenu();
        
        //msg system
    },
    showARSlider: function(mode,bol){
       if ($('#ar_slider')[0]){
            $('#ar_slider p:last-child').text(mode);
            $('#ar_slider p')[0].className = "active";
            $('#ar_slider p')[1].className = "notactive";
            $('#ar_slider input')[0].checked = bol;
            $('#ar_slider').show()
        } 
    },
    showARMenu: function(){
        if (o.data.hasARMenu) {
            $('ar').css('display','flex')
            if (ARstate && !jQuery.isEmptyObject(ARstate)) {
                o.translator(ARstate)
                o.loadARMenu()
            }
        }
        if (o.status > 1) {
            this.logo2d(true)
            if (o.sceneEl.is('2d-mode')) this.toggleZoom(true)
        }
    },
    geolocate: async function (supported) {
        // https://aws.amazon.com/pt/location/pricing/
        // 0,50 USD por 1.000
        
        //geoapify - 3000 req per day free
        //add http header
        
        var requestOptions = {method: 'GET'};
        fetch("https://api.geoapify.com/v1/geocode/reverse?lat="+supported.coords.latitude+"&lon="+supported.coords.longitude+"&apiKey=fe9622d69c60445ab53b8d97dd7c0423", requestOptions)
        .then(response => response.json())
        .then(result => o.geo.push(result))
        .catch(error => console.log('error', error));
        
        /*
        try {
            const geocode = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`);
            console.log(geocode)
            
            //const geocode = await fetch(`https://geocode.xyz/${position.coords.latitude},${position.coords.longitude}?json=1`);
            //o.geo = await geocode.json();
        } catch (error) {
            console.loog('erro',error)
            // bloco de tratamento do erro
        } finally {
          // bloco de código que sempre será executado após
          // o bloco try, independentemente de sua conclusão
          // ter ocorrido normalmente ou ter sido interrompida
        }
        */
    }, // ok
    
    //Menus
    overlayMenu: function(){
        if (!this.data.has2DMenu || this.data.hasARMenu) return
        if (!this.menu2DIsOpen){
            $("#overlay-menu").css('display',"flex")
            $("#overlay-menu i").on('click', function(e){
                if (!o.sceneEl.is("2d-mode")) return
                if (e.target.id == "oo") {
                    o.changeMode(e.target.innerHTML+"-mode")
                } else if (e.target.id == "fsc"){
                    if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement ) {
                        //o.sceneEl.exitFullscreen();
                        o.closeFullscreen()
                        $(this).text('fullscreen');
                    } else {
                        //o.sceneEl.requestFullscreen(o.sceneEl.canvas);
                        o.openFullscreen()
                        $(this).text('fullscreen_exit');
                    }
                } else {
                    o.sessionHandler(e.target.id);
                } 
            });
        } else {
            $("#overlay-menu").hide()
            $("#overlay-menu i").off("click")
        }
        this.menu2DIsOpen = !this.menu2DIsOpen;
    }, 
    toggleMenu: function(first){
        if (!this.data.has3DMenu) return
        if (!this.menu3DIsOpen){
            let s = this.initiateSphere()
            if (first){
                s.appendChild(this.createText(modName, "center",0.025,"infinity", this.data.textColor,"0 0.12 -0.4","0 0 0")) 
                s.appendChild( this.createButton(0.25,0.05,0.025, this.data.buttonColor,this.data.buttonDetailColor,"0 0.04 -0.4","mclickable","Iniciar",0.025,()=>{this.sessionHandler('play')}));
                //s.appendChild( this.createButton(0.1,0.04,0.02,'red',this.data.buttonDetailColor,"0 -0.04 -0.4","mclickable","Sair",0.025,()=>{this.changeMode('2d-mode')}));
            } 
            else {
                if (!this.end) {
                    s.appendChild(this.createButton(0.15,0.03,0.015, this.data.buttonColor, this.data.buttonDetailColor,"0 0.02 -0.4","mclickable","Continuar",0.015,()=>{this.sessionHandler('play')}));
                }
                s.appendChild( this.createButton(0.15,0.03,0.015,  this.data.buttonColor,this.data.buttonDetailColor,"0 -0.02 -0.4","mclickable","Repetir",0.015,()=>{this.sessionHandler('replay')}));
                s.appendChild( this.createButton(0.06,0.03,0.015, this.data.buttonColor,this.data.buttonDetailColor,"-0.045 -0.06 -0.4","mclickable","Sair",0.015,()=>{this.sessionHandler('exit')})); 
                s.appendChild( this.createButton(0.06,0.03,0.015, this.data.buttonColor,this.data.buttonDetailColor,"0.045 -0.06 -0.4","mclickable","2D",0.015,()=>{this.changeMode('2d-mode')}));
            } 
            o.cameraRig.appendChild(s)
        } else {
            this.deleteSphere();
        }
        this.menu3DIsOpen = !this.menu3DIsOpen;
        this.changeTargetClass();
    },
    initiateSphere: function(op=1){
        if (this.menuSphere) {
            this.menuSphere.parentNode.removeChild(this.menuSphere);
            this.menuSphere = null;
        }
        let s = document.createElement('a-sphere');
        s.setAttribute('segments-height',9);
        s.setAttribute('segments-width',18);
        s.setAttribute('radius',1);
        s.setAttribute('radius',1);
        s.setAttribute('rotation',"0 "+o.camera.getAttribute("rotation").y+" 0");
        s.setAttribute('hoverable',"");
        s.setAttribute('material',{
            color: this.data.menuColor,
            side: "double",
            transparent: true,
            opacity: op
        });
        s.setAttribute('shader',"flat") 
        if (op==1){
            Array.prototype.forEach.call(o.lights, function( node ) {node.object3D.visible = false});
            this.wires.object3D.visible = false;
            this.dim3.object3D.visible = false;
            if (this.econtrol) this.econtrol.object3D.visible = false;
        }
        let light = document.createElement('a-entity');
        light.setAttribute("position","0 0.4 0")
        light.setAttribute("light",{
            type: "point",
            color: "#FFF",
            intensity: 2
        })
        s.appendChild(light)
        this.menuSphere = s;
        return s;
    },
    deleteSphere: function(){
        if (this.menuSphere) this.menuSphere.parentNode.removeChild(this.menuSphere);
        Array.prototype.forEach.call(o.lights, function( node ) {node.object3D.visible = true});
        this.wires.object3D.visible = true;
        this.dim3.object3D.visible = true;
        if (this.econtrol) this.econtrol.object3D.visible = true;
        this.menuSphere = null;    
    },
    toggleZoom: function(bol){
        if (this.data.hasIntro) return;
        if (!this.data.hasZoom) return;
        (bol)?$('#zoom-btn').css('display','flex') :$('#zoom-btn').hide();
        if (this.data.hasARMenu) {
            if ($('ar main').css('right') == '0px') {
                $('#zoom-btn').css('right','176px');    
            } else {
                $('#zoom-btn').css('right','5px');
            }
            $('#zoom-btn').css('flex-direction','column')     
            $('#zoom-btn').css('justify-content','') 
            $('#zoom-btn').css('width','36px')
        } 
        else if (this.data.has2DMenu){
            $('#zoom-btn').css('right','calc(50% - 160px/2)');
            $('#zoom-btn').css('flex-direction','row')     
            $('#zoom-btn').css('justify-content','space-around') 
            $('#zoom-btn').css('width','160px') 
        }
    },  
    
    //Msg System - Revisar
    inIframe: function () {
        if (CONFIG.iframe && dev) return o.permissions.msg = true;
        try {
            o.permissions.msg = (window.self !== window.top);
        } catch (e) {
            o.permissions.msg = true;
        }
        return o.permissions.msg
    }, // ok
    msgSystem: function(){
        if (ARstate && ARmsg) {
            Object.assign(ARmsg.simulation,ARstate.simulation)
            o.translator(ARstate)
        }
        window.addEventListener("message", function(e){
            if (!modName) return
            if(!e.origin.includes(pass) && !dev) return
            o.iframe.origin = e.origin;
            o.iframe.source = e.source;
            if (!o.iframe.firstMsg){
                o.iframe.firstMsg = true
                ARstate = JSON.parse(e.data)
                ARmsg.simulation.type = ARstate.simulation.type
                ARmsg.simulation.status = ARstate.simulation.status
                o.sendMsg(ARstate)
                o.translator(ARstate)
                o.loadARMenu()
            } else {
                ARstate = JSON.parse(e.data)
                o.iframe.newMsg = true;
                if (ARstate.simulation.status == "stopped" && o.status==3) o.sessionHandler("pause")
                if (ARstate.simulation.status == "running" && !o.status==3) {
                    ARmsg.simulation.status ="stopped";
                    ARstate.simulation.status ="stopped";
                    o.sendMsg(ARmsg)
                }
            }
        });
    },
    sendMsg: function(json){
        // window.parent.postMessage( JSON.stringify(json),parent)
        //window.parent.postMessage( JSON.stringify(json),window.parent.location.origin)
        console.log('sending msg',JSON.stringify(json))
        if (!this.iframe.source) return
        this.iframe.source.postMessage(JSON.stringify(json),this.iframe.origin)
    },
    translator: function(sta){
        this.translated = {}
        let path = []
        o.iterateObj(sta,path);
        
        // inform oorbit that a new translation arrived
        o.iframe.newMsg = true;
    }, // ok
    iterateObj: function(obj,path){
        Object.keys(obj).forEach(function(item){  
            if (obj[item] && obj[item].constructor && obj[item].constructor.name === "Object") {
                path.push(item)
                o.iterateObj(obj[item],path)
            } else {
                let arr = [...path]
                if (arr.at(-1) == 'inputs' || arr.at(-1) == 'outputs') o.translated[item] = arr
            }
        })
        let gr = path.at(-1)
        path.pop()
        o.translated[gr] = [...path]
    }, // ok  
    getObj: function(obj,key){
        let x = this.translated[key];
        if (!x) return
        switch (x.length){
             case 1:
                return obj[x[0]][key]
                break
            case 2:
                return obj[x[0]][x[1]][key]
                break
            case 3:
                return obj[x[0]][x[1]][x[2]][key]
                break
            case 4:
                return obj[x[0]][x[1]][x[2]][x[3]][key]
                break
            case 5:
                return obj[x[0]][x[1]][x[2]][x[3]][x[4]][key]
                break
            case 6:
                return obj[x[0]][x[1]][x[2]][x[3]][x[4]][x[5]][key]
                break
            case 7:
                return obj[x[0]][x[1]][x[2]][x[3]][x[4]][x[5]][x[6]][key]
                break
            default:
                return obj[key]
        }
    }, 
    setObj: function(obj,key,val,length){
        // obj to be set
        // key of the obj to be set
        // val of the key. Can be a value or an obj
        let y = this.translated[key];
        if (!y) return null
        let x = []
        if (length) {
            for (i=0;i<length;i++){
                x.push(y[i])        
            }    
        } else {
            x = y;
        }
        switch (x.length){
            case 1:
                res = obj[x[0]];
                break
            case 2:
                res = obj[x[0]][x[1]];
                break
            case 3:
                res = obj[x[0]][x[1]][x[2]];
                break
            case 4:
                res = obj[x[0]][x[1]][x[2]][x[3]];
                break
            case 5:
                res = obj[x[0]][x[1]][x[2]][x[3]][x[4]];
                break
            case 6:
                res = obj[x[0]][x[1]][x[2]][x[3]][x[4]][x[5]];
                break
            case 7:
                res = obj[x[0]][x[1]][x[2]][x[3]][x[4]][x[5]][x[6]];
                break
            default:
                res = obj;
        }
        // if key is obj, set val to specific key only
        if (typeof res[key] === 'object' && !Array.isArray(res[key]) && res[key] !== null){
            Object.assign(res[key],val);
        } 
        // if val is obj, set val only.
        else if (typeof val === 'object' && !Array.isArray(val) && val !== null){
            res[key] = val.value;
        } 
        else {
            res[key] = val;       
        }
        return res[key]
    }, // ok
    setEvt: function(obj,key,val){
        if (!ARstate || !ARmsg) return
        
        // update ang get new value
        let res = o.setObj(obj,key,val);
        
        let arr = o.translated[key];
        // define tag and type (builtin or external)
        let _obj = {name: key,type: arr[2]}
        
        if (res == null) {
            return console.warn(key+' not defined')    
        }
        else if (typeof res === 'object' && !Array.isArray(res)){
            Object.assign(_obj,res)
        }
        else {
            _obj.value = res;
        }
        
        // prepare msg obj
        ARmsg[arr[0]][arr[1]].push(_obj)
        if (this.permissions.msg) o.sendMsg(ARmsg)
        ARmsg[arr[0]][arr[1]] = []; 
        
        o.iframe.newMsg = true;
        
    }, // ok

    //Assets
    loader: function (assets) {       
        // adding assets
        if (!$('a-assets').length) $('a-scene').prepend('<a-assets timeout="10000"></a-assets>')      
        if (!jQuery.isEmptyObject(assets)){
            for (const type in assets) {
                for (const id in assets[type]) {
                    if (Array.isArray(assets[type][id])) {
                        o.addAsset(type,id,assets[type][id][0],assets[type][id][1])
                    } else {
                        o.addAsset(type,id,assets[type][id])
                    }
                }   
            }
        }
        
        if (!$('a-assets').length) return o.updateBar(0,1)
        var assets = $('a-assets')[0].querySelectorAll('audio, video, img, a-asset-item');
        let p = 0;
        let a = assets.length;
        // wait environment to load
        if ($("script[src*='environment']")[0] != null && this.sceneEl!=null && !jQuery.isEmptyObject(environment)) {
            a++;
            this.sceneEl.addEventListener('econtrolloaded', (e) => {p = o.updateBar(p,a,e)},{once:true});
        }
        // wait gps to load
        if (mode.charAt(2) == 3 || mode.charAt(2) == 4 || geo){
            a++;
            this.sceneEl.addEventListener("gpsReady", (e) => {p = o.updateBar(p,a)},{once:true});
            this.sceneEl.addEventListener('gpsError', (e) => {/*errorHandler('gps')*/});    
        }
        // wait AR to load
        if (mode.charAt(1) == 8) {
            a++;
            this.sceneEl.addEventListener("arReady", (e) => {
                if ((mode.charAt(2) == 3 || mode.charAt(2) == 4) && !o.permissions.gps) {
                    o.pauseload('Libere o gps para localização');
                    o.gpsAllow("gps")
                } else {
                    o.resumeload('Carregando nova órbita');
                }
                p = o.updateBar(p,a);
            },{once:true});
            this.sceneEl.addEventListener('arError', (e) => {/*errorHandler('ar')*/
            });
        } 
        else if (geo){
            o.pauseload('Libere o gps para localização'); 
            o.gpsAllow("gps")
        }
        
        // wait model entities to load
        let entities = this.el.sceneEl.querySelectorAll('[gltf-model], [gltf-submodel]');
        if (entities.length>0) {
            for (var i = 0; i < entities.length; i++) {
                a++
                entities[i].addEventListener('model-loaded', (e) => {p = o.updateBar(p,a,e)},{once:true});
            }
        }
        
        if (a==0) this.updateBar(0,1)        
        for (var i = 0; i < assets.length; i++) {
            if (assets[i].localName == 'a-asset-item'){
                assets[i].addEventListener('loaded', (e) => {p = o.updateBar(p,a,e)},{once:true});
            } else if (assets[i].localName == 'video' || assets[i].localName == 'audio'){ 
                assets[i].load();
                assets[i].addEventListener('canplaythrough', (e) => {p = o.updateBar(p,a,e)},{once:true}); 
                o.media.push(assets[i])
            } else if (assets[i].localName == 'img'){  
                assets[i].addEventListener('load', (e) => {p = o.updateBar(p,a,e)},{once:true});
            }
        };
        for(i=0;i<$('[sound]').length;i++){
            this.media.push($('[sound]')[i])   
        }
        for(i=0;i<$('a-sound').length;i++){
            this.media.push($('a-sound')[i])   
        }
    },
    addAsset: function(type,id,asset,url) {
        let el;
        if (asset.charAt(0) == '.') asset = id+asset;
        if (url && url.includes('generic')) url = path+mod+url+"/"+asset;
        switch (type) {
            case 'models':
                el = document.createElement('a-asset-item')
                el.setAttribute('src', url || path+mod+"assets/model/"+asset)
                break
            case 'audios': 
            case 'videos':
                el = document.createElement(type.slice(0, -1))
                el.setAttribute('src', url || path+mod+"assets/"+type.slice(0, -1)+"/"+asset)
                break
            case 'minds':
                if (id.length == 6) {
                    id = 1
                } else {
                    id = id.substr(5);    
                }
                o.sceneEl.setAttribute('mindar-image',{
                    imageTargetSrc: url || path+mod+"assets/mind/"+asset,
                    maxTrack: id
                })
                break
            case 'imgs':
            case 'lmaps':
                el = document.createElement('img')
                el.setAttribute('src', url || path+mod+"assets/imgs/"+asset)
                break
            default:
        }
        if (!el) return 
        el.id = id
        if (el) $('a-assets')[0].insertBefore(el,$('a-assets')[0].firstChild);
    }, 
    updateBar: function (p,a,e) { 
        if (!$('#ebar')[0] || error) return
        p += 1/a*100; 
        $('#ebar').css('width',p+'%')
        if (p >= 99.9){
            p = 100;
            $('#ebar').css('width',p+'%')
            $('#ebar i').removeClass('rotate90');
            $('#circle-loader').hide();
            $('#ebar i').html('check_circle_outline');
            $('#ebar i').css('top',"2.8px");
            $('#ebar i').css('color','greenyellow');
            $('#loading-msg').html('Tudo Pronto!');
            
            o.sceneLoaded(()=>{
                o.sessionHandler(1);
                if (hide) return $('#mode2D').click();
                if (!geo) {
                    $('#buttons').css('opacity',1)
                    $('#buttons').css('z-index',1)
                }
            })
            
        }  
        if (!ARstate || !ARmsg || !this.permissions.msg) return p
        ARmsg.simulation.loading = p/100
        ARstate.simulation.loading = p/100
        if (o.iframe.firstMsg || dev) o.sendMsg(ARmsg)
        return p
    }, // ok
    loadsvgs: function(symbol){
        this.happy = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" height="480" width="480"><path fill="forestGreen" d="M31.3 21.35q1.15 0 1.925-.775Q34 19.8 34 18.65t-.775-1.925q-.775-.775-1.925-.775t-1.925.775q-.775.775-.775 1.925t.775 1.925q.775.775 1.925.775Zm-14.6 0q1.15 0 1.925-.775.775-.775.775-1.925t-.775-1.925q-.775-.775-1.925-.775t-1.925.775Q14 17.5 14 18.65t.775 1.925q.775.775 1.925.775Zm7.3 13.6q3.3 0 6.075-1.775Q32.85 31.4 34.1 28.35h-2.6q-1.15 2-3.15 3.075-2 1.075-4.3 1.075-2.35 0-4.375-1.05t-3.125-3.1H13.9q1.3 3.05 4.05 4.825Q20.7 34.95 24 34.95ZM24 44q-4.1 0-7.75-1.575-3.65-1.575-6.375-4.3-2.725-2.725-4.3-6.375Q4 28.1 4 23.95q0-4.1 1.575-7.75 1.575-3.65 4.3-6.35 2.725-2.7 6.375-4.275Q19.9 4 24.05 4q4.1 0 7.75 1.575 3.65 1.575 6.35 4.275 2.7 2.7 4.275 6.35Q44 19.85 44 24q0 4.1-1.575 7.75-1.575 3.65-4.275 6.375t-6.35 4.3Q28.15 44 24 44Zm0-20Zm0 17q7.1 0 12.05-4.975Q41 31.05 41 24q0-7.1-4.95-12.05Q31.1 7 24 7q-7.05 0-12.025 4.95Q7 16.9 7 24q0 7.05 4.975 12.025Q16.95 41 24 41Z"/></svg>';

        this.sad = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" height="480" width="480"><path fill="red" d="M31.3 21.35q1.15 0 1.925-.775Q34 19.8 34 18.65t-.775-1.925q-.775-.775-1.925-.775t-1.925.775q-.775.775-.775 1.925t.775 1.925q.775.775 1.925.775Zm-14.6 0q1.15 0 1.925-.775.775-.775.775-1.925t-.775-1.925q-.775-.775-1.925-.775t-1.925.775Q14 17.5 14 18.65t.775 1.925q.775.775 1.925.775Zm7.3 5.8q-3.35 0-6.075 1.875T13.9 34h2.65q1.1-2.1 3.125-3.25t4.375-1.15q2.35 0 4.325 1.15T31.5 34h2.6q-1.25-3.1-4-4.975-2.75-1.875-6.1-1.875ZM24 44q-4.1 0-7.75-1.575-3.65-1.575-6.375-4.3-2.725-2.725-4.3-6.375Q4 28.1 4 23.95q0-4.1 1.575-7.75 1.575-3.65 4.3-6.35 2.725-2.7 6.375-4.275Q19.9 4 24.05 4q4.1 0 7.75 1.575 3.65 1.575 6.35 4.275 2.7 2.7 4.275 6.35Q44 19.85 44 24q0 4.1-1.575 7.75-1.575 3.65-4.275 6.375t-6.35 4.3Q28.15 44 24 44Zm0-20Zm0 17q7.1 0 12.05-4.975Q41 31.05 41 24q0-7.1-4.95-12.05Q31.1 7 24 7q-7.05 0-12.025 4.95Q7 16.9 7 24q0 7.05 4.975 12.025Q16.95 41 24 41Z"/></svg>';
        
        this.moon = 'data:image/svg+xml;utf8,<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 56 56" style="enable-background:new 0 0 56 56;" xml:space="preserve"><path fill="LightYellow" d="M46.369,28.793c-11.852,5.935-26.271,1.138-32.206-10.714c-2.748-5.488-3.191-11.524-1.702-17.016 C1.197,7.236-3.255,21.263,2.544,32.844C8.479,44.696,22.898,49.493,34.75,43.558c6.364-3.187,10.69-8.821,12.417-15.19 C46.903,28.513,46.64,28.658,46.369,28.793z"/></svg>';
                
        this.cloud = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAADAFBMVEUAAADp7O7j5+nt8PHn6+zk6On////h5efU2t3////////29/j////////////////9/f3W3N74+fn////////19vf+/v7////4+fn6+vv////+/v7////7/Pz////V293z9PX////////w8vPw8vP5+vrV297////9/f3+/v7////4+frw8vPy9PX////////x8vPm6uv////3+Pj8/Pz3+Pnt8PHX3d/3+Pjq7e7+/v7l6erW3N7n6uv9/f37/PzV29729/jq7e7r7u/3+Pn3+Pj+///9/f3w8vPu8PHV29329/jX3N/w8vPX3N/09fbt7/H+/v7f4+br7u/////s7u/+/v7m6uv19vfW297n6uzO1djW3N/X3d/U2t39/f3V297s7u/X3d/3+Pj9/v7l6erj5+j+/v709fbd4uTX3N/i5ujY3eD09fXv8fLe4+Xo6+zm6evo6+ze4+X9/f3b4OP5+vr////W3N7l6Orh5efq7e7i5uju8PHU2tzh5efW3N7s7/DX3d/X3d/9/f77/Pzs7vDZ3uH+/v7m6uva4OLl6evX3N/W3N7y9PTf4+b+///3+PjY3eDd4eTz9fXW297O1djn6uzU2t3V297N1Nf////m6evb4OLi5ufb4OPU2t3g5Ob09vbQ19rj5+j3+Pjn6uzt7/Hs7u/w8vP9/v7////P1djz9fX09fbT2dz5+vrT2dzn6uvy9PXc4ePh5efe4uTx8/P29/j29/fz9PXN1Nfm6uvQ19rl6Onp7O3U2tzY3eDb4OLs7/DR19rg5ObT2dzP1dj5+vrX3N/X3N/k5+nN1Nfg5Obw8vPi5ujW2974+fnu8PHe4+X09vb09vbh5ef19vfb4OLW3N7c4ePS2Nv+///Z3uDf4+X3+PjW297v8fL29/fY3eDz9PXx8/Th5ujz9fXh5efm6evx8/TW3N/19vfb4OLq7e7f4+X29/js7/Dd4uTT2dv5+vrf4+bu8PH////m6ev29/f39/jZ3uDj5ujj5+n19vf5+vqvHALMAAAA/nRSTlMAAgYECAOzCg67vwvPx7eu4REQy8MO2Kf5E6vce/HSFdOjf9njGhmQa3eLFt7OlZ3JvJkv6P7YKynG5JwcwE30eSXgzjMh1WHFzn/aI+gn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';
        
        this.iconHead = '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="-8 -8 40 40"><circle cx="-13" cy="12" r="16" fill="none" stroke="'+this.colorToRGB(this.data.loadingColor)+'" stroke-width="3" stroke-linecp="round" transition="stroke-dashoffset 1s linear" stroke-dasharray="565.48" transform="scale(-1,-1) translate(0,-24)"';
        
        this.iconPath = "M18.536 7.555c-1.188-.252-4.606-.904-5.536-1.088v-3.512c0-1.629-1.346-2.955-3-2.955s-3 1.326-3 2.955v7.457c-.554-.336-1.188-.621-1.838-.715-1.822-.262-3.162.94-3.162 2.498 0 .805.363 1.613 1.022 2.271 3.972 3.972 5.688 5.125 6.059 9.534h9.919v-1.748c0-5.154 3-6.031 3-10.029 0-2.448-1.061-4.157-3.464-4.668zm.357 8.022c-.821 1.483-1.838 3.319-1.891 6.423h-6.13c-.726-3.82-3.81-6.318-6.436-8.949-.688-.686-.393-1.37.442-1.373 1.263-.006 3.06 1.884 4.122 3.205v-11.928c0-.517.458-.955 1-.955s1 .438 1 .955v6.948c0 .315.256.571.572.571.314 0 .57-.256.57-.571v-.575c0-.534.49-.938 1.014-.833.398.079.686.428.686.833v1.273c0 .315.256.571.571.571s.571-.256.571-.571v-.83c0-.531.487-.932 1.008-.828.396.078.682.424.682.828v1.533c0 .315.256.571.571.571s.571-.256.571-.571v-.912c0-.523.545-.867 1.018-.646.645.305 1.166.932 1.166 2.477 0 1.355-.465 2.193-1.107 3.354z";
    }, // ok
        
    //Cursor
    setupCursor: function(){
        if (dev) console.log("Cursor initiated")
        
        let pair = ['lhand','rhand']
        for (i=0;i<pair.length;i++){
            let cursor = document.createElement('a-entity')
            cursor.setAttribute('class',"ignore-ray")     
            cursor.setAttribute('geometry',{
                primitive: 'box',
                width: 0.015,
                height: 0.015,
                depth: 0.015,
            })
            cursor.setAttribute('material',{
                opacity:0,
                alphaTest: 0.3
            })
            cursor.setAttribute('ammo-body',{
                emitCollisionEvents: true,
                collisionFilterGroup: 1,
                collisionFilterMask: 2,
                type: 'static',
                mass: 0,
            })
            cursor.setAttribute('ammo-shape',{
                type: 'box',
            })         
            cursor.setAttribute('id',pair[i]+'cursor')
            this[pair[i]+'cursor'] = cursor;
            
            //this.sceneEl.insertBefore(cursor, $("#cameraRig")[0]);
            //$("#cameraRig")[0].appendChild(cursor)
            $("a-camera")[0].appendChild(cursor)
            cursor.appendChild(this.createSVGCursor(pair[i]+'cursorimg'))
            
            cursor.addEventListener('dynamic', function(e){
                //cursor.setAttribute('ammo-body','disableCollision',false)
                cursor.setAttribute('ammo-body','type','kinematic')
                cursor.setAttribute('ammo-body','type','static')
                cursor.setAttribute('ammo-body','type','kinematic')
            })
            cursor.addEventListener('static', function(e){
                //cursor.setAttribute('ammo-body','disableCollision',true)
                cursor.setAttribute('ammo-body','type','static')
                cursor.setAttribute('ammo-body','type','kinematic')
                cursor.setAttribute('ammo-body','type','static')
            })
        }
        
        // crawling cursor
        AFRAME.components["raycaster"].Component.prototype.tock = function(time, delta){
            var data = this.data;
            var prevCheckTime = this.prevCheckTime;

            if (!data.enabled) { return; }

            // Only check for intersection if interval time has passed.
            if (prevCheckTime && (time - prevCheckTime < data.interval)) { return; }

            // Update check time.
            this.prevCheckTime = time;
            
            this.checkIntersections();
            
            let cursor = $('#rhandcursor')[0];
            if (this.el.id == "lhand") cursor = $('#'+this.el.id+'cursor')[0];
            if (this.intersections.length > 0){
                if (this.el == o.camera) {
                    o.positionCursor(cursor,this.intersections.find(el => cursor !== el.object.el && !el.object.el.classList.contains("ignore-ray")))
                    let s = 1;
                    if (!AFRAME.utils.device.isMobile() && !o.sceneEl.is('vr-mode')) s = 0.01;
                    cursor.setAttribute('scale',s+' '+s+' '+s)    
                    cursor.object3D.visible = true;
                    this.el.setAttribute('raycaster','lineColor','white')
                } else {
                    (!this.intersections[0].object.el.components.hoverable)?this.el.setAttribute('raycaster','lineColor','blue'):this.el.setAttribute('raycaster','lineColor','white');
                }
            } else {
                cursor.setAttribute('scale','1 1 1')
                cursor.object3D.visible = false;
                o.curveRay.removeAttribute('tickline')
                this.el.setAttribute('raycaster','lineColor','white')
            }
        } 
    }, // ok
    positionCursor: function(el,intersection){ // intersection = entidade que foi atingida.        
        let img = el.querySelectorAll('a-image')[0];
        if (intersection !== null && intersection !== undefined) {  
            let move = o.cameraRig.components['movement-controls'];
            if (o.sceneEl.is('2d-mode') && !AFRAME.utils.device.isMobile()){
                if (move && move.velocityCtrl && o.rhandcursor.grabbedEl && o.rhandcursor.grabbedEl.length > 0 && intersection.uv){
                    o.camera.components.cursor.onMouseMove({
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX: intersection.uv.x, // bug estranho
                        clientY: intersection.uv.y    
                    })
                }
            }
            
            // create path for checkpoints
            let check = intersection.object.el.components.checkpoint;
            if (intersection.object.el != o.actualCheckpoint && check && check.active && o.movementType == 'checkpoint' && o.status == 3) {
                o.createIndication(el);        
            } else {
                if (o.curveRay.components.tickline) o.curveRay.removeAttribute('tickline') 
            }
            
            // a matrix which represents item's movement, rotation and scale on global world
            var mat = intersection.object.matrixWorld;
            // remove parallel movement from the matrix
            mat.setPosition(new THREE.Vector3(0, 0, 0));
            if(!intersection.face) return
            // change local normal into global normal
            var global_normal = intersection.face.normal.clone().applyMatrix4(mat).normalize().negate();
                        
            // look at target coordinate = intersection coordinate + global normal vector
            var lookAtTarget = new THREE.Vector3().addVectors(intersection.point, global_normal);

            // correct cursor position for menus
            if (this.menu3DIsOpen && intersection.object.el.tagName == "A-SPHERE") lookAtTarget = new THREE.Vector3().addVectors( intersection.point, global_normal.multiplyScalar(-0.2));
            
            // cursor direction (avoid constantly rotating)
            img.object3D.lookAt(lookAtTarget);  
            
            if (Math.abs(img.object3D.rotation.x) >= 1.56){
                img.object3D.rotation.z = 0
            }
            if (Math.abs(img.object3D.rotation.y) >= 1.56){
                img.object3D.rotation.x = 0
                img.object3D.rotation.z = 0
            }            
            // scale down if near camera
            if (o.menu3DIsOpen || o.status == 7) {
                img.setAttribute('scale','0.05 0.05 0.05')
            } else if(intersection.point.distanceTo(o.camera.object3D.position)<2){
                img.setAttribute('scale','0.15 0.15 0.15')
            } else {
                img.setAttribute('scale','0.3 0.3 0.3')
            }
            // cursor coordinate = intersection coordinate + normal vector * offset
            //var cursorPosition = new THREE.Vector3().addVectors(intersection.point, global_normal.multiplyScalar(-this.offset));
            //var cursorPosition = o.cameraRig.object3D.worldToLocal(new THREE.Vector3().addVectors(intersection.point, global_normal.multiplyScalar(-this.offset)));
            var cursorPosition = o.camera.object3D.worldToLocal(new THREE.Vector3().addVectors(intersection.point, global_normal.multiplyScalar(-this.offset)));
            if (o.sceneEl.is('2d-mode') && !AFRAME.utils.device.isMobile() && o.rhandcursor.grabbedEl && o.rhandcursor.grabbedEl[1]) cursorPosition.clampLength ( o.rhandcursor.grabbedEl[1]*0.9, o.rhandcursor.grabbedEl[1]*1.1)         
            el.setAttribute("position", cursorPosition);
            
            o.animateCursor(img,img.getAttribute("percentage"))
            
            img.object3D.visible = (o.data.hasCursor && ( AFRAME.utils.device.isMobile() || o.sceneEl.is('vr-mode')))
        } else {
            img.object3D.visible = false;
            o.curveRay.removeAttribute('tickline')
        }
    }, // ok
    createSVGCursor: function(id){       
        let cImg = document.createElement("a-image")
        cImg.setAttribute('visible',true)
        cImg.setAttribute('id',id)
        cImg.setAttribute('class',"ignore-ray")
        cImg.setAttribute('scale',"0.3 0.3 0.3")
        cImg.setAttribute('percentage',0)
        
        let x = -101;
        if (AFRAME.utils.device.isIOS()) x = 566; // ios fix            
        cImg.setAttribute('src','data:image/svg+xml;utf8,'+this.iconHead+' stroke-dashoffset="'+x+'"></circle><circle cx="12" cy="12" r="3" fill="'+this.colorToRGB(this.data.cursorColor)+'"/></svg>')
        
        cImg.setAttribute('animation__on',{
            property: "percentage",
            startEvents: 'on',
            pauseEvents: 'off',
            easing: "linear",
            dur: this.data.hoverTime,
            from: 0,
            to: 1
        })
        
        cImg.addEventListener("animationcomplete__on", e => {
            let el = e.target;
            el.object3D.scale.multiplyScalar(1.1)
            setTimeout(()=>{el.object3D.scale.multiplyScalar(0.9)},80)
        })
        cImg.addEventListener('off', e => {
            let x = -101;
            if (AFRAME.utils.device.isIOS()) x = 566; // ios fix
            e.target.setAttribute('src','data:image/svg+xml;utf8,'+this.iconHead+' stroke-dashoffset="'+x+'"></circle><circle cx="12" cy="12" r="3" fill="'+this.colorToRGB(this.data.cursorColor)+'"/></svg>')
            e.target.setAttribute('percentage',0)
        })
        cImg.setAttribute('material',{
            alphaTest: 0.3,
            side: 'double'
        })       
        return cImg;
    }, // ok 
    animateCursor: function(el,percentage){
        if (this.clicking != null){
            if (percentage == 0 || percentage == 1) return
            
            let x = parseInt(-98+100*(percentage));
            if (AFRAME.utils.device.isIOS()) x = parseInt(-600*(percentage/6)); // ios fix -566
            
            el.setAttribute('src','data:image/svg+xml;utf8,'+this.iconHead+' stroke-dashoffset="'+x+'"></circle><path stroke="grey" stroke-width="1" d="'+this.iconPath+'" fill="'+this.colorToRGB( this.data.cursorColor)+'" transform="scale(1,-1) translate(0,-24)"/></svg>')
        } 
    }, // ok
    createIndication: (function(el){
        let p1 = new THREE.Vector3()
        let p2 = new THREE.Vector3()
        let point = new THREE.Vector3()
        return function(el){
            o.camera.object3D.getWorldPosition(p1);
            el.object3D.getWorldPosition(p2);            
            let p = o.getPointInBetweenByPerc(p1, p2, 0.5) // change formula if heights are different
            
            p1.y = o.cameraRig.object3D.position.y;
            p.x *=1.1
            
            let spline = new THREE.CatmullRomCurve3([p1,p,p2]);
            let html ="";
            
            for ( let i = 0, l = 12; i < l; i ++ ) {
                const t = i / l;
                spline.getPoint( t, point );
                html += point.x+" "+point.y+" "+point.z
                if (i < 11) html +=","
            }
            o.curveRay.setAttribute('tickline',{
                lineWidth:15,
                path: html+','+p2.x+' '+p2.y+' '+p2.z,
                color: o.data.menuColor
            })
        }
    })(),

    //Controller
    setupControllers: function (){
        console.log('controllers initiated') 

        this.dof3 = ['vrbox-controller','oculus-go']
        this.dof6 = ['oculus-touch','hand-tracking']  
        let pair = ['left','right']
        
        let ctrl = '<a-entity id="controllerRig">';
        for (i=0;i<pair.length;i++){
            // hand id
            ctrl += '<a-entity id="'+pair[i].charAt(0)+'hand" ';

            // 6DOF controllers
            for (j=0;j<this.dof6.length;j++){
                ctrl += this.dof6[j]+'-controls="hand: '+pair[i]+'" ';
            }
            
            // 3DOF controllers
            if (i==1) {
                for (j=0;j<this.dof6.length;j++){  
                    ctrl += this.dof3[j]+' ';     
                }
            }
            
            // add listeners
            ctrl += 'ccontrol ';
            
            ctrl += '></a-entity>';
        }
        ctrl += '</a-entity>';
        $("#cameraRig").append(ctrl); 
        o.rhand = $('#rhand')[0]
        o.lhand = $('#lhand')[0]; 
                
        AFRAME.registerComponent('vrbox-controller-controls',{
            init: function(){
                let turn1 = 0;
                let turn2 = 0;
                let self = this;
                this.controllerPresent = false
                window.addEventListener("gamepadconnected", function(e) {
                    console.log('Simple gamepad connected')
                    let pads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
                    for (i=0;i<pads.length;i++){
                        if (!pads[i] || pads[i].pose ) continue;
                        if (pads[i].axes.length>0 && pads[i].buttons.length>0) {
                            self.controllerPresent = pads[i];
                            // create model
                        }
                    } 
                })
                window.addEventListener("gamepaddisconnected", function(e) {
                    let pads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
                    for (i=0;i<pads.length;i++){
                        if (o.pads != null && pads[i] == o.pads) o.pads = false
                        // delete model
                    }     
                })
            },
            tick: function(){
                if (o.pads != null) {
                    for (i=0;i<o.pads.buttons.length;i++){
                        if (o.pads.buttons[i].pressed) this.action(o.pads.buttons[i])
                    }
                    if (o.pads.axes[0]!=0 || o.pads.axes[1]!=0){
                        if (gp.axes[0]==-1) turn1++;
                        if (gp.axes[0]==1) turn1--;
                        if (gp.axes[1]==1) turn2++;
                        if (gp.axes[1]==-1) turn2--;
                        this.cRot(turn1,turn2)
                    }
                }
            },
            cRot: function(x,y){
                let speed = 1.5;
                x = x * speed;
                y = y * speed;
                this.el.object3D.rotation.set(
                    THREE.Math.degToRad(x-90),
                    THREE.Math.degToRad(y),
                    THREE.Math.degToRad(0)
                );
            },
            action: function(el){
                //2,5,8,9,10,11 e 12 -> sem funções 
                //Botão 0 - menu
                //Botão 6 - escolher 
            },
            createModel: function(){
            }
        }); // tbd
              
        AFRAME.registerComponent('ccontrol',{
            schema: {
                enabled:{type:'boolean',default:true}, // detect or not collide
                fingerColliders:{type:'array',default:[false,true,true,true,true,true]}, // finger colliders
                
                gesture:{type:'string',default:'none'},
                grabGesture:{type:'array',default:['fist','pinch']}, // gesture that triggers grab
                
                smooth: { default: 20 },
            },
            init: function(){
                this.positions = {};                
                this.bones = [
                    'wrist', //0
                    'thumb_null', //4
                    'index_null', //9
                    'middle_null', //14
                    'ring_null', //19
                    'pinky_null', //24
                    'middle0' //11
                ]     
                this.prefix = 'b_'+this.el.id.charAt(0)+'_';
                this.gesturesRules = {
                    a:[this.prefix+'index_null','greater',0.85],
                    b:[this.prefix+'index_null','smaller',0.55],
                    
                    c:[this.prefix+'thumb_null','greater',0.90],
                    d:[this.prefix+'thumb_null',0.90],
                    
                    e:[this.prefix+'middle_null','greater',0.85],
                    f:[this.prefix+'middle_null','smaller',0.55],
                    
                    g:[this.prefix+'middle_null','greater',0.0355,this.prefix+'index_null'],
                    
                    h:[this.prefix+'ring_null','greater',0.85],
                    i:[this.prefix+'ring_null','smaller',0.55],
                    
                    j:['negative']
                }
                this.gestures = {
                    adfgi:'indexPointer',
                    bdfi:'fist',
                    acfgi:'gun',
                    acei:'raycasterOff',
                    adei:'raycasterOn',
                    adegi:'scisor',
                    acegh:'paper',
                    bcfi:'thumbsUp',
                    bcfij:'thumbsDown',
                }
                this.controller;
                this.colliders = {};
                this.codeArray = [];
                this.oldGesture;

                for(i=0;i<this.bones.length;i++){
                    this.bones[i] = this.prefix+this.bones[i]
                }

            }, // ok
            update: function(oldData){
                var obj = AFRAME.utils.diff(oldData,this.data)
                if (obj.fingerColliders) {
                    if (this.controller == 'hand-tracking' && this.data.enabled && this.el.getObject3D('mesh') && this.el.getObject3D('mesh').visible) {
                        
                        for (i=0;i<this.data.fingerColliders.length;i++){
                            // delete the collider
                            if (this.colliders[this.bones[i]]) this.remove(this.colliders[this.bones[i]])
                            // add new colliders
                            if (this.data.fingerColliders[i]) this.addFingerCollider(this.bones[i]);
                        }
                    }
                }
            }, // ok
            remove: function(collider){
                this.hideFingerColliders(collider);
                collider.parentElement.removeChild(collider) 
            }, // ok
            tick: function(){
                let handTracker = this.el.components['hand-tracking-controls'];
                //this.checkController();

                if (this.controller == 'hand-tracking' && this.data.enabled && this.el.getObject3D('mesh') && this.el.getObject3D('mesh').visible) {

                    let bones = this.el.components['hand-tracking-controls'].mesh.children;
                    for (i=0;i<bones.length;i++){
                        let index = this.bones.indexOf(bones[i].name);
                        if (index == -1) continue

                        // create colliders
                        if (!this.colliders[bones[i].name]){
                            if (index == 6) {
                                this.addFingerCollider(bones[i].name)    
                            } else if (this.data.fingerColliders[index]) {
                                this.addFingerCollider(bones[i].name) 
                            }
                        }
                        
                        // store and update collider position
                        this.getFingerPosition(bones[i]);
                    }
                    // detect gestures
                    this.detectGesture();
                    /*
                    if (this.colliders[this.fingers[i]]){
                        this.remove(this.colliders[this.fingers[i]])
                        delete this.colliders[this.fingers[i]]
                    }
                    */
                } 
                else {
                    if (!jQuery.isEmptyObject(this.positions)) {
                        for (i=0;i<this.bones.length;i++){
                            if (this.colliders[this.bones[i]]) this.hideFingerColliders( this.colliders[this.bones[i]])     
                        }
                        this.positions = {};
                    }
                }
                
                // fix: show controller mesh
                if (this.controller && this.controller.includes('oculus')) {
                    let cp = this.el.components[this.controller+'-controls'];
                    if (cp && cp.controllerObject3D && !cp.controllerObject3D.visible) cp.controllerObject3D.visible = true;
                }

                //this.el.setAttribute('material','emissive','#fff')
                //this.el.setAttribute('material','emissiveIntensity',0.4)   

                /*
                if (this.collidedEl && this.grabbedEl && this.positions['index-finger-tip'] && this.positions['index-finger-tip'].x) {

                    //this.grab()

                    //if (this.grabbedEl.components.body) this.grabbedEl.components.body.pause()
                    //this.grabbedEl.object3D.position.copy( this.positions['index-finger-tip'])
                    //this.grabbedEl.object3D.updateMatrixWorld();
                    //if (this.grabbedEl.components.body) this.grabbedEl.components.body.play()
                } else {
                    //this.deltaPosition = null;
                }
                */
            },
            
            addFingerCollider: function(name){
                let col = document.createElement('a-entity');
                col.setAttribute('geometry',{
                    primitive:'sphere',
                    radius:0.005,
                });
                col.setAttribute('material','opacity',0)
                col.setAttribute('class','finger-collider');
                
                if (name == 'b_l_middle0'  || name == 'b_r_middle0') {
                    col.setAttribute('id',this.el.id+'_anchor'); 
                    col.setAttribute('super-hands',{
                        colliderEvent: 'collidestart', 
                        colliderEventProperty: 'targetEl',
                        colliderEndEvent: 'collideend', 
                        colliderEndEventProperty: 'targetEl'
                    })
                } 
                else {
                    col.setAttribute('id',name);
                    this.el.setAttribute('super-hands',{
                        colliderEvent: 'collidestart', 
                        colliderEventProperty: 'targetEl',
                        colliderEndEvent: 'collideend', 
                        colliderEndEventProperty: 'targetEl'
                    })
                }
                
                col.setAttribute('ammo-body',{
                    emitCollisionEvents: true,
                    collisionFilterGroup: 1,
                    collisionFilterMask: 2,
                    type: 'static',
                    mass: 0,
                })
                col.setAttribute('ammo-shape',{
                    type: 'sphere',
                })
                
                this.el.appendChild(col)
                //o.sceneEl.appendChild(col)
                
                this.colliders[name] = col;  
            }, // ok
            getFingerPosition: (function(){
                let pos = new THREE.Vector3();
                //let qat = new THREE.Quaternion()
                return function(bone){
                    bone.getWorldPosition(pos);
                    //bone.getWorldQuaternion(qat);
                    p = this.positions;
                    p[bone.name] = pos;
                    
                    if (!p[this.prefix+'thumb_null'] || 
                        !p[this.prefix+'wrist'] || 
                        !p[this.prefix+'index_null'] || 
                        !p[this.prefix+'middle_null'] ||
                        !p[this.prefix+'ring_null'] ||
                        !p[this.prefix+'pinky_null'] 
                    ) return

                    p.maxthumb = Math.max(p[this.prefix+'thumb_null'].distanceTo( p[this.prefix+'wrist']),(p.maxthumb || 0))

                    p.maxindex = Math.max(p[this.prefix+'index_null'].distanceTo( p[this.prefix+'wrist']),(p.maxindex || 0))
                    
                    p.maxmiddle = Math.max(p[this.prefix+'middle_null'].distanceTo( p[this.prefix+'wrist']),(p.maxmiddle || 0))
                    
                    p.maxring = Math.max(p[this.prefix+'ring_null'].distanceTo( p[this.prefix+'wrist']),(p.maxring || 0))
                    
                    p.maxpinky = Math.max(p[this.prefix+'pinky_null'].distanceTo( p[this.prefix+'wrist']),(p.maxpinky || 0))
                    
                    let collider = this.colliders[bone.name];
                    if (!collider) return
                    
                    o.cameraRig.object3D.worldToLocal(pos)
                    collider.object3D.position.copy(pos);
                    
                    if (!collider.object3D.visible) this.showFingerColliders(collider);
                }
            })(), // ok
            detectGesture: function(){
                let p = this.positions;
                if (!p || jQuery.isEmptyObject(p)) return 
                let code = '';
                for (const rule in this.gesturesRules) {
                    let a = this.gesturesRules[rule];

                    // TODO nao funciona
                    if (a[0]=='negative') {
                        if (p[this.prefix+'thumb_null'].sub(p[this.prefix+'wrist']).y <0) code+=rule;
                    } else {
                        if (!p[a[0]]) continue;
                        let b;
                        let c;
                        if (a[3]!=null){
                            b = p[a[0]].distanceTo(p[a[3]]);
                            c = a[2];
                        } else {
                            b = p[a[0]].distanceTo(p[this.prefix+'wrist']);
                            c = a[2]*p['max'+a[0].split('_')[2]]; 
                        }
                        if (a[1] == "greater"){                
                            if (b > c) code+=rule;
                        } else {
                            if (b < c) code+=rule;
                        }
                    }   
                }   
                code = o.sortString(code)
                code = o.smoothingString(this.codeArray,this.data.smooth,code)
                
                //console.log(code)
                let sixG = this.gestures[code.substring(0, 6)];
                let fiveG = this.gestures[code.substring(0, 5)];
                let fourG = this.gestures[code.substring(0, 4)];
                if (sixG != null || fiveG != null || fourG != null){
                    let gesture = sixG || fiveG || fourG;
                    if (this.data.gesture != gesture) {
                        this.oldGesture = this.data.gesture;
                        this.data.gesture = gesture;
                        this.el.emit('gesture',gesture)
                        this.setRaycaster()
                    }
                } else {
                    if (this.data.gesture != 'none'){
                        this.oldGesture = this.data.gesture; 
                        this.data.gesture = 'none';
                        this.setRaycaster()
                    } 
                }
            }, // ok 
            showFingerColliders: function(collider){
                collider.object3D.visible = true;
                //collider.setAttribute('ammo-body','collisionFilterMask',0)
                //let group = o.collisionGroups[o.data.targetClass]
                //collider.setAttribute('ammo-body','collisionFilterMask',group)      
            }, // ok
            hideFingerColliders: function(collider){
                collider.object3D.visible = false;
                //collider.setAttribute('ammo-body','collisionFilterMask',0)
                //collider.setAttribute('ammo-body','collisionFilterMask',0)  
            }, // ok
                            
            setRaycaster: function(){
                if (this.data.gesture == "raycasterOff"){
                    if (this.oldGesture == "raycasterOn") {
                        this.el.emit("grab-end")
                    } else {
                        // o.changeRaycaster(6)
                    }
                } else if (this.data.gesture == "raycasterOn"){
                    if (this.oldGesture == "raycasterOff") {
                        this.el.emit("grab-start")
                    } else {
                        // o.changeRaycaster(7)   
                    }
                } else if (this.oldGesture == "raycasterOn" || this.oldGesture == "raycasterOff") {
                    // o.changeRaycaster(8)
                }  
            },
            openMenu: function(){
                if(o.menu3DIsOpen) return
                if (o.data.has3DMenu) o.sessionHandler('pause')
            }, // ok            
            events:{
                //change Raycaster if controller connected
                controllerconnected: function(e){
                    let name = e.detail.name.substring(0, e.detail.name.length - 9)
                    this.controller = name;
                    o.checkController()
                    
                    if (dev) console.log('controle adicionado', name)
                    
                    // fix: show hand model
                    if (name == 'hand-tracking') this.el.components[ e.detail.name ].initMeshHandModel()
                    

                    //o.changeRaycaster(4)    
                }, // ok
                controllerdisconnected: function(e){
                    this.controller = null;
                    
                    o.removeRaycaster(this.el)
                    
                    o.checkController()
                    
                    if (dev) console.log('controle removido', e.detail.name.substring(0, e.detail.name.length - 9))
                    
                    //o.changeRaycaster(5)
                }, // ok
                
                // controller rays
                'raycaster-intersection': function(e){
                    let els = o.emitFiltered(e);
                    e.target.emit('raycaster-intersection-filtered',{els:els})  
                    //console.log(els)
                },
                /*
                'raycaster-intersection-cleared': function(e){
                    let els = o.emitFiltered(e);
                    e.target.emit('raycaster-intersection-cleared',{els:els})  
                },*/
                              
                //MENU
                thumbstickdown: function(){
                    this.openMenu()
                },
                trackpaddown: function(){
                    this.openMenu()
                },
                touchpaddown: function(){
                    this.openMenu()
                },
                surfacedown: function(){
                    this.openMenu()
                },

                // Movement
                thumbstickmoved: function(evt){
                    if (evt.detail.y > 0.95) { console.log("DOWN"); }
                    if (evt.detail.y < -0.95) { console.log("UP"); }
                    if (evt.detail.x < -0.95) { console.log("LEFT"); }
                    if (evt.detail.x > 0.95) { console.log("RIGHT"); }
                },       
                
                // HAND Interaction
                gesture: function(e){  
                    console.log('gesture',e.detail)
                    /*
                    let els = []
                    if (this.el.is('pinching')) return
                    if (this.data.grabGesture.includes(e.detail)){
                        this.grabbedEl = this.collidedEl;
                        this.el.emit('gripdown',{
                            hand: $('#index-finger-tip-'+this.el.id)[0]
                        })
                    } else {
                        if (!this.grabbedEl) return
                        if (this.grabbedEl.components.body) this.grabbedEl.components.body.play()
                        this.grabbedEl = null;
                        this.el.emit('gripup',{
                            hand: $('#index-finger-tip-'+this.el.id)[0]
                        })
                    }
                    */
                },
                /*
                collidestart: function(e){
                    console.log('collide on',e)
                },
                collideend: function(e){
                    console.log('collide off',e)
                },*/
                
                pinchstarted: function(){
                    //console.log('pinch on')
                    
                    let bone = this.el.components['hand-tracking-controls'].mesh.children
                    for (i=0;i<bone.length;i++){
                        if (bone[i].name=='b_l_middle0' || bone[i].name=='b_r_middle0') {
                            bone = bone[i];
                            break
                        }
                    }
                    //console.log(bone,$('#index-finger-tip-'+this.el.id)[0])
                    
                    // TODO nao funciona
                    $('#'+this.el.id+'_anchor')[0].emit('gripdown',{
                        hand: $('#'+this.el.id+'_anchor')[0]
                    })
                    /*
                    $('#cube1')[0].emit('grab-start',{
                        hand: $('#index-finger-tip-'+this.el.id)[0]
                    })
                    
                    $('#cube1')[0].emit('stretch-start',{
                        hand: $('#index-finger-tip-'+this.el.id)[0]
                    })*/
                    
                    // o problema é que o ongrab start usa hand o elemento que tem o superhands, e nao o elemento passado no evento.
                    /*
                    onGrabStartButton: function (evt) {
    let carried = this.state.get(this.GRAB_EVENT)
    this.dispatchMouseEventAll('mousedown', this.el)
    this.gehClicking = new Set(this.hoverEls)
    if (!carried) {
      carried = this.findTarget(this.GRAB_EVENT, {
        hand: this.el,                                  // aqui oh
        buttonEvent: evt
      })
      if (carried) {
        this.state.set(this.GRAB_EVENT, carried)
        this._unHover(carried)
      }
    }
  },
  */
                },
                pinchended: function(){
                    //console.log('pinch off')
                    
                    $('#'+this.el.id+'_anchor')[0].emit('gripup',{
                        hand: $('#'+this.el.id+'_anchor')[0]
                    })
                    /*
                    $('#cube1')[0].emit('grab-end',{
                        hand: $('#index-finger-tip-'+this.el.id)[0]
                    })
                    
                    $('#cube1')[0].emit('stretch-end',{
                        hand: $('#index-finger-tip-'+this.el.id)[0]
                    })*/
                },
                
                /*
                hitstart: function(e){
                    if (e.target.id == 'index-finger-tip-lhand' || e.target.id == 'index-finger-tip-rhand') {
                        let els = o.emitFiltered(e);
                        console.log(1,els)
                        if (els[0]) {
                            //e.target.emit('raycaster-intersection-filtered',{els:[els[0]]})
                            this.collidedEl = els[0];
                            //if (els[0].components.body) els[0].components.body.pause()
                        }
                    }
                },
                hitend: function(e){
                    if (e.target.id == 'index-finger-tip-lhand' || e.target.id == 'index-finger-tip-rhand') {
                        console.log(2)
                        if (!this.grabbedEl) {
                            //e.target.emit('raycaster-intersection-cleared',{clearedEls:[this.collidedEl]})
                            if (this.collidedEl.components.body) this.collidedEl.components.body.play()
                            this.collidedEl = null;
                            this.grabbedEl = null;
                        }

                    }
                },
                
                pinchstarted: function(){
                    if (!this.collidedEl || this.collidedEl.getAttribute('pinchable')!='') return
                    this.el.addState('pinching')
                    this.grabbedEl = this.collidedEl;
                    //if (this.grabbedEl.components.body) this.grabbedEl.components.body.pause()
                    console.log(3)
                    
                    //let bone = document.createElement('a-entity')
                   //bone.setObject3D('mesh',this.el.components['hand-tracking-controls'].mesh.children[3])
                    //let bone = {object3D: }
                    //console.log(4,bone,this.grabbedEl)
                    //if (!bone) return
                    
                    //this.grabbedEl.components['grabbable'].grabber = bone;

                   
                },
                pinchended: function(e){
                    if (!this.collidedEl || this.collidedEl.getAttribute('pinchable')!='') return
                    this.el.removeState('pinching')
                    //if (this.grabbedEl.components.body) this.grabbedEl.components.body.play()
                    this.grabbedEl = null;
                    console.log(4)
                    this.el.emit('gripup',{
                        hand: $('#index-finger-tip-'+this.el.id)[0]
                    })
                }
                */
                
                triggerdown: function(){
                    console.log('triggerdown')
                },
                triggerup: function(){
                    console.log('triggerup')
                }
            }
        }); 
    },
    addGesture: function(rulesObj,gestureObj,erase=false){
        if (!rulesObj || jQuery.isEmptyObject(rulesObj)) return 
        if (!gestureObj || jQuery.isEmptyObject(gestureObj)) return
        $("[ccontrol]").each(function() {
            if (this.tagName == "A-MIXIN") return
            if (erase) {
                this.components['ccontrol'].gesturesRules = rulesObj;
                this.components['ccontrol'].gestures = gestureObj;
            }
            for (const rule in rulesObj) {
                this.components['ccontrol'].gesturesRules[rule] =  rulesObj[rule] 
            }
            for (const gesture in gestureObj) {
                this.components['ccontrol'].gestures[gesture] = gestureObj[gesture]
            }
        });
    },
    
    //Raycaster
    checkController: function(){
        let bol = false;
        let left = o.lhand.components.ccontrol.controller;
        let right = o.rhand.components.ccontrol.controller;
        
        console.log(left, right)
        
        if (left && left.includes('touch')) bol = o.defineRaycaster(o.lhand,'oculus-touch');
        
        if (right && right.includes('touch')) bol = o.defineRaycaster(o.rhand,'oculus-touch');
        
        if (left &&  left.includes('go') && !bol) bol = o.defineRaycaster(o.lhand,'oculus-go');
        if (right && right.includes('go') && !bol) bol = o.defineRaycaster(o.rhand,'oculus-go');
        
        if (left &&  left.includes('hand') && !bol) bol = o.defineRaycaster(o.lhand,'hand-tracking');
        if (right && right.includes('hand') && !bol) bol = o.defineRaycaster(o.rhand,'hand-tracking');
        
        if (!bol) o.defineRaycaster(o.camera)
    }, // ok 
    defineRaycaster: function(el,name){
        if (el.components['super-hands']) return true
        o.removeRaycaster(o.camera)
        
        let up = 'gripup, triggerup, mouseup, touchend';
        let down = 'gripdown, triggerdown, mousedown, touchstart';
        
        el.setAttribute('super-hands',{
            colliderEvent: 'raycaster-intersection-filtered', 
            colliderEventProperty: 'els',
            colliderEndEvent: 'raycaster-intersection-cleared', 
            colliderEndEventProperty: 'clearedEls',
            grabStartButtons: down,
            grabEndButtons: up,
            stretchStartButtons: down,
            stretchEndButtons: up,
            dragDropStartButtons: down,
            dragDropEndButtons: up
        })
        
        if (name == 'hand-tracking') {
            if (dev) console.log('hand raycaster')
            el.setAttribute('super-hands',{
                colliderEvent: 'collidestart', 
                colliderEventProperty: 'targetEl',
                colliderEndEvent: 'collideend', 
                colliderEndEventProperty: 'targetEl'
            })
            
            //if ($("#b_"+el.id.charAt(0)+"_"+"index_null").length) el = $("#b_"+el.id.charAt(0)+"_"+"index_null")[0]  
            
            
            //TODO
            //let gesture = el.getAttribute('ccontrol').gesture;
            //console.log(gesture)
            //if (!(gesture == "raycasterOff" || gesture == "raycasterOn")) {
                /*
                $(ele.id+'_anchor')[0].setAttribute('super-hands',{
                    colliderEvent: 'collidestart', 
                    colliderEventProperty: 'targetEl',
                    colliderEndEvent: 'collideend', 
                    colliderEndEventProperty: 'targetEl'
                })
                
            }*/
            
            return true
        }
        else if (name && name.includes('oculus')) {
            if (dev) console.log('laser raycaster')
            el.setAttribute('raycaster',{
                showLine: o.data.showRay,
                objects: o.data.targets,
            })    
            return true
        }
        else if (el == o.camera){
            $('#lhandcursor')[0].object3D.visible = false;
            $('#lhandcursor')[0].object3D.position.y=-1000;
            el.setAttribute('raycaster',{
                showLine: false,
                objects: o.data.targets
            })
            if (o.sceneEl.is('ar-mode') || (!AFRAME.utils.device.isMobile() && !o.sceneEl.is('vr-mode'))){
                el.setAttribute('cursor',"rayOrigin","mouse")  
                $('#rhandcursor')[0].origin = 'mouse';
                $('#lhandcursorimg')[0].object3D.visible = false;
                $('#rhandcursorimg')[0].object3D.visible = false;
                if (dev) console.log('mouse raycaster')
            } 
            else {
                $('#rhandcursor')[0].origin = 'camera';
                if (dev) console.log('camera raycaster')
            } 
            let a = o.mode.charAt(0)
            if (!(a == "f"||a == "p"||a == "c") && AFRAME.utils.device.isMobile()) {
                this.data.hasCursor = true;
            } else {
                this.data.hasCursor = false;
            }
            return false
        }
    }, // ok 
    removeRaycaster: function(el){
        el.removeAttribute('raycaster')
        el.removeAttribute('super-hands')
        el.removeAttribute('cursor')
        $('#lhandcursor')[0].object3D.visible = false;
        $('#lhandcursor')[0].object3D.position.y=-1000;
        $('#rhandcursor')[0].object3D.visible = false;
        $('#rhandcursor')[0].object3D.position.y=-1000;
    }, // ok    
    changeTargetClass: function(){
        switch (this.status) {
            case 0: case 1: case 2: case 5:  
                this.data.targetClass = 'mclickable';
                this.changeCollideMask(2)
                break
            case 7: 
                this.data.targetClass = 'qclickable';
                this.changeCollideMask(4)
                break
            case 8:
                this.data.targetClass = 'aclickable';
                this.changeCollideMask(8)
                break 
            default:
                this.data.targetClass = 'any';
                this.changeCollideMask(1)
        }
        if (this.menu3DIsOpen) {
            this.data.targetClass = 'mclickable';
            this.changeCollideMask(2)
        }
    }, // ok
    changeCollideMask: function(group){
        //this.collisionGroups = {any: 1, mclickable: 2, qclickable: 4, aclickable: 8}
        /*
        group
        any e cursor = 1
        mclickable = 2
        qclickable = 4
        aclickable = 8

        mask 1,2,4,8,3,5,6,7,9,10,12,11,14,13,15 
        */
        o.rhandcursor.setAttribute('ammo-body','collisionFilterMask',0)
        o.rhandcursor.setAttribute('ammo-body','collisionFilterMask',group)
        o.lhandcursor.setAttribute('ammo-body','collisionFilterMask',0)
        o.lhandcursor.setAttribute('ammo-body','collisionFilterMask',group)
        
        let arr = $('.finger-collider')
        for (i=0;i<arr.length;i++){
            arr[i].setAttribute('ammo-body','collisionFilterMask',0)
            arr[i].setAttribute('ammo-body','collisionFilterMask',group)    
        }    
        
    }, // ok
    
    definingSuperHands: function(el){
        el.setAttribute('super-hands',{
            colliderEvent: 'raycaster-intersection-filtered', 
            colliderEventProperty: 'els',
            colliderEndEvent: 'raycaster-intersection-cleared', 
            colliderEndEventProperty: 'clearedEls'
        })
    }, // old    
    changeSuperHands: function(ele,up = 'gripup, triggerup',down = 'gripdown, triggerdown'){
        ele.setAttribute('super-hands',{
            grabStartButtons: down,
            grabEndButtons: up,
            stretchStartButtons: down,
            stretchEndButtons: up,
            dragDropStartButtons: down,
            dragDropEndButtons: up 
        })
    }, // old
    
    intersectListener: function (evt,els,bol) {
        let a = o.mode.charAt(0)
        if (((a == "g"||a == "r"||a == "w") && AFRAME.utils.device.isMobile()) || (!AFRAME.utils.device.isMobile() && (o.sceneEl.is('vr-mode')))) {
            if (!els[0]) return
            if (o.clicking != els[0] && bol){
                clearTimeout(o.timeout1);
                if (o.clicking != null) {
                    o.clicking.emit("hover-end",{hand:$('#rhandcursor')[0]})
                    $('#rhandcursorimg')[0].emit("off")
                }
                o.clicking = els[0];
                o.clicking.emit("hover-start",{hand:$('#rhandcursor')[0]})
                $('#rhandcursorimg')[0].emit("on")
                o.timeout1 = setTimeout(function(){
                    console.log('timer click')
                    o.clicking.emit('grab-start',{hand: $('#rhandcursor')[0]})
                    o.clicking = null
                }, o.data.hoverTime);
            } else {
                if (o.clicking) {
                    o.clicking.emit("hover-end",{hand:$('#rhandcursor')[0]})
                    o.clicking = null
                }
                if (els[0].is('grabbed')) els[0].emit('grab-end',evt)
                
                $('#rhandcursorimg')[0].emit("off")
                clearTimeout(o.timeout1); 
            }
        }
    }, // ok
    emitFiltered: function(e){
        let els = e.detail.clearedEls || e.detail.els || e.detail.intersectedEls;
        if (!els && e.detail.body) els = [e.detail.body.el]
        let oldEl;
        let arr = [];
        for(i=0;i<els.length;i++){
            if (!oldEl) {
                oldEl = els[i];
            } else if (oldEl == els[i]) {
                continue 
            }
            if ((els[i].classList.contains(o.data.targetClass) || o.data.targetClass == 'any') && (!els[i].object3D || els[i].object3D.visible)) arr.push(els[i])
        }
        return arr
    }, // ok
    clickListener: function(){
        if (document.addEventListener) {
            document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
            }, false);
        }
        else {
            document.attachEvent('oncontextmenu', function() {
                window.event.returnValue = false;
            });
        }
        
        o.sceneEl.addEventListener("grab-end",function(e){
            //console.log('grabend',e)
            e.target.lastClick = e.target.timeout2;
            clearTimeout(e.target.timeout2)
        })
        o.sceneEl.addEventListener("grab-start",function(e){
            //console.log('grabstart',e)
            if (!(e.target.components.clickable || e.target.components.selectable)) return
            
            // left click
            if (e.detail.buttonEvent && e.detail.buttonEvent.detail && (e.detail.buttonEvent.detail.button == 2 || (e.detail.buttonEvent.detail.mouseEvent && e.detail.buttonEvent.detail.mouseEvent.button == 2))){
                e.target.emit('leftclick')
            };
            let target = e.target;
            
            // longer click
            e.target.timeout2 = setTimeout(function(){
                target.emit('longclick')        
            }, 500);
            
            // double click
            if (e.target.lastClick && e.target.timeout2 - e.target.lastClick < 250){
                e.target.emit('dbclick') 
                clearTimeout(e.target.timeout2)
            }
        })
    }, // ok
    
    //Marketing
    loadLogos: function(){     
        let html = '';
        (path == '' || !path)? html=mod : html=path;
        if (logo!=null) $("a-assets").append('<img id="logocli" src="'+html+'generic/logos/'+logo+'" crossorigin="anonymous">')   
        if (orb!=null) $("a-assets").append('<img id="logoorb" src="'+html+'generic/'+orb+'" crossorigin="anonymous">')
    },
    createLogo: function(id,url,width,height,position){
        let logo = document.createElement('a-image');
        logo.setAttribute('position', position);
        logo.setAttribute('width', width);
        logo.setAttribute('height', height);
        logo.setAttribute('material','alphaTest',0.15)
        if (id!='' || id!=null) logo.setAttribute('id',id);
        (url.slice(url.length - 3) == "svg")?logo.setAttribute('material','src',url):logo.setAttribute('src',url);       
        return logo 
    },
    logo2d: function(bol){
        if (this.data.hasIntro) return
        if (!this.data.hasLogos) return
        if (logo!=null) {   
            $('#ar_client').attr('src','#logocli'); 
            $('#ar_client').attr('class','white_logo');
            (bol)?$('#ar_client').show():$('#ar_client').hide();
        }
        if (orb!=null){
            $('#ar_oorbit').attr('src','#logoorb'); 
            $('#ar_oorbit').attr('class','white_logo');
            (bol)?$('#ar_oorbit').show():$('#ar_oorbit').hide();
        }
    },
    showIntro: function(play){
        if (!this.data.hasIntro) return
        if (!play){
            let html = '';
            (path == '' || !path)? html=mod : html=path;
            $("a-assets").append('<a-asset-item src="'+html+'generic/logo.js" id="introModel"></a-asset-item>')
            $("a-assets").append('<audio id="introAudio" src="'+html+'generic/logo.mp3" crossorigin="anonymous"></audio>')
            //$('#introAudio')[0].load()
        } else {
            let s = o.initiateSphere()
            o.cameraRig.appendChild(s);
            o.fixMenu = true;
            setTimeout(function (){
                s.appendChild(o.createText('Desenvolvido por:',"center",0.025,"infinity", o.data.textColor,"0 0 -0.5","0 0 0"))
                let m = document.createElement('a-entity');
                m.setAttribute('gltf-model',"#introModel")
                m.setAttribute('gltf-material',"opacity",1)
                m.setAttribute('scale',"0.16 0.16 0.16")
                m.setAttribute('rotation',"90 0 0")
                m.setAttribute('position',"0 -0.08 -0.5")
                s.appendChild(m)
                if (logo) s.appendChild(o.createLogo('',"#logocli",0.2,0.17,"0 0.14 -0.5"))
                if (o.sceneEl.is('2d-mode')) {
                    o.camera.setAttribute('look-controls','enabled',false)
                    o.menuSphere.object3D.rotation.copy(o.camera.object3D.rotation)
                }
                if (!o.permissions.mute && !AFRAME.utils.device.isIOS()) {
                    o.permissions.mute = true;
                    o.sessionHandler('mute')
                }
                setTimeout(function () {
                    m.setAttribute('animation-mixer',{
                        timeScale: 0.55, 
                        loop: 'once',
                        clampWhenFinished: true,
                    })
                    $('#introAudio')[0].volume = 1;
                    $('#introAudio')[0].play()
                }, 1200);
                setTimeout(function (){
                    o.deleteSphere()
                    o.fixMenu = false;
                    o.data.hasIntro = false;
                    o.sessionHandler(2);
                    if (!o.permissions.fix) o.camera.setAttribute('look-controls','enabled',true);
                    o.sceneEl.emit('introend')
                },8000)
            },1000)
        }
    },
    
    // Environment
    setupEnvironment: function (){
        if (environment!=null && !jQuery.isEmptyObject(environment)) {
            Object.assign(o.environment, environment);
            if (o.environment.econtrol != null && !jQuery.isEmptyObject(o.environment.econtrol)){             
                if(o.econtrol.getAttribute('econtrol') != null) {
                    o.econtrol.parentElement.removeChild(o.econtrol)
                    o.econtrol = document.createElement('a-entity');
                }
                o.econtrol.setAttribute('econtrol',o.environment.econtrol);
                this.sceneEl.appendChild(o.econtrol)
                delete o.environment.econtrol;
            } else {
                console.warn("Environment não funciona corretamente sem econtrol!");
                o.econtrol.setAttribute('environment',o.environment);
                this.sceneEl.appendChild(o.econtrol)
            }
        } else {
            o.econtrol = null;
        }
    },
    
    // General
    createButton: function (w,h,r,c1,c2,position,targetClass,text,size,func){
        let button;
        for (i=0;i<3;i++){
            let el = document.createElement('a-entity');
            let _color = c1
            let round;
            switch (i) {
                case 0:
                    el.setAttribute('position', position); 
                    el.setAttribute('clickable',""); 
                    el.setAttribute('collidable',"group", this.collisionGroups[targetClass]); 
                    el.classList.add(targetClass);
                    button = el;
                    round = this.drawRound(w,h,r)
                break;
                case 1:
                    _color = c2
                    round = this.drawRound(w*0.95,h*0.9,Math.min(w*0.95,h*0.9)/2)
                    el.setAttribute('position', "0 0 0.001");
                    button.appendChild(el)
                break;
                default:
                    _color = c1
                    round = this.drawRound(w*0.9,h*0.81,Math.min(w*0.9,h*0.81)/2)
                    el.setAttribute('position', "0 0 0.002");
                    button.appendChild(el)
            }
            el.setAttribute('material',{
                shader:'flat',
                color:_color
            })
            
            el.setObject3D('mesh', new THREE.Mesh(round, new THREE.MeshPhongMaterial( {color: new THREE.Color(_color), side: THREE.DoubleSide})))
        }
        
        button.appendChild(this.createText(text,"center",size,"infinity",c2,"0 0 "+(this.offset+0.001),"0 0 0")) 
               
        button.addEventListener("hover-start",function(){
            button.setAttribute('scale',"1.03 1.03 1.03")
            button.firstChild.setAttribute('material',"color",o.data.loadingColor)
            button.lastChild.setAttribute("color",o.data.loadingColor)
        })
        button.addEventListener("hover-end",function(){
            button.setAttribute('scale',"1 1 1") 
            button.firstChild.setAttribute('material',"color",c2)
            button.lastChild.setAttribute("color",c2)
        })
        
        button.addEventListener("grab-start",function(e){
            func()
        })
        button.addEventListener("grab-end",function(e){
            e.preventDefault()
        })
        
        button.addEventListener("collidestart",function(e){
            if (e.detail.targetEl.origin == 'camera' || e.detail.targetEl.origin == 'mouse') return
            func()
        })
        button.addEventListener("collideend",function(e){
            e.preventDefault()
        })
        
        return button
    }, // testar on runtime
    createText: function(text,anchor,size,width,color,position,rotation,id){
        let el = document.createElement("a-entity")
        let t = document.createElement("a-troika-text")
        t.setAttribute('value',text)
        t.setAttribute('align','justify')
        t.setAttribute('anchor',anchor)
        t.setAttribute('max-width',width)
        t.setAttribute('font-size',size)
        t.setAttribute('color',color)
        t.setAttribute('rotation',rotation)
        t.setAttribute('position',position)
        if ($("#"+id)[0]!=null) this.deleteText(id)
        if (id != null) t.setAttribute('id',id)
        
        if (AFRAME.utils.device.isIOS()) {
            let t2 = document.createElement("a-troika-text")
            t2.setAttribute('value','')
            el.appendChild(t)
            el.appendChild(t2)
            return el
        } else {
            return t
        }
    },
    removeEl: function (el){
        if(!el) return
        el.parentElement.removeChild(el)    
    },
    deleteText: function(id){
       if ($("#"+id)!=null) $("#"+id)[0].parentNode.removeChild($("#"+id)[0]);   
    },
    screenMsg: function(msg,icon){
        let s = o.initiateSphere();
        if (!icon) {
            s.appendChild(o.createText(msg, "center",0.02,0.45,o.data.textColor,"0 0 -0.4","0 0 0")) 
        } else {
            s.appendChild(o.createText(msg, "center",0.02,0.45,o.data.textColor,"0 0.15 -0.4","0 0 0"))
            let svg = o.svgImg(icon)
            svg.setAttribute('scale',"0.15 0.15 0.15")
            svg.setAttribute('position','0 0 -0.4')
            svg.setAttribute('material','alphaTest',0.15)
            s.appendChild(svg)
        } 
        o.cameraRig.appendChild(s)     
    },
    setupTurnBtn: function(){
        $("#turn-btn").css("top","10px")
        $("#turn-btn").css("left","50%")
        if (this.data.hasARMenu){
            $("#turn-btn").css("top","50px")
            $("#turn-btn").css("left","calc((100% - 176px)/2)");
        }
        $("#turn-btn").on('click',function(e){
            e.target.style.transform = "scale(1.0)";
            setTimeout(()=>{e.target.style.transform = "scale(1.1)"},100)
            o.selected.forEach(function(item, index, arr){
                //console.log(o.data.turnAxis)
                if (!item.components.turnable) return
                o.toKinematic(item)
                item.object3D.rotation[o.data.turnAxis] += Math.PI/4
                if (item.object3D.rotation[o.data.turnAxis] >= Math.PI*2) item.object3D.rotation[o.data.turnAxis] = 0;
            })
        }) 
        this.lim_min_y = 0;
        this.lim_max_x = window.innerWidth;
        if (this.data.hasARMenu){              
            if ($('ar header').length) this.lim_min_y = $('ar header').height()
            if ($('ar main').length) this.lim_max_x = window.innerWidth-$('ar main').width()
        }
    }, // ok
    setZoom: function(incr,x = this.lim_max_x/2,y = window.innerHeight/2){
        if (o.sceneEl.is('ar-mode')) return
        if (x >= this.lim_max_x || (y < this.lim_min_y && y!= 0) || !this.data.hasZoom) return
        this.zoom[0] += incr/10
        if (this.zoom[0]>=1.3) return this.zoom[0]=1.2;
        if (this.zoom[0]<=0.6) return this.zoom[0]=0.7;
        if (!incr) {
            this.zoom[0] = 1;
            o.dim3.setAttribute('position','0 0 0')
        }
        o.camera.setAttribute('fov',fov = this.zoom[1]*this.zoom[0])
        o.camera.components.camera.camera.updateProjectionMatrix();
        
        // zoom at cursor
        if (this.data.cursorZoom){
            let poiV2 = new THREE.Vector2(x,y)
            let midV2 = new THREE.Vector2(this.lim_max_x/2,(window.innerHeight - this.lim_min_y)/2)
            let ratio = 2;
            poiV2.sub(midV2).divideScalar(ratio*1000)
            
            o.dim3.object3D.position.x += poiV2.x*Math.sign(incr)
            o.dim3.object3D.position.y -= poiV2.y*Math.sign(incr)
        }
    }, // ok
    boxTrigger: function (id,d,h,w,position,trigger,op,append){
        let bT = document.createElement('a-box')
        if (id) bT.setAttribute('id',id)
        bT.setAttribute('class','boxTrigger')
        bT.setAttribute('depth',d)
        bT.setAttribute('height',h)
        bT.setAttribute('width',w)
        bT.setAttribute('visible',true)
        bT.setAttribute('material','opacity',op)
        bT.setAttribute('position',position)
        bT.setAttribute('lasthit',0)
        bT.setAttribute('clickable','')
        bT.setAttribute('collidable',"group", this.collisionGroups['any']); 
        if (!trigger) return 
        bT.addEventListener('grab-start',function(e){
            //console.log('boxTrigger clicked')
            if (o.status!=3) return
            for(i=0;i<trigger.ids.length;i++){
                if (!$('#'+trigger.ids[i]).length) continue;
                for(j=0;j<trigger.meshes.length;j++){
                    let note = trigger.meshes[j];
                    if (note.charAt(1) == "#") note = note.charAt(0)+'s'+note.charAt(2);
                    let obj = {name:trigger.meshes[j]}
                    for (k=0;k<trigger.on.length;k+=2){
                        obj[trigger.on[k]] = trigger.on[k+1]
                    }
                    $('#'+trigger.ids[i])[0].setAttribute('gltf-transform__'+note,'') 
                    $('#'+trigger.ids[i])[0].setAttribute('gltf-transform__'+note,obj) 
                    
                    //let num = parseInt(e.target.getAttribute('lasthit'));
                    //num++
                    //e.target.setAttribute('lasthit',num)
                }
            }
            if (!trigger.boombox) return
            o.boombox.start(trigger.boombox[0],trigger.boombox[1],trigger.boombox[2],trigger.boombox[3]);
        })
        if (trigger.spring) {
            bT.addEventListener('grab-end',function(e){
                if (o.status!=3) return
                //console.log('boxTrigger unclicked')
                //let num = parseInt(e.target.getAttribute('lasthit'));
                //num--;
                //e.target.setAttribute('lasthit',num)
                //if(num>0) return
                
                for(i=0;i<trigger.ids.length;i++){
                    if (!$('#'+trigger.ids[i]).length) continue;
                    for(j=0;j<trigger.meshes.length;j++){
                        let note = trigger.meshes[j];
                        if (note.charAt(1) == "#") note = note.charAt(0)+'s'+note.charAt(2);
                        let obj = {name:trigger.meshes[j]}
                        for (k=0;k<trigger.off.length;k+=2){
                            obj[trigger.off[k]] = trigger.off[k+1] || !!0
                        }
                        $('#'+trigger.ids[i])[0].setAttribute('gltf-transform__'+note,obj) 
                    }
                }
                
                if (!trigger.boombox) return
                o.boombox.stop(trigger.boombox[0],trigger.boombox[1],trigger.boombox[2]);
            })    
        }
        o.triggers.push(bT)
        if (append){
            $(append)[0].appendChild(bT)
        } else {
            return bT
        }
    }, // ok
    
    //Questions
    createQuestion: function (index,fb,op){
        text = o.questions[index]
        if (this.status == 8) {
            this.status = 7;
            this.changeTargetClass();
            this.status = 8;
        }
        
        if (this.sceneEl.is("vr-mode")) {
            this.camera.setAttribute('look-controls','enabled',false)
        }
        
        // enquete concluded
        if (!text) {
            if (this.mode.charAt(0) != 'f') o.camera.setAttribute('look-controls','enabled',true)
            if (!questions) return
            if (fb=="feedback"){
                this.screenMsg('Obrigado pelo feedback!',"happy")
                this.fillForm()
                setTimeout(function(){
                    o.endQuestion()  
                    o.dur[o.dur.length-1] = Math.round(o.dur[o.dur.length-1]-3);
                }, 3000);
            } else {
                o.endQuestion()  
            }
            return
        }
        
        // questions concluded
        if (text[text.length-1].slice(0,5)=="entry" && questions.length != this.questions.length && this.results!=null && this.status == 7) {
            let html = 'Você acertou '+this.results[1]+' questões de '+this.results[0]+'!';
            if (this.results[1] == 1) html = 'Você acertou '+this.results[1]+' questão de '+this.results[0]+'!';
            if (this.results[1]/this.results[0]>=0.6){
                this.screenMsg(html,"happy")   
            } else {
                this.screenMsg(html,"sad")
            }
            o.fillResults('question')
            setTimeout(function(){
                o.dur[o.dur.length-1] = Math.round(o.dur[o.dur.length-1]-3);
                o.createQuestion(0) 
            }, 3000);
            return
        }
        
        this.dur.push('q'+questions.indexOf(text))
        this.dur.push(0)
        
        let s = this.initiateSphere(op);
        o.cameraRig.appendChild(s);
        
        let tam = 0.4;
        if (o.sceneEl.is('vr-mode')) tam = 0.6;
            
        let correct;
        for (i=0;i<text.length;i++){
            let round;
            let adj = Math.ceil(text[i].length/60);
            let el = document.createElement('a-entity');
            s.appendChild(el);
            el.setAttribute('material',{
                shader: 'flat',
                color: this.data.questionBackColor,
            })
            
            if (text[i].slice(0,5)=="entry") {
                if (form && form != null) {
                    o.form[0] = form;
                    o.form.push(text[i])
                }
                return
            }
            
            // header creation
            if (i == 0){
                el.setAttribute('position', "0 0.15 -"+tam);
                el.appendChild( this.createText(text[i],"center",0.015,0.45,this.data.questionTextColor,"0 0 0.001","0 0 0"))
                round = this.drawRound(0.5,(0.03+0.02*adj),0.02)
                el.setAttribute('h',(0.15-(0.03+0.02*adj)/2))
            } 
            
            // options creation
            else {
                el.setAttribute('material','opacity',0.7)
                el.setAttribute('class',"qclickable");
                el.setAttribute('hoverable', "");
                el.setAttribute('clickable', "");
                if (text[i].charAt(0) == 'x') {
                    correct = el; 
                    text[i] = text[i].substring(1)
                }
                el.appendChild( this.createText(text[i],"left",0.015,0.42,this.data.questionTextColor,"-0.21 0 0.001","0 0 0"))
                round = this.drawRound(0.45,(0.02+0.02*adj),0.02)
                let pos = el.previousSibling.getAttribute('h')-(0.02+0.02*adj)/2-0.015;
                el.setAttribute('h',pos-(0.02+0.02*adj)/2)
                el.setAttribute('position', "0 "+pos+" -"+tam);
                
                el.addEventListener("hover-start",function(){
                    el.setAttribute('material','opacity',1)
                })
                el.addEventListener("hover-end",function(){
                    el.setAttribute('material','opacity',0.7)
                })
                el.addEventListener("grab-start",function(){
                    if (!correct) {
                        o.form.push(this.children[0].getAttribute("value"))
                        
                        setTimeout(function(){
                            //o.questions.shift();
                            o.dur[o.dur.length-1] = Math.round(o.dur[o.dur.length-1]-3);
                            o.questions.splice(index, 1);
                            if (o.status == 7) {
                                o.createQuestion(0, "feedback");    
                            } else {
                                o.deleteSphere()
                                o.sceneEl.emit('action')
                            }
                        },3000)
                        this.setAttribute('material','color','#008000')
                        $('.qclickable').removeClass( "qclickable");
                        return
                    }
                    o.results[0]++;
                    correct.setAttribute('material','color','#008000')
                    
                    if (this == correct) {
                        s.appendChild(
                        o.createText("Resposta Certa!","center",0.015,0.45,'#008000',"0 0.22 -0.4","0 0 0"))
                        let svg = o.svgImg("happy")
                        svg.setAttribute('scale',"0.04 0.04 0.04")
                        svg.setAttribute('position','0.09 0.22 -0.4')
                        s.appendChild(svg)
                        o.results[1]++;
                    } 
                    else {
                        s.appendChild(
                        o.createText("Resposta Errada!","center",0.015,0.45,'#800000',"0 0.22 -0.4","0 0 0"))
                        this.setAttribute('material','color','#800000')
                        let svg = o.svgImg("sad")
                        svg.setAttribute('scale',"0.04 0.04 0.04")
                        svg.setAttribute('position','0.09 0.22 -0.4')
                        s.appendChild(svg)
                    }
                    $('.qclickable').removeClass( "qclickable");
                    
                    setTimeout(function(){
                        //o.questions.shift();
                        o.dur[o.dur.length-1] = Math.round(o.dur[o.dur.length-1]-3);
                        o.questions.splice(index, 1);
                        if (o.status == 7) {
                            o.createQuestion(0);    
                        } else {
                            o.deleteSphere()
                            o.sceneEl.emit('action')
                        }
                    },3000)
                    
                },{once:true})
            }
            el.setObject3D('mesh', new THREE.Mesh(round, new THREE.MeshPhongMaterial( {color: new THREE.Color(this.data.buttonColor), side: THREE.DoubleSide})))
        }
    }, // ok
    endQuestion: function(){
        if (o.sceneEl.is("2d-mode")){
            o.deleteSphere()
            $('#pause').hide();
            $('#play').hide();
            $('#playmsg').hide();
            if (o.data.has2DMenu) o.overlayMenu();
        } else {
            if (o.data.has3DMenu) o.toggleMenu();
        }
        o.status = 4;
        o.changeTargetClass()
        o.end = true;
    }, // ok
    fillForm: function(){
        var data = {}
        for (i=1;i<=((o.form.length-1)/2);i++){
            data[o.form[i]]=o.form[((o.form.length-1)/2)+i]
        }   
        $.ajax({
            url: o.form[0],
            type: 'GET',
            mode: 'no-cors',
            crossDomain: true,
            dataType: "xml",
            data: data,
            success: function(jqXHR, textStatus, errorThrown) {console.log('Enviado com sucesso.')},
            error: function(jqXHR, textStatus, errorThrown) {}
        });
    },  // ok
    fillResults: function(type){
        if (!exer) return
        var data = {
            a: urlParams.get('a'),
            b: urlParams.get('b'),
            c: o.results[1],
            d: o.results[0],
            e: o.dur,
            vr: o.sceneEl.is('ar-mode') || o.sceneEl.is('vr-mode')
        }
        if (geo) data.g = o.geo;
        if (dev) return
        o.sendMsg(data)
        $.ajaxSetup({contentType: "application/json; charset=utf-8"});
        $.post(opath+"setresults",JSON.stringify(data),
        function(data){
            console.log(data)
        }).fail(function(err) {
            console.log(err)
        });
        
        //o.results = null
        //o.dur = null
        //o.geo = null
    }, // ok
    
    //Baseline
    iniState: function (){
        this.fadeIn('#000')
        setTimeout(function(){
            $("a-scene *").each(function(){
                if (this.tagName == "A-ASSETS" || this.parentElement.tagName == "A-ASSETS" || this.tagName == "DIV" || this.tagName == "CANVAS" || this.tagName == "BUTTON" || this.id == "svgCursor" || this.classList.contains('environment')|| this == o.lid) return
                let obj = {};
                let initial;
                let mixin;
                let self = this;
                for (i=0;i<o.baseline.length;i++){
                    if (o.baseline[i].el == this) {
                        obj = o.baseline[i];
                        initial = true;
                        break
                    }
                }
                if (!initial) {
                    this.parentNode.removeChild(this);
                    return
                }
                
                for (const name in this.components){
                    if (!(name in obj)) {
                        this.removeAttribute(name);
                        continue
                    }
                    
                    if (name.includes('gltf-transform')) {
                        var original = this.components[name].original
                        var name2 = this.getAttribute(name).name;
                        var mesh = this.getObject3D('mesh');
                        
                        //console.log(original,name2,mesh)
                        
                        if (!mesh) return;
                        mesh.traverse(function (n) {
                            if (!n.isMesh || !name2 || n.name != name2) return
                            n.position.copy(original[0])
                            n.rotation.copy(original[1])
                            n.scale.copy(original[2])
                            return
                        })
                        continue
                    }
                    if (name.includes('gltf-material')) {
                        self.setAttribute(name,'reset',true) 
                        continue
                    }
                    
                    if (name == "gltf-model" || name == "gltf-submodel" || name.includes('gltf-transform') || name.includes('gltf-material') || name == "id" || name.includes('event-set')) continue
                    
                    if (name == 'mixin'){
                        mixin = obj[name]
                        this.setAttribute("mixin",obj[name]);
                        continue
                    }
                    if (name == "animation-mixer"){
                        if (this.getAttribute("animation-mixer").clip == "*"){
                            let html = "clip:'' "+obj[name]
                            this.setAttribute(name, html); 
                            this.setAttribute("animation-mixer",'clip',"*");
                            continue
                        }
                    }
                    if (name.includes("animation")) continue
                    
                    if (this.components[name] == ''){
                        if (obj[name] != '') {
                            this.setAttribute(name,obj[name]);  
                        }
                    } else {
                        this.setAttribute(name,obj[name]); 
                    }
                }
            });
            $('#rhandcursorimg')[0].setAttribute('scale',"0.3 0.3 0.3");
            $('#lhandcursorimg')[0].setAttribute('scale',"0.3 0.3 0.3");
                        
            if (o.econtrol!= null) o.setupEnvironment();
            setTimeout(function(){
                o.fadeOut() 
                o.startMedia();
                o.sessionHandler(2);
            },200)
        },300)
    },
    registerIniState: function(){
        $("a-scene *").each(function(){
            if (this.tagName == "A-ASSETS" || this.parentElement.tagName == "A-ASSETS" || this.tagName == "DIV" ||  this.tagName == "CANVAS" || this.tagName == "BUTTON" || this.id == "svgCursor" || this.classList.contains('environment')) return
            let obj = {el:this}
            for (i=0;i<this.attributes.length;i++){
                let name = this.attributes[i].nodeName 
                //if (name == "gltf-model" || name == "gltf-submodel" || name == "id") continue

                obj[name] = this.attributes[i].nodeValue;
            } 
            if (this.tagName == "A-CAMERA"){
                let camerapos = o.camera.object3D.position;
                if (camerapos != null){
                    obj['position'] = camerapos.x+' '+camerapos.y+' '+camerapos.z
                }
            }
            o.baseline.push(obj)
        });
        $('video').each(function(){
            if (this.classList.contains('peervideo')) return
            this.pause();
            this.currentTime = 0
        })
        $('audio').each(function(){
            if (this.classList.contains('peeraudio')) return
            this.pause();
            this.currentTime = 0
        })
        $('[sound]').each(function(){
            this.components.sound.stopSound()
        })
    },
    
    //Session
    startMedia: function(){
        for (i=0;i<this.media.length;i++){
            if (this.media[i].components !=null && this.media[i].components.sound !=null){
                this.media[i].components.sound.playSound();
                this.media[i].components.sound.pauseSound();
            } else {
                this.media[i].playpause()
            }
        } 
        if (!this.permissions.mute) {
            this.permissions.mute = true;
            this.sessionHandler('mute')
        }
    },
    sessionHandler: function(status,bol){
        switch(status) {
            case 1: status = 'ready'; break;
            case 2: status = 'intro'; break;
            case 3: status = 'play'; break;       
            case 4: status = 'pause'; break;
            case 5: status = 'replay'; break;
            case 6: status = 'mute'; break;
            case 7: status = 'question'; break;
            case 8: status = 'action'; break;
            case 9: status = 'end';
        }
        o.sceneEl.emit('status-'+status)
        this.masterControl(status)
        //0 - loading - no action
        if (status == "ready"){ 
            if (dev) console.log('status 1 ready')
            o.status = 1;
            // load pre
            if (o.timeline.pre!=null) {
                this.timeline.pre();
                delete this.timeline.pre;
            }
        } 
        else if (status == "intro"){ //2 - intro
            if (dev) console.log('status 2 intro')
            o.status = 2;
            // pre correction
            if (o.timeline.pre!=null) {
                this.timeline.pre();
                delete this.timeline.pre;
            }
            
            $('a-scene canvas').show()
            o.camera.setAttribute('look-controls',{
                touchEnabled: true,
                mouseEnabled: true
            })
            if (this.data.hasIntro) {
                this.showIntro(true)
            } else {
                // load ini
                if (o.timeline.ini!=null) {
                    this.timeline.ini();
                    delete this.timeline.ini;
                }
                // Show menus only after Intro
                if (this.sceneEl.is("2d-mode")) {
                    if (this.data.hasARMenu) o.showARMenu()
                    else if (!this.menu2DIsOpen) {
                        $('ar').hide();
                        this.overlayMenu();                     
                    }
                    this.logo2d(false)
                    this.toggleZoom(true)
                } 
                else if (this.sceneEl.is("vr-mode")) {
                    $('ar').hide();
                    this.logo2d(false)
                    this.toggleZoom(false)
                    if (!this.menu3DIsOpen) this.toggleMenu(true);     
                } 
                else if (this.sceneEl.is("ar-mode")) {
                    this.logo2d(true)
                    this.toggleZoom(false)
                    if (this.data.hasARMenu) o.showARMenu()
                }
            }
        } 
        else if (status == "play"){
            if (dev) console.log('status 3 play')
            if (this.data.hasIntro){
                this.sessionHandler(2)
                return
            }
            if (this.end && !this.replay) return
            if (this.data.has3DMenu && this.menu3DIsOpen) this.toggleMenu(); 
            if (!bol && (o.status == 7 || o.status == 8)) return
            if (o.override(bol)){
                if (hide && this.status <=2) this.startMedia();    
                this.playSession() 
                o.status = 3;
            }
            this.changeTargetClass()
        } 
        else if (status == "pause"){
            if (dev) console.log('status 4 pause')
            if (!o.override(bol)) return
            o.status = 4;
            this.pauseSession();
            if (this.sceneEl.is("2d-mode") && this.data.has2DMenu) return
            if (this.sceneEl.is("vr-mode") && this.data.has3DMenu) this.toggleMenu();
        } 
        else if (status == "replay"){
            if (dev) console.log('status 5 replay')
            if (!o.override(bol)) return
            o.status = 5;
            this.changeTargetClass()
            this.replay = true;
            this.pauseSession();
            this.wasPlaying = [];
            this.delay += this.run;
            this.run = 0;
            if (timeline!=null) Object.assign(o.timeline, timeline);
            if (this.menu3DIsOpen) this.toggleMenu();
            if (this.menu2DIsOpen) this.overlayMenu();
            this.toggleZoom(false)
            $('#playmsg').show();
            $('#play').show();
            this.iniState();
        } 
        else if (status == "mute"){
            if (dev) console.log('status 6 mute',this.permissions.mute)
            if (this.permissions.mute){
                $('#mute').html('volume_up');
                $('#mute').css('color','#D0D0D0')
                for (i=0;i<o.media.length;i++){
                    if (o.media[i].components !=null && o.media[i].components.sound !=null){
                        o.media[i].setAttribute( 'sound','volume',1)
                    } else {
                        o.media[i].muted = false;
                        if (o.media[i].id != 'introAudio') o.media[i].volume = 1;     
                    } 
                } 
            } else{
                $('#mute').html('volume_off');
                $('#mute').css('color','red')
                for (i=0;i<o.media.length;i++){
                    if (o.media[i].components !=null && o.media[i].components.sound !=null){
                        o.media[i].setAttribute( 'sound','volume',0)
                    } else {
                        o.media[i].muted = true;
                        o.media[i].volume = 0;     
                    }   
                } 
            }
            this.permissions.mute = !this.permissions.mute;
        } 
        else if (status == "question"){ // questions
            if (dev) console.log('status 7 questions')
            o.status = 7;
            this.changeTargetClass();
            this.pauseSession();
            if (this.replay && this.end) return
            if (this.sceneEl.is("2d-mode") && this.data.has2DMenu) this.overlayMenu();
            this.createQuestion(0);
        } 
        else if (status == "action"){ // user Action
            if (dev) console.log('status 8 action')
            if (o.status != 8) return
            if (this.sceneEl.is("2d-mode") && this.data.has2DMenu) this.overlayMenu();
            this.sessionHandler('play',true)
            this.changeTargetClass()
            var data = {
                a: urlParams.get('a'),
                b: urlParams.get('b'),
                e: o.dur,
                vr: o.sceneEl.is('ar-mode') || o.sceneEl.is('vr-mode')
            }
            if (geo) data.g = o.geo;
            o.sendMsg(data)
        } 
        else if (status == 'exit'){ // exit
            if (dev) console.log('status 9 exit')
            if (!o.override(bol)) return
            if (!jQuery.isEmptyObject(this.questions)) return this.sessionHandler(7);
            for (i=0;i<o.media.length;i++){
                if (o.media[i].components !=null && o.media[i].components.sound !=null){
                    o.media[i].components.sound.stopSound();
                } else {
                    o.media[i].currentTime = 0;
                    o.media[i].pause()
                }
            }
            if (this.sceneEl.is("2d-mode")) {
                this.camera.setAttribute('look-controls','enabled',false)
            }
            this.screenMsg('Obrigado por assistir!')
            setTimeout(function(){
                if (o.sceneEl.is("vr-mode")) {
                    o.screenMsg('Retire o seu óculos.')
                    setTimeout(function(){
                        (dev)?document.location.reload(true):window.location.href = "../estudar/index.html";
                    }, 10000);
                } else {
                    (dev)?document.location.reload(true):window.location.href = "../estudar/index.html";
                }
            }, 2500);
        }
    }, 
    pauseSession: function(ele){
        $('video').each(function(){
            if (this.classList.contains('peervideo') || this.id == 'arvideo') return
            if (this.playing){
                this.pause();
                //this.currentTime = o.run/1000;
                o.wasPlaying.push([this,"video",true])
            }
        })
        $('audio').each(function(){
            if (this.classList.contains('peeraudio')) return
            if (this.playing){
                this.pause();
                //this.currentTime = o.run/1000;
                o.wasPlaying.push([this,"audio",true])
            }
        })
        $("a-scene *").each(function(){
            if (this.id == "svgCursor" || this.classList.contains('peer')) return
            if (this.components != null) {
                Object.keys(this.components).forEach(comp => {
                    if(comp=='animation-mixer') {
                        if(this.components[comp].data.timeScale != 0){
                            o.wasPlaying.push( [this,comp,this.components[comp].data.timeScale]);
                            this.setAttribute("animation-mixer",{
                                timeScale:0,
                               // startFrame: o.run
                            })
                        } 
                    } 
                    else if(comp.includes('animation') && this.components[comp].animation != null && this.components[comp].animationIsPlaying && this != o.lid && (this.getAttribute('pOnP')!= null && this.getAttribute('pOnP'))) {
                        this.components[comp].animationIsPlaying = false
                        o.wasPlaying.push([this,comp,true])   
                    } 
                    else if (comp == "sound" && this.components.sound.isPlaying) {
                        this.components.sound.pool.children[0]["_progress"] = o.run/1000;                  
                        this.components.sound.pauseSound();
                        o.wasPlaying.push([this,comp,true])
                    }
                    else if (comp == "buzzer" && this.components.buzzer.oscillator) {
                        this.components.buzzer.oscillator.disconnect(); 
                        o.wasPlaying.push([this,comp,true])
                        
                    }
                });
            }
        });
        $('#pause').text('play_arrow');
        $("#pause").attr("id","play");
        if(o.movementType) o.cameraRig.setAttribute('movement-controls','enabled',false);
    },
    playSession: function(ele){
        o.wasPlaying.forEach((n)=>{
            switch (n[1]) {
                case "video": case "audio": 
                    n[0].play();
                break
                case "animation-mixer":
                    n[0].setAttribute("animation-mixer","timeScale",n[2])
                break
                case "sound":
                    n[0].components.sound.playSound();
                break
                case "buzzer":
                    n[0].components.buzzer.oscillator.connect(n[0].components.buzzer.gainNode);
                break
                default:
                    n[0].components[n[1]].animationIsPlaying = true
            }
        });
        o.wasPlaying = [];
        $('#play').text('pause');
        $("#play").attr("id","pause");
        $('#playmsg').hide();
        if(o.movementType) o.cameraRig.setAttribute('movement-controls','enabled',true);
    },
    userAction: function (type,data,bol,func){
        this.status = 8;
        this.pauseSession();
        if (this.menu2DIsOpen) this.overlayMenu()
        if (this.menu3DIsOpen) this.toggleMenu()
        if (type == 'question') {
            o.createQuestion(data,'',bol?1:0)
            o.sceneEl.addEventListener('action',function(){
                o.sceneEl.removeEventListener('action',function(){})
                if (func) func();
                o.sessionHandler(8)
            },{once:true})
        }
        else if (type == 'action') {
            this.dur.push('ac')
            this.dur.push(0)
            data.classList.add("aclickable");
            this.changeTargetClass() 
            o.sceneEl.addEventListener('action',function(){
                data.classList.remove("aclickable");
                o.sceneEl.removeEventListener('action',function(){})
                if (func) func();
                if (bol) data.parentElement.removeChild(data);
                o.sessionHandler(8)
                o.dur[o.dur.length-1] = Math.round(o.dur[o.dur.length-1]);
            },{once:true})
        } 
    }, //ok
    rewind: function(time){
        o.delay += o.run - time*1000;
    }, //ok
        
    //Camera
    setupCamera: function(){        
        let lid = document.createElement('a-plane');
        lid.setAttribute('width',5);
        lid.setAttribute('height',5);
        lid.setAttribute('material',{color: this.data.menuColor});
        lid.setAttribute('opacity',0)
        lid.setAttribute('visible',false)
        lid.setAttribute('position',"0 0 -0.1");
        this.camera.appendChild(lid) 
        this.lid = lid;
        lid.setAttribute("animation__fadein",{
            property: 'material.opacity',
            startEvents: 'fadein',
            from: 0,
            to:1,
            dur:150,
            easing:'linear'
        })
        lid.setAttribute("animation__fadeout",{
            property: 'material.opacity',
            startEvents: 'fadeout',
            from: 1,
            to:0,
            dur:150,
            easing:'linear'
        })
        
        o.camera.addEventListener("raycaster-intersection", function(e){
            e.preventDefault()
            e.stopImmediatePropagation();
            let els = o.emitFiltered(e);
            e.target.emit('raycaster-intersection-filtered',{els:els})
            o.intersectListener(e,els,true)
        });
        o.camera.addEventListener("raycaster-intersection-cleared", function(e){
            o.intersectListener(e,o.emitFiltered(e))
        });
    },
    fadeIn: function(color){
        this.lid.setAttribute('material',{color: color || this.data.menuColor});
        this.lid.setAttribute('visible',true);
        this.lid.emit('fadein')
    },
    fadeOut: function(){
        this.lid.emit('fadeout')
        setTimeout(function(){
            o.lid.setAttribute('visible',false);
        }, 100);
    },
    fadeTo: function(color,pos,rot,fun){
        this.fadeIn(color)
        setTimeout(function(){
            o.lid.setAttribute('visible',false)
            if (fun != null) fun();
            if (!pos) return;
            o.cameraRig.setAttribute('position',pos)
            if (!rot) return;
            o.cameraRig.setAttribute('rotation',rot)
        }, 250);
        setTimeout(function(){
            o.fadeOut()
        }, 500);
    }, 
    
    navigation: function(){
        o.camera.setAttribute('wasd-controls','enabled',false)
        
        $('a-assets').append('<a-mixin id="checkpoint" geometry="primitive: cylinder; radius: 0.5;height:0.01" material="color: #39BB82" checkpoint clickable hoverable></a-mixin>')
        o.cameraRig.addEventListener('navigation-start',function(e){
            if (e.target.getAttribute('checkpoint-controls').mode == 'teleport') o.fadeIn('black') 
        })
        o.cameraRig.addEventListener('navigation-end',function(e){
            if (e.target.getAttribute('checkpoint-controls').mode == 'teleport') o.fadeOut()
        })
        o.curveRay = document.createElement('a-entity');
        o.sceneEl.appendChild(o.curveRay)
        
        let a = o.mode.charAt(0)
        if (a == 'f' || a == 'r') {
            this.movementType = false;
            //o.cameraRig.setAttribute('wasd-controls','enabled',false)
        } 
        else if (a == 'w') {
            this.movementType = 'wasd'
            console.log(this.movementType+' movement')
            o.cameraRig.setAttribute('movement-controls',{
                fly: o.data.cursorFly,
                controls:"gamepad,trackpad,keyboard,touch",
                enabled: false,
                speed:0.2,
                camera: o.camera
            })
            // keyboard-controls: WASD + arrow controls for movement, and more.
            //touch-controls: Touch screen (or Cardboard button) to move forward. Touch-to-move-forward controls for mobile.
            // gamepad-controls: Gamepad-based rotation and movement.
            // trackpad-controls: Trackpad-based movement. 3dof (Gear VR, Daydream) controls for mobile.  
        }
        else if (a == "p"||a == "g"||a == "c") {
            this.movementType = 'checkpoint'
            console.log(this.movementType+' movement')
            o.cameraRig.setAttribute('movement-controls',{
                controls:"checkpoint",
                enabled:false
            });
            o.cameraRig.setAttribute('checkpoint-controls','mode','animate');
            //o.cameraRig.setAttribute('checkpoint-controls','mode','teleport')
            //o.cameraRig.setAttribute('checkpoint-controls','animateSpeed',2) 
        }
        
        if (this.movementType && $('[nav]').length) {
            console.log('navmesh constrained')
            o.cameraRig.setAttribute('movement-controls','constrainToNavMesh',true)
        }
    },
    
    //Setup Online
    setupOnline: function(){
        AFRAME.registerComponent('onlinerig', {
            schema: {
            },     
            init: function () {
                createdAudios = {}
                
                this.v = new THREE.Vector3()
                
                if (master && seats && seats.length>0){
                    o.cameraRig.setAttribute('position',seats[0][0])
                    o.cameraRig.setAttribute('rotation',seats[0][1]) 
                }
            },
            tick: function () {
                // check if anyone connected
                if (!peerConnected && !localCaller) return
                
                // Slaves don have some buttons
                if (!master && $('#play').is(":visible")) {
                    $('#play').hide()
                    $('#playmsg').hide()
                    $('#replay').hide()
                    $('#exit').hide()
                }
                      
                // Making self avatar listener
                let arr = [o.cameraRig,o.camera,o.lhand,o.rhand];
                for (i=0;i<arr.length;i++){
                    if (!arr[i]) return
                    if (!arr[i].getAttribute('online-el')) arr[i].setAttribute('online-el',localCaller+'-'+i)
                }
                
                // registering self avatar
                if (o.selfAvatar.defined && !o.selfAvatar.sent) {
                    o.selfAvatar.sent = true;
                    o.cameraRig.components['online-el'].props = o.selfAvatar
                }                 
                
                for (const p in peer){
                    if (remoteQueue[p+'-0'] && remoteQueue[p+'-0'][1]) {
                        if (!createdEls[p]){
                            createdEls[p] = true;
                            this.createAvatar(p)
                        }   
                    }
                    else if (createdEls[p]) {
                        this.deleteAvatar(p)
                        delete createdEls[p]     
                    }
                }
            },
            createAvatar: function(p){
                console.log('avatar created',p)
                let props = remoteQueue[p+'-0'][1]
                
                let avatar = document.createElement('a-entity');
                avatar.setAttribute('class','peer');
                avatar.setAttribute('visible',false);
                avatar.setAttribute('online-el',p+'-0');
                //avatar.setAttribute('scale','0.3 0.3 0.3');
                
                let body = document.createElement('a-entity');
                body.setAttribute('class','body');
                body.setAttribute('position','0 1.6 0');
                
                if (props.type == 'Homem'){
                    body.setAttribute('gltf-submodel',{src: "#avatars",part: "m2body"});
                } else if (props.type == 'Homem1'){
                    body.setAttribute('gltf-submodel',{src: "#avatars",part: "m1body"});
                } else if (props.type == 'Mulher'){
                    body.setAttribute('gltf-submodel',{src: "#avatars",part: "w1body"});
                }
                body.setAttribute('gltf-material__hands',{
                    materials:"hands",
                    opacity:0,
                });
                body.setAttribute('gltf-material__skin',{
                    materials:"skin",
                    color:props.color,
                });
                
                body.setAttribute('online-el',p+'-1');
                avatar.appendChild(body)
                
                let text = o.createText(props.name,"center",0.15,"infinity","black","0 0.7 0","0 0 0");
                text.setAttribute('rotation','0 180 0');
                body.appendChild(text)
                
                let lhand = document.createElement('a-entity');
                lhand.setAttribute('class','lhand');
                lhand.setAttribute('visible',false);
                //lhand.setAttribute('gltf-submodel',{src: "#avatars",part: "lhand"});  
                
                //$("a-assets").append('<a-asset-item src="https://cdn.aframe.io/controllers/hands/leftHandLow.glb" id="lhandmodel"></a-asset-item>')
                
                lhand.setAttribute('gltf-model',"https://cdn.aframe.io/controllers/hands/leftHandLow.glb");

                lhand.setAttribute('gltf-material__skin',{
                    materials:"hands",
                    color:props.color,
                });
                lhand.setAttribute('online-el',p+'-2');
                avatar.appendChild(lhand)
                
                let rhand = document.createElement('a-entity');
                rhand.setAttribute('class','rhand');
                rhand.setAttribute('visible',false);
                //rhand.setAttribute('gltf-submodel',{src: "#avatars",part: "rhand"});  
                
                rhand.setAttribute('gltf-model',"https://cdn.aframe.io/controllers/hands/rightHandLow.glb");

                rhand.setAttribute('gltf-material__skin',{
                    materials:"hands",
                    color:props.color,
                });
                rhand.setAttribute('online-el',p+'-3');
                avatar.appendChild(rhand)
                
                if (onlineAudio[p+'-0']){
                    let id = this.createAudio(avatar,p+'-0')
                    //set as positional sound?
                }
                o.dim3.appendChild(avatar)
            }, 
            deleteAvatar: function(p){
                $('.peer').each(function(){
                    if (this.components['online-el'].data==p+'-0') {
                        this.parentElement.removeChild(this);
                    }
                })
            },
            createAudio: function(avatar,conid){
                let audioEl = document.createElement('audio');
                audioEl.setAttribute("autoplay", "autoplay");
                audioEl.setAttribute("playsinline", "playsinline");
                
                let arr = Object.keys(onlineAudio);
                let index = arr.indexOf(conid);
                
                audioEl.setAttribute("id", "audio"+index);
                audioEl.setAttribute("class", "peeraudio");
                audioEl.srcObject = onlineAudio[conid];
                
                // start with volume 0.
                audioEl.muted = true;
                audioEl.volume = 0;
                
                if (o.status > 2 || (o.status == 2 && !o.data.hasIntro) || master) {
                    audioEl.muted = false;
                    audioEl.volume = 1; 
                }
                avatar.appendChild(audioEl)
                
                return "#audio"+index;
            },        
        })
        o.sceneEl.setAttribute('onlinerig','')     
        o.selfAvatar = {
            type: "Homem",
            color: "#E8BEAC",
            name: "Orbinauta",
            defined: false,
            sent: false
        }
        $("#av-type p").on("click",function(e){
            $("#av-type p").removeClass("av-active")
            o.selfAvatar.type = jQuery(this).text()
            jQuery(this).addClass("av-active")
        })
        $("#av-color p").on("click",function(e){
            $("#av-color p").removeClass("av-active")
            o.selfAvatar.color = jQuery(this).css( "background-color" )
            if (!hide) $('#overlay').css( "background-color" ,o.selfAvatar.color)
            jQuery(this).addClass("av-active")
        })
        $("#av-pick button").on("click",function(e){
            let name = $('#av-pick input').val()
            if (!name) {
               $('#av-pick input').css('border','solid 2px red') 
            } else {
                o.selfAvatar.name = name;
                o.selfAvatar.defined = true;
                $('#overlay').hide();
                o.changeMode($('#av-pick').attr("mode"));
                if (!hide){
                    o.openFullscreen()
                    //screen.orientation.lock("landscape").then((v)=>{}, (m)=>{});
                    o.startMedia();
                }
                o.tryKeepScreenAlive(10);
                o.sessionHandler(2)
                
                // unmute avatars
                let arr = Object.keys(onlineAudio);
                for (i=0;i<arr.length;i++){
                   if($('#audio'+i).length) {
                       $('#audio'+i)[0].muted = false;
                       $('#audio'+i)[0].volume = 1; 
                   }
                }
            }
        })      
    },
    pingDC: function(dcArr,el,data) {
        dcArr.forEach(function(item, index, arr){
            if (item.readyState != "open") return
            let obj = {}
            obj[el] = data;
            item.send(JSON.stringify(obj))
        }) 
    },
    override: function(override){
        if (this.multi && !master && (!override && peerConnected)) return false 
        return true
    },
    masterControl: function(status){
        if (!this.multi || !master) return
        dC2s.forEach(function(item){
            if (item.readyState != "open") return
            item.send(JSON.stringify([status]))
        })
    },
    muteMedia: function(el){
        if (!master) return
        let conid = jQuery(el.parentElement).data("conid")
        let mute = !el.checked
        let type = 'audio'
        if (el.name.slice(-1) == 'v') type = 'video'

        if (type == "audio") {
            let arr = Object.keys(onlineAudio);
            let index = arr.indexOf(conid);
            if (mute){
                $('#audio'+index)[0].volume = 0;
                $('#audio'+index)[0].muted = true;
            } else {
                $('#audio'+index)[0].volume = 1;
                $('#audio'+index)[0].muted = false;
            }
        }
        else if (type == "video") {
            
        }
        dC2s.forEach(function(item){
            if (item.readyState != "open") return
            item.send(JSON.stringify([conid,type,mute]))
        })
        
    },
    muteAllMedia: function(type = 'audio'){
        if (!master) return
        let mute = !el.checked
        if (type == 'video') type = 'video'

        if (type == "audio") {
            let arr = Object.keys(onlineAudio);
            for (i=0;i<arr.length;i++){
                if (mute){
                    $('#audio'+index)[0].volume = 0;
                    $('#audio'+index)[0].muted = true;
                } else {
                    $('#audio'+index)[0].volume = 1;
                    $('#audio'+index)[0].muted = false;
                }
            }
        }
        else if (type == "video") {
            
        }
        dC2s.forEach(function(item){
            if (item.readyState != "open") return
            item.send(JSON.stringify([conid,type,mute]))
        })
        
    },
    
    //AR
    setARSystem: function(){
        //create AR Video
        o.ARvideo.id = 'arvideo';
        o.ARvideo.setAttribute('autoplay', '');
        o.ARvideo.setAttribute('muted', '');
        o.ARvideo.setAttribute('playsinline', '');
        o.ARvideo.style.objectFit= 'fill';
        o.ARvideo.style.position = 'absolute'
        o.ARvideo.style.left = '0px'
        o.ARvideo.style.zIndex = '-2'
        o.ARvideo.addEventListener( 'loadedmetadata', () => {
            o.deleteSphere()
            o.ARvideo.setAttribute('width', o.ARvideo.videoWidth);
            o.ARvideo.setAttribute('height', o.ARvideo.videoHeight);
            if (o.ARsystem[0] >= 5) {
                o.ARsystem[1]._startAR();
            } else if (o.ARsystem[0] == 1){
                o.arResize()
            }
            o.canvas.style.backgroundColor = "transparent";
            $("#ar_loading").hide()
        });
        
        if (o.sceneEl.systems['mindar-image-system']) {
            o.ARsystem.push(5)
            o.ARsystem.push(o.sceneEl.systems['mindar-image-system'])
            
        } else if (o.sceneEl.systems['mindar-face-system']){
            o.ARsystem.push(7)
            o.ARsystem.push(o.sceneEl.systems['mindar-face-system'])
            
        } else if (AFRAME.components['gps-new-camera']){
            o.ARsystem.push(1)
            //this.ARsystem.push(o.sceneEl.systems.arjs)
        } else if (o.sceneEl.systems.ar){
            //this.ARsystem.push(0)
            //this.ARsystem.push(o.sceneEl.systems.arjs)
        }
        
        // allow swap cameras
        /*
        navigator.mediaDevices.enumerateDevices()
            .then(function(devices) {
            for (i=0;i<devices.length;i++) {
                if(devices[i].kind == "videoinput"){
                    if (i==0) o.ARcamera = devices[i].deviceId;
                    o.ARcameras.push( devices[i].deviceId ,[devices[i].deviceId , devices[i].label]   )           
                }
            }
            if (o.ARcameras.length > 1) {
                $('#camera-btn').css('display','flex')
                $('#camera-btn').on('click',function(){
                    o.changeCamera()
                })
            }
        });
        */
    },
    changeCamera: function() {
        if (!o.stream) return
        o.canvas.style.backgroundColor = o.data.menuColor;//'#D0D0D0'
        $("#ar_loading").show()
        
        let index = o.ARcameras.indexOf(o.ARcamera);
        if (index == o.ARcameras.length-1){
            o.ARcamera = o.ARcameras[0]
        } else {
            o.ARcamera = o.ARcameras[index+1]
        }
        if (dev) console.log(o.ARcamera)
        /*
        if (o.stream) {
            o.stream.getTracks().forEach(function(i) {
                i.stop();
            })
        }*/
        if (o.ARsystem[0] >= 5) {
            if (o.ARsystem[1].processingImage) {
                o.ARsystem[1].processingImage = false;
                o.ARsystem[1].stop()
            }
            o.arVisible(true)
        }
        else if (o.ARsystem[0] == 1) {

        }
        o.getARMedia()
    },
    toggleAR: function() {
        if ($('ar main').css('right') == '0px') {
            $('ar main').animate({right: "-176px"}, 200);
            $('ar main footer').animate({right: "-176px"}, 200);
            $('#toggle-btn').animate({right: "5px"}, 200);
            $('#zoom-btn').animate({right: "5px"}, 200);
            $('#turn-btn').css('left', "50%");
            $('#toggle-btn i').removeClass('rot180')
            this.lim_max_x = window.innerWidth
        } else {
            $('ar main').animate({right: "0px"}, 200);
            $('ar main footer').animate({right: "0px"}, 200);
            $('#toggle-btn').animate({right: "176px"}, 200);
            $('#zoom-btn').animate({right: "176px"}, 200);
            $('#turn-btn').css('left', "calc((100% - 176px)/2)");
            $('#toggle-btn i').addClass('rot180')
            this.lim_max_x = window.innerWidth-$('ar main').width()
        }
        
    },
    loadAR: function(){
        if (o.data.hasIntro) {
            o.sceneEl.addEventListener('introend',function(){
                o.loadAR()     
            },{once:true})
            return
        }

        if (dev) console.log('loading AR')
        $("#ar_loading").show()
        
        // distach matrix from actual position
        o.arVisible(false)
        
        // reload media
        o.getARMedia()
    },
    getARMedia(){

        //if (o.mode.charAt(2) == 0 && !AFRAME.utils.device.checkARSupport()) return 
        
        o.toggleIcons('ar')
        let video = {
            facingMode: "environment",
            width: { max: 4619 }, //ideal: 4032, 
            height: { ideal: 720, max: 1080 }
        }
        //if (o.ARcamera) video = {deviceId: {exact:o.ARcamera}}
        let constraints = {
            video: video 
        };
        $('#buttons').css('opacity',0)
        $('#buttons').css('z-index',-10)
        
        navigator.mediaDevices.getUserMedia(constraints).then(
            (t=>{
                // mirror for front cam
                if (t.getVideoTracks()[0].getSettings().facingMode == 'user') {
                    o.canvas.classList.add('mirrorcam')
                    o.ARvideo.classList.add('mirrorcam')
                } else {
                    o.canvas.classList.remove('mirrorcam')
                    o.ARvideo.classList.remove('mirrorcam')
                }

                if (o.status <= 1) {
                    o.toggleIcons('ar',true)
                    t.getTracks().forEach(function(i) {
                        i.stop();
                    })
                    o.sceneEl.emit('arReady')
                    if (!geo) {
                        $('#buttons').css('opacity',1)
                        $('#buttons').css('z-index',1)
                    }
                    o.unloadAR()
                } else {
                    // store AR stream
                    o.stream = t;
                    
                    // reappend de video
                    document.body.appendChild(o.ARvideo)
                    
                    if (o.ARsystem[0] >= 5) {
                        o.ARsystem[1].video = o.ARvideo
                        o.ARsystem[1].processingImage = true;
                        
                    } else if (o.ARsystem[0] == 1){
                        o.dim3.setAttribute("arjs-webcam-texture", !0)
                        $("[arjs-webcam-texture]")[0].components['arjs-webcam-texture'].video = o.ARvideo;
                    }
                    o.ARvideo.srcObject = t;
                    
                    $("#ar_loading").hide()
                }   
            })).catch(
            (t=>{
                if (o.status > 1) {
                    if (o.ARcameras.length > 1){
                        return o.changeCamera()   
                    }
                    console.log(t)
                    alert("Câmera bloqueada") 
                    o.changeMode('2d-mode')
                } else {
                    if (!geo) {
                        $('#buttons').css('opacity',1)
                        $('#buttons').css('z-index',1)
                    }
                }
                o.unloadAR()
            })
        ) 
    },
    unloadAR: function(){
        if (dev) console.log('unloading AR')
        
        o.sceneLoaded(function(){

            // arjs pause 
            //system = o.sceneEl.systems['arjs']
            
            
            if (o.ARsystem[0] >= 5) {
                if (o.ARsystem[1].processingImage) {
                    o.ARsystem[1].processingImage = false;
                    o.ARsystem[1].stop()
                }
                o.arVisible(true)
            }
            else if (o.ARsystem[0] == 1) {
                
            }
            o.canvas.classList.remove('mirrorcam')
            o.data.targetClass = 'any'
        })
    },
    arVisible: function(bol){
        let arr = $('[mindar-image-target]')
        for (i=0;i<arr.length;i++){
            if (!arr[i].object3D) continue
            // return matrix to original position
            arr[i].object3D.matrixAutoUpdate = bol;
            // make visible
            arr[i].object3D.visible = bol;
            //arr[i].object3D.matrixAutoUpdate = false;
            //arr[i].components['mindar-image-target'].updateWorldMatrix(null, )
        }
        o.cameraRig.object3D.position.y = (bol)?-1.6:0;
        o.cameraRig.object3D.position.z = (bol)?5:0;
        let cam = o.camera.components.camera.camera;
        cam.near = (bol)?0.01:10; 
        cam.fov = (bol)?45:80; 
        o.zoom[1] = cam.fov;
        o.setZoom(null,0,0)
    },
    arResize: function(){
        if (o.ARsystem.length > 0 && o.ARvideo) {
            let vw, vh; // display css width, height
            const videoRatio = o.ARvideo.videoWidth / o.ARvideo.videoHeight;
            const containerRatio = document.body.clientWidth / document.body.clientHeight;
            if (videoRatio > containerRatio) {
                vh = document.body.clientHeight;
                vw = vh * videoRatio;
            } else {
                vw = document.body.clientWidth;
                vh = vw / videoRatio;
            }
            o.ARvideo.style.top = (-(vh - document.body.clientHeight) / 2) + "px";
            o.ARvideo.style.left = (-(vw - document.body.clientWidth) / 2) + "px";
            o.ARvideo.style.width = vw + "px";
            o.ARvideo.style.height = vh + "px";
        }
    },
    slideMode: function(e){
        e.disabled = true;
        if (e.checked){
            o.changeMode(e.parentElement.children[3].innerHTML+ '-mode') 
            e.previousElementSibling.className = "notactive";
            e.nextElementSibling.nextElementSibling.className = "active";
        } else {
            o.changeMode('2d-mode') 
            e.previousElementSibling.className = "active";
            e.nextElementSibling.nextElementSibling.className = "notactive";
        }
        setTimeout(function() {
            e.disabled = false;
        }, 1000);
    }, // ok
    simulate: function(){
        if (this.data.hasIntro && !this.data.hasARMenu) return
        
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
        
        if (this.status == 3) {
            this.sessionHandler('pause')
            $("#playProg p").text("Simular")
            $("#playProg i").text("play_arrow") 
        } else {
            this.sessionHandler('play')
            $("#playProg p").text("Parar")
            $("#playProg i").text("stop")  
        }
        
        ARstate.simulation.status = (this.status == 3)?"running":"stopped";
        ARmsg.simulation.status = (this.status == 3)?"running":"stopped";
        
        if (this.permissions.msg) o.sendMsg(ARmsg)
    }, // ok
    
    loadARMenu: function(){ 
        let foot = $('ar footer').detach();
        $('ar main').empty()
        $("ar main").append('<row></row>')
        $("ar main").append(foot)
        if (ARMenu instanceof Function) ARMenu()
        $("ar main footer").empty()
        $("ar main footer").append('<p id="ar_version">'+modName+' <b>'+version+'</b></p>')
        o.selectListeners();
    }, // ok
    
    //ARTitles
    addARTitle: function(text,id){
        let cl = "notactive";
        if ($("ar main row p").length == 0) cl = "active"
        
        // create row title
        $("ar main row").append('<p id="'+id+'" onclick="o.openSubMenu(this.id)" class="'+cl+'">'+text+'</p>')
        
        // create section
        $("ar main").append('<div id="'+id+'-sub" class="scroller"></div>')
        if (cl == "active") $('#'+id+'-sub').show();
        
        // correct centralization
        if ($("ar main row p").length == 1){
            $("ar main row").css('justify-content','center')   
        } else {
            $("ar main row").css('justify-content','space-between')
        }
    }, // ok
    openSubMenu: function(id){
        o.loadARMenu()
        let cl = $('#'+id).attr('class')
        if (cl == 'active') return
        $('#'+id)[0].parentNode.querySelector('.active').className = "notactive";
        $('#'+id)[0].className = "active";
        $('.scroller').hide();
        $('#'+id+'-sub').show();
        //$("ar main footer").empty();
        //$("ar main footer").append('<p id="ar_version">'+modName+' <b>'+version+'</b></p>')
    }, // ok
    
    //ARSections
    addARSection: function(id,arr){
        $("#"+id+'-sub').empty() 
        for(i=0;i<arr.length;i++){
            $("#"+id+'-sub').append(arr[i])
        }
    }, // ok
    
    //ARParts
    addARPart: function(id,title,tag,code,arr){
        $("#"+code).remove();
        let html = ''; 
        
        let position;
        // open parts that are visible in AR
        if (o.sceneEl.is('ar-mode')){
            if (document.getElementById(code+'AR').object3D.visible) position = true;    
        } 
        // open parts that have position
        else {
            if (ARstate) position = o.getObj(ARstate,tag).position;    
        }

        html +='<article class="ar_part ar_check"><span><label><input type="checkbox"';
        if (position) html += ' checked';
        html += ' id="'+code+'_check" onclick="o.openPart(this.id)"><div><b>&#10003;</b></div></label><h5 onclick="o.openPart(this)">'+title+'</h5></span><ul id="'+code+'_colap"';
        if (position) html += ' style="display:block"';
        html += '>';
        for(i=0;i<arr.length;i++){
            html += '<li>'+arr[i]+'</li>';
        }
        html+='</ul></article>';
        $("#"+id+'-sub').append(html)
    },
    openPart: function(part,ini){
        let ele;
        if (typeof part != 'string') {
            part = $(part.parentElement)[0].querySelector('label input').id;
            ele = document.getElementById(part) 
            ele.checked = !ele.checked
        } else {
            ele = document.getElementById(part)
        }
        let type = part.slice(0, -6); //ani, MT0, MT1, UT0, SE0, SE1 
        let modelid = type+'Model';
        let model = document.getElementById(modelid)
        
        if (!o.sceneEl.is('ar-mode')) {
            if (ele.checked){
                ele.setAttribute('manual',true)
                document.getElementById(type+"_colap").style.display = "block";
                model.setAttribute('visible',true)
                model.emit('show')
            } else {
                ele.removeAttribute('manual')
                document.getElementById(type+"_colap").style.display = "none";
                model.setAttribute('visible',false)
                model.emit('hide')
            }
            return
        }
        
        if (ini){
            model.setAttribute('visible',true)
            ele.checked = true 
            document.getElementById(type+"_colap").style.display = "block";
            return
        }
        if (ele.checked) {
            model.setAttribute('visible',true)
            document.getElementById(type+"_colap").style.display = "block";
        } else {
            model.setAttribute('visible',false)
            document.getElementById(type+"_colap").style.display = "none";
            $("#turn-btn").css('display',"none")
        }
    },
    
    subCreate: function(n){
        let html = "<section><h4 style='margin:0'>"+n+"</h4></section>"
        return html
    }, // ok
    checkCreate: function(n,id){
        let html ='<article class="ar_check"><span><label id="'+id+'"><input onclick="o.checkClick(this.parentElement)" type="checkbox"><div><b>&#10003;</b></div></label><h5>'+n+'</h5></span></article>';
        return html
    }, // ok
    checkClick:function(el){
        o.setEvt(ARstate,el.id,{value: el.firstChild.checked ? 1 : 0}) 
        
        if (el.id == 'dots_eraser'){
            let els = $('.dotX')
            for(i=0;i<els.length;i++){
                els[i].object3D.visible = !!el.firstChild.checked;  
            }
        }
        
    }, // ok   
    infoCreate: function(n,id,info,unit){
        let html = "<article class='ar_info'><span id='"+id+"'><p>"+n+"</p><p>"+info+"</p><p> "+unit+"</p></span>"
        return html
    }, // ok 
    warnCreate: function(n,id){
        let html = "<p class='ar_warn' id='"+id+"'>"+n+"</p>"
        return html
    }, // ok 
    submitCreate: function(n,id){
        let html = "<article class='ar_submit' id='"+id+"'><p>"+n+"</p></article>"
        return html
    },
    
    //ARSwitches
    switchCreate: function(title,arr,tag = 'main'){
        let html = "<section><h4>"+title+"</h4>"
        arr.forEach(function(item){
            let active = "active";
            let notactive = "notactive";
            let checked;
            
            let val;
            if (tag == 'main') {
                val = o.getObj(ARstate,item[0])  
            } else {
                val = o.getObj(ARstate,tag)[item[0]]
            }
            if (ARstate && val==1){
                active = "notactive";
                notactive = "active";
                checked = true;
            }
            
            html +='<article class="ar_slider"><p class="'+tag+'_switch '+active+'"  onclick="o.switchClick(this)">'+item[1]+'</p><label><input type="checkbox"';
            if (checked) {
                html += ' checked data-val="0"';
            } else {
                html += ' data-val="1"';
            }
            html += ' id="'+item[0]+'" class="'+tag+'_switch" onclick="o.switchClick(this)"><article class="toggle round"></article></label><p class="'+tag+'_switch '+notactive+'" onclick="o.switchClick(this)">'+item[2]+'</p></article>';
        });
        return html+'</section>';
    }, // ok
    switchClick: function(el){        
        let tag = el.classList[0] //.slice(0, -7);
        let act = el.classList[1] 
        let ele = el.parentElement.querySelector('label input')
        let val = 0;
        
        if (!act){
            if (el.checked) {
                el.parentElement.previousElementSibling.className = tag+" notactive";
                el.parentElement.nextElementSibling.className = tag+" active";
                val = 1;
            } else {
                el.parentElement.previousElementSibling.className = tag+" active";
                el.parentElement.nextElementSibling.className = tag+" notactive";
            }
        } else if (act == "notactive") {

            el.parentElement.querySelector('.active').className = tag+" notactive";
            el.className = tag+" active";
            
            if (!el.nextElementSibling) {
                ele.checked = true;
                val = 1
            } else {
                ele.checked = false
            }
        } 

        if (tag == 'main_switch'){
            o.setEvt(ARstate,ele.id,{value: val})     
        } else {
            let obj = {}
            obj[ele.id] = val
            o.setEvt(ARstate,tag.slice(0, -7),obj) 
        }
    }, // ok
    
    //ARBtn
    btnCreate: function(title,n,tag = 'main'){
        let html = "<section><h4>"+title+"</h4><spans>"
        for (i=0;i<n;i++){
            html+= "<span><span id='button_"+i+"' class='"+tag+"_arbutton' onmousedown='o.btnClick(this,1)' onmouseup='o.btnClick(this,0)'><span></span></span><p>B"+i+"</p></span>"
        }
        html+= "</spans></section>";
        return html
    }, // ok
    btnClick: function(self,val){  
        let id = self.id;
        let tag = self.classList[0].slice(0, -9);
        let el = self.nextElementSibling;

        (val == 1)? el.className = "active" : el.className = "notactive"; 
        
        if (tag == 'main'){
            o.setEvt(ARstate,id,{value: val})     
        } else {
            let obj = {}
            obj[id] = val
            o.setEvt(ARstate,tag,obj) 
        }
        
    }, // ok
    
    //ARSlide
    sliderCreate: function(title,tag){
        if (!ARparams) return
        let arr = ARparams[tag+'val'];
        let val = o.getObj(ARstate,tag);
        if (typeof val === 'object' && !Array.isArray(val) && val !== null){
            val = val.value;
        }
        if (ARstate && arr && arr[0]) ARparams[tag+'val'][0] = val  
        let html = "<section><p>";
        if (tag == "ldr"){
            html += title;
        } else if (arr[3]!=''){
            html += title+" ("+arr[3]+")";
        } else {
            html += title;
        }
        html += "</p><div class='slidecontainer'><input type='range' min='"+arr[1]+"' max='"+arr[2]+"' value='"+Math.round(o.map(arr[0],0,1,arr[1],arr[2]))+"' class='slider' id='"+tag+"_range' oninput='o.sliderClick(this.id)'>";
        (arr[4]!=null)?html += "<p style='position:absolute;bottom: 25px;left: 0px;'><i class='material-icons-outlined md-16'>"+arr[4]+"</i></p>":html += "<p style='position:absolute;bottom: 25px;left: 5px;'>"+arr[1]+"</p>";
        html += "<b class='rangeval'>"+Math.round(o.map(arr[0],0,1,arr[1],arr[2]))+"</b>";
        (arr[5]!=null)?html += "<p style='position: absolute; bottom: 25px; right:-5px;'><i class='material-icons-outlined md-16'>"+arr[5]+"</i></p>":html += "<p style='position: absolute; bottom: 25px; right:-5px;'>"+arr[2]+"</p>";
        html += "</div></section>";
        
        if (tag == "ldr") o.ldrChange(val)
        
        return html
    }, // ok
    sliderClick: function(id,bol){
        var index = id.slice(0,-6); 
        var slider = document.getElementById(id);
        var output = slider.parentElement.querySelector('.rangeval')
        let val = o.map(slider.value,ARparams[index+"val"][1],ARparams[index+"val"][2],0,1)
        ARparams[index+"val"][0] = val
        output.innerHTML = slider.value;
        if (index == "ldr") o.ldrChange(val) 
        if (!bol) o.setEvt(ARstate,index,{value: parseFloat(val.toFixed(3))}) 
    }, // ok 
    ldrChange: function(val){
        if (o.sceneEl.is('2d-mode')){
            Array.prototype.forEach.call(o.lights, function( node ) {
                let old = node.getAttribute('light').intensity;
                if (node.getAttribute('oldARint') == null) node.setAttribute("oldARint", old);
                node.setAttribute('light','intensity', o.map(val,0,1,0.3, node.getAttribute("oldARint")*2))
            });
        } else {
            $("video").css('filter','brightness('+val*200+'%)')  
        }
    }, // ok
    
    //ARSelect
    selectCreate: function(arr){ 
        let html = '<span class="material-icons-outlined md-20" style="visibility:hidden">add_box</span>';
        html += '<h5>'+arr[1]+'</h5>';
        html += o.returnOptions(arr[2],arr[0].slice(-1),arr[0].slice(0, -1),arr[3],arr[2].charAt(0));
        return html;
    }, 
    selectMultiCreate: function(arr,minus){ 
        let html = '<span class="material-icons-outlined md-20"';
        if (minus){
            html += ' onclick="o.removeSelect(this)" data-arr="'+arr+'">indeterminate_check_box</span>'    
        } else {
            html += ' onclick="o.addSelect(this)" data-arr="'+arr+'">add_box</span>'
        }
        html += '<h5>'+arr[1]+'</h5>';
        html += o.returnOptions(arr[2],arr[0].slice(-1),arr[0].slice(0, -1),arr[3],arr[2].charAt(0),true);
        return html;
    },
    addSelect: function(el){
        let arr = el.dataset.arr.split(',');
        if ($('.'+arr[2]+arr[0].substring(arr[0].length - 1)+'.'+arr[0].slice(0, -1)).length == 3) return
        
        let arr2 = [arr[0],arr[1],arr[2]]
        let arr3 = []
        for(i=3;i<arr.length;i++){
            arr3.push(arr[i])    
        }
        arr2[3] = arr3;
        $(el.parentElement).after( '<li>'+o.selectMultiCreate(arr2,true)+'</li>');
        o.selectListeners()
    },
    removeSelect: function(el){
        let ele = el.parentElement.getElementsByTagName('select')[0]
        /*
        let id = ele.classList[1]+ele.classList[0].substr( ele.classList[0].length - 1)
        let selfPin = ele.classList[0].charAt(0)
        let otherPin = String(ele.value);
        let other;
        if (otherPin!=''){
            let arr = otherPin.split(" ");
            if (!arr[1]){
                other = o.ARparts.main      
            } else {
                other = arr[1];  
                otherPin = arr[0];
            }
            o.removeWire(id+'_'+selfPin+'_'+other+'_'+otherPin)
        }*/
        ele.value = ''
        $(ele).trigger("change");
        $(el.parentElement).remove() 
    },
    selectListeners: function (el){
        $('.ar_part select').off('change')
        $('.ar_part select').on('change', function (e) {
            if (this.status == 3) $("#playProg").click()
            let old = $(e.target).attr('old') 
            let id = e.target.classList[0]
            let localPin = id.substring(0,1);
            let otherPin = $(e.target).val();
            let other;
            if (otherPin != '') {
                if (!otherPin.split(" ")[1]){
                    other = o.ARparts.main   
                } else {
                    other = otherPin.split(" ")[1];    
                }
                // register old
                if (!old){
                    $(e.target).attr('old',otherPin)    
                }
                else if(old && otherPin != old){
                    var index = o.usedPins.indexOf(old);
                    if (index !== -1) o.usedPins.splice(index, 1);
                    $(e.target).attr('old',otherPin); 
                }
            } else {
                var index = o.usedPins.indexOf(old);
                if (index !== -1) o.usedPins.splice(index, 1);
                $(e.target).removeAttr("old");
            }
            let num = id.substring(id.length - 1); 
            let type = e.target.classList[1];
            let el = type+num;
            if (other && !ARparams.multiple) o.usedPins.push(otherPin)
            
            // update other options
            document.querySelectorAll(".ar_part ul select").forEach(sel => {
                [...sel.children].forEach(opt => {
                    if (opt.value == '' || opt.selected) return
                    
                    if (o.usedPins.includes(opt.value)){
                        opt.disabled = true    
                    } else {
                        opt.disabled = false;    
                    }
                    $('.'+id+"."+type).each(function(){
                        if (opt.parentElement.classList[0] == id && opt.parentElement.classList[1] == type){
                            if ($(this).val() == opt.value && !this.hasAttribute("data-multi")) opt.disabled = true 
                        }
                    });
                });  
            });
            
            // removing wires if changes
            if (o.ARwires[el] && o.ARwires[el][localPin] && old) {
                let arr = String(old).split(' ');
                if (!arr[1]) arr[1] = o.ARparts.main;
                
                let id = el+"_"+localPin+"_"+arr[1]+"_"+arr[0]
                
                o.removeWire(id)
                
                let arr2 = ARparams.autoPins[arr[0]+' '+arr[1]]
                if (arr2) {
                    for (i=0;i<arr2.length;i+=2){
                        let arr3 = String(arr2[i+1]).split(' ');
                        let id = el+"_"+arr2[i]+"_"+arr3[1]+"_"+arr3[0]    
                        o.removeWire(id)
                    } 
                }
            }
            
            if (!(otherPin == '' || !otherPin)){
                o.ARwires[el][localPin].push(otherPin);
                if (ARparams.autoPins[otherPin]){
                    let arr = ARparams.autoPins[otherPin];
                    for (i=0;i<arr.length;i+=2){
                        o.ARwires[el][arr[i]].push(arr[i+1]);    
                    }
                }
            } else {
                otherPin = ARparams.none || -1
            }
            let obj = {}
            
            if(e.target.hasAttribute("data-multi")){
                let pin = o.getObj(ARstate,o.ARparts[el].name)[id.slice(0,-1)]
                
                if (otherPin == ARparams.none || otherPin == -1) {
                    if (pin.length==1) {
                        obj[id.slice(0,-1)] = otherPin;    
                    } else if (Array.isArray(pin)){
                        var index = pin.indexOf(old);
                        if (index !== -1) pin.splice(index, 1);
                        obj[id.slice(0,-1)] = pin;
                    }
                } else if (pin == ARparams.none || pin == -1) {
                    obj[id.slice(0,-1)] = [otherPin];    
                } else {
                    var index = pin.indexOf(old);
                    if (index !== -1) pin.splice(index, 1);
                    pin.push(otherPin)
                    obj[id.slice(0,-1)] = pin;
                }
            } else {
                obj[id.slice(0,-1)] = otherPin;    
            }  
            o.setEvt(ARstate,o.ARparts[el].name,obj) 
        });
    },
    returnOptions: function(name,num,type,pins,pin,multi){
        let html = "<select ";
        if (multi) html += "data-multi='' "
        html += "class='"+name+num+" "+type+"'>";
        let html2 = "<option></option>";
        for (i=0;i<pins.length;i++) {
            let disabled = false;
            let arr = String(pins[i]).split(' ');
            
            if (!ARparams.multiple) pins[i] = arr[0];
            
            if (o.ARwires[type+num] != null && o.ARwires[type+num][pin] && o.ARwires[type+num][pin].includes(pins[i]) && !multi){
                html = "<select class='"+name+num+" "+type+"' old='"+pins[i]+"'>"
                html2 += "<option selected='selected'>";
            } else {
                html2 += "<option";
                if (o.usedPins.includes(pins[i])) {
                    disabled = true;
                }
                $('.'+name+num+"."+type).each(function(){
                    if ($(this).val() == pins[i] && !this.hasAttribute("data-multi")) {
                        disabled = true;    
                    }
                });
                if (disabled) html2 += " disabled='true'";
                html2 += ">";
            }
            html2 += pins[i];
            html2 += "</option>";
        }
        html2 += "</select>";
        return html+html2
    },
         
    //AR utils
    getPins: function(name){
        return o.ARparts[name].pins
    },
    removeWire: function(id){
        let arr = id.split('_')
        // Delete model
        const index = o.ARwires.all.indexOf(id);
        if (index > -1) {
            o.ARwires.all.splice(index, 1);
            $('#'+id)[0].parentNode.removeChild($('#'+id)[0])
        }
        // Delete from ARwires
        const index2 = o.ARwires[arr[0]][arr[1]].indexOf(arr[3]+' '+arr[2]);
        const index3 = o.ARwires[arr[0]][arr[1]].indexOf(arr[3]);
        if (index2 > -1) {
            o.ARwires[arr[0]][arr[1]].splice(index2, 1);
        } else if (index3 > -1) {
            o.ARwires[arr[0]][arr[1]].splice(index3, 1);
        }
    },
    
    //AR GPS
    addARMark: function(){
        let arr = [
            $("#arloc select option:selected").text(),
            $("#arloc select option:selected").val(),
            $('#hgps').val(),
            $('#latgps').text(),
            $('#longps').text()
        ]
        o.ARmarks.push(arr)
        o.copyARMark()    
    },
    remARMark: function(){
        let rem = o.ARmarks.pop();
        o.copyARMark()
    },
    copyARMark: function(){
        o.copyToClipboard(o.ARmarks.toString(),
            () => {
                $('#markmsg').text('Marks copiados.')
                setTimeout(function(){
                    $('#markmsg').text(o.ARmarks.length+' marks criados')    
                },1000)
            },
            () => {
                $('#markmsg').text('Erro ao copiar')
                setTimeout(function(){
                    $('#markmsg').text(o.ARmarks.length+' marks criados')    
                },1000)
            }
        )
    },
    setARMark: function(str,model){
        let arr = str.split(",");
        for (i=0;i<arr.length;i+=5) {
            let el = document.createElement("a-entity");
            if (model) {
                el.setAttribute('gltf-submodel',{
                    src:model,
                    part:arr[i+1]
                })
            } else {
                el.setAttribute('geometry', {
                    primitive:'sphere',
                    radius:0.5
                })
            }
            el.setAttribute('gps-new-entity-place', {
                latitude: arr[i+3],
                longitude: arr[i+4]
            });
            el.classList.add(arr[i+1]);
            el.object3D.position.y = arr[i+2];
            o.dim3.appendChild(el);
            return el;
        }      
    },
    
    //AR DOTS
    isPart: function(el,parent){
        var bol;
        for(var n in el){
            el = el.parentNode;
            if(el.nodeName == parent) {
                bol = true;
                break;
            }
        }  
        return bol
    },
       
        
        // animator
        // controller grab
        // touch interaction test (grab e zoom)
        // vrbox controller
        // fill results test
        // fill form test
        // alphavideo - https://github.com/n5ro/vimeo-threejs-player
        // body interaction even if blocked
        // tempo total da aula
        // qtds que repetiu
        // Criar login aluno master
        // Criar login aluno slave
        // Resposta com interacoes na tela
        // sound components
        // uma das maos perdendo coliders qd entra e sai do menu.
        // testar mudar vr e 2d
        // testar iframe errors msg
        // lambdas e rebuild
        // view auto renew
    
        // aula de pegar e plantar a semente
        // campus virtual
        // enquete virtual
        // aula de portugues
        // aula de capoeira
        // cidade metaverso
        // criando robos
        // aula de medicina
        // caminhao virtual
        // batalha de robos
    
    
    //https://codepen.io/remersonc/pen/JXyvbZ
    
    //https://github.com/kylebakerio/aframe-liquid-portal-shader
    //https://github.com/kikoano/web2vr
    //https://github.com/kylebakerio/grass
    //https://github.com/AdaRoseCannon/aframe-xr-boilerplate
    //https://github.com/AdaRoseCannon?tab=repositories
    //https://github.com/kylebakerio/aframe-super-keyboard
    //https://fern.solutions/dev-logs/aframe-adventures-02/
    //https://colinfizgig.github.io/WebXRTutorials.html
    
        //https://github.com/bryik/aframe-ball-throw
        //https://github.com/wmurphyrd/aframe-physics-extras

        //https://github.com/networked-aframe/networked-aframe#getting-started
        //https://github.com/aframevr/aframe/pull/5102
        //https://amitrajput1992.github.io/r3f-experiments/?path=/story/testers--text-tester
    //https://medium.com/@bluemagnificent/moving-objects-in-javascript-3d-physics-using-ammo-js-and-three-js-6e39eff6d9e5
    /*
    const face = new THREE.Triangle()
  .setFromAttributeAndIndices( geometry.attributes.position, 0, 1, 2 );

const area = face.getArea();
    */
            /*
        Ligar os pontos para fazer o formato
Seleciona, circulo e reta
Areas verdes, adicionar, areas vermelhas, retirar
Preview 3d

Selecionar circulos  - raio
Selecionar retas – comprimento, angulo

Massa, resistencia vertical, resistencia horizontal
*/
        //https://medium.com/samsung-internet-dev/integrating-augmented-reality-objects-into-the-real-world-with-light-and-shadows-12123e7b1151
    
        //Extrude e Glue
        //https://muffinman.io/blog/three-js-extrude-svg-path/
        //https://muffinman.io/blog/three-js-extrude-svg-path/#live-demo
        //https://github.com/luiguild/aframe-svg-extruder/blob/develop/src/index.js
        //https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry
        
        //https://aframe.wiki/en/physics.js
        //cannon.js, ammo.js, physics.js, oimo.js
        //https://discourse.threejs.org/t/preferred-physics-engine-cannon-js-ammo-js-diy/1565/9
    
    oorbitComponents: function(){
        $('<a-entity id="wires"></a-entity>').insertBefore("#cameraRig")
        
        AFRAME.registerComponent('gltf-material', {
            multiple: true,
            schema: {
                materials:{default: [null]},
                opacity:{default: 1.0},
                emission:{type:"vec4",default: {x: 0, y: 0, z: 0, w: 0}},
                wireframe:{default:false},
                color:{type:"color"},
                reset:{default:false}
            },
            init: function(){
                this.m={}    
            },
            update: function (olddata) {
                if (!(this.el.getAttribute('gltf-model') || this.el.getAttribute('gltf-submodel'))) return
                var mesh = this.el.getObject3D('mesh');
                var data = this.data;
                var self = this;
                if (!mesh) return;
                mesh.traverse(function (n) {
                    if (!n.isMesh) return
                    if (data.materials[0] != null){
                        if (!data.materials.includes(n.material.name) || jQuery.isEmptyObject(olddata)) return
                    }
                    
                    // register initial material
                    if (!self.m[n.material.name]){
                        self.m[n.material.name] = {}
                        self.m[n.material.name] = {
                            opacity:n.material.opacity,
                            //transparent: n.material.transparent,
                            emissive:n.material.emissive.clone(),
                            emissiveIntensity: n.material.emissiveIntensity,
                            color:n.material.color.clone(),
                            wireframe: n.material.wireframe
                        };
                    }
                    
                    // reset to original material
                    if (data.reset) {
                        let m2 = self.m[n.material.name];
                        self.el.setAttribute(self.attrName,{
                            opacity: m2.opacity,
                            emission: m2.emissive.clone().r+' '+m2.emissive.clone().g+' '+m2.emissive.clone().b+' '+'0',
                            color: "#"+m2.color.clone().getHexString(),
                            wireframe: m2.wireframe,
                            reset: false
                        })
                        n.material.needsUpdate = true;
                        return
                    }
                    
                    // clone to avoid subcopies propagation
                    n.material = n.material.clone()
                    
                    // changing materials
                    n.material.opacity = data.opacity;
                    //n.material.transparent = data.opacity < 1.0;
                    n.material.emissive.r = data.emission.x/255;
                    n.material.emissive.g = data.emission.y/255;
                    n.material.emissive.b = data.emission.z/255;
                    n.material.emissiveIntensity = data.emission.w
                    if (data.color) n.material.color = new THREE.Color(data.color)  
                    n.material.wireframe = data.wireframe
                    n.material.needsUpdate = true;
                    //console.log(n.material.name,'updated')
                });
            },
            events:{
                'model-loaded': function(){
                    this.update()    
                }
            }
        });
        AFRAME.registerComponent('gltf-transform', {
            multiple: true,
            schema: {
                name:{type: 'string'},
                position:{type: 'vec3'},
                rotation:{type: 'vec3'},
                scale:{type: 'vec3'},
                px:{type:'number'},
                py:{type:'number'},
                pz:{type:'number'},
                rx:{type:'number'},
                ry:{type:'number'},
                rz:{type:'number'},
                sx:{type:'number'},
                sy:{type:'number'},
                sz:{type:'number'},               
            },
            init: function(){
                this.original = [new THREE.Vector3(),new THREE.Euler(),new THREE.Vector3()]
                this.position = new THREE.Vector3()
                this.rotation = new THREE.Euler()
                this.scale = new THREE.Vector3()
                this.iniData = {}
                Object.assign(this.iniData,this.data) 
                this.actualData = {};
            },
            update: (function () {
                return function (oldData) {
                    if (!(this.el.getAttribute('gltf-model') || this.el.getAttribute('gltf-submodel'))) return
                    var data = this.data;
                    var self = this;  
                    var obj = AFRAME.utils.diff(jQuery.isEmptyObject(oldData)?this.iniData:oldData,data)
                    
                    if (!this.el.object3D) return
                    
                    n = this.el.object3D.getObjectByName(data.name);
                    
                    if (!n) return
                    
                    this.actualData = {
                        position:n.position,
                        rotation:n.rotation,
                        scale:n.scale
                    }
                    
                    if (jQuery.isEmptyObject(oldData)) {
                        self.position.copy(n.position)
                        self.rotation.copy(n.rotation)
                        self.scale.copy(n.scale)
                        self.update(data)

                        self.original[0].copy(n.position)
                        self.original[1].copy(n.rotation)
                        self.original[2].copy(n.scale)

                        return
                    }

                    self.checkVec3('position',n,obj)
                    self.checkVec3('rotation',n,obj)
                    self.checkVec3('scale',n,obj)

                    self.checkNum('position','x',n,obj)
                    self.checkNum('position','y',n,obj)
                    self.checkNum('position','z',n,obj)

                    self.checkNum('rotation','x',n,obj)
                    self.checkNum('rotation','y',n,obj)
                    self.checkNum('rotation','z',n,obj)

                    self.checkNum('scale','x',n,obj)
                    self.checkNum('scale','y',n,obj)
                    self.checkNum('scale','z',n,obj)
                }
            })(),
            checkVec3: function(attr,mesh,obj){
                if (obj[attr]==undefined || (obj[attr] && obj[attr].x==undefined)) return
                
                if (obj[attr]) {
                    if (isNaN(obj[attr].x)) return mesh[attr].set(this[attr].x, this[attr].y, this[attr].z);
                    
                    if (obj[attr].x || obj[attr].x == 0) return mesh[attr].set(obj[attr].x,obj[attr].y,obj[attr].z);
                }
            },
            checkNum: function(prop,axis,mesh,obj){
                let attr = prop.charAt(0)+axis;
                if (obj[attr]==undefined) return
                if (isNaN(obj[attr])) return mesh[prop][axis] = this[prop][axis];
                if (obj[attr] || obj[attr] == 0) return mesh[prop][axis] = obj[attr];
            },
            events:{
                'model-loaded': function(){
                    this.update()    
                }
            }
        });
        AFRAME.registerComponent('gltf-submodel', {
            schema: {
                buffer: {default: true},
                part: {type: 'string'},
                src: {type: 'asset'},
                center: {type: 'boolean',default: true},
                rotation: {type: 'vec3'},
                shape: {type: 'string',default: 'mesh',oneOf:['mesh','box','sphere']},
                body: {type: 'string',default: 'none',oneOf:['none','static','knematic','dynamic']},
            },     
            init: function () {
                this.dracoLoader = document.querySelector('a-scene').systems['gltf-model'].getDRACOLoader();
            },
            update: function () {
                var el = this.el;
                var data = this.data;
                if (!this.data.part && this.data.src) { return; }
                this.getModel(function (modelPart) {
                    if (!modelPart) { return; }
                    
                    el.setObject3D('mesh', modelPart)   
                    el.object3DMap.mesh = el.object3D
                    //el.object3D.add(modelPart)
                    
                    el.emit('model-loaded', {
                        format: 'gltf',
                        part: this.modelPart
                    });
                    if (data.body != 'none') {
                        o.sceneEl.addEventListener('status-ready', function () {
                                el.setAttribute('ammo-body','type',data.body)
                                el.setAttribute('ammo-shape','type',data.shape)
                        },{once:true})
                    }
                });
            },
            getModel: function (cb) {
                var self = this;
                if (o.Cache.get[this.data.src]) {
                    cb(this.selectFromModel(o.Cache.get[this.data.src]));
                    return;
                }
                if (o.Cache.loading[this.data.src] !== undefined ) {
                    return o.Cache.loading[this.data.src].then(function (model) {
                        cb(self.selectFromModel(model));
                    });
                }
                o.Cache.loading[this.data.src] = new Promise(function (resolve) {
                    var loader = new THREE.GLTFLoader();
                    if (self.dracoLoader) {  
                        loader.setDRACOLoader(self.dracoLoader);
                    }

                    loader.load(self.data.src, function (gltfModel) {
                        var model = gltfModel.scene || gltfModel.scenes[0];  
                        delete o.Cache.loading[self.data.src];                         
                        cb(self.selectFromModel(model));                            
                        resolve(model);                       
                    }, function (xhr) {console.log(xhr)/*xhr.loaded / xhr.total * 100 */}, function (error) {console.log(error)});
                });
            }, 
            selectFromModel: function (model) {
                var part = model.getObjectByName(this.data.part).clone();
                if (this.data.center) {
                    part.position.x = 0 
                    part.position.y = 0 
                    part.position.z = 0    
                }
                part.rotation.x = this.data.rotation.x
                part.rotation.y = this.data.rotation.y
                part.rotation.z = this.data.rotation.z
                
                if (!part) {
                    console.error('[gltf-part] `' + this.data.part + '` not found in model.');
                    return;
                }
                return part
            },
            geometryFix: function(mesh){
                if (this.data.buffer) {
                    mesh.geometry = mesh.geometry.toNonIndexed();
                } else {
                    mesh.geometry = new THREE.Geometry().fromBufferGeometry(mesh.geometry);
                }
                return mesh
            }
        }); // ok
        AFRAME.registerComponent('lmap', {
            multiple: true,
            schema: {
                texture: {type:'asset', default:''},
                key: {type:'string', default:''},
                reset:{default:false}
            },
            init: function(){
                var self = this;
                self.lightMap = new THREE.Texture();
                self.lightMap.image = self.data.texture;
                self.lightMap.flipY = false;
                self.el.addEventListener('model-loaded', () => {
                    self.setMap()
                },{once:true})   
            },
            update: function(olddata){
                if (!jQuery.isEmptyObject(olddata)) this.setMap()
            },
            setMap: function() {
                this.el.object3D.traverse(n => {
                    if (!n.isMesh) return
                    if (!n.material.name.includes(this.data.key)) return

                    //set lightmap from a-frame asset
                    if (!this.data.reset) {
                        n.material.lightMap = this.lightMap;
                        n.material.lightMapIntensity = 3.5;
                        n.material.lightMap.needsUpdate = true;    
                    } else {
                        n.material.lightMap =  null;
                    }
                });
            }
        }); // ok

        AFRAME.registerComponent('econtrol',{
            schema:{
                cycleDuration: {defaul:0},
                hour: {type:'number',default:9.0}, // 0 to 24
                hasMoon: {type:'boolean',default: true},
                intensity: {type:'number',default:1},
                sumbias: {type:'number',default: 0},
                skyradius: {type:'number',default:500},
                universe: {type:'boolean',default: false},
                ucolor: {type: 'color', default: "#493889"},
                upct: {type: 'number', default: 0.6},
                hasClouds: {type:'boolean',default: true},
                hoverable: {type:'boolean',default: true},
                groundPhysics: {type:'boolean',default: false},
                pOnP: {type: 'boolean',default: true}, // pause on pause
            },
            init: function(){
                _data = this.data;
                t = this;
                o.econtrol = this.el;
                this.groundMeshed;
                this.el.addEventListener('environmentloaded',function(e){
                    t.setupEnv()
                    o.sceneEl.emit('econtrolloaded')                    
                },{once:true})
                if (o.replay) this.setupEnv()
            },
            setupEnv: function(){
                // inspector correction
                t.el.setAttribute('environment',o.environment);
                //t.el.components.environment.environmentData.lightPosition.z = 0.05;
                //t.el.setAttribute('environment', 'lightPosition',t.el.components.environment.environmentData.lightPosition)
                t.el.classList.add("environment");

                // day night animation
                t.el.setAttribute('animation',{
                    property: 'econtrol.hour',
                    from: _data.hour,
                    to: 24+_data.hour,
                    loop:true,
                    easing:'linear',
                    dur: _data.cycleDuration*1000,
                    enabled: false
                })

                // create moon
                t.moon = o.svgImg("moon")
                t.moon.setAttribute('class','environment')
                t.moon.setAttribute('material','fog',false);
                t.moon.setAttribute('scale','10 10 10')
                t.moon.setAttribute('position','0 -1000 0')
                t.moon.setAttribute('rotation','30 30 0')
                t.el.appendChild(t.moon)

                // anchors
                t.sky = t.el.components.environment.sky;
                t.ground = t.el.components.environment.ground;
                t.dressing = t.el.components.environment.dressing;
                if (t.data.hoverable) {
                    t.ground.setAttribute('hoverable','')    
                    t.dressing.setAttribute('hoverable','')
                }
                t.flyland(t.ground);
                t.flyland(t.dressing); 
                
                t.sky.setAttribute('radius',_data.skyradius)

                // clouds
                if (t.data.hasClouds) t.el.setAttribute('clouds','')

                this.oldShadow = this.el.getAttribute('environment').shadow;
                
                // ground physics
                if (this.data.groundPhysics && t.el.getAttribute('environment').ground != "none") {
                    t.ground.setAttribute('ammo-body','type','static')
                    t.ground.setAttribute('ammo-shape','type','mesh')
                }
                this.hasLoaded = true;
                // set initial data
                t.update(_data)
            },
            tick: function(){
                // load correction
                if (!AFRAME.components["environment"]) return
                this.el.emit('environmentloaded')
                    
                if ((o.status == 3 || !_data.pOnP) && !_data.universe && _data.cycleDuration != 0){
                    if (!this.el.getAttribute('animation').enabled) this.el.setAttribute('animation','enabled',true);
                } else {
                   if (this.el.getAttribute('animation').enabled) this.el.setAttribute('animation',{
                        enabled:false,
                        from: this.data.hour,
                        to: this.data.hour+24
                    });
                }
                if (_data.universe){
                    if (t.sky.object3D.visible){
                        if (!t.sky2){
                            t.sky2 = document.createElement("a-sphere");
                            t.sky2.setAttribute("radius", t.sky.getAttribute('radius'));
                            t.sky2.classList.add("environment");
                            t.sky2.setAttribute('material',{
                                shader:'colormix',
                                side: 'back',
                                color1: _data.ucolor,
                                pct: _data.upct,
                            });
                            t.el.appendChild(t.sky2);   
                        }
                        t.ground.setAttribute('position','0 -1000 0');
                        t.dressing.setAttribute('position','0 -1000 0');
                        t.moon.object3D.visible = false;
                        t.sky.object3D.visible = false;
                        this.el.setAttribute('environment', 'lightPosition',this.cycle(24));
                        t.el.components.environment.createStars(0.5);
                        t.el.components.environment.setStars(1000,0.5);
                    }

                } else {
                    if (!t.sky.object3D.visible){
                        if (t.sky2){
                            t.sky2.parentNode.removeChild(t.sky2);
                            t.sky2 = null;
                        }
                        t.ground.object3D.visible = true;
                        t.dressing.object3D.visible = true;
                        t.sky.object3D.visible = true;
                        
                        // t.el.components.environment.createStars();
                        
                        this.el.setAttribute('environment', 'lightPosition',this.cycle(_data.hour));
                        
                        this.el.setAttribute('animation',{dur: _data.cycleDuration*1000});
                        t.moon.object3D.visible = _data.hasMoon;
                    }
                }
            },
            update: function(e){
                if (jQuery.isEmptyObject(e)) return
                // update elements

                this.el.setAttribute('animation',{dur: _data.cycleDuration*1000});
                
                t.moon.object3D.visible = _data.hasMoon;    
                
                if (_data.hour>17 || _data.hour<6) {
                    if(!this.el.is('night')) {
                        this.el.addState('night');
                        this.el.setAttribute('environment',{
                            lightPosition: this.cycle(_data.hour),
                            shadow: false
                        })
                    } else {
                       this.el.setAttribute('environment', 'lightPosition',this.cycle(_data.hour)); 
                    }
                } else {
                    if(!this.el.is('day')) {
                        this.el.removeState('night');
                        this.el.setAttribute('environment',{
                            lightPosition: this.cycle(_data.hour),
                            shadow: this.oldShadow
                        })
                    } else {
                       this.el.setAttribute('environment', 'lightPosition',this.cycle(_data.hour)); 
                    }
                }
                
                (_data.hasClouds)?this.el.setAttribute('clouds','end',false): this.el.setAttribute('clouds','end',true);
                this.el.setAttribute('clouds','pOnP',_data.pOnP)
                 
                if (_data.hoverable) {
                    this.ground.setAttribute('hoverable','')    
                    this.dressing.setAttribute('hoverable','')
                } else {
                    this.ground.removeAttribute('hoverable')    
                    this.dressing.removeAttribute('hoverable')
                }
                
                t.el.components.environment.intensity = (_data.intensity < 0)?0:4*_data.intensity;
                
                if (t.el.components.environment.sunlight) {
                    t.el.components.environment.sunlight.setAttribute( 'light','shadowBias',_data.sumbias)
                }
                
                t.el.components.environment.update()
                
            },
            cycle: function(h){   
                let z = this.el.components.environment.environmentData.lightPosition.z;
                let x = 200 * Math.cos((2*Math.PI/24*h)-(Math.PI/2));
                let y = 200 * Math.sin((2*Math.PI/24*h)-(Math.PI/2));

                if (_data.hasMoon && t.moon != null) {
                    t.moon.setAttribute('position',(-190 * Math.cos((2*Math.PI/24*h)-(Math.PI/2)))+' '+(-190 * Math.sin((2*Math.PI/24*h)-(Math.PI/2)))+' '+0.5)
                    t.moon.setAttribute('rotation',(15*(18-h))+' 90 '+ (15*(h-18)-30))
                }
                return new THREE.Vector3(x,y,z);
            },
            flyland: function(e){
                e.setAttribute('animation__land', { 
                    property: "position",
                    startEvents:"land",
                    easing: "linear",
                    dur: 1500,
                    to: "0 0 0"
                })
                e.setAttribute('animation__fly', { 
                    property: "position",
                    startEvents:"fly",
                    easing: "linear",
                    dur: 1500,
                    to: "0 -1000 0"
                })
            },
            flyhandler: function(e){
                if (e.detail != null && e.detail.duration != null){
                    t.ground.setAttribute('animation__'+e.type.slice(0,-3), 'dur',e.detail.duration);
                    t.dressing.setAttribute('animation__'+e.type.slice(0,-3), 'dur',e.detail.duration);
                }
                t.ground.emit(e.type.slice(0,-3));
                t.dressing.emit(e.type.slice(0,-3));
            },
            events:{
                flying: function(e){t.flyhandler(e)},
                landing: function(e){t.flyhandler(e)},
                bigbang: function(e){t.bigBang(e)},
                lightning: function(e){t.lightning(e)},
            },
            lightning: function(){
                if (!$('a-sky')[0]) return
                let color = o.canvas.style.backgroundColor;
                o.canvas.style.backgroundColor = "#C0C0C0";
                $('a-sky')[0].setAttribute('material','transparent',true)
                setTimeout(function(){
                    $('a-sky')[0].setAttribute('material','visible',false)
                    setTimeout(function(){
                        $('a-sky')[0].setAttribute('material',{
                            transparent:false,
                            visible:true
                        })
                        o.canvas.style.backgroundColor = color;
                    },100)    
                },100) 
            },
            bigBang: function(e){
                if (!_data.universe) return
                if (!t.stars.getAttribute('animation__bbpos')){            
                    t.stars.setAttribute('animation__bbpos', { 
                        property: "position",
                        startEvents: "bb",
                        easing: "linear",
                        dur: 1500,
                        to: "0 0 -190"
                    });
                    t.stars.setAttribute('animation__bbsca', { 
                        property: "scale",
                        startEvents: "bb",
                        easing: "linear",
                        dur: 1500,
                        to: "0.001 0.001 0.001"
                    });
                    t.sky2.setAttribute('animation__color', { 
                        property: "material.color1",
                        startEvents: "bb",
                        easing: "linear",
                        dur: 1500,
                        to: '#000'
                    });
                }
                if (!e.detail) return
                if (e.detail.type == "implode"){
                    t.sky2.setAttribute('animation__color', {to: '#000'});
                    t.stars.setAttribute('animation__bbpos', {to: "0 0 -190"});
                    t.stars.setAttribute('animation__bbsca', {to: "0.001 0.001 0.001"});
                } else if (e.detail.type == "explode"){
                    t.sky2.setAttribute('animation__color', {to: _data.ucolor});
                    t.stars.setAttribute('animation__bbpos', {to: "0 0 0"});
                    t.stars.setAttribute('animation__bbsca', {to: "1 1 1"});
                }
                t.stars.emit('bb')
                t.sky2.emit('bb')
            },           
        })
        AFRAME.registerComponent('rain', {
            schema: {
                color1: {type: 'string',default: "#000080"},
                color2: {type: 'string',default: "#00FFFF"},
                size: {type: 'number',default: 0.015},
                xlength: {type: 'number',default: 10}, // medida x
                ylength: {type: 'number',default: 10}, // medida y
                evap: {type: "boolean", default: false},
                height: {type: 'number',default: 10},
                count: {type: 'number',default: 15000,min: 0},
                hasAudio: {type: "boolean", default: true},
                pause: {type: "boolean", default: false},
                end: {type: "boolean", default: false},
                pOnP: {type: 'boolean',default: true},
            },
            init: function() {
                this.rainGeo = new THREE.BufferGeometry();
                this.vertices = [];
                this.colors = [];
                o.rAudio;
                this.vertexPositions;
                this.old = 1;
                this.velocity = 0.05 + Math.random() * 0.05;
                if (!o.rAudio && this.data.hasAudio){
                    let a = document.createElement('audio');
                    a.setAttribute('src',path+'generic/rain.mp3')
                    a.addEventListener('canplaythrough', (e) => {
                        o.rAudio = a;
                        o.media.push(a)
                    }); 
                }
            },
            update: function() {
                if (this.data.end) return;
                let color;
                this.vertices = [];
                this.colors = [];
                for(let i=0;i<this.data.count;i++) {
                    rainDrop = new THREE.Vector3(
                        o.randFloatOne() * this.data.xlength/2,
                        Math.random() * this.data.height,
                        o.randFloatOne() * this.data.ylength/2,
                    );
                    this.vertices.push(rainDrop.x,rainDrop.y,rainDrop.z);

                    color = new THREE.Color((Math.random() < 0.4)?this.data.color2:this.data.color1)
                    this.colors.push( color.r, color.g, color.b);
                }  
                this.rainGeo.setAttribute( 'position', new THREE.Float32BufferAttribute( this.vertices, 3 ) );
                this.rainGeo.setAttribute( 'color', new THREE.Float32BufferAttribute( this.colors, 3 ) ); 
                rainMaterial = new THREE.PointsMaterial({
                    vertexColors: true, 
                    size: this.data.size,
                    transparent: true
                });
                this.rain = new THREE.Points(this.rainGeo,rainMaterial);
                this.el.object3D.add( this.rain );  
                //this.el.setObject3D('mesh',this.rain)
                this.vertexPositions = this.rain.geometry.attributes.position.array; 
                
                if(o.rAudio!=null && !this.data.hasAudio){
                    o.rAudio.muted = true;
                    o.rAudio.volume = 0; 
                }
            },
            tick: function() {
                if (this.data.pause || (!this.vertexPositions || !this.rain)) return;
                if (o.status == 3) {
                    if(o.rAudio!=null && !o.rAudio.playing){
                        if (o.permissions.mute || !this.data.hasAudio){
                            o.rAudio.muted = true;
                            o.rAudio.volume = 0; 
                        }
                        o.rAudio.play()
                    }
                    this.velocity = 0.05 + Math.random() * 0.05;
                } else if (o.status != 3 && this.data.pOnP) {
                    if(o.rAudio!=null && o.rAudio.playing){
                        o.rAudio.pause()
                    }
                    this.velocity = 0;
                }
                this.vertexPositions = this.raining(this.vertexPositions,this.data.height,this.old,this.data.evap, this.data.end);
                this.old = 1;
                this.rain.geometry.attributes.position.needsUpdate = true; 
            },
            raining: function (positions, height,old,evap,end){
                for ( var i = 0; i <= positions.length; i++ ) {
                    if (i == old) {
                        old = old+3;
                        if (!evap) {
                            positions[i] = positions[i] - this.velocity;
                            if (positions[i] <= 0) {
                                positions[i] = height; 
                                if (end) positions[i] = -1000;
                            }
                        } else {
                            let velocity = 0.05 + Math.random() * 0.05;
                            positions[i] = positions[i] + velocity;
                            if (positions[i] >= height) {
                                positions[i] = 0;    
                                if (end) positions[i] = -1000;
                            }
                        }
                    }
                }
                return positions
            }
        });
        AFRAME.registerComponent('clouds', {
            schema: {
                count: {type: 'number',default: 100,min: 0}, // qtd de nuvens
                xlength: {type: 'number',default: 200}, // medida x
                ylength: {type: 'number',default: 200}, // medida y
                zlength: {type: 'number',default: 10.0}, // medida z
                height: {type: 'number',default: 50.0}, // altura do solo
                cheight: {type: 'number',default: 10.0}, // altura no centro
                cwidth: {type: 'number',default: 50}, // largura no centro
                speed: {type: 'number',default: 1.0},// velocidade
                size: {type: 'number',default: 5.0},// comprimento inicial da nuvem 
                range: {type: 'number',default: 3.0},// range de tamanhos
                color: {type: 'color',default: "white"}, // cor das nuvens 
                spot: {type: 'string',default: "none"}, // se é uma nuvem spot (vertical ou horizontal)
                pause: {type: 'boolean',default: false}, // if moves or not.
                end: {type: "boolean", default: false}, // esconder as nuvens    
                pOnP: {type: 'boolean',default: false}, // pause on pause
            },
            init: function() {                   
                var geometries = [];            
                this.cloudGeo = new THREE.BufferGeometry();
                this.positions = new Float32Array( this.data.count * 3 );
                this.attr = []; //[sizeX,sizeY,speed]

                this.xlen = this.data.xlength/2
                this.ylen = this.data.ylength/2
                this.ang = Math.sin(Math.PI/6);
                // dando posição aos planos
                for (var i = 0; i < this.positions.length; i += 3) {
                    var plane = new THREE.Mesh( new THREE.PlaneGeometry(this.data.size,this.data.size));

                    this.positions[i  ] = o.randFloatOne()*this.xlen;
                    this.positions[i+1] = Math.random()*this.data.zlength+((this.data.spot != "none")?0:this.data.height);
                    this.positions[i+2] = o.randFloatOne()*this.ylen;

                    // altera a escala
                    let scale = o.randInt(this.data.range)
                    plane.geometry.scale(scale,0.5*scale,1)
                                        
                    // aplica posição no plano
                    plane.geometry = plane.geometry.translate(this.positions[i], this.positions[i+1], this.positions[i+2])
                    
                    if (this.data.spot == "none"){
                        // armazena tamanhos e velocidade
                        this.attr.push([
                            scale*this.data.size/2,
                            0.5*scale*this.data.size/2,
                            o.randInt(3)*this.data.speed/50
                        ])
                    } else if (this.data.spot == "horizontal"){
                        let arr = plane.geometry.attributes.position.array;
                        //Y
                        arr[1] = this.positions[i+1];
                        arr[4] = arr[1];
                        arr[7] = arr[1];
                        arr[10] = arr[1];
                        //Z
                        arr[2] = this.positions[i+2] + scale*this.data.size/2
                        arr[5] = arr[2];
                        arr[8] = this.positions[i+2] - 0.5*scale*this.data.size/2;
                        arr[11] = arr[8];
                    } 
                    geometries.push(plane.geometry);                       
                }

                // merge os planos em uma geometria só
                this.cloudGeo = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
                this.cloudGeo.computeBoundingBox();
                
                // aplica a malha ao objeto            
                this.cloudMesh = new THREE.Mesh(
                    this.cloudGeo,
                    new THREE.MeshBasicMaterial({ color: 0x0000ff, depthWrite: false})
                );
                this.el.setObject3D('mesh',this.cloudMesh)

                this.opacity = 1;
                this.el.setAttribute('material',{
                    src:o.cloud,
                    color: this.data.color,
                    transparent: true,
                    side: "double",
                    alphaTest:0.15,
                    opacity:this.opacity,
                    emissive:this.data.color,
                    emissiveIntensity: 0.5,
                    //flatShading: true
                }) 
            },
            update: function(e){
                //updates color
                this.el.setAttribute('material',{color: this.data.color,emissive:this.data.color})
                
                //updates qty
                this.cloudGeo.setDrawRange(0, this.data.count*6);
                
                //updates opacity
                this.el.setAttribute('material','opacity',this.opacity)
                let t = this;
                if (this.data.end){
                    if (this.opacity <= 0) return
                    this.opacity-=0.1;
                    setTimeout(function(){t.update()},100)
                } else {
                    if (this.opacity >= 1) return
                    this.opacity+=0.1;
                    setTimeout(function(){t.update()},100)
                }
                
                if (this.data.spot != "none") return
                
                // updates speed
                for (var i = 0; i < this.attr.length; i++) {
                    this.attr[i][2] = o.randInt(3)*this.data.speed/50
                }
            },
            tick: function(time, delta) {
                // night control
                if (o.econtrol!=null && !this.data.end){
                    (o.econtrol.is('night'))?this.el.setAttribute('material',{opacity:0.5,emissiveIntensity: 0.1}):this.el.setAttribute('material',{opacity:1,emissiveIntensity: 0.5});
                }
                
                if (this.data.spot != "none") return
                if((this.data.pause || (o.status !=3 && this.data.pOnP)) && time >0) return

                // array de vertices
                let arr = this.cloudGeo.attributes.position.array;
                let num = 0;
                let b = this.xlen*this.xlen;
                //let c = Math.pow(this.data.inflection,3)/(this.xlen);
                let c = Math.pow(this.data.inflection,2);
                for (var i = 0; i < arr.length; i += 12) {
                    let a = this.attr[num]
                    let x = this.positions[num*3];
                    let y = this.positions[num*3+1];
                    let z = this.positions[num*3+2];
                    let r = Math.sin(Math.PI/6)
                    if (arr[i] > this.xlen){
                        this.positions[num*3] = -this.xlen - a[0];
                        x = this.positions[num*3];
                        // X Coord
                        arr[i+3] = -this.xlen;
                        arr[i] = -this.xlen - a[0]*2;
                        arr[i+6] = arr[i];
                        arr[i+9] = arr[i+3];
                    } else {
                        this.positions[num*3] += a[2];
                        x = this.positions[num*3];
                        // X Coord
                        arr[i] += a[2];
                        arr[i+3] += a[2];
                        arr[i+6] += a[2];
                        arr[i+9] += a[2];
                        let ang = (a[0]/2)*Math.sign(z*x)*this.ang*Math.abs(arr[i]/this.xlen)

                        if (z<this.data.cwidth/2 && z>-this.data.cwidth/2){
                            let hei = Math.sqrt((1-(x*x)/b)*Math.pow((this.data.cheight),2))+y-this.data.height/2;
                            //Y
                            arr[i+1] = hei+Math.sign(x);
                            arr[i+4] = hei-Math.sign(x);
                            arr[i+7] = hei+Math.sign(x);
                            arr[i+10] = hei-Math.sign(x);
                            //Z
                            arr[i+2] = z+a[1];
                            arr[i+5] = arr[i+2];
                            arr[i+8] = z-a[1];
                            arr[i+11] = arr[i+8]; 
                        } else {                        
                            arr[i+2] = z+ang;
                            arr[i+5] = z-ang;
                            arr[i+8] = z+ang;
                            arr[i+11] = z-ang;
                        }
                    }
                    num++  
                }
                this.cloudGeo.attributes.position.needsUpdate = true; 
            },         
        });
        
        // Improvement: use shaders
        // Improvement: true acceleration rate
        // Improvement: schema update on runtime
        // Improvement: changing screen makes spawn alkward
        // Improvement: material transparency control
        // TODO: correct parameters changes
            //obj.count
            //obj.relative
            //opacity
            //enable
        AFRAME.registerComponent("particles", {
            schema: {
                /*
                * can use
                * number    1
                * range     1..2
                * vec range 1 1 1 .. 2 2 2
                * num time  1 , 2 , 3 , 4 , 5
                * vec time  0 0 0 , 0 360 0
                */

                active: {type: 'boolean', default: true}, // if movement is paused or active

                helper: {type: 'boolean', default: true}, // create axis helper
                relative: {type: 'boolean', default: false}, // if relative to world

                entity: { type: "selector" }, // entity to be used as model [optional]
                svg: {type: 'array'}, // if use internal svg
                double: {type: 'boolean', default: false}, // if double side mesh

                count: { default: 10 }, // number of particles emitted
                rate: { default: -1 }, // how many spawn particles per second
                // -1: burst , =count: spread evenly

                position: { default: "0 0 0" , parse : o.arrRange},  // range of initial positions
                rotation: { default: "0 0 0" , parse : o.arrRange}, // range of initial rotations
                scale: { default: "1" , parse : o.arrRange}, // range of initial scales

                lifeTime: { default: "1" , parse : o.arrRange}, // maximum age of each particle
                duration: { default: -1 },  // how long the animation lasts [-1 forever]

                color: { default: "none", parse : o.colorRange}, // particle color

                direction: { default: "forward", oneOf: ["forward", "backwards"]}, // anim direction

                // if any of these exists, position, rotation and scale ony uses first el
                pvel: { default: "0 0 0" , parse : o.arrRange}, // linear velocity
                pacc: { default: "0 0 0" , parse : o.arrRange}, // linear acceleration
                rvel: { default: "0 0 0" , parse : o.arrRange}, // rotation velocity
                racc: { default: "0 0 0" , parse : o.arrRange}, // rotation acceleration
                svel: { default: "0 0 0" , parse : o.arrRange}, // scale velocity
                sacc: { default: "0 0 0" , parse : o.arrRange}, // scale acceleration

                avel: { default: "0 0 0" , parse : o.arrRange}, // angular velocity

                path: { default: "0 0 0" , parse : o.arrRange}, // path to be followed

                // if any of these exists, position, rotation and scale not used
                sphereR: { default: "0" , parse : o.arrRange}, // sphere radius
                spherePhi: { type: 'number', default: 360 , parse: THREE.MathUtils.degToRad },
                sphereTheta: { type: 'number', default: 0 , parse: THREE.MathUtils.degToRad },
                sphereEven: {type: 'boolean', default: false}, // sort particles evenly

                // override rotation
                lookAtCenter: {type: 'boolean', default: false}, // particles targeting center;
                invertY: {type: 'boolean', default: false}, // mesh mirrored in Y;

                // expansion parameters
                spvel: { default: "0" , parse : o.arrRange}, // expansion velocity
                spacc: { default: "0" , parse : o.arrRange}, // expansion acceleration

                // angular increment per slot
                ainc: { default: "0" , parse : o.arrRange}, // angular increment

                accSmooth: { default: 2 }, // how smooth acceleration effect
                opacity: { default: "1" , parse : o.arrRange},

            },
            multiple: true,

            init() { 
                let data = this.data;
                
                // time emitter is
                this.emitterTime = 0

                // particle spawn time
                this.nextTime = 0

                // particles to be created;
                this.bus = []

                // maximum lifetime after random selections
                this.age = 0

                // placeholder for overTimeSlots
                this.overTimeSlots = 0;

                // is sphere positioned
                for (let i=0; i<data.sphereR.length; i++) {
                    if (!(this.data.sphereR[i].every(e => e === 0))) this.sphere =  true
                    if (this.sphere && this.data.pvel.length > i && !(this.data.pvel[i].every(e => e === 0))) this.firework =  true
                }

                // is angular positioned
                for (let i=0; i<data.ainc.length; i++) {
                    if (!this.sphere && !(this.data.ainc[i].every(e => e === 0))) this.angular =  true
                }

                // create svg and apply
                if (data.svg.length > 0) this.createPlane();
                
                // not active timer
                this.paused = 0;
                
                // update movement parameters
                let arr = ['p','r','s']
                for (let i = 0; i < 3; i++) {
                    data[arr[i]+'vel'].unshift([0,0,0,0,0,0])
                    data[arr[i]+'acc'].unshift([0,0,0,0,0,0])            
                }
                data.avel.unshift([0,0,0,0,0,0])
                data.spvel.unshift([0,0])
                data.spacc.unshift([0,0])
                
                // Calculate overTimeSlots
                this.overTimeSlots = Math.max(
                    data.position.length,
                    data.rotation.length,
                    data.scale.length,
                    data.color.length,
                    data.pvel.length,
                    data.rvel.length,
                    data.svel.length,
                    data.sphereR.length,
                    data.spvel.length,
                    data.pacc.length,

                    // acceleration parameters add smooth sublevels
                    (data.pacc.length - 1) * data.accSmooth+1,
                    (data.racc.length - 1) * data.accSmooth+1,
                    (data.sacc.length - 1) * data.accSmooth+1,
                    (data.spacc.length - 1) * data.accSmooth+1,
                    ((this.angular) ? 9 : 0)
                )-1;

            }, // ok
            createPlane(){
                this.isSVG = true;
                const self = this;

                var canvas = document.createElement("canvas");
                var ctx = canvas.getContext("2d");
                var img = document.createElement("img");
                img.setAttribute("src", o[this.data.svg[0]]);
                img.onload = function() {
                    ctx.drawImage(img, 0, 0, 
                        ((self.data.svg[2]) ? self.data.svg[2] : ctx.canvas.width),
                        ((self.data.svg[3]) ? self.data.svg[3] : ctx.canvas.height))
                    self.texture = new THREE.Texture(canvas);
                    self.texture.center.x = 0.5;
                    self.texture.center.y = 0.5;
                    if (self.data.invertY) self.texture.rotation = Math.PI
                    self.texture.needsUpdate = true;

                    // if material already loaded
                    if (self.material) {
                        let c1 = self.data.color[0][0]
                        let c2 = self.data.color[0][1]
                        if (c1.r+c1.g+c1.b+c2.r+c2.g+c2.b == 6) {
                            self.material.emissive.setRGB(1,1,1)
                            self.material.emissiveIntensity = 5;
                        }
                        self.material.map = self.texture;
                        self.material.alphaTest = (self.data.svg[1]) ? self.data.svg[1] : 0.15;
                        self.material.needsUpdate = true;    
                    }
                }

                /*
                let el = document.createElement('a-plane')       
                el.setAttribute('material',{
                    src: o[this.data.svg],
                    transparent: true,
                    side: "double",
                    alphaTest:0.15,
                    //emissive:this.data.color,
                    //emissiveIntensity: 0.5,
                    //flatShading: true
                })

                this.el.parentEl.appendChild(el) 
                this.data.entity = el;    
                */
            },
            update(oldData) {
                const data = this.data
                let obj = AFRAME.utils.diff(oldData,data) 

                // adjust theta limit
                data.sphereTheta = Math.min(Math.PI,obj.sphereTheta)

                // changing particle count
                if (obj.count) {
                    this.remove();
                    this.createMesh();
                }

                // if the duration is changed then restart the particles
                if (obj.duration || obj.direction || obj.count) {
                    this.emitterTime = 0;
                    this.nextTime = 0;
                    this.age = 0;

                    // refill bus;
                    if (this.particles){
                        this.bus = []
                        for (i=0;i<data.count;i++) { 
                            this.bus.push(i)
                        }
                    }

                    (obj.duration == -1) ? this.duration = Infinity : this.duration = obj.duration;
                }

            }, // ok  
            createMesh() {
                const data = this.data

                // if there is no entity property then use self geometry
                let mesh = data.entity ? data.entity.getObject3D("mesh") : this.el.object3D.getObjectByProperty('type', "Mesh");

                // mesh doesn't exist or not yet loaded
                if (!mesh || !mesh.geometry || !mesh.material) return   

                // geometry
                this.geometry = mesh.geometry.clone();    

                // bake entity scale directly on the geo
                let entityScale = data.entity ? data.entity.object3D.scale : {x:1, y:1, z:1}
                this.geometry.scale(entityScale.x, entityScale.y, entityScale.z)

                // material
                this.material = mesh.material //.clone()
                if (data.double) this.material.side = THREE.DoubleSide 
                this.material.transparent = true;
                this.material.alphaTest = (data.svg[1]) ? data.svg[1] : 0.15;
                this.material.opacity = data.opacity[0][0];

                // particles not affected by fog
                this.material.fog = false;

                // if texture already loaded.
                if (data.invertY && this.texture) {
                    this.material.map = this.texture;
                    this.material.needsUpdate = true;
                }

                // this.material.onBeforeCompile = this.onBeforeCompile

                // instances
                this.particles = new ParticleMesh( this.geometry , this.material, data.count);
                this.particles.count = 0;

                // populate bus
                for (i=0;i<data.count;i++) { 
                    this.bus.push(i) 

                    // Adding colors
                    this.particles.setColorAt(i, this.material.color )
                    this.particles.instanceColor.needsUpdate = true;
                }
                this.nextID = this.bus[0]

                // add vec attrs  
                for (let i = 0; i<=this.overTimeSlots; i++){
                    this.particles.addAttr("pos"+i,3,data.count)
                    this.particles.addAttr("rot"+i,3,data.count)
                    this.particles.addAttr("sca"+i,3,data.count)
                    this.particles.addAttr("col"+i,3,data.count)
                } 

                // will be updated every frame
                //this.particles.instanceMatrix.setUsage( THREE.DynamicDrawUsage ); 
                //this.particles.instanceColor.setUsage( THREE.DynamicDrawUsage ); 
                //this.geometry.attributes.instanceOpacity.setUsage( THREE.DynamicDrawUsage );

                let clear = 0;
                for (const key in this.el.components){
                    if (key.includes('particles')) clear++;
                }
                if (clear==1) this.el.object3D.clear();

                if (data.relative) {
                    let el = document.createElement('a-entity');
                    this.el.parentEl.appendChild(el)
                    el.object3D.add( this.particles );
                } else {
                    this.el.object3D.add( this.particles );
                }

                if (data.helper) this.el.object3D.add( new THREE.AxesHelper(1))

                // add lifetime to each particle
                this.particles.addAttr("plife",2,data.count)

                // calculate sphere spread
                if (this.sphere) {
                    this.qty = Math.floor(Math.floor(Math.sqrt(data.count-2))/2)

                    // hide particles above squared qty
                    if (data.count >= (this.qty * this.qty * 4 + 1)) this.particles.count = this.qty * this.qty * 4 + ((data.spherePhi != (Math.PI*2)) ? 1 : 2);

                }
            }, // ok

            tick: (function(){
                const matrix = new THREE.Matrix4();
                const end = new THREE.Matrix4();
                const color = new THREE.Color(); 

                const v1 = new THREE.Vector3();
                const v2 = new THREE.Vector3();
                const v3 = new THREE.Vector3();
                const v4 = new THREE.Vector3();

                const o1 = new THREE.Vector3();
                const o2 = new THREE.Vector3();
                const o3 = new THREE.Vector3();
                const o4 = new THREE.Vector3();

                return function(t,dt){ 
                    let data = this.data;
                    // pause with enabled

                    // create ParticleMesh
                    if (!this.particles) return this.createMesh()

                    // pause if session is paused
                    o.checkPause(this);
                    
                    // incremental emitter time
                    if (data.active) {
                        this.emitterTime += dt;      
                    }  else return
                    
                    // incremental time for next spawn cycle
                    const spawnDelta = (data.rate === -1) ? 0 : 1000 / Math.min(Math.abs(data.rate),data.count)

                    //console.log('wait',(this.emitterTime/1000).toFixed(3))

                    // mid life particles
                    if (this.bus.length < data.count) {            
                        for ( let i = 0; i < data.count; i ++ ) {

                            let life = new THREE.Vector2()
                            this.particles.getAttrAt("plife", i, life)
                            if (!life || life.x == 0) continue

                            // rest of life
                            let rest = (life.x - this.emitterTime/1000)/life.y

                            // kill end of life particles
                            if (rest <= 0) {

                                // OP A - change instance position
                                //array.push(array.splice(index, 1)[0]);

                                //console.log('died',(this.emitterTime/1000).toFixed(3),i,this.bus)

                                // OP B - apply empty matrix
                                this.bus.push(i)
                                this.particles.setMatrixAt(i, end.makeScale(0,0,0));
                                this.particles.instanceMatrix.needsUpdate = true;
                                this.particles.setAttrAt("plife", i, new THREE.Vector2())
                            }

                            // update particles
                            else {

                                let index = this.overTimeSlots-parseInt(rest*this.overTimeSlots)-1

                                if (index >= 0) {

                                    this.particles.getAttrAt("pos"+index, i, o1)
                                    this.particles.getAttrAt("rot"+index, i, o2)
                                    this.particles.getAttrAt("sca"+index, i, o3)
                                    this.particles.getAttrAt("col"+index, i, o4)

                                    this.particles.getAttrAt("pos"+(index+1), i, v1)
                                    this.particles.getAttrAt("rot"+(index+1), i, v2)
                                    this.particles.getAttrAt("sca"+(index+1), i, v3)
                                    this.particles.getAttrAt("col"+(index+1), i, v4)

                                    let ratio = o.map(rest,1-(1/this.overTimeSlots*index),1-(1/this.overTimeSlots*(index+1)),1,0)

                                    if (!(o1.equals(v1) && o2.equals(v2) && o3.equals(v3))) {

                                        this.createMatrix( matrix , [v1,v2,v3], [o1,o2,o3], ratio, true)  

                                        // update transform
                                        this.particles.setMatrixAt(i, matrix);
                                        this.particles.instanceMatrix.needsUpdate = true;
                                    }

                                    if (!(o4.equals(v4))) {

                                        this.createColor( color , [v4,o4,ratio])

                                        // update color
                                        this.particles.setColorAt(i, color )
                                        this.particles.instanceColor.needsUpdate = true;
                                    }
                                }
                            }
                        }
                    }

                    // spawn loop
                    // if particle time before emitter, spawn particle
                    // if not all spawned, continue
                    while (spawnDelta !== Infinity && this.nextTime <= this.emitterTime && this.bus.length > 0 && this.emitterTime < this.duration*1000) {

                        // increase particle drawn count
                        if (!this.sphere) this.particles.count = Math.min(this.particles.count+1,data.count)

                        // set particle lifetime
                        let life = o.randomNum(data.lifeTime[0][0],data.lifeTime[0][1])

                        this.age = Math.max(this.age,life*1000)
                        let vec2 = new THREE.Vector2(this.emitterTime/1000+life,life)
                        this.particles.setAttrAt("plife", this.bus[0],vec2)

                        // if burst, set nextTime to max age
                        if (data.rate === -1 && this.bus.length == 1) this.nextTime = this.emitterTime + this.age;

                        let pos;
                        if (this.sphere && data.sphereEven) {
                            pos = this.spawnVec('position',life,this.bus[0])    
                        } else {
                            pos = this.spawnVec('position',life)
                        }

                        let rot;
                        if (data.lookAtCenter) {
                            rot = this.spawnVec('rotation',life,pos)
                        } else {
                            rot = this.spawnVec('rotation',life)
                        }

                        let sca = this.spawnVec('scale',life)
                        let col = this.spawnVec('color')

                        for (let i=0; i <= this.overTimeSlots;i++){

                            // get vec3s
                            v1.fromArray(pos[i])  
                            v2.fromArray(rot[i])
                            v3.fromArray(sca[i])
                            v4.fromArray(col[i])

                            // store prs as attribute
                            this.particles.setAttrAt("pos"+i, this.bus[0], v1)
                            this.particles.setAttrAt("rot"+i, this.bus[0], v2)
                            this.particles.setAttrAt("sca"+i, this.bus[0], v3)
                            this.particles.setAttrAt("col"+i, this.bus[0], v4)

                            // spawn
                            if (i==0){

                                // generate matrix from vecs
                                this.createMatrix(matrix,pos[0],rot[0],sca[0])

                                // particle transform
                                this.particles.setMatrixAt(this.bus[0], matrix);
                                this.particles.instanceMatrix.needsUpdate = true;  

                                // generate color from vecs
                                this.createColor(color,col[0],true)

                                // particle color
                                this.particles.setColorAt(this.bus[0], color )
                                this.particles.instanceColor.needsUpdate = true;

                            }
                        }
                        
                        this.particles.setOpacityAt( this.bus[0] , 0.5 );

                        //console.log('born',(this.emitterTime/1000).toFixed(3),this.bus[0],this.bus)

                        this.nextTime += spawnDelta;
                        this.bus.shift();

                    }

                    // opacity control
                }
            })(),
            moveEq1: (function(){
                const vec = new THREE.Vector3();
                return function (prop, his, life, i){
                    let data = this.data
                    // S = S0 + V0 . t + a . t . t / 2

                    let c = prop.charAt(0)

                    let p1 = data[c+'vel'];
                    let l1 = p1.length;
                    let p2 = data[c+'acc'];
                    let l2 = p2.length;
                    let s0;

                    // random or old position

                    if (!i) {
                        s0 = o.randomArr(data[prop][i]);  
                    } else if ((!(l1>2 || !(p1[1].every(e => e === 0)))  || !(l2>2 || !(p2[1].every(e => e === 0)))) && data[prop].length > i) {
                        s0 = o.randomArr(data[prop][i]); 
                    }
                    else s0 = his[c][i-1];

                    // world realtive spawn
                    if (i==0 && data.relative && prop == 'position') {
                        vec.fromArray(s0)
                        vec.add(this.el.object3D.position)
                        s0 = [vec.x,vec.y,vec.z]
                    }

                    //let t = life / this.overTimeSlots || 0
                    let t = (!i) ? 0 : life / this.overTimeSlots * i;

                    // random or historic velocity
                    let v = (l1 <= i) ? his.v[i-1] : o.randomArr(p1[i])
                    his.v.push(v)        

                    // random or historic acceleration
                    let a = (l2 <= i) ? his.a[i-1] : o.randomArr(p2[i])
                    his.a.push(a)

                    // position based on linear velocity and acceleration
                    let sx = s0[0] + v[0] * t + a[0] * t * t / 2                
                    let sy = s0[1] + v[1] * t + a[1] * t * t / 2
                    let sz = s0[2] + v[2] * t + a[2] * t * t / 2

                    //if (prop == 'position') console.log(this.overTimeSlots ,i , t)

                    let arr = [sx,sy,sz]
                    if (prop == 'rotation') arr.map(THREE.MathUtils.degToRad)

                    his[c].push(arr)
                    return his
                }
            })(),
            expansionEq1:function (his, i,life, index){
                let data = this.data
                // S = S0 + V0 . t + a . t . t / 2

                let p1 = data.spvel;
                let l1 = p1.length;
                let p2 = data.spacc;
                let l2 = p2.length;

                if (!i ) {
                    s0 = this.sphereCreation(i,index);
                } else if ((!(l1>2 || !(p1[1].every(e => e === 0)))  || !(l2>2 || !(p2[1].every(e => e === 0)))) && data.sphereR.length > i) {
                    s0 = this.sphereCreation(i,index);
                }
                else s0 = his.p[i-1];

                //let t = life / this.overTimeSlots || 0
                let t = (!i) ? 0 : life / this.overTimeSlots * i;

                // random or historic velocity
                let v = (l1 <= i) ? his.v[i-1] : o.randomArr(p1[i])
                his.v.push(v)    

                // random or historic acceleration
                let a = (l2 <= i) ? his.a[i-1] : o.randomArr(p2[i])
                his.a.push(a)

                // position based on angular velocity and acceleration
                let sx = v[0] * t + a[0] * t * t / 2;                
                let sy = v[1] * t + a[1] * t * t / 2;
                let sz = v[2] * t + a[2] * t * t / 2;

                sx = (sx > 0) ? s0[0] * (1 + sx) : s0[0] / (1 - sx);
                sy = (sy > 0) ? s0[1] * (1 + sy) : s0[1] / (1 - sy);
                sz = (sz > 0) ? s0[2] * (1 + sz) : s0[2] / (1 - sz);

                his.p.push([sx,sy,sz])

                // position based on linear velocity and acceleration
                if (this.firework) {
                    if (!his.v2) his.v2 = [];
                    let v2 = (data.pvel.length <= i) ? his.v2[i-1] : o.randomArr(data.pvel[i])
                    his.v2.push(v2) 
                    sz -= v2[2] * t;
                    his.p2.push([sx,sy,sz])
                }

                return his
            },
            angularEq1: (function(){
                const vec = new THREE.Vector3();
                const sphere = new THREE.Spherical()
                const pi = Math.PI;
                return function (his, i,life){
                    // S = S0 + V0 . t;

                    let p1 = this.data.ainc
                    let l1 = p1.length;
                    let p2 = this.data.pvel
                    let l2 = p2.length;
                    let s0;

                    let t = (!i) ? 0 : life / this.overTimeSlots * i;

                    // radius and linear velocity    
                    let v = (l2 <= i) ? his.v[i-1] : o.randomArr(p2[i])
                    his.v.push(v) 

                    // original position as start offset
                    if (!i || !(l2>2 || (p2[0].every(e => e === 0)))) {
                        s0 = o.randomArr(this.data.position[i]);

                        let r0 = Math.sqrt( s0[0] * s0[0] + s0[2] * s0[2] )

                        his.r = r0 + v[0] * t; 

                        his.r += o.randFloatOne() * his.r/100 

                        // create sphere coordinates from initial position
                        sphere.setFromCartesianCoords(s0[0],s0[1],s0[2])

                        // phi fixed through lifetime
                        his.phi = sphere.phi
                    }
                    else s0 = his.p[i-1];

                    // linear increment
                    if (!his.h) his.h = []
                    his.h.push(v[1] * t)

                    // angular increment
                    let ainc = (l1 <= i) ? his.a[i-1] : o.randomArr(p1[i])
                    his.a.push(ainc)

                    // create sphere coordinates from initial position
                    sphere.setFromCartesianCoords(s0[0],s0[1],s0[2])

                    // theta
                    let theta = sphere.theta + THREE.MathUtils.degToRad(ainc[1]); 

                    let sp = new THREE.Spherical(his.r,his.phi,theta)
                    vec.setFromSpherical(sp)

                    his.p.push([vec.x, vec.y + his.h[i], vec.z])

                    return his
                }
            })(),
            sphereCreation: (function(){
                const vec = new THREE.Vector3();
                const sphere = new THREE.Spherical();
                const pi = Math.PI;
                return function(i,index){
                    let data = this.data;
                    // Spherical( radius : Float, phi : Float, theta : Float )

                    // Radius
                    let r = o.randomArr(data.sphereR[i])[0];

                    // phi
                    let phi = data.spherePhi / 2;

                    // theta
                    let theta = data.sphereTheta;

                    // evenly sort sphere
                    if (index != null) {

                        let each = this.qty;

                        if (index == 0) {
                            phi = 0;
                            theta = pi / 2;
                        } else if (index == data.count-1 || index == each * each * 4 + 1) {
                            phi = pi;
                            theta = pi / 2;
                        } else if ((index-1) >= (each * each * 4)){
                            r = 0;
                            phi = 0;
                            theta = 0;
                        } else {                            
                            let row = Math.floor((index-1) / each);
                            let seat = Math.floor((index-1) % each);

                            if (phi == pi) {
                                phi = (seat + 1) * (data.spherePhi / 2) / (each+1);   
                            } else {
                                phi = (seat)* (data.spherePhi / 2) / (each-1);
                            }

                            if (theta == pi) {
                                theta = row * data.sphereTheta / (each*2);  
                            } else {
                                if (row >= each*2) {
                                    theta = pi;
                                    (row%2) ? row = -0.5 * row - 0.5 + 2*each: row = 0.5 * row + 1 - 2*each;
                                } else {
                                    theta = 0;
                                    (row%2) ? row = -0.5 * row - 0.5: row = 0.5 * row + 1;
                                }

                                theta += row * (data.sphereTheta/ 2) / (each*2); 
                            }
                        }

                    } 

                    // random sort sphere
                    else {

                        // phi
                        phi = o.randomNum(-phi,phi)

                        // theta
                        //let theta = Math.min(pi,data.sphereTheta / 2)
                        theta = o.randomNum(pi/2 - theta, pi/2 + theta)

                    }

                    // cartesian position
                    sphere.set(r,phi,theta)
                    vec.setFromSpherical(sphere)

                    return [vec.x, vec.y, vec.z]
                }

            })(),
            spawnVec: (function() {
                const obj = new THREE.Object3D();
                const vec = new THREE.Vector3(1,0,0);
                return function (prop, life, index) {
                    let data = this.data

                    // matrices components array
                    let res= [/*[vec3],[vec3]*/]

                    let his = { v:[], a:[] , p2:[] }
                    let c = prop.charAt(0)
                    his[c] = [];

                    for (let i=0;i<=this.overTimeSlots; i++){
                        // general rule
                        // (this[prop].length <= i) ? res[i] = old : res[i] = o.randomArr(this[prop][i]);

                        if (prop == 'color') {
                            if (data[prop].length > i) {
                                let color = new THREE.Color(Math.random(),Math.random(),Math.random());



                                if (data.color[i][0] != 'random') color.lerpColors(data.color[i][0],data.color[i][1],Math.random());


                                his[c][i] = [color.r, color.g, color.b]
                            } else his[c][i] = his[c][i-1]
                        } 

                        else if (this.sphere && prop=='position') {
                            his = this.expansionEq1(his,i,life,index)
                        }
                        else if (this.angular && prop=='position') {
                            his = this.angularEq1(his, i, life)
                        }
                        else if (index != null && prop=='rotation') {

                            obj.position.fromArray(index[i])
                            obj.lookAt(0,0,0)

                            his[c].push([obj.rotation.x,obj.rotation.y,obj.rotation.z])
                        }
                        else {
                            his = this.moveEq1(prop, his, life, i)
                        }
                    }
                    if (data.direction == 'backwards') {
                        his[c].reverse();
                        his.p2.reverse();
                    }

                    if (this.firework && prop=='position') return his.p2
                    return his[c]
                }
            })(), 
            createMatrix: (function() {
                let position = new THREE.Vector3();
                let vec3 = new THREE.Vector3();
                let rotation = new THREE.Euler();
                let quaternion = new THREE.Quaternion();
                let scale = new THREE.Vector3();

                return function ( matrix , p , r , s , b ) {

                    if (b) {

                        //position
                        position.lerpVectors(p[0],r[0],s)

                        //rotation
                        vec3.lerpVectors(p[1],r[1],s) 
                        rotation.fromArray([vec3.x,vec3.y,vec3.z])
                        quaternion.setFromEuler( rotation );

                        //scale
                        scale.lerpVectors(p[2],r[2],s) 

                        matrix.compose( position, quaternion, scale );
                        return
                    }

                    position.fromArray(p)
                    rotation.fromArray(r)
                    scale.fromArray(s)
                    quaternion.setFromEuler( rotation );
                    matrix.compose( position, quaternion, scale );
                };
            })(),
            createColor: (function() {
                let col1 = new THREE.Color()
                let col2 = new THREE.Color()
                return function ( color , c , b) {

                    if (!b) {

                        col1.fromArray([c[0].x,c[0].y,c[0].z])
                        col2.fromArray([c[1].x,c[1].y,c[1].z])

                        color.lerpColors(col1,col2,c[2])

                        return
                    }

                    color.fromArray(c)
                };
            })(),

            remove() {
                if (this.particles) this.el.removeObject3D(this.particles.name)
            },

            onBeforeCompile(shader) {
                console.log(shader.vertexShader)
                shader.vertexShader = shader.vertexShader.replace( "void main() {",`
                    attribute float instanceOpacity;
                    varying float vInstanceOpacity;
                    varying vec4 vInstanceColor;
                    void main() {
                        vInstanceOpacity = instanceOpacity;
                        vInstanceColor = vec4(1.0);
                `)
                shader.fragmentShader = shader.fragmentShader.replace( "void main() {", `
                    varying float vInstanceOpacity;
                    varying vec4 vInstanceColor;
                    void main() {
                `)
               /* 
                shader.fragmentShader = shader.fragmentShader.replace( "#include <color_fragment>", `
                        diffuseColor *= vInstanceColor;
                        //diffuseColor.a = vInstanceOpacity;
                        diffuseColor.a = 0.5;
              `)
              */
               shader.fragmentShader = shader.fragmentShader.replace( "vec4 diffuseColor = vec4( diffuse, opacity );", `
                    vec4 diffuseColor = vec4( diffuse, opacity ) * vInstanceColor;
                `) 

              this.shader = shader
            },
        }) 
        class ParticleMesh extends THREE.InstancedMesh {
            constructor( geometry, material, count ) {

                super( geometry, material, count );

                this.isParticleMesh = true;
                this.attrs = {}

                this.geometry.setAttribute("instanceOpacity", new THREE.InstancedBufferAttribute(new Float32Array( count ).fill(1), 1 )) 
            }
            getAttrAt(attr, index, holder) {
                holder.fromArray( this[attr].array, index * this.attrs[attr] ); 
            }
            setAttrAt(attr, index, holder) { 
                holder.toArray( this[attr].array, index * this.attrs[attr] );
            }
            addAttr(attr, length , n,fill) { 
                this.attrs[attr] = length;
                this[attr] = new THREE.InstancedBufferAttribute( new Float32Array( n * length ).fill(0), length );
            }
            setOpacityAt( index , opacity ) {
               this.geometry.attributes.instanceOpacity.setX( index, opacity );
            }
            getOpacityAt = function ( index ) {
                return this.geometry.attributes.instanceOpacity.getX( index );
            }
        }
        
        AFRAME.registerComponent('color-picker', {
            schema: {
                targets:{type:'array',default: ['[color-picked]']},
                disabled: {type: 'boolean', default: false},
                wheelSize: {type: 'number', default: 0.28},
                selectionSize: {type: 'number', default: 0.015},
                targetClass: {type: 'string', default: 'any'},
            },
            init: function() {
                var el = this.el;
                var _this = this;
                var old;
                var oClass;
                this.color = new THREE.Color();

                const geometry = new THREE.CircleGeometry( this.data.wheelSize, 32 );
                const material = new THREE.ShaderMaterial({
                    uniforms: {
                        brightness: {type: 'f',value: 1.0}
                    },
                    vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                            gl_Position = projectionMatrix * mvPosition;
                        }
                    `,
                    fragmentShader: `      
                        #define M_PI2 6.28318530718
                        #define M_PI 3.14159265359
                        #define M_PI3 1.04719755119
                        uniform float brightness;
                        varying vec2 vUv;
                        vec3 hsb2rgb(in vec3 c){
                            vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0 );
                            rgb = rgb * rgb * (3.0 - 2.0 * rgb);
                            return c.z * mix( vec3(1.0), rgb, c.y);
                        }
                        void main() {
                            vec2 toCenter = vec2(0.5) - vUv;
                            float radius = length(toCenter) * 2.0;
                            float angle = atan(toCenter.y, toCenter.x);
                            vec3 color = hsb2rgb(vec3((angle / M_PI2) + 0.5, radius, brightness));
                            gl_FragColor = vec4(color,1.0);
                        }
                    `
                });
                el.setObject3D('mesh', new THREE.Mesh(geometry,material));	
                
                el.setAttribute('hoverable',"")
                el.setAttribute('clickable',"")
                el.setAttribute('collidable',"group", o.collisionGroups[this.data.targetClass]); 
                el.classList.add(this.data.targetClass);

                el.addEventListener('grab-start', function (evt) {
                    if (_this.data.disabled) return;
                    if (evt.detail.hand == o.camera || evt.detail.hand == o.hand){
                        _this.onHueDown(o.rhandcursor.object3D.position)
                    } else if (evt.detail.hand == o.land){
                        _this.onHueDown(o.lhandcursor.object3D.position)
                    } else {
                        _this.onHueDown(evt.detail.hand.object3D.position)
                    }
                });
                colorCursor = document.createElement('a-ring');
                colorCursor.setAttribute("color","black")
                colorCursor.setAttribute("position","0 0 0.001")
                colorCursor.setAttribute("radius-inner",this.data.selectionSize/3)
                colorCursor.setAttribute("radius-outer",this.data.selectionSize)
                el.appendChild(colorCursor)
                this.el.sceneEl.addEventListener('loaded', function () {
                    for (i=0;i<_this.data.targets.length;i++){
                        let els = document.querySelectorAll(_this.data.targets[i])
                        for (j=0;j<els.length;j++){
                            els[j].emit('color-picked',{
                                color:_this.color,
                                picker:el
                            })
                        }
                    }
                })
            },
            onHueDown: function(position) {
                position = $("a-camera")[0].object3D.localToWorld(position)
                var colorWheel = this.el.getObject3D('mesh');
                colorWheel.updateMatrixWorld();
                position = colorWheel.worldToLocal(position);            
                var polarPosition = {
                  r: Math.sqrt(position.x * position.x + position.y * position.y),
                  theta: Math.PI + Math.atan2(position.y, position.x)
                };
                var angle = (polarPosition.theta * (180 / Math.PI) + 180) % 360;
                var lightness = -0.5 *((polarPosition.r - this.data.wheelSize) / this.data.wheelSize)+0.5
                this.color.setHSL(angle / 360, polarPosition.r / this.data.wheelSize, lightness)
                this.el.children[0].setAttribute('animation__moving', { 
                    property: "position",
                    easing: "linear",
                    dur: 200,
                    to: {x:position.x,y:position.y,z:0.01}
                });
                for (i=0;i<this.data.targets.length;i++){
                    let els = document.querySelectorAll(this.data.targets[i])
                    for (j=0;j<els.length;j++){
                        els[j].emit('color-picked',{
                            color:this.color,
                            picker:this.el
                        })
                    }
                }
            },
        }); // ok
        AFRAME.registerComponent('color-picked', {
            multiple: true,
            schema: {
                materials:{default: [null]},
                flat:{type: 'boolean', default: true},
                tint:{type:"number",default:0,min:0,max:1},
            },
            init: function(){
                this.pickers = {};
                this.color = new THREE.Color();
                var _this = this;
                this.el.addEventListener('color-picked',function(e){
                    let p = e.detail.picker.object3D.uuid;
                    _this.pickers[p] = new THREE.Color();
                    _this.pickers[p].copy(e.detail.color)    
                    _this.blend();                    

                    if (_this.data.tint) c1.offsetHSL(0,0,_this.data.tint*0.2-0.5)
                    if (_this.data.flat) _this.el.setAttribute('material','shader','flat')
                   
                    if (_this.el.getAttribute('gltf-model') || _this.el.getAttribute('gltf-submodel')){
                        _this.el.setAttribute('gltf-material',{
                            color: "#"+_this.color.getHexString(),
                            materials: _this.data.materials
                        })
                    } 
                    else if (_this.el.tagName == "A-TROIKA-TEXT") {
                        _this.el.setAttribute('troika-text','color',"#"+_this.color.getHexString()) 
                    }
                    else {
                        _this.el.setAttribute('material','color',"#"+_this.color.getHexString())
                    }
                })
            },
            blend: (function(){
                let c1 = new THREE.Color();
                let c2 = new THREE.Color();
                let o1 = {}
                let o2 = {}
                return function() {
                    let num = 0;
                    for (const [key, value] of Object.entries(this.pickers)) {
                        if (num == 0) {
                            c1.copy(value) 
                            num++
                            continue 
                        }
                        c2.copy(value) 
                        c1.getHSL(o1)
                        c2.getHSL(o2)
                        let max = Math.max(o1.h, o2.h);
                        let min = Math.min(o1.h, o2.h);
                        let h;
                        if (max - min > 0.6){
                            h = (((min-0)+1)-max)/2+max
                        } else {
                            if (max >= 0.95){
                                h = (max-min)/3+min
                            } else if (min <= 0.05){
                                h = (max-min)*2/3+min
                            } else {
                                h = (max-min)/2+min
                            }
                        }
                        c1.setHSL(h,o1.s,o1.l)
                    }
                    this.color.copy(c1)
                } 
           })()
        }); // ok  
        
        AFRAME.registerPrimitive('a-sea', {
            defaultComponents: {
                ocean: {},
                rotation: { x: -90, y: 0, z: 0 }
            },
            mappings: {
                width: 'ocean.width',
                length: 'ocean.length',
                depth: 'ocean.depth',
                density: 'ocean.density',
                amplitude: 'ocean.amplitude',
                amplitudevariance: 'ocean.amplitudevariance',
                speed: 'ocean.speed',
                speedvariance: 'ocean.speedvariance',
                color: 'ocean.color',
                opacity: 'ocean.opacity',
                flatshading: 'ocean.flatshading'
            }
        }); // ok 
        AFRAME.registerComponent('ocean', {
            schema: {
                // Dimensions of the ocean area.
                width: { default: 100, min: 0 },
                length: { default: 10, min: 0 },
                depth: { default: 1, min: 0 },

                // Density of waves.
                density: { default: 10 },

                // Wave amplitude and variance.
                amplitude: { default: 0.1 },
                amplitudevariance: { default: 0.3 },

                // Wave speed and variance.
                speed: { default: 1 },
                speedvariance: { default: 2 },

                // Material.
                color: { default: '#7AD2F7', type: 'color' },
                opacity: { default: 0.8 },
                flatshading: {default: false}
            },
            init: function(){
                this.el.setAttribute('material',{
                    shader:'phong',
                    color: this.data.color,
                    transparent: this.data.opacity < 1,
                    opacity: this.data.opacity,
                    flatShading: this.data.flatshading,
                    side: 'double'
                }) 
            },
            play: function () {
                const el = this.el;
                const data = this.data;

                let geometry = new THREE.PlaneGeometry(data.width, data.length, data.density, data.density);
                geometry = THREE.BufferGeometryUtils.mergeVertices(geometry);
                this.waves = [];
                for (let v, i = 0, l = geometry.attributes.position.count; i < l; i++) {
                    v = geometry.attributes.position;
                    this.waves.push({
                        z: v.getZ(i),
                        ang: Math.random() * Math.PI * 2,
                        amp: data.amplitude + Math.random() * data.amplitudevariance,
                        speed: (data.speed + Math.random() * data.speedvariance) / 1000 // radians / frame
                    });
                }

                this.mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({}));
                el.setObject3D('mesh', this.mesh);
            },
            remove: function () {
                this.el.removeObject3D('mesh');
            },
            tick: function (t, dt) {
                if (!dt) return;
                const verts = this.mesh.geometry.attributes.position.array;
                for (let i = 0, j = 2; i < this.waves.length; i++, j = j + 3) {
                    const vprops = this.waves[i];
                    verts[j] = vprops.z + Math.sin(vprops.ang) * vprops.amp;
                    vprops.ang += vprops.speed * dt;
                }
                this.mesh.geometry.attributes.position.needsUpdate = true;
            }
        }); // ok 
        
	    AFRAME.registerComponent('mirror', {
           //by Alfredo Consebola 2017.
	       schema: {
	           resolution: { type:'number', default: 128},
	           refraction: { type:'number', default: 0.95},
	           color: {type:'color', default: 'white'},
	           distance: {type:'number', default: 3000},
	           interval: { type:'number', default: 1000},
	           repeat: { type:'boolean', default: true}
	       },
	       init: function(){
               this.counter = this.data.interval;
               
               const cubeRenderTarget = new THREE.WebGLCubeRenderTarget( this.data.resolution, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter } );

	           this.cam = new THREE.CubeCamera( 0.5, this.data.distance, cubeRenderTarget);
               
	           this.el.object3D.add( this.cam );
	           this.mirrorMaterial = new THREE.MeshBasicMaterial( { color: this.data.color, refractionRatio: this.data.refraction, envMap: this.cam.renderTarget.texture } );
	           this.done = false;
	           var mirrormat = this.mirrorMaterial;
	           this.mesh = this.el.getObject3D('mesh');
	           if(this.mesh){
                   this.mesh.traverse( function( child ) {
                       if ( child instanceof THREE.Mesh ) child.material = mirrormat;
	               });
	           }
	       },	  
	       tick: (function(){
               let pos = new THREE.Vector3();
               let qt = new THREE.Quaternion();
               return function(t,dt){
                   if(!this.done){
                       if( this.counter > 0){
                           this.counter-=dt;
                       }else{
                           this.mesh = this.el.getObject3D('mesh');

                           if(this.mesh){
                               this.mesh.visible = false;
                               AFRAME.scenes[0].renderer.autoClear = true;
                               
                               this.el.object3D.matrixWorld.decompose(this.cam.position, qt,this.cam.scale);
                               
                               this.cam.quaternion = qt.conjugate()

                               this.cam.update( AFRAME.scenes[0].renderer, this.el.sceneEl.object3D );

                               var mirrormat = this.mirrorMaterial;
                               this.mesh.traverse( function( child ) { 
                                   if ( child instanceof THREE.Mesh ) child.material = mirrormat;
                               });
                               this.mesh.visible = true;

                               if(!this.data.repeat){
                                   this.done = true;
                                   this.counter = this.data.interval;
                               }
                           }
                       }
                   }
               }
           })(),
        }); // ok
        
        AFRAME.registerComponent('online-el', {
            init: function(){
                if (!this.data) console.warn("Elementos online precisam de ID!"); 
                if ($("[online-el='"+this.data+"']").length > 1) console.error("Elementos online com ID repetidos!"); 
                                
                // Actual seat
                this.seat = null;
                this.oldMatrix = new THREE.Matrix4();
                //this.oldMatrix.fromArray( this.el.object3D.matrix.elements) 
                this.props = {};
                              
            },
            //We use IIFE (immediately-invoked function expression) to only allocate one vector or euler and not re-create on every tick to save memory.
            tick: (function () {
                var matrix = new THREE.Matrix4();
                var elements = [];
                return function (time) {
                    if (!this.multi) return
                    if (!this.data && (!remoteQueue && !master)) return 
                    
                    // Actual position
                    matrix.copy(this.el.object3D.matrix)
                    elements = Array.from(matrix.elements);
                    //if (!this.oldMatrix) this.oldMatrix.fromArray( this.el.object3D.matrix.elements) 
                    
                    // Setting Seat
                    // && this.data == localCaller+'-0'
                    if (!this.seat && this.data.slice(-2)=='-0' && seats){
                        this.el.object3D.visible = false;
                        if (remoteQueue[this.data] && remoteQueue[this.data][2]){
                            this.seat = [...remoteQueue[this.data][2]];

                            this.el.setAttribute( 'position',this.seat[0])
                            this.el.setAttribute( 'rotation',this.seat[1])
                            if (!this.seat.equals(seats[0]))this.el.object3D.visible = true;
                            
                            if (!selfQueue[this.data]) selfQueue[this.data] = []
                            selfQueue[this.data][2] = [...remoteQueue[this.data][2]]; 
                                                                                   
                        }
                    }  
                    // show hands if main is visible
                    if (this.el.classList.contains('lhand') || this.el.classList.contains('rhand')) {
                        this.el.object3D.visible = true;
                    }
                    
                    // matrix changed somewhere
                    if (remoteQueue[this.data] && (remoteQueue[this.data][0])) {
                        
                        matrix.fromArray(remoteQueue[this.data][0].elements)
                        
                        this.setMatrix(matrix);
                        
                        this.oldMatrix.fromArray(remoteQueue[this.data][0].elements)
                        
                        // send to other peers
                        if (master) {
                            o.pingDC(dC1s, this.data,remoteQueue[this.data])  
                            Object.assign(selfQueue,remoteQueue)
                        }
                        delete remoteQueue[this.data][0]
                    }
                    
                    // matrix changed here
                    else if (!elements.equals(this.oldMatrix.elements) && (!remoteQueue[this.data] || (remoteQueue[this.data] && !remoteQueue[this.data][0]))){
                        //console.log(3,this.data,selfQueue[this.data])
                        
                        this.oldMatrix.fromArray(elements)
                        if (!selfQueue[this.data]) selfQueue[this.data] = []
                        selfQueue[this.data][0] = this.el.object3D.matrix; 
                        
                        if (peer[this.data.slice(0, -2)]) return         
                        o.pingDC(dC1s,this.data,selfQueue[this.data])
                        if (!master) delete selfQueue[this.data]
                    } 
                    
                    // obj changed here
                    else if (!jQuery.isEmptyObject(this.props)){
                        //console.log(4,this.data)
                        
                        if (!selfQueue[this.data]) selfQueue[this.data] = []
                        selfQueue[this.data][1] = {}
                        Object.assign(selfQueue[this.data][1],this.props)
                        o.pingDC(dC1s, this.data,selfQueue[this.data])
                        if (!master) delete selfQueue[this.data]
                        this.props = {}
                    }
                };
            })(),
            setMatrix: function(matrix){
                matrix.decompose(this.el.object3D.position, this.el.object3D.quaternion, this.el.object3D.scale);
            }    
        })  
        AFRAME.registerComponent('menu-el',{
            init: function(){ 
                this.el.setAttribute('collidable','')
            },
            events: {
                'grab-start': function(){
                    if (o.data.hasIntro || o.status == 1 || o.status == 7 || o.status == 8) return
                    if (o.data.has3DMenu && o.sceneEl.is('vr-mode')) {
                        $('#playmsg').show();
                        o.sessionHandler('pause')      
                    }
                    if (o.data.hasARMenu) o.simulate()   
                }
            }
        })
        
        AFRAME.registerComponent('selectable',{
            init: function(){ 
            
                if (this.el.getAttribute('grabbable')==null) this.el.setAttribute('clickable','')
                
                if (!(this.el.getAttribute('gltf-model') || this.el.getAttribute('gltf-submodel'))){
                    this.color = this.el.getAttribute('material').color;
                    this.emissive = this.el.getAttribute('material').emissive;
                }
                this.position = new THREE.Vector3()
            },
            events: {
                'grab-start': function(e){
                    this.position.copy(e.detail.hand.object3D.position)
                },
                'grab-end': function(e){  
                    if(e.detail.hand.object3D.position.distanceTo( this.position)>0.01 || o.status<=1) return
                    if (this.el.is('selected')) {
                        const index = o.selected.indexOf(this.el);
                        if (index > -1) o.selected.splice(index, 1);
                        this.el.removeState('selected')
                        if (!(this.el.getAttribute('gltf-model') || this.el.getAttribute('gltf-submodel'))){
                            this.el.setAttribute('material',{
                                emissive: this.emissive,
                                color: this.color
                            }) 
                        } else {
                            this.el.setAttribute("gltf-material__a","reset",true)    
                        }
                    } else {
                        o.selected.push(this.el)
                        this.el.addState('selected')
                        
                        if (!(this.el.getAttribute('gltf-model') || this.el.getAttribute('gltf-submodel'))){
                            this.el.setAttribute('material',{
                                emissive: "rgb(0, 182, 160)",
                            })
                        } else {
                            this.el.setAttribute("gltf-material__a","")  
                            this.el.setAttribute("gltf-material__a",{
                                emission:"0 182 160 0.2",
                                reset:false
                            })   
                        }
                    }
                },
            }
        }) // ok
        AFRAME.registerComponent('turnable',{
            init: function(){ 
                if (!this.el.getAttribute('selectable')==null) this.el.setAttribute('selectable','')
            },
            events: {
                stateadded: function(e){
                    if (e.detail == 'selected' && !o.sceneEl.is('vr-mode')) $("#turn-btn").css('display','flex')
                },
                stateremoved: function(e){
                    if (e.detail == 'selected' && o.selected.length == 0) {
                        $("#turn-btn").hide()
                        o.toDynamic(this.el)
                    }
                },
            }
        }) // ok
        AFRAME.registerComponent('collidable',{
            schema: {
                group: {type: 'int',default: 8}, // collide group
                alwaysCollide: {type: 'boolean',default:false}
            },
            init: function(){ 
                if (this.el.getAttribute('ammo-body') == null) {
                    this.el.setAttribute('ammo-body',{
                        emitCollisionEvents: true,
                        collisionFilterGroup: this.data.group,
                        collisionFilterMask: 1,
                        type:'static',
                        mass:0
                    })
                } else {
                    this.el.setAttribute('ammo-body',{
                        emitCollisionEvents: true,
                        collisionFilterGroup: this.data.group,
                        collisionFilterMask: 1,
                    })
                }
                if (this.el.getAttribute('ammo-shape') == null) {
                    this.el.setAttribute('ammo-shape',{
                        type:'box',
                    })
                }
                this.allowCollisions = true;
            },
            tick: function(){
                if (this.data.alwaysCollide){
                    this.el.setAttribute('ammo-body','disableCollision',false)
                    this.allowCollisions = true;
                } else if (this.allowCollisions && o.sceneEl.is('2d-mode') && this.el.getAttribute('clickable') != null) {
                    this.el.setAttribute('ammo-body','disableCollision',true)
                    this.allowCollisions = false;
                } else if (!this.allowCollisions && o.sceneEl.is('vr-mode') && this.el.getAttribute('clickable') == null) {
                    this.el.setAttribute('ammo-body','disableCollision',false)
                    this.allowCollisions = true;
                }
            },
            events: {
                'collide-start': function(e){
                    //console.log('ammo colision start',e) 
                    if (!this.allowCollisions) return
                    this.el.emit('grab-start',{hand:e.target})
                },
                'collide-end': function(e){
                    //console.log('ammo colision end',e) 
                    if (!this.allowCollisions) return
                    this.el.emit('grab-end',{hand:e.target})
                }
            }
        }) // ok
        AFRAME.registerComponent('mode-lock',{
            schema: {type: 'string',default: '2d', oneOf: ['2d','vr','ar']},
            tick: function(){
                if (o.sceneEl.is(this.data+'-mode') && !this.el.object3D.visible){
                    this.el.object3D.visible = true;   
                }
                else if (!o.sceneEl.is(this.data+'-mode') && this.el.object3D.visible){
                    this.el.object3D.visible = false;
                }
            }
        }) // ok
        
        AFRAME.registerComponent('buzzer',{
            schema: {
                frequency: {type: 'number',default: 0},
                volume: {type: 'number',default: 1},
                buzzerOn: {type: 'boolean',default: false},
                positional: {type: 'boolean',default: true},
            },
            init: function(){
                this.oscillator;
                this.gainNode;   
            },
            buzzer: function(f){  
                if (!o.audioCtx) return;
                this.data.frequency = f;
                ARparams.buzzer[0] = f;
                if (!this.oscillator){
                    this.oscillator = o.audioCtx.createOscillator();
                    this.gainNode = o.audioCtx.createGain();
                    this.oscillator.connect(this.gainNode);
                    this.gainNode.connect(o.audioCtx.destination);
                    this.gainNode.gain.value = this.data.volume/10;
                }
                this.oscillator.frequency.value = f*ARparams.buzzer[2];
                if (f <= 0){
                    this.oscillator.stop();
                    this.oscillator = null;
                    this.data.buzzerOn = false;
                } else {
                    if (!this.data.buzzerOn) {
                        this.oscillator.start();
                        this.data.buzzerOn = true;
                    }
                }
            },
            tick: (function(){
                var p1 = new THREE.Vector3();
                var p2 = new THREE.Vector3();
                return function(){
                    if (!this.data.positional) return
                    let val = o.getObj(ARstate,'buzzer')
                    if (val != this.data.frequency) this.buzzer(val)
                    
                    p1.setFromMatrixPosition(this.el.object3D.matrixWorld);
                    p2.setFromMatrixPosition(o.camera.object3D.matrixWorld);
                    
                    let distance = p1.distanceTo(p2)
                    
                    let vol = o.map(distance+o.zoom[0],0.7,2.7,this.data.volume/10,this.data.volume/100)
                    
                    if (this.gainNode && this.gainNode.gain.value != vol) this.gainNode.gain.value = vol;
                }
            })(),
        })
        AFRAME.registerComponent('boombox' , {
            schema: {
                debug: {type: 'boolean', default: false},
                bitsPerSample: {type: 'int', default: 16},
                channels: {type: 'int', default: 1},
                sampleRate: {type: 'int', default: 44100},
                volume: {type: 'int', default: 32768},
            }, 
            init: function () { // initial state
                // Based on audiosynth by Keith William Horwood
                console.log('initiating boombox')
                o.boombox = this; // to be called on runtime

                this.notes = {
                    'C':261.63, 
                    'C#':277.18,
                    'D':293.66,
                    'D#':311.13,
                    'E':329.63,
                    'F':349.23,
                    'F#':369.99,
                    'G':392.00,
                    'G#':415.30,
                    'A':440.00,
                    'A#':466.16,
                    'B':493.88
                } // notes
                this.sounds = [] // loaded instruments

                this.wavCache = [] // created wavs

                // array of modulation functions
                this.mod = [ 
                    function(i,s,f,x){
                        return Math.sin((2 * Math.PI)*(i/s)*f+x);
                    }
                ];
                this.loadModulationFunction()
                
                // starting instruments
                let instruments = {
                    piano: {
                       name: 'piano',
                       attack: function() { return 0.002; },
                       dampen: function(sampleRate, frequency, volume) {
                          return Math.pow(0.5*Math.log((frequency*volume)/sampleRate),2);
                       },
                       wave: function(i, sampleRate, frequency, volume) {
                          var base = this.modulate[0];
                          return this.modulate[1](
                             i,
                             sampleRate,
                             frequency,
                             Math.pow(base(i, sampleRate, frequency, 0), 2) + (0.75 * base(i, sampleRate, frequency, 0.25)) + (0.1 * base(i, sampleRate, frequency, 0.5))
                          );
                       }
                    },
                }
                this.loadSoundProfile(instruments.piano);
            },
            createInstrument: function(sound) {
                console.log(2,sound)
                var n = 0;
                var found = false;
                if (!this.sounds.includes(sound)) throw new Error('Invalid sound or sound ID: ' + sound); 
                var ins = new AudioSynthInstrument(this, sound, n);
                return ins;
            },
            loadModulationFunction: function() {
                let arr = [
                    function(i, sampleRate, frequency, x) { return 1 * Math.sin(2 * Math.PI * ((i / sampleRate) * frequency) + x); },
                    function(i, sampleRate, frequency, x) { return 1 * Math.sin(4 * Math.PI * ((i / sampleRate) * frequency) + x); },
                    function(i, sampleRate, frequency, x) { return 1 * Math.sin(8 * Math.PI * ((i / sampleRate) * frequency) + x); },
                    function(i, sampleRate, frequency, x) { return 1 * Math.sin(0.5 * Math.PI * ((i / sampleRate) * frequency) + x); },
                    function(i, sampleRate, frequency, x) { return 1 * Math.sin(0.25 * Math.PI * ((i / sampleRate) * frequency) + x); },
                    function(i, sampleRate, frequency, x) { return 0.5 * Math.sin(2 * Math.PI * ((i / sampleRate) * frequency) + x); },
                    function(i, sampleRate, frequency, x) { return 0.5 * Math.sin(4 * Math.PI * ((i / sampleRate) * frequency) + x); },
                    function(i, sampleRate, frequency, x) { return 0.5 * Math.sin(8 * Math.PI * ((i / sampleRate) * frequency) + x); },
                    function(i, sampleRate, frequency, x) { return 0.5 * Math.sin(0.5 * Math.PI * ((i / sampleRate) * frequency) + x); },
                    function(i, sampleRate, frequency, x) { return 0.5 * Math.sin(0.25 * Math.PI * ((i / sampleRate) * frequency) + x); }
                ]
                for(var i=0;i<arr.length;i++) {
                    f = arr[i];
                    if(typeof(f)!='function') { throw new Error('Invalid modulation function.'); }
                    this.mod.push(f);
                }
                return true;
            },
            loadSoundProfile: function() {
                for(i=0;i<arguments.length;i++) {
                    this.sounds.push(arguments[i]);
                }
                this.resizeCache();
            },
            resizeCache: function() {
                while(this.wavCache.length<this.sounds.length) {
                    var octaveList = [];
                    for(var i = 0; i < 8; i++) {
                        var noteList = {};
                        for(var k in this.notes) {
                            noteList[k] = {};
                        } 
                        octaveList.push(noteList);
                    }
                    this.wavCache.push(octaveList);
                }
            },
            clearCache: function() {
                this.wavCache = [];
                this.resizeCache();
            },
            generate: function(sound, note, octave, duration) {
                var thisSound = this.sounds[sound];
                if(!thisSound) {
                    for(var i=0;i<this.sounds.length;i++) {
				        if(this.sounds[i].name==sound) {
                            thisSound = this.sounds[i];
                            sound = i;
                            break;
                        }       
                    }        
                }
                
                if(!thisSound || !this.notes[note] || !window.Blob) throw new Error('Invalid sound, note or blob');

                var t = (new Date).valueOf();
                this.temp = {};
                octave |= 0;
                octave = Math.min(8, Math.max(1, octave));
                
                var time = !duration?2:parseFloat(duration);

                if(typeof(this.wavCache[sound][octave-1][note][time])!='undefined') {
                    if(this.data.debug) { console.log((new Date).valueOf() - t, 'ms to retrieve (cached)'); }
                    return this.wavCache[sound][octave-1][note][time];
                } 
                // wav creation
                else {
                    var frequency = this.notes[note] * Math.pow(2,octave-4);
                    var sampleRate = this.data.sampleRate;
                    var volume = this.data.volume;
                    var channels = this.data.channels;
                    var bitsPerSample = this.data.bitsPerSample;

                    var attack = thisSound.attack(sampleRate, frequency, volume);
                    var dampen = thisSound.dampen(sampleRate, frequency, volume);
                    var waveFunc = thisSound.wave;
                    var waveBind = {modulate: this.mod, vars: this.temp};
                    var val = 0;
                    var curVol = 0;

                    var data = new Uint8Array(new ArrayBuffer(Math.ceil(sampleRate * time * 2)));
                    var attackLen = (sampleRate * attack) | 0;
                    var decayLen = (sampleRate * time) | 0;

                    for (var i = 0 | 0; i !== attackLen; i++) {

                        val = volume * (i/(sampleRate*attack)) * waveFunc.call(waveBind, i, sampleRate, frequency, volume);

                        data[i << 1] = val;
                        data[(i << 1) + 1] = val >> 8;

                    }

                    for (; i !== decayLen; i++) {

                        val = volume * Math.pow((1-((i-(sampleRate*attack))/(sampleRate*(time-attack)))),dampen) * waveFunc.call(waveBind, i, sampleRate, frequency, volume);

                        data[i << 1] = val;
                        data[(i << 1) + 1] = val >> 8;

                    }

                    var out = [
                        'RIFF',
                        this.pack(1, 4 + (8 + 24/* chunk 1 length */) + (8 + 8/* chunk 2 length */)), // Length
                        'WAVE',
                        // chunk 1
                        'fmt ', // Sub-chunk identifier
                        this.pack(1, 16), // Chunk length
                        this.pack(0, 1), // Audio format (1 is linear quantization)
                        this.pack(0, channels),
                        this.pack(1, sampleRate),
                        this.pack(1, sampleRate * channels * bitsPerSample / 8), // Byte rate
                        this.pack(0, channels * bitsPerSample / 8),
                        this.pack(0, bitsPerSample),
                        // chunk 2
                        'data', // Sub-chunk identifier
                        this.pack(1, data.length * channels * bitsPerSample / 8), // Chunk length
                        data
                    ];
                    var blob = new Blob(out, {type: 'audio/wav'});
                    var dataURI = URL.createObjectURL(blob);
                    this.wavCache[sound][octave-1][note][time] = dataURI;
                    if(this.data.debug) { console.log((new Date).valueOf() - t, 'ms to generate'); }
                    return dataURI;
                }
            }, 
            start: function(sound, note, octave, duration) {
                let el = document.getElementById(sound+"_"+note+"_"+octave);
                if (el) return
                var src = this.generate(sound, note, octave, duration);
                var audio = new Audio(src);
                audio.id = sound+"_"+note+"_"+octave;
                o.sceneEl.appendChild(audio)
                this.playPromise = audio.play();
                return true;
            }, 
            stop: function(sound, note, octave) {
                let el = document.getElementById(sound+"_"+note+"_"+octave);
                if (!el) return
                if (this.playPromise !== undefined) {
                    this.playPromise.then(_ => {
                        el.pause();
                        el.parentElement.removeChild(el)
                    })
                }
                return true;
            },
            pack: function(c,arg){ 
                return [new Uint8Array([arg, arg >> 8]), new Uint8Array([arg, arg >> 8, arg >> 16, arg >> 24])][c]; 
            },
        });
        AFRAME.registerComponent('axes-helper', {
            //The X axis is red. The Y axis is green. The Z axis is blue.
            schema: {size: {type: "number",default: 0.5}},
            init: function () {
                this.el.setObject3D("axes-helper",new THREE.AxesHelper(this.data.size));
            }
        });
        
        AFRAME.registerComponent('limit-lock', {
            schema: {
                plimx:{type: "vec2"},//min,max
                plimy:{type: "vec2"},
                plimz:{type: "vec2"},
                rlimx:{type: "vec2"},
                rlimy:{type: "vec2"},
                rlimz:{type: "vec2"},
                slimx:{type: "vec2"},
                slimy:{type: "vec2"},
                slimz:{type: "vec2"},
            },
            init: function () {
                this.position = new THREE.Vector3()
                this.rotation = new THREE.Euler()
                this.scale = new THREE.Vector3()
                this.newTransform('position')
                this.newTransform('rotation')
                this.newTransform('scale')
            },
            newTransform: function(prop){
                this[prop.toLowerCase()].copy( this.el.object3D[ prop.toLowerCase() ]) 
            },
            tick: function () {
                this.locking()
            },
            locking: function(){
                for(const lim in this.data){
                    
                    // check prop
                    let prop = 'position';
                    if (lim.charAt(0)=='s') prop = 'scale'
                    else if (lim.charAt(0)=='r') prop = 'rotation';
                    
                    // check axis
                    let axis = 'x';
                    if (lim.charAt(lim.length-1)=='y') axis = 'y'
                    else if (lim.charAt(lim.length-1)=='z') axis = 'z';
                    
                    if(this.data[lim].x != this.data[lim].y) {
                        //check min
                        if (this.el.object3D[prop][axis] < this.data[lim].x) {
                            this.el.object3D[prop][axis] = this.data[lim].x
                        }
                        //check max
                        if (this.el.object3D[prop][axis] > this.data[lim].y) {
                            this.el.object3D[prop][axis] = this.data[lim].y
                        }
                    }
                } 
            }
        }); // ok
        
        AFRAME.registerComponent('checkpoint', {
            schema: {
                offset: {default: {x: 0, y: 0, z: 0}, type: 'vec3'}
            },
            init: function () {
                this.active = false;
                this.targetEl = null;
                this.fire = this.fire.bind(this);
                this.offset = new THREE.Vector3();
            },
            update: function () {
                this.offset.copy(this.data.offset);
            },
            play: function() {
                this.el.addEventListener('grab-start', this.fire);
                this.active = true;
            },
            pause:function() {
                this.el.removeEventListener('grab-end', this.fire);
                this.active = false;
            },
            remove: function () { this.pause(); },
            fire: function() {
                if (o.movementType == 'checkpoint' && o.status == 3 && o.cameraRig.components['checkpoint-controls']) {
                    o.cameraRig.components['checkpoint-controls'].setCheckpoint(this.el); 
                    o.actualCheckpoint = this.el;
                }
            },
            getOffset: function () {
                return this.offset.copy(this.data.offset);
            }
        });
        
        AFRAME.registerComponent('spline', {
            schema: {
                closed: {type: 'boolean',default: false},
                color: {type: 'string',default: "#ff0000"},
                showLine: {type: 'boolean',default: true},
                showcps: {type: 'boolean',default: false}
            },
            init: function () {
                this.pathPoints = null;
                this.curve = null;
                this.el.addEventListener("cp-change", this.update.bind(this));
            },
            update: function (oldData) {
                this.points = Array.from(this.el.querySelectorAll("a-cp, [cp]"));
                if (this.points.length <= 1) {
                    console.warn("São necessários no mínimo 2 pontos");
                    this.curve = null;
                } else {
                    let _data = this.data;
                    // Pega a posição de cada CP.
                    var pointsArray = this.points.map(function (point) {
                        point.setAttribute('show',_data.showcps)
                        
                        if (point.x !== undefined && point.y !== undefined && point.z !== undefined) return point;
                        return point.object3D.getWorldPosition(new THREE.Vector3());
                    });
                    
                    // Update do spline se o formato mudar.
                    if (!AFRAME.utils.deepEqual(pointsArray, this.pathPoints) || (oldData !== 'CustomEvent' && !AFRAME.utils.deepEqual(this.data, oldData))) {
                       this.curve = null;
                        this.pathPoints = pointsArray;
                        this.curve = new THREE.CatmullRomCurve3(this.pathPoints);
                        this.curve.closed = this.data.closed;                
                        if (this.data.showLine){
                            var lineGeometry = new THREE.BufferGeometry().setFromPoints(this.curve.getPoints(this.curve.getPoints().length * 10));
                           var lineMaterial = new THREE.LineBasicMaterial({color: this.data.color});
                           this.el.setObject3D('mesh', new THREE.Line(lineGeometry, lineMaterial));
                        }
                    }
                }
            },
            remove: function () {
                this.el.removeEventListener("cp-change", this.update.bind(this));
                this.el.getObject3D('mesh').geometry = new THREE.Geometry();
            },
            closestPointInLocalSpace: function closestPoint(point, resolution, testPoint, currentRes) {
                if (!this.curve) throw Error('Curve not instantiated yet.');
                resolution = resolution || 0.1 / this.curve.getLength();
                currentRes = currentRes || 0.5;
                testPoint = testPoint || 0.5;
                currentRes /= 2;
                var aTest = testPoint + currentRes;
                var bTest = testPoint - currentRes;
                var a = this.curve.getPointAt(aTest);
                var b = this.curve.getPointAt(bTest);
                var aDistance = a.distanceTo(point);
                var bDistance = b.distanceTo(point);
                var aSmaller = aDistance < bDistance;
                if (currentRes < resolution) {
                    var tangent = this.curve.getTangentAt(aSmaller ? aTest : bTest);
                    if (currentRes < resolution) return {
                        result: aSmaller ? aTest : bTest,
                        location: aSmaller ? a : b,
                        distance: aSmaller ? aDistance : bDistance,
                        normal: normalFromTangent(tangent),
                        tangent: tangent
                    };
                }
                if (aDistance < bDistance) {
                    return this.closestPointInLocalSpace(point, resolution, aTest, currentRes);
                } else {
                    return this.closestPointInLocalSpace(point, resolution, bTest, currentRes);
                }
            }
        }); // ok
        AFRAME.registerComponent('cp', {
            schema: {
                show:{type: 'boolean',default: false},
            },
            init: function () {
                this.el.addEventListener("componentchanged", this.changeHandler.bind(this));
                this.el.emit("cp-change");
            },
            update: function(){
                if (this.data.show) {
                    this.el.setAttribute('axes-helper','')
                } else {
                    this.el.removeAttribute('axes-helper')
                }
            },
            changeHandler: function (event) {
                if (event.detail.name == "position") this.el.emit("cp-change");
            }
        }); // ok
        AFRAME.registerComponent('alongpath', {
            schema: {
                path: {default: 'asset'}, //path to follow
                dur: {default:1000}, // duration of the whole path
                speed: {default: 50}, // wheels speed
                stoped: {default: false}, // ??
                loop: {default: false}, // loop when finished
                rotate: {default: false}, // rotate to follow path
                resetonplay: {default:false}, // restart at 0
                audio: {type: 'selector'}, // positional audio of the car
                delay: {type: 'number', default: 0}, // delay to adequate audio
            },
            init: function(){
                this.initialPosition = this.el.object3D.position;
                this.reset()
            },
            update: function (oldData) {
                if (!this.data.path) return
                this.path = o.sceneEl.querySelector(this.data.path)
                this.lastcp = null;
                if (this.data.resetonplay) this.reset();
            },
            reset: function() {
                this.interval = 0;
                this.el.removeState("endofpath");
                this.el.removeState("moveonpath");
            },   
            getI_: function (interval, dur) {
                //if (this.data.stoped) return 0;
                var i = 0;
                (interval >= dur)?i=1:i=interval/dur;
                return i
            },
            tick: function (time, timeDelta) {
                if (o.status != 3 && !this.el.hasAttribute("nonstop") || this.data.stoped) return
                
                // get spline curve
                var curve = this.path.components['spline'] ? this.path.components['spline'].curve : null;
                if (!curve) return
                
                // Update Rotation of Entity
                if (this.data.rotate === true) {
                    var nextInterval = this.interval + timeDelta
                    
                    var nextPosition = curve.getPoint(this.getI_(nextInterval, this.data.dur));
                    
                    this.el.object3D.lookAt(nextPosition)
                    if (this.el.is('fpv')) {
                        o.cameraRig.object3D.lookAt(nextPosition)
                        o.cameraRig.object3D.rotation.y += 3.14
                    }
                    
                    let right = new THREE.Vector3(0,0,1)

                    this.el.emit('steer',{
                        y:nextPosition
                            .sub(this.el.object3D.position)
                            .angleTo(right)
                    })
                }
                
                if (!this.el.is("endofpath")) {
                    this.interval = this.interval + timeDelta;
                    
                    var i = this.getI_(this.interval, this.data.dur)
                    
                    // reached end of path
                    if (this.data.loop === false && i >= 1) {
                        
                        // set position as the last of the path.
                        this.el.setAttribute('position', curve.points[curve.points.length - 1]);
                        
                        this.el.removeState("moveonpath");
                        this.el.addState("endofpath");
                        this.el.emit("movingended");
                        
                        // pause the audio at end.
                        if (this.data.audio!= null) this.data.audio.pause();
                    } 
                    
                    // reached end of path but loops
                    else if ((this.data.loop === true) && i >= 1) {
                        this.el.emit("movingended");
                        if (this.data.audio!= null) {
                            this.data.audio.loop = true;
                            this.data.audio.currentTime = this.data.delay; 
                        }
                        // reset interval
                        this.interval = 0;
                    } 
                    
                    // during the path
                    else {
                        if (!this.el.is("moveonpath")) {
                            this.el.addState("moveonpath");
                            this.el.emit("movingstarted");
                            if (this.data.audio!= null) {
                                if (!this.data.stoped) this.data.audio.play();
                                this.data.audio.currentTime = this.data.delay; 
                            }
                        }
                        
                        // if not manually stoped
                        if (!this.data.stoped) {
                            
                            var v2 = curve.getPoint(i);
                            this.el.setAttribute('position', v2); 
                            
                            let cps = this.path.querySelectorAll('a-cp')
                            let cpi = parseInt(o.map(i,0,1,0,cps.length));
                            
                            if (this.lastcp == cpi) return
                            this.lastcp = cpi;
                            
                            // get cp property
                            let prop = cps[cpi].getAttribute("prop")
                            
                            if (!prop) return
                            let obj = AFRAME.utils.styleParser.parse(prop);
                            
                            for (const key in obj) {
                                this.el.emit(key,obj[key])
                                
                                if (key == 'speed') {
                                    // update duration per cp speed
                                    if (obj[key]==0) {
                                        this.data.stoped = true
                                    } else {
                                        let i = this.interval/this.data.dur;
                                        this.data.dur = 50000/obj[key];
                                        this.interval = i*this.data.dur 
                                    } 
                                }
                            }
                            
                            // play cp audio
                            if (cps[cpi].getAttribute("audio")!=null) cps[cpi].play();
                        }
                    }
                }
            },
            play: function () {
                if (this.data.resetonplay) this.reset();
            },
            remove: function () {
                this.el.object3D.position.copy(this.initialPosition);
            }
        }); // ok
        AFRAME.registerPrimitive('a-spline', {
            defaultComponents: {'spline': {}},
            mappings: {
                closed: 'spline.closed',
                color: 'spline.color',
                showLine: 'spline.showLine',
                showcps: 'spline.showcps',
            }
        }); // ok
        AFRAME.registerPrimitive('a-cp', {
            defaultComponents: {cp: {}},
            mappings: {
                show: 'cp.show',
                mark: 'cp.show'
            }
        }); // ok        
        AFRAME.registerComponent('car', {
            schema: {
                wheelsrc: {type: 'asset'},
                wheelpart: {type: 'string'},
                
                steer:{type: 'number',default: 0}, // -1 à 1
                speed:{type: 'number',default: 0}, // -1 à 1
               
                wheelb:{type:'number',default: 1.62},
                wheeld:{type:'number',default: 2.75},
                wheelh:{type:'number',default: 0.25},
                
                //fpvpos:{type:'vec3'},
                
                pitchbump:{type: 'boolean',default: true},
                bumpdur:{type: 'number',default: 100}, // 0 à 1
               
                animated:{type: 'boolean',default: true}
            },
            init: function () {
                var el = this.el;
                var rotDir = "360";
                
                let wheelb = this.data.wheelb;
                let wheeld = this.data.wheeld;
                let wheelh = this.data.wheelh;
                
                let steerObj = { 
                    property: "rotation",
                    easing: "linear",
                    dur: 500,
                    enabled:false
                }
                
                this.fpv = false;
                this.old = new THREE.Vector3();
                this.pos = new THREE.Vector3();
                
                // creating wheels
                for (i=1;i<=4;i++){
                    // creating wheel steering el
                    let wheel = document.createElement('a-entity');
                    let rotation;
                    rotDir = "360";
                    switch(i) {
                        case 2:
                            wheelb = -wheelb;
                            rotation="0 180 0";
                            rotDir = "-360";
                            this.w2 = wheel;
                            wheel.setAttribute( 'animation__steering',steerObj);
                            break;
                        case 3:
                            wheeld = -wheeld;
                            rotation="0 180 0";
                            rotDir = "-360";
                            break;
                        case 4:
                            wheelb = -wheelb;
                            break;
                        default:
                            this.w1 = wheel;
                            wheel.setAttribute( 'animation__steering',steerObj);
                    }
                    wheel.setAttribute('position',wheelb/2+' '+wheelh+' '+wheeld/2);
                    if (rotation!=null) wheel.setAttribute('rotation',rotation);
                    wheel.setAttribute('class','w'+i)
                    
                    // creating wheel rolling el
                    let inner = document.createElement('a-entity');
                    inner.setAttribute('class','w')
                    inner.setAttribute('animation__moving', { 
                        property: "rotation",
                        easing: "linear",
                        loop:true,
                        dur: 100,
                        to: rotDir+" 0 0",
                        enabled:false
                    }); 
                    
                    // creating wheel 3dmodel
                    let model = document.createElement('a-entity');
                    if (this.data.wheelpart!='') {
                        model.setAttribute('gltf-submodel',{src:this.data.wheelsrc,part:this.data.wheelpart});    
                    } else {
                        model.setAttribute('gltf-model',this.data.wheelsrc)
                    }

                    inner.append(model)
                    wheel.append(inner)
                    el.append(wheel)
                }
                this.wheels = this.el.querySelectorAll('.w')

            },
            update: function(olddata) {
                //this.pos.copy(this.data.fpvpos)
                //this.pos.x = -this.pos.x
                
                if (!this.data.animated) this.moving()
                
                let obj = AFRAME.utils.diff(olddata,this.data)
                if (obj.speed != null) {
                    this.moving(obj.speed)
                    if (this.data.pitchbump) this.pitchbump(olddata.speed,this.data.speed)
                }
                if (obj.steer != null) this.steering(obj.steer) 
            },
            steering: function(steer) {
                this.w1.setAttribute('animation__steering', {
                    enabled:true,
                    to: "0 "+(o.map(steer,-1,1,-40,40))+" 0"
                }) 
                this.w2.setAttribute('animation__steering', {
                    enabled:true,
                    to: "0 "+(o.map(steer,-1,1,140,220))+" 0"
                }) 
            },
            moving: function(speed) {
                for (var i = 0; i < this.wheels.length; i++) {
                    this.wheels[i].setAttribute('animation__moving', {
                        enabled: (!speed || speed == 0) ? false : true,
                        dur: (!speed || speed == 0) ? 0 : 3000/speed * Math.sign(speed),
                        dir: (Math.sign(speed)<0) ? 'normal' : 'reverse',
                        to:(this.wheels[i].getAttribute('rotation').x+360)+' 0 0'
                    })
                }
            },
            pitchbump: function(old,actual){
                let self = this;
                let ele = this.el;
                let d = this.data;
                let n = -1;
                if (actual>old) n = 1;
                
                // workaround to lookat on alongpath
                ele.object3D.traverse(node => {
                    if (!node.isMesh) return
                    node.rotation.x -= n * d.wheeld / 110;
                    setTimeout(function(){
                        node.rotation.x += n * d.wheeld / 110;
                    },d.bumpdur)
                });
                
                //ele.object3D.rotation.x -= n * d.wheeld / 110;
                this.wheels[0].object3D.position.y -= n * d.wheeld / 70;
                this.wheels[1].object3D.position.y -= n * d.wheeld / 70;
                this.wheels[2].object3D.position.y += n * d.wheeld / 70;
                this.wheels[3].object3D.position.y += n * d.wheeld / 70;
            
                setTimeout(function(){
                    //ele.object3D.rotation.x += n * d.wheeld / 110;
                    self.wheels[0].object3D.position.y += n*d.wheeld/70;
                    self.wheels[1].object3D.position.y += n*d.wheeld/70;
                    self.wheels[2].object3D.position.y -= n*d.wheeld/70;
                    self.wheels[3].object3D.position.y -= n*d.wheeld/70;
                },d.bumpdur)
            },
            events: {
                steer: function(e){
                    if (e.detail == null) return
                    if (e.detail.y != null){
                        this.w1.setAttribute('animation__steering','enabled',false) 
                        this.w2.setAttribute('animation__steering','enabled',false)
                        this.w1.object3D.rotation.y = (e.detail.y-1.57)*0.5;
                        this.w2.object3D.rotation.y = (e.detail.y*0.5+1.57*1.5);
                    } else {
                       this.el.setAttribute('car','steer',e.detail)  
                    }
                },
                speed: function(e){
                    if (e.detail == null) return
                    this.el.setAttribute('car','speed',e.detail)
                },
                fpv: function(e){
                    if (!this.fpv) {
                        this.old.copy(o.cameraRig.object3D.position)
                        this.el.addState('fpv')
                    } else {
                        o.cameraRig.obect3D.position.copy(this.old)
                        this.el.removeState('fpv')
                    }
                    this.fpv = !this.fpv
                }
            },
            tock: function () {  
                if (!this.fpv) return
                o.cameraRig.object3D.position.copy(this.el.object3D.position) //.add(this.pos)   
            }   
        }); // ok
        
        AFRAME.registerComponent('nav', {
            schema: {
                model:{type: 'string'}, // if present, a nav-mesh gltf model
                width: {type: 'number',default:10, min: 0}, // square side
                depth: {type: 'number',default:10, min: 0}, // square side
                radius: {type: 'number', min: 0}, // circle radius
                nodeName: {type: 'string'},
                debug: {type: 'boolean', default: false},
            },
            init: function () {
                this.hasLoadedNavMesh = false;
                this.nodeName = this.data.nodeName;
                this.el.addEventListener('object3dset', this.loadNavMesh.bind(this));
                if (!this.data.model || this.data.model == '') {
                    this.createNav()    
                } else {
                    this.el.setAttribute('gltf-model',this.data.model)
                }
                this.el.setAttribute('hoverable',"")
                this.el.setAttribute('clickable',"")
                
                this.el.setAttribute('ammo-body',{
                    emitCollisionEvents: true,
                    type:'static'
                })
                this.el.setAttribute('ammo-shape','type','mesh')
                this.off = []
            },
            update: function(){
                this.el.object3D.visible=this.data.debug;
            },
            play: function () {
                if (!this.hasLoadedNavMesh) this.loadNavMesh();
            },
            loadNavMesh: function () {
                var self = this;
                const object = this.el.getObject3D('mesh');
                const scene = this.el.sceneEl.object3D;
                if (!object) return;
                let navMesh;
                object.traverse((node) => {
                    if (node.isMesh && (!self.nodeName || node.name === self.nodeName)) navMesh = node;
                });
                if (!navMesh) return;
                scene.updateMatrixWorld();
                this.system.setNavMeshGeometry(navMesh.geometry);
                this.hasLoadedNavMesh = true;
            },
            createNav: (function(){          
                const material = new THREE.MeshBasicMaterial( { color: 0xff0000 } ); 
                const geometry = new THREE.BufferGeometry();
                const vertex = new THREE.Vector3();
                return function(){
                    let arr = []
                    if (this.data.radius != 0 ){
                        const segments = 16;
                        const indices = [];
                        const vertices = [];
                        vertices.push( 0, 0, 0 );
                        for ( let s = 0, i = 3; s <= segments; s ++, i += 3 ) {
                            const segment = s / segments * Math.PI * 2;
                            vertex.x = this.data.radius * Math.cos( segment );
                            vertex.z = this.data.radius * Math.sin( segment );
                            vertices.push( vertex.x, vertex.y, vertex.z );
                        }
                        for ( let i = 1; i <= segments; i ++ ) {
                            indices.push( i, i + 1, 0 );
                        }
                        geometry.setIndex( indices );
                        geometry.setAttribute('position', new THREE.Float32BufferAttribute( vertices, 3));
                        this.el.setObject3D('mesh',new THREE.Mesh( geometry, material ));
                        this.el.object3D.rotation.x = Math.PI;
                    } 
                    else if (this.data.width != 0 && this.data.depth != 0){
                        let x = Math.abs(this.data.depth/2);
                        let z = Math.abs(this.data.width/2);
                        arr =  [
                            -x, 0.0, z,
                             x, 0.0, z,
                             x, 0.0, -z,

                             x, 0.0, -z,
                            -x, 0.0, -z,
                            -x, 0.0, z
                        ]  
                        const vertices = new Float32Array(arr);
                        geometry.setAttribute('position', new THREE.BufferAttribute( vertices, 3 ) );
                        this.el.setObject3D('mesh',new THREE.Mesh( geometry, material ));
                    }
                    this.el.object3D.position.y += 0.001;
                }
            })(),
            tick: function() {
                for (i=0;i<this.off.length;i++){
                    if(this.off[i].components['nav-block'].stopedX){
                        this.off[i].object3D.position.x = this.off[i].components['nav-block'].clampedEnd.x;   
                    }  
                }
            },
            events: {
                collideend: function(e){
                    if (e.detail.targetEl.components['nav-block']) {
                        this.off.push(e.detail.targetEl)    
                    }
                },
                collidestart: function(e){
                    if (e.detail.targetEl.components['nav-block']) {  
                        const index = this.off.indexOf(e.detail.targetEl);
                        if (index > -1) this.off.splice(index, 1);
                    }
                },
            }
        });
        
        //TODO: make objects constrained to nav
        //TODO: objects far from the navmesh
        AFRAME.registerComponent('npc', {
            schema: {
                destination: {type: 'vec3'},
                active: {default: false},
                speed: {default: 2},
                move:{default: 'nav', oneOf: ['click','auto','nav']},
                loop: {default: false},
                fixRotAll: {default: false},
                fixRotIni: {default: false},
                pOnP: {type: 'boolean',default: true},
            },
            init: function () {
                this.system = this.el.sceneEl.systems.nav;
                this.system.addAgent(this);
                this.group = null;
                this.path = [];
                this.destinationBkp = new THREE.Vector3();
                this.destinationBkp.copy(this.data.destination);
                this.from = new THREE.Vector3();
                this.from.copy(this.el.object3D.position);
                this.rot = new THREE.Quaternion();
                this.rot.copy(this.el.object3D.quaternion);
                this.isMoving = false;
                this.going = true;
                
                // nav interaction
                const nav = o.sceneEl.querySelectorAll('[nav]')[0];
                if (!nav) return
                nav.addEventListener('grab-start', (e) => {
                    if (this.data.move != 'nav') return
                    for (var key in e.detail) {
                        if (key == 'hand' || key == 'target') continue
                        this.movement(e.detail[key].detail.intersection.point)
                    }
                });
                
                // click interaction
                this.el.setAttribute('hoverable',"")
                if (!(this.el.components.clickable || this.el.components.grabbable)) this.el.setAttribute('clickable',"")
                
                // auto interaction
                if (this.data.move == 'auto') {
                    this.el.setAttribute('npc','active',true)
                }
                
                this.raycaster = new THREE.Raycaster();
            },
            remove: function () {
                this.system.removeAgent(this);
            },
            update: function (oldData) {
                this.path.length = 0;

                var obj = AFRAME.utils.diff(oldData,this.data);
                var keys = Object.keys(obj);
                var key = keys[0];
                if (keys.length == 1 && key == "destination") {
                    this.destinationBkp.copy(obj[key])    
                } 
            },
            updateNavLocation: function () {
                this.group = null;
                this.path = [];
            },
            movement: function(destination){
                this.el.setAttribute('npc', {
                    active: true,
                    destination: destination
                }); 
                this.going = !this.going
            },
            tick: (function () {
                const vDest = new THREE.Vector3();
                const vDelta = new THREE.Vector3();
                const vNext = new THREE.Vector3();

                return function (t, dt) {
                    const el = this.el;
                    const data = this.data;
                    const raycaster = this.raycaster;
                    const speed = data.speed * dt / 1000;

                    if (!data.active) return;
                    if (o.status !=3 && data.pOnP) return

                    // Use PatrolJS pathfinding system to get shortest path to target.
                    if (!this.path.length) {
                        const position = this.el.object3D.position;
                        this.group = this.group || this.system.getGroup(position);
                        this.path = this.system.getPath(position, vDest.copy(data.destination), this.group) || [];
                        el.emit('navigation-start');
                    }

                    // If no path is found, exit.
                    if (!this.path.length) {
                        console.warn('[nav] Unable to find path to %o.', data.destination);
                        this.el.setAttribute('npc', {active: false});
                        el.emit('navigation-end');
                        return;
                    }
                    
                    // Current segment is a vector from current position to next waypoint.
                    const vCurrent = el.object3D.position;
                    const vWaypoint = this.path[0];
                    vDelta.subVectors(vWaypoint, vCurrent);

                    const distance = vDelta.length();
                    let gazeTarget;

                    if (distance < speed) {
                        // If <1 step from current waypoint, discard it and move toward next.
                        this.path.shift();

                        // After discarding the last waypoint, exit pathfinding.
                        if (!this.path.length) {
                            this.el.setAttribute('npc', {active: false});
                            el.emit('navigation-end');
                            return;
                        }

                        vNext.copy(vCurrent);
                        gazeTarget = this.path[0];
                    } else {
                        // If still far away from next waypoint, find next position for
                        // the current frame.
                        vNext.copy(vDelta.setLength(speed)).add(vCurrent);
                        gazeTarget = vWaypoint;
                    }

                    // Look at the next waypoint.
                    gazeTarget.y = vCurrent.y;
                    if (!data.fixRotAll) el.object3D.lookAt(gazeTarget);

                    // Raycast against the nav mesh, to keep the agent moving along the
                    // ground, not traveling in a straight line from higher to lower waypoints.
                    raycaster.ray.origin.copy(vNext);
                    raycaster.ray.origin.y += 1.5;
                    raycaster.ray.direction = {x:0, y:-1, z:0};
                    const intersections = raycaster.intersectObject(this.system.getNavMesh());

                    if (!intersections.length) {
                        // Raycasting failed. Step toward the waypoint and hope for the best.
                        vCurrent.copy(vNext);
                    } else {
                        // Re-project next position onto nav mesh.
                        vDelta.subVectors(intersections[0].point, vCurrent);
                        vCurrent.add(vDelta.setLength(speed));
                    }
                };
            }()),
            events: {
                'navigation-start': function(e){
                    this.isMoving = true;
                    // store actual position for loop
                    //this.from = this.el.object3D.position;
                },
                'navigation-end': function(e){
                    // loop to original position
                    if (this.data.loop) { 
                        if (this.data.move == 'auto') {
                           if (this.going) {
                                this.movement(this.from)
                            } else {
                                this.movement(this.destinationBkp)
                            }  
                        }
                        else if (this.from.distanceTo(this.el.object3D.position)>0.01) {
                            this.movement(this.from)
                        } 
                        else if (this.data.move == 'click'){
                            this.el.setAttribute('npc','destination', this.destinationBkp);
                        }
                    } else {
                        // store new actual position
                        this.from = this.el.object3D.position;     
                    }
                    
                    // fixed quaternion Ini
                    if (this.data.fixRotIni) this.el.object3D.quaternion.copy(this.rot) 
                    this.isMoving = false;
                },
                'grab-start': function(e){
                    // this.el.components.grabbable || 
                    if (this.data.move != 'click' || this.isMoving) return
                    this.movement(this.data.destination)
                },
            }       
        }); 
        
        AFRAME.registerComponent('nav-block', {
            init: function () {
                this.updateNavLocation()
                this.nav = this.el.sceneEl.systems.nav;
                this.nav.addAgent(this);
                this.clampedEnd = new THREE.Vector3();
                this.stopedX = false;
            },
            updateNavLocation: function () {
                this.navGroup = null;
                this.navNode = null;
            },
            tick: (function () {
                const start = new THREE.Vector3(); 
                const clampedEnd = new THREE.Vector3();
                return function () {
                    start.copy(this.el.object3D.position);
                    this.navGroup = this.navGroup === null ? this.nav.getGroup(start) : this.navGroup;
                    this.navNode = this.navNode || this.nav.getNode(start, this.navGroup);
                    this.navNode = this.nav.clampStep(start, start, this.navGroup, this.navNode, clampedEnd);
                    
                    //console.log(clampedEnd.x == this.clampedEnd.x)
                    this.stopedX = (clampedEnd.x == this.clampedEnd.x)
                    this.clampedEnd.copy(clampedEnd)
                    
                    //start.sub(this.clampedEnd)
                    
                    //console.log(start)
                    
                    /*
                    console.log(this.clampedEnd.x == clampedEnd.x)
                    
                    if (this.clampedEnd.x == clampedEnd.x) {
                        //this.el.components['ammo-body'].pause()
                        //this.el.object3D.position.x = this.clampedEnd.x 
                    }
                    this.clampedEnd.copy(clampedEnd)
                    
                    let p1 = this.el.object3D.position;
                    let p2 = this.el.components['nav-block'].clampedEnd;
                    
                    if (Math.abs(p1.x)>=Math.abs(p2.x)){
                        
                         //
                        //console.log(this.el.object3D.position.x,p2.x)
                    }
                    if (Math.abs(p1.z)>=Math.abs(p2.z)){
                        // this.el.object3D.position.z = p2.z    
                    }
                    */
                }
            }()),
            
        });
   
        const ZONE = 'level';
        o.pathfinder = new threePathfinding.Pathfinding();
        AFRAME.registerSystem('nav', {
            init: function () {
                this.navMesh = null;
                this.agents = new Set();
            },
            setNavMeshGeometry: function (geometry) {
                this.navMesh = new THREE.Mesh(geometry);
                o.pathfinder.setZoneData(ZONE, threePathfinding.Pathfinding.createZone(geometry));
                Array.from(this.agents).forEach((agent) => agent.updateNavLocation());
            },
            getNavMesh: function () {
                return this.navMesh;
            },
            addAgent: function (ctrl) {
                this.agents.add(ctrl);
            },
            removeAgent: function (ctrl) {
                this.agents.delete(ctrl);
            },

          /**
           * @param  {THREE.Vector3} start
           * @param  {THREE.Vector3} end
           * @param  {number} groupID
           * @return {Array<THREE.Vector3>}
           */
            getPath: function (start, end, groupID) {
                return this.navMesh
                ? o.pathfinder.findPath(start, end, ZONE, groupID)
                : null;
            },

            getGroup: function (position) {
                return this.navMesh
                ? o.pathfinder.getGroup(ZONE, position)
                : null;
            },

            getNode: function (position, groupID) {
                return this.navMesh
                ? o.pathfinder.getClosestNode(position, ZONE, groupID, true)
                : null;
            },

            clampStep: function (start, end, groupID, node, endTarget) {
                if (!this.navMesh) {
                    endTarget.copy(end);
                    return null;
                } else if (!node) {
                    endTarget.copy(end);
                    return this.getNode(end, groupID);
                }
                return o.pathfinder.clampStep(start, end, node, ZONE, groupID, endTarget);
            }
        });

        AFRAME.registerComponent('lookat', {
            tick: function() {
                this.el.object3D.lookAt(o.cameraRig.getAttribute('position'))
            }
        });
        AFRAME.registerComponent('led', {
            multiple: true,
            schema: {
                name:{type: 'string'},// led_2
                materials:{type: 'array'}, //g_trans
                blur:{type: 'boolean',default: false},
                emission:{type:"vec4",default: {x: 0, y: 0, z: 0, w: 0}}, // '52 173 12 0.5'
                active:{type: 'boolean',default: false},
            },
            init: function(){
                let data = this.data
                this.el.setAttribute('gltf-material__'+this.data.name,'materials',this.data.materials)
                this.el.addEventListener(this.data.name+'on',function(e){
                    e.target.setAttribute('gltf-material__'+data.name,{
                        emission: data.emission,
                        reset: false
                    })    
                })
                this.el.addEventListener(this.data.name+'off',function(e){
                    e.target.setAttribute('gltf-material__'+data.name,'reset',true)    
                })
            },
            tick: function(){
                let val = o.getObj(ARstate,this.data.name)
                if(Array.isArray(val)){
                    if (val[0]==0 && val[1]==0 && val[2]==0 && this.data.active || (o.status == 4 && this.data.active)){
                        this.data.active = false;
                        this.el.setAttribute('gltf-material__'+this.data.name,'reset',true)   
                    }  else if (((val[0]!=0 || val[1]!=0 || val[2]!=0) && !this.data.active && o.status == 3) ){
                        this.data.active = true;
                        this.el.setAttribute('gltf-material__'+this.data.name,{
                            emission: (val[0]*255)+' '+(val[1]*255)+' '+(val[2]*255)+' '+this.data.emission.w,
                            reset: false
                        })
                    }    
                } else {
                    if (val == 1 && !this.data.active && o.status == 3){
                        this.data.active = true;
                        this.el.setAttribute('gltf-material__'+this.data.name,{
                            emission: this.data.emission,
                            reset: false
                        })   
                    } else  if ((val == 0 && this.data.active) || (o.status == 4 && this.data.active)){
                        this.data.active = false;
                        this.el.setAttribute('gltf-material__'+this.data.name,'reset',true)
                    } 
                }
            }
        });
        AFRAME.registerComponent('dot-grid', {
            schema: {
                color: {type: 'string',default: "#000080"},
                dotsize: {type: 'number',default: 0.01},
                xcount: {type: 'number',default: 20,min: 0},
                ycount: {type: 'number',default: 20,min: 0},
                gap: {type: 'number',default: 0.1},
            },
            init: function() {
                //this.el.setAttribute('hoverable','')
                let data = this.data;
                let self = this;
                this.positions = [];
                this.allDots=[];
                this.posDots=[];
                this.negDots=[];
                this.openVertices=[];
                this.vertices=[];
                this.lines=[];
                this.iniDot = new THREE.Vector3()
                this.drawing = false;
                this.w;
                
                let l = document.createElement('a-entity');
                l.setAttribute('id','dglines')
                this.el.appendChild(l)
                
                for(let i=0;i<(data.xcount*data.ycount);i++) {
                    let xsize = data.gap*(data.xcount-1)
                    let ysize = data.gap*(data.ycount-1)
                    let row = Math.floor(i/data.xcount)
                    let col = Math.floor(i%data.xcount)
                    let xpos = parseFloat((-xsize/2 + col*data.gap).toFixed(3));
                    let ypos = parseFloat((ysize/2 - row*data.gap).toFixed(3));
                    
                    let el = document.createElement('a-entity');
                    el.setAttribute('clickable','')
                    el.setAttribute('id','dgel_'+i)
                    el.setAttribute('geometry',{
                        primitive: 'plane',
                        width: data.gap*2/4,
                        height: data.gap*2/4
                    })
                    el.setAttribute('material','opacity',0)
                    let el2 = document.createElement('a-entity');
                    el2.setAttribute('geometry',{
                        primitive: 'circle',
                        radius: data.dotsize/2
                    })
                    el2.setAttribute('material',{
                        side: 'double',
                        color:data.color
                    })
                    el.appendChild(el2)
                    el.addEventListener('grab-start',function(e){
                        let id = e.target.id.split('_')
                        if(self.posDots[id[1]] >= 2 && self.negDots[id[1]] >= 2) return
                        self.iniDot.set(xpos,ypos,0)
                        el2.setAttribute('material','color','orange')
                        self.drawing = true;
                    })
                    el.addEventListener('grab-end',function(e){
                        el2.setAttribute('material','color',data.color)
                        self.drawing = false;
                        let pos = $('#rhandcursor')
                        
                        //[0].object3D.position.clone().sub( o.dim2.object3D.position);
                        
                        pos.z=0;
                        for (i=0;i<self.positions.length;i++){
                            if (pos.distanceTo(self.positions[i]) < data.gap*2/4 && (self.posDots[i] < 2 && self.negDots[i] < 2)) {
                                if (self.iniDot.distanceTo(self.positions[i])==0) break
                                self.drawline(self.iniDot,self.positions[i],'create') 
                                self.calculateArea()
                                return
                            }
                        }
                        self.drawline(self.iniDot,pos,'erase') 
                    })
                    el.object3D.position.set(xpos,ypos,0.002)   
                    this.positions.push(new THREE.Vector3(xpos,ypos,0))
                    this.posDots.push(0)
                    this.negDots.push(0)
                    this.el.appendChild(el)
                }
            },
            tick: function(){
                let pos = $('#rhandcursor')
                
                //[0].object3D.position.clone().sub(o.dim2.object3D.position);
                
                if (this.drawing) this.drawline(this.iniDot,pos)   
            },
            drawline: function(p1,p2,bol){
                let self = this;
                if (o.getObj(ARstate,"dots_eraser")) return
                if (this.w) this.w.parentElement.removeChild(this.w)
                if (bol == 'erase') return this.w = null;
                this.w = document.createElement('a-entity');
                let color = (!o.getObj(ARstate,"dots_creation"))?'forestgreen':'#FF0000';
                
                this.w.setAttribute('tickline',{
                    lineWidth:this.data.dotsize*1000,
                    path:p1.x+' '+p1.y+' 0,'+p2.x+' '+p2.y+' 0',
                    color: color
                })
                this.w.object3D.position.z = 0.001
                
                //this.el.appendChild(this.w)
                $('#dglines')[0].appendChild(this.w)
                
                if (bol == 'create') {
                    let dotsArr = []
                    // vertical line
                    if (p2.x == p1.x){
                        for (i=0;i<this.positions.length;i++){
                            let p = this.positions[i]
                            if (o.between(p.y,p1.y,p2.y) && p2.x == p.x) {
                                dotsArr.push(i); 
                                this.hideDot(i);
                            }
                            else if (p.x == p1.x && p.y == p1.y) {
                                dotsArr.push(i);
                                this.halfDot(i);
                            }
                            else if (p.x == p2.x && p.y == p2.y) {
                                dotsArr.push(i);
                                this.halfDot(i);
                            }
                        }    
                    }
                    else if (p2.y == p1.y){
                        for (i=0;i<this.positions.length;i++){
                            let p = this.positions[i]
                            if (o.between(p.x,p1.x,p2.x) && p2.y == p.y) {
                                dotsArr.push(i); 
                                this.hideDot(i);
                            }
                            else if (p.x == p1.x && p.y == p1.y) {
                                dotsArr.push(i);
                                this.halfDot(i);
                            }
                            else if (p.x == p2.x && p.y == p2.y) {
                                dotsArr.push(i);
                                this.halfDot(i);
                            }
                        }    
                    }
                    else {
                        let m = (p2.y - p1.y)/(p2.x - p1.x)
                        let n = p2.y - m*p2.x
                        for (i=0;i<this.positions.length;i++){
                            let p = this.positions[i]
                            if ((Math.abs(p.x*m+n-p.y) <0.0001) && o.between(p.x,p1.x,p2.x) && o.between(p.y,p1.y,p2.y)) {
                                dotsArr.push(i);
                                this.hideDot(i)
                            }
                            else if (p.x == p1.x && p.y == p1.y) {
                                dotsArr.push(i);
                                this.halfDot(i)
                            }
                            else if (p.x == p2.x && p.y == p2.y) {
                                dotsArr.push(i);
                                this.halfDot(i)
                            }
                        }
                    }
                    this.w.setAttribute('id','dgline_'+this.lines.length)
                    this.w.setAttribute('data-arr',dotsArr)
                    this.lines.push('dgline_'+this.lines.length)
                    
                    //Delete X
                    let pos = o.getPointInBetweenByPerc(p1, p2, 0.5)
                    let t;
                    t = o.createText("X","center",0.05,"infinity",'purple',pos,"0 0 0")
                    t.object3D.visible = false;
                    t.setAttribute('class','dotX')
                    t.setAttribute('clickable','')
                    
                    t.addEventListener('grab-start',function(e){
                        e.preventDefault()
                        e.stopImmediatePropagation();
                        e.target.parentElement.setAttribute('scale','0 0 0')
                        e.target.parentElement.setAttribute('visible',false)
                        self.showDot(e.target.parentElement.id)
                    })
                    
                    this.w.appendChild(t)
                    
                    this.w = null; 
                    this.allDots.push(...dotsArr)
                    dotsArr = [];
                    
                }
            },
            halfDot: function(i){
                let arr;
                if (!o.getObj(ARstate,"dots_creation")){
                    arr = this.posDots;
                    this.posDots[i]++
                } else {
                    arr = this.negDots;
                    this.negDots[i]++
                }
                if (arr[i] == 2) {
                    arr[i] = 3;
                    this.vertices.push(this.positions[i])
                    let el = $('#dgel_'+i)[0]                
                    if (el) el.object3D.visible = false;  
                } else {
                    this.openVertices.push(this.positions[i])
                }
            },
            hideDot: function(i){
                if (!o.getObj(ARstate,"dots_creation")){
                    this.posDots[i] = 2;
                } else {
                    arr = this.negDots;
                    this.negDots[i] = 2;
                }
                let el = $('#dgel_'+i)[0]                
                if (el) el.object3D.visible = false;                                            
            },
            showDot: function(id){
                let arr = $('#'+id).data('arr').split(',')
                for (i=0;i<arr.length;i++){
                    let el = $('#dgel_'+arr[i])[0]                
                    if (el) el.object3D.visible = true; 
                    
                    let i0 = parseInt(arr[i]);
                    
                    console.log(this.posDots[i0],i0)
                    this.posDots[i0] -= 2;
                    if (this.posDots[i0]<0) this.posDots[i0] = 0;

                    const i1 = this.vertices.indexOf(this.positions[i0]);
                    if (i1 > -1) this.vertices.splice(i1, 1);
                    
                    if (this.posDots[i0] == 0) {
                        const i2 = this.openVertices.indexOf(this.positions[i0]);
                        if (i2 > -1) this.openVertices.splice(i2, 1);
                    }

                }
                //this.usedPositions.splice(i, 1)
                //this.positions.push(vec)
            },
            calculateArea: function(){
                if (this.openVertices.length != this.vertices.length) {
                    $('#dots_warn').text('Peça está aberta.')
                    $('#dots_mass p:last-child').text('0 g')
                    $('#dots_rx p:last-child').text('0 #')
                    return
                }
                let mass = 0;
                let Rx = 1000;
                let Ry = 1000;
                
                // mass calculation
                for(j=0;j<2;j++){
                    let last = 0;
                    let lastrow = 0;
                    let border = 0;
                    let row = 0;
                    let inside;
                    let arr;
                    (j==0)?arr=this.posDots:arr=this.negDots;

                    for(i=0;i<arr.length;i++){
                        row = Math.floor(i/this.data.xcount)
                        if (arr[i]==3) {
                            border++
                            (j==0)? mass++ : mass--;
                            if (inside!=null) {
                                (j==0)? mass += (i-inside-1) : mass -= (i-inside-1);
                                inside = null;
                            }
                            //console.log(row,3,mass) 
                        }
                        else if (arr[i]==2) {
                            (j==0)? mass++ : mass--;
                            if (border==0 && !inside) {
                                inside = i;
                            }
                            else if (inside!=null) {
                                (j==0)? mass += (i-inside-1-border) : mass -= (i-inside-1-border);
                                inside = null;
                            }
                            //console.log(row,2,mass)
                        } 
                        last = arr[i];
                        // changing row
                        if (lastrow != row){
                            border = 0;
                            last = 0;
                            inside = null;
                        }
                        lastrow = row;
                    }
                }
                $('#dots_warn').text('Peça fechada.')
                $('#dots_mass p:last-child').text(mass+' g')
                
                //resistance calculation
                let rowArr = [];
                let colArr = [];
                
                for (i=0;i<this.allDots.length;i++){
                    let row = Math.floor(this.allDots[i]/this.data.xcount)
                    let col = Math.floor(this.allDots[i]%this.data.xcount)
                    
                    if (!rowArr[row]) rowArr[row] = []
                    //if (rowArr[row].indexOf(col) == -1) rowArr[row].push(col)
                    rowArr[row].push(col)
                    
                    if (!colArr[col]) colArr[col] = [];
                    //if (colArr[col].indexOf(row) == -1) colArr[col].push(row)
                    colArr[col].push(row)
                    
                    
                    //console.log(this.allDots[i],row,col)
                }
                //console.log(rowArr,colArr)
                // Rx Calculation
                //let avg = rowArr.length;
                for (i=0;i<rowArr.length;i++){
                    if (!rowArr[i]) continue
                    console.log(rowArr[i])
                    let min = 1000;
                    let max = 0;
                    let num = 0;
                    for (j=0;j<rowArr[i].length;j++){
                        if(o.getOccurrence(rowArr[i],rowArr[i][j])==2) {
                            console.log(10)
                            num++;
                            min = Math.min(min,rowArr[i][j])
                            max = Math.max(max,rowArr[i][j])
                        }
                    }
                    let dif = max-min;
                    if (dif==-1000) {
                        //avg--
                        continue
                    }
                    console.log(min,max,dif,num)
                    Rx = Math.min(Rx,dif*num/2) 
                    //Rx += dif*num/2
                    num = 0;
                }
                //Rx /= avg;
                $('#dots_rx p:last-child').text(Rx+' #')
                
//[8, 11, 10, 11, 10, 9, 8, 9]
//[8, 11, 10, 9, 10, 9]
//[8, 11]
//[8, 8, 9, 10, 11, 11]
                
                
                //

            }
        });
                
        AFRAME.registerShader('colormix', {
            schema: {
                color1: {type: 'color', is: 'uniform', default: "#493889"},
                color2: {type: 'color', is: 'uniform', default: "#000"},
                brightness: {type: 'number', is: 'uniform', default: 0.1}, // colors intensity
                pct: {type: 'number', is: 'uniform', default: 0.5}, // ratio between colors
                scale: {type: 'number', is: 'uniform', default: 1.0}, // scale of the noise
                opacity: {type: 'number', is: 'uniform', default: 1.0}, // visibility
                timeMsec: {type: 'time', is: 'uniform'},

            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 pos;
                void main() {
                    vUv = uv;
                    pos = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying vec3 pos;
                uniform vec3 color1;
                uniform vec3 color2;
                uniform float pct;
                uniform float brightness;
                uniform float scale;
                uniform float opacity;
                uniform float timeMsec; // A-Frame time in milliseconds.

                float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
                vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
                vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

                float noise(vec3 p){
                    vec3 a = floor(p);
                    vec3 d = p - a;
                    d = d * d * (3.0 - 2.0 * d);

                    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
                    vec4 k1 = perm(b.xyxy);
                    vec4 k2 = perm(k1.xyxy + b.zzww);

                    vec4 c = k2 + a.zzzz;
                    vec4 k3 = perm(c);
                    vec4 k4 = perm(c + 1.0);

                    vec4 o1 = fract(k3 * (1.0 / 41.0));
                    vec4 o2 = fract(k4 * (1.0 / 41.0));

                    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
                    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

                    return o4.y * d.y + o4.x * (1.0 - d.y);
                }

                void main() {
                    float n = noise(pos/50.0*scale);

                    vec3 color = vec3(
                        color1.r*n*(1.0-pct) + color2.r*n*pct + color2.r*(1.0-n),
                        color1.g*n*(1.0-pct) + color2.g*n*pct + color2.g*(1.0-n),
                        color1.b*n*(1.0-pct) + color2.b*n*pct + color2.b*(1.0-n)
                    );

                    gl_FragColor = vec4(mix(vec3(0),color,1.0 +clamp(brightness,0.0,1.5)),opacity);
                }
            `
        });
        AFRAME.registerShader('blurpoint', {
            schema: {
                color: {type: 'color', is: 'uniform'},
                timeMsec: {type: 'time', is: 'uniform'},
                opacity: {type: 'number', is: 'uniform', default: 0.7}
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform vec3 color;
                uniform float timeMsec; // A-Frame time in milliseconds.
                uniform float opacity;

                void main() {

                    float time = timeMsec / 1000.0; // Convert from A-Frame milliseconds to typical time in seconds.
                    vec3 col = color;
                    vec2 pos = vec2(vUv.x - 0.5, vUv.y - 0.5);
                    float alpha = opacity - smoothstep(0.0, 0.8, length(pos));
                    gl_FragColor = vec4(col, alpha);

                }
            `
        });
        
        AFRAME.registerComponent('epart',{
            schema: {
                main: {type: 'boolean',default: false},
                name:{type:'array'}, //dc_motor_0,MT0 - tag,code
                pins: {type: 'array'}, // t, e
                wires: {type: 'array'}, // p,'3 placa',
                cons: {type: 'array'}, // '9 placa','10 placa'
                speed: {type: 'number', default: 1}
            },
            init: function(){
                this.part = this.data.name[1] // MT0, MT1, UT0, SE0, SE1
                this.type = this.part.slice(0, -1); // MT, UT, SE
                this.num = this.part.substring(this.part.length - 1); // 0 ou 1
                this.positioned = false;
                this.to;
                //this.el.object3D.visible = false;
                
                if (this.data.main) {
                    // o.ARparts[this.data.name[1]]
                    o.ARparts.main = this.data.name[1]
                } else {
                    o.ARparts[this.data.name[1]] = {
                        pins: this.data.cons,
                        name: this.data.name[0]    
                    }    
                } 
            },
            tock: function (time,timeDelta){
                if (o.status < 1) return
                
                // main component
                if (this.data.main) {
                    this.el.object3D.visible = true;
                    if (!this.el.object3D.visible && o.status == 3) o.simulate()
                    
                    if (o.wires && !o.wires.getAttribute('wiring')) o.wires.setAttribute('wiring','')
                    
                    // paramsUpdate
                    if (o.iframe.newMsg){
                        o.iframe.newMsg = false;
                        for (const p in ARparams){
                            let val = o.getObj(ARstate,p);
                            if (!val) val = o.getObj(ARstate,p.slice(0, -3)); 
                            if (typeof val === 'object' && !Array.isArray(val) && val !== null) val = val.value;
                            if (!val) continue;
                            val = o.map(val,0,1,ARparams[p][1],ARparams[p][2]);
                            if ($('#'+p+'_range').length && $('#'+p+'_range').val() != val){
                                $('#'+p+'_range').val(val)                                
                                o.sliderClick(p+'_range',true)
                            }
                            else if ($('#'+p.slice(0, -3)+'_range').length && $('#'+p.slice(0, -3)+'_range').val() != val){
                                $('#'+p.slice(0, -3)+'_range').val(val)                           
                                o.sliderClick(p.slice(0, -3)+'_range',true)
                            }
                        }
                        for (const t in o.translated){
                            let val = o.getObj(ARstate,t);                            
                            if (t.substring(0, 6) == 'switch'){
                                if (($('#'+t).is(':checked') && val==0) || (!($('#'+t).is(':checked')) && val==1)) {
                                    $('#'+t).click()
                                    this.switches(t,val)
                                } 
                                else if ($('#'+t).data('val')!= val) {
                                    this.switches(t)
                                    $('#'+t).data('val',val)
                                }
                            }
                        }  
                    }
                    return
                }
                
                // store animation parameters if exists
                if (!this.to) {
                    let anim = this.el.getAttribute('animation');
                    if (anim) {
                        this.to = anim.to.split(' ');
                    } else {
                        this.to = true;
                    } 
                }
                
                if (!ARstate) return
                
                let id = this.part;
                let obj = o.getObj(ARstate,this.data.name[0])
                
                if (!o.sceneEl.is('ar-mode')) {
                    if (this.el.object3D.visible && !obj.position) this.el.object3D.visible = false;     
                } else {
                    this.el.object3D.visible = true;     
                }
                
                
                // open menu if obj is visible in AR
                let el = this.el;
                if (o.sceneEl.is('ar-mode')) el = this.el.parentElement;
                if (el.object3D.visible && !$('#'+id+'_check').prop('checked')) {
                    $('#'+id+'_check').prop('checked', true)  
                    $('#'+id+'_colap').show()
                    this.el.emit('show')
                } else if (!el.object3D.visible && $('#'+id+'_check').prop('checked')) {
                    $('#'+id+'_check').prop('checked', false)  
                    $('#'+id+'_colap').hide()
                }

                // position and show if on ARState
                if (!this.positioned && obj && obj.position && (!o.inIframe() || o.iframe.firstMsg)){
                    if (obj.position[0]!=this.el.object3D.position.x || obj.position[1]!=this.el.object3D.position.y) {
                        this.el.object3D.position.x = obj.position[0];
                        this.el.object3D.position.y = obj.position[1];
                    }
                    this.positioned = true;
                    this.el.object3D.visible = true;
                    $('#'+id+'_check').prop('checked', true)  
                    $('#'+id+'_colap').show()
                }
                
                /*else if (this.el.object3D.visible && !$('#'+id+'_check').attr('manual')){
                    $('#'+id+'_check').prop('checked', false)
                    $('#'+id+'_colap').hide()
                }*/
                
                // Creating placeholders in ARwires
                if (!(id in o.ARwires)) {
                    // register the code on the ARwires
                    o.ARwires[id] = {}
                    
                    // create arrays for each available pins of this epart
                    this.data.pins.forEach(function(item){
                        o.ARwires[id][item] = [];
                    });
                    
                    // populate the arrays with preexisting wires
                    if (this.data.wires != null){
                        for (i=0;i<this.data.wires.length;i+=2){
                            o.ARwires[id][this.data.wires[i]].push(this.data.wires[i+1])
                        }
                    }
                    
                    // register the connections defined on ARstate
                    if (ARstate){
                        for (const key in obj){
                            if (key.slice(-3) == 'pin') {
                                // multiple connections on the same pin
                                if(Array.isArray(obj[key])){
                                    for(i=0;i<obj[key].length;i++){
                                        this.registerPin(id,key,obj[key][i])
                                    }    
                                } 
                                // one connection per pin
                                else {
                                    this.registerPin(id,key,obj[key])
                                }                                
                            }   
                        }
                    }
                }  
                
                // Change animation per speed
                if (obj && obj.speed){
                    
                    // stop animation if speed is 0 or status is not play
                    if (obj.speed <= 0 || o.status != 3) return this.el.setAttribute('animation','enabled',false)                    
                    
                    // activate animation
                    this.updateAnimation(
                        o.map(obj.speed,0,1,2000*this.data.speed,200*this.data.speed),
                        (obj.direction==0)?'normal':'reverse'
                    )
                } 
                
                // Change animation per value
                else if (obj && obj.value){
                    if(this.data.name[0] == 'ultrasonic'){
                        if(o.sceneEl.is('2d-mode')){
                            let val = -0.05 * obj.value-0.02;
                            if (this.el.children[0].object3D.position.y != val) this.el.children[0].object3D.position.y = val
                        } else {
                            //this.distance()
                        }
                    } else {
                        // stop animation if speed is 0 or status is not play
                        if (obj.value <= 0 || o.status != 3) return this.el.setAttribute('animation','enabled',false)   
                        
                        this.updateAnimation(
                            200 / this.data.speed,
                            obj.value
                        )    
                    }
                }
                
                // if (dev && timeDelta>24) console.warn('slow',time,timeDelta)
            },
            // register connections in ARwire
            registerPin: function(id,key,pin){
                if (!ARparams) return
                
                // if pin is none, no connection to register
                if (pin == ARparams.none || -1) return
                
                // register connection
                o.ARwires[id][key.charAt(0)].push(pin)
                
                // check if automatic connections exist
                if (ARparams.autoPins) {
                    let arr = ARparams.autoPins[pin];
                    if (arr) {
                        for (i=0;i<arr.length;i+=2){

                            // if pin does not exist on epart
                            if (!o.ARwires[id][arr[i]]) continue

                            // register connection
                            o.ARwires[id][arr[i]].push(arr[i+1])
                        }    
                    }
                }
                // if multiple pins are not allowed, define pin as used.
                if (!ARparams.multiple) o.usedPins.push(pin)
            }, // ok
            
            // animate submeshes
            updateAnimation: function(dur,val,dir){
                let animation = this.el.getAttribute('animation')   
                if (!animation || animation.enabled) return
                let name = '';
                                
                let obj = {};
                if (this.el.getAttribute('gltf-transform')) Object.assign(obj,this.el.components['gltf-transform'].actualData)
                if (jQuery.isEmptyObject(obj)) return
                
                let prop = animation.property.split('.')[1];
                let loop = animation.loop;
                
                let  to = "";
                if (loop){
                    to += (parseFloat(this.to[0])+obj[prop].x)+" ";
                    to += (parseFloat(this.to[1])+obj[prop].y)+" ";
                    to += (parseFloat(this.to[2])+obj[prop].z)
                } else {
                    to += o.map(val, 0,  1, 0, parseFloat(this.to[0]))+" ";
                    to += o.map(val, 0,  1, 0, parseFloat(this.to[1]))+" ";
                    to += o.map(val, 0,  1, 0, parseFloat(this.to[2]))
                }
                this.el.setAttribute('animation',{
                    enabled: true,
                    to: to,
                    dir: dir || animation.dir,
                    dur: dur
                })
            }, // ok
            
            distance: (function(){
                var pU = new THREE.Vector3();
                var pW = new THREE.Vector3();
                let pUN = new THREE.Vector3(); // UT Normal
                let pWN = new THREE.Vector3(); // Parede Normal
                return function(){
                    var mesh1 = this.el.getObject3D('mesh');
                    var mesh2 = $("#wall")[0].getObject3D('mesh');
                    if (!mesh1 || !mesh2) return;
                    const submesh1 = mesh1.getObjectByName('s');
                    const submesh2 = mesh2.getObjectByName('s');
                    if (!submesh1 || !submesh2) return;    

                    mesh1.matrixWorld.decompose( pU, new THREE.Quaternion(), new THREE.Vector3() );
                    mesh2.matrixWorld.decompose( pW, new THREE.Quaternion(), new THREE.Vector3() ); 
                    submesh1.matrixWorld.decompose( pUN, new THREE.Quaternion(), new THREE.Vector3() );
                    submesh2.matrixWorld.decompose( pWN, new THREE.Quaternion(), new THREE.Vector3() );

                    // Calculo da distancia
                    let vU = new THREE.Vector3(pU.x,pU.y,0) // UT no plano
                    let vW = new THREE.Vector3(pW.x,pW.y,0) // Wall no plano
                    let dist = vU.distanceTo(vW);
                    if (Number.isNaN(dist)) return
                    let limit = 400;
                    let reading = false;

                    // Verificar paralelismo
                    var fU = new THREE.Vector3(pUN.x-pU.x,pUN.y-pU.y,0);
                    var fW = new THREE.Vector3(pWN.x-pW.x,pWN.y-pW.y,0);
                    if(fU.angleTo(fW) > 0.3 && fU.angleTo(fW) < 2.8) reading = false

                    // Verificar scanZone Cone na frente do UT.
                    var dUW = new THREE.Vector3(vU.x-vW.x,vU.y-vW.y-160,0);
                    if (dist < 300) {
                        this.data.smooth = [];
                        reading = false;
                        dist = 1;
                    } else {
                        if(Math.PI-dUW.angleTo(fU) < Math.asin(limit/dist)) {
                            dist = Math.round(smoothing (this.data.smooth,30,map(dist,300,1800,3,20))*2)/2
                            dist = map(dist,3,20,0,1);                         
                            //console.log('ok')
                        } else {
                            this.data.smooth = [];
                            reading = false;
                            dist = 1;
                            //console.log('notok')
                        }
                    }
                    
                    if (ARparams[this.data.name[0]+'val'][0] != dist){
                        ARparams[this.data.name[0]+'val'][0] = dist;
                        let obj = {}
                        obj.value = dist 
                        o.setEvt(ARstate,this.data.name[0],obj)
                    }
                }
            })(),
            
            // animate switches
            switches: function(id){
                let animation = this.el.getAttribute('animation__'+id)
                if (!animation) return
                let from = animation.from;
                animation.from = animation.to;
                animation.to = from;
                animation.enabled = true;
                this.el.emit(id);
            }, // ok 
            
            // store epart position and msg
            setpos: function(bol){
                let obj = {}
                
                // get entity position on screen plane
                obj.position = [parseFloat(this.el.getAttribute('position').x.toFixed(3)) , parseFloat(this.el.getAttribute('position').y.toFixed(3))]
                
                // erase position
                if (bol) obj.position = null
                
                // main msg: only position,
                if(this.data.main) {
                    o.setObj(ARstate,this.data.name[0],obj) 
                    ARmsg[this.data.name[0]].position = obj.position
                    if (o.permissions.msg) o.sendMsg(ARmsg)
                    delete ARmsg[this.data.name[0]].position
                } 
                // eparts msg: uses setEvt to msg all ARstate obj
                else {
                    o.setEvt(ARstate,this.data.name[0],obj)  
                }     
            }, // ok
            
            // events that controll when position is stored
            events:{
                show: function(){
                    this.setpos()    
                },
                hide: function(){
                    this.setpos(true)
                },
                'grab-end': function(){
                    this.setpos()
                }
            } // ok
        })
        AFRAME.registerComponent('wiring', {
            schema: {
                resolution: {default: 12},
                tickness: {default: 6},
                inflection: {default: 2},
            },
            tick: (function (){
                var pi = new THREE.Vector3();
                var pf = new THREE.Vector3();
                let cg = new THREE.Vector3();
                return function (time,deltatime){
                    if (o.status < 1 || Object.keys(o.ARwires).length == 1) return
                    for (var part in o.ARwires){ // MT0, MT1, UT0, SE0, SE1
                        if (part == "all") continue
                        let obj = o.ARwires[part];
                        for (var k in obj){ // p ou n / e ou t / s
                            if (obj[k].length == 0) continue;
                            for(i=0;i<obj[k].length;i++){
                                
                                let arr = String(obj[k][i]).split(' ');
                                
                                if (!arr[1]) arr.push(o.ARparts.main)

                                let str = part+"_"+k+"_"+arr[1]+"_"+arr[0];
                                
                                this.wire = document.querySelector('#'+str)
                                let target = document.querySelector('#'+arr[1]+'Model')
                                let element = document.querySelector('#'+part+'Model');
                                
                                if (!element.object3D.visible || !element.parentElement.object3D.visible || !target.object3D.visible || !target.parentElement.object3D.visible) {
                                    if ($("#"+str).length) $("#"+str)[0].object3D.visible = false
                                    continue;
                                }        
                                
                                let type = part;
                                if (part.length == 3) type = part.slice(0, -1);
                                
                                var mesh1 = element.getObject3D('mesh');
                                var mesh2 = target.getObject3D('mesh');
                                if (!mesh1 || !mesh2) continue;
                                const submesh1 = mesh1.getObjectByName(type+k);
                                const submesh2 = mesh2.getObjectByName(arr[1]+'p'+arr[0]);
                                if (!submesh1 || !submesh2) continue; 

                                mesh1.matrixWorld.decompose( cg, new THREE.Quaternion(), new THREE.Vector3() );
                                submesh1.matrixWorld.decompose( pi, new THREE.Quaternion(), new THREE.Vector3() );
                                submesh2.matrixWorld.decompose( pf, new THREE.Quaternion(), new THREE.Vector3() );  
                                var p2 = pf.x+' '+pf.y+' '+pf.z;
                                var p1 = pi.x+' '+pi.y+' '+pi.z;
                    
                                var middle = new THREE.Vector3(o.lerp(pi.x, pf.x, 0.5),o.lerp(pi.y,pf.y, 0.5),o.lerp(pi.z, pf.z, 0.5)+this.data.inflection/10)
                    
                                //if (o.sceneEl.is('ar-mode')) middle = new THREE.Vector3(o.lerp(pi.x, pf.x, 0.5),o.lerp(pi.y,pf.y, 0.5),o.lerp(pi.z, pf.z, 0.5)+800)
                    
                                if (!this.wire) {
                                    this.wire = document.createElement('a-entity')
                                    this.wire.setAttribute('id',str)
                                    o.ARwires.all.push(str);
                                    this.wire.object3D.visible = true;
                                    o.wires.appendChild(this.wire)
                                } else {
                                    if (this.wire.getAttribute('stafin') == p1+p2) {
                                        this.wire.object3D.visible = true;
                                        continue
                                    }
                                }
                    
                                this.wire.textContent = '';
                                let points = [pi,middle,pf];
                                var h = this.data.inflection/5;
                                
                                if (this.between(cg.x,pf.x,pi.x) || this.between(cg.y,pf.y,pi.y)) { 
                                    points = [pi,new THREE.Vector3(pi.x,pi.y,pi.z+h),new THREE.Vector3(middle.x,middle.y,middle.z+h),new THREE.Vector3(pf.x,pf.y,pf.z+h),pf] 

                                    //if (o.sceneEl.is('ar-mode')) points = [pi,new THREE.Vector3(pi.x,pi.y,pi.z+200),new THREE.Vector3(middle.x,middle.y,middle.z+200),new THREE.Vector3(pf.x,pf.y,pf.z+200),pf]
                        
                                }
                                this.wire.appendChild( this.setSpline(points,p1,p2,this.setColor(k)))
                            }
                        }
                    }
                }
            })(),
            setSpline: function (pointArray,pi,pf,color){
                let spline = new THREE.CatmullRomCurve3(pointArray);
                const point = new THREE.Vector3();
                let html ="";
                for ( let i = 0, l = this.data.resolution; i < l; i ++ ) {
                    const t = i / l;
                    spline.getPoint( t, point );
                    html += point.x+" "+point.y+" "+point.z
                    if (i < this.data.resolution-1) html +=","
                }
                let w1 = document.createElement('a-entity');
                w1.setAttribute('tickline',{
                    lineWidth:this.data.tickness,
                    path:html+','+pf,
                    color: color
                })
                this.wire.setAttribute('stafin',pi+pf)
                return w1
            },
            setColor: function (k){
                let color = "red"
                if (k == "n") {color = 'black'}
                else if (k == "s") {color = 'orange'}
                else if (k == "t") {color = 'green'}
                else if (k == "e") {color = 'brown'}
                return color
            },
            between: function(val,a, b) {
                let bol = false
                let sig = Math.max(a,b)
                let max = Math.max(a,val)
                let min = Math.min(b,val)
                if (sig == a){ // placa na frente da peca
                    if (min != val && max != val) bol = true
                } else {
                    if (min == val && max == val) bol = true
                }

                //if (Math.abs(Math.abs(val)-Math.abs(b)) < 0.15+0.5*o.zoom[0]) bol = false
                //if (o.sceneEl.is('ar-mode') && Math.abs(Math.abs(val)-Math.abs(b)) < 100) bol = false
                return bol            
            },
            remove: function(){
                /*wires.all.forEach(function(item){
                    removeWire(item,item.substring(0,3),item.substring(4,5))
                })*/
                //wires = {all:[]}
                //usedPins = [];
            }
        }); 
        
        class MeshLine extends THREE.BufferGeometry {
          constructor() {
            super()
            this.type = 'MeshLine'
            this.isMeshLine = true
            this.positions = []
            this.previous = []
            this.next = []
            this.side = []
            this.width = []
            this.indices_array = []
            this.uvs = []
            this.counters = []
            this._points = []
            this._geom = null

            this.widthCallback = null

            // Used to raycast
            this.matrixWorld = new THREE.Matrix4()

            Object.defineProperties(this, {
              // this is now a bufferGeometry
              // add getter to support previous api
              geometry: {
                enumerable: true,
                get() {
                  return this
                }
              },
              geom: {
                enumerable: true,
                get() {
                  return this._geom
                },
                set(value) {
                  this.setGeometry(value, this.widthCallback)
                }
              },
              // for declaritive architectures
              // to return the same value that sets the points
              // eg. this.points = points
              // console.log(this.points) -> points
              points: {
                enumerable: true,
                get() {
                  return this._points
                },
                set(value) {
                  this.setPoints(value, this.widthCallback)
                }
              }
            })
          }
          setMatrixWorld(matrixWorld) {
            this.matrixWorld = matrixWorld
          }
          setGeometry(g, c) {
            // as the input geometry are mutated we store them
            // for later retreival when necessary (declaritive architectures)
            this._geometry = g
            if (g instanceof THREE.BufferGeometry) {
              this.setPoints(g.getAttribute('position').array, c)
            } else {
              this.setPoints(g, c)
            }
          }
          setPoints(points, wcb) {
            if (!(points instanceof Float32Array) && !(points instanceof Array)) {
              console.error('ERROR: The BufferArray of points is not instancied correctly.')
              return
            }
            // as the points are mutated we store them
            // for later retreival when necessary (declaritive architectures)
            this._points = points
            this.widthCallback = wcb
            this.positions = []
            this.counters = []
            if (points.length && points[0] instanceof THREE.Vector3) {
              // could transform Vector3 array into the array used below
              // but this approach will only loop through the array once
              // and is more performant
              for (var j = 0; j < points.length; j++) {
                const p = points[j]
                var c = j / points.length
                this.positions.push(p.x, p.y, p.z)
                this.positions.push(p.x, p.y, p.z)
                this.counters.push(c)
                this.counters.push(c)
              }
            } else {
              for (var j = 0; j < points.length; j += 3) {
                var c = j / points.length
                this.positions.push(points[j], points[j + 1], points[j + 2])
                this.positions.push(points[j], points[j + 1], points[j + 2])
                this.counters.push(c)
                this.counters.push(c)
              }
            }
            this.process()
          }
          compareV3(a, b) {
            const aa = a * 6
            const ab = b * 6
            return this.positions[aa] === this.positions[ab] && this.positions[aa + 1] === this.positions[ab + 1] && this.positions[aa + 2] === this.positions[ab + 2]
          }
          copyV3(a) {
            const aa = a * 6
            return [this.positions[aa], this.positions[aa + 1], this.positions[aa + 2]]
          }
          process() {
            const l = this.positions.length / 6

            this.previous = []
            this.next = []
            this.side = []
            this.width = []
            this.indices_array = []
            this.uvs = []

            let w

            let v
            // initial previous points
            if (this.compareV3(0, l - 1)) {
              v = this.copyV3(l - 2)
            } else {
              v = this.copyV3(0)
            }
            this.previous.push(v[0], v[1], v[2])
            this.previous.push(v[0], v[1], v[2])

            for (let j = 0; j < l; j++) {
              // sides
              this.side.push(1)
              this.side.push(-1)

              // widths
              if (this.widthCallback) w = this.widthCallback(j / (l - 1))
              else w = 1
              this.width.push(w)
              this.width.push(w)

              // uvs
              this.uvs.push(j / (l - 1), 0)
              this.uvs.push(j / (l - 1), 1)

              if (j < l - 1) {
                // points previous to poisitions
                v = this.copyV3(j)
                this.previous.push(v[0], v[1], v[2])
                this.previous.push(v[0], v[1], v[2])

                // indices
                const n = j * 2
                this.indices_array.push(n, n + 1, n + 2)
                this.indices_array.push(n + 2, n + 1, n + 3)
              }
              if (j > 0) {
                // points after poisitions
                v = this.copyV3(j)
                this.next.push(v[0], v[1], v[2])
                this.next.push(v[0], v[1], v[2])
              }
            }

            // last next point
            if (this.compareV3(l - 1, 0)) {
              v = this.copyV3(1)
            } else {
              v = this.copyV3(l - 1)
            }
            this.next.push(v[0], v[1], v[2])
            this.next.push(v[0], v[1], v[2])

            // redefining the attribute seems to prevent range errors
            // if the user sets a differing number of vertices
            if (!this._attributes || this._attributes.position.count !== this.positions.length) {
              this._attributes = {
                position: new THREE.BufferAttribute(new Float32Array(this.positions), 3),
                previous: new THREE.BufferAttribute(new Float32Array(this.previous), 3),
                next: new THREE.BufferAttribute(new Float32Array(this.next), 3),
                side: new THREE.BufferAttribute(new Float32Array(this.side), 1),
                width: new THREE.BufferAttribute(new Float32Array(this.width), 1),
                uv: new THREE.BufferAttribute(new Float32Array(this.uvs), 2),
                index: new THREE.BufferAttribute(new Uint16Array(this.indices_array), 1),
                counters: new THREE.BufferAttribute(new Float32Array(this.counters), 1)
              }
            } else {
              this._attributes.position.copyArray(new Float32Array(this.positions))
              this._attributes.position.needsUpdate = true
              this._attributes.previous.copyArray(new Float32Array(this.previous))
              this._attributes.previous.needsUpdate = true
              this._attributes.next.copyArray(new Float32Array(this.next))
              this._attributes.next.needsUpdate = true
              this._attributes.side.copyArray(new Float32Array(this.side))
              this._attributes.side.needsUpdate = true
              this._attributes.width.copyArray(new Float32Array(this.width))
              this._attributes.width.needsUpdate = true
              this._attributes.uv.copyArray(new Float32Array(this.uvs))
              this._attributes.uv.needsUpdate = true
              this._attributes.index.copyArray(new Uint16Array(this.indices_array))
              this._attributes.index.needsUpdate = true
            }

            this.setAttribute('position', this._attributes.position)
            this.setAttribute('previous', this._attributes.previous)
            this.setAttribute('next', this._attributes.next)
            this.setAttribute('side', this._attributes.side)
            this.setAttribute('width', this._attributes.width)
            this.setAttribute('uv', this._attributes.uv)
            this.setAttribute('counters', this._attributes.counters)

            this.setIndex(this._attributes.index)

            this.computeBoundingSphere()
            this.computeBoundingBox()
          }
          advance({ x, y, z }) {
            const positions = this._attributes.position.array
            const previous = this._attributes.previous.array
            const next = this._attributes.next.array
            const l = positions.length

            // PREVIOUS
            memcpy(positions, 0, previous, 0, l)

            // POSITIONS
            memcpy(positions, 6, positions, 0, l - 6)

            positions[l - 6] = x
            positions[l - 5] = y
            positions[l - 4] = z
            positions[l - 3] = x
            positions[l - 2] = y
            positions[l - 1] = z

            // NEXT
            memcpy(positions, 6, next, 0, l - 6)

            next[l - 6] = x
            next[l - 5] = y
            next[l - 4] = z
            next[l - 3] = x
            next[l - 2] = y
            next[l - 1] = z

            this._attributes.position.needsUpdate = true
            this._attributes.previous.needsUpdate = true
            this._attributes.next.needsUpdate = true
          }
        }
        THREE.ShaderChunk['meshline_vert'] = [
          '',
          '#include <common>',
          '',
          THREE.ShaderChunk.logdepthbuf_pars_vertex,
          THREE.ShaderChunk.fog_pars_vertex,
          '',
          'attribute vec3 previous;',
          'attribute vec3 next;',
          'attribute float side;',
          'attribute float width;',
          'attribute float counters;',
          '',
          'uniform vec2 resolution;',
          'uniform float lineWidth;',
          'uniform vec3 color;',
          'uniform float opacity;',
          'uniform float sizeAttenuation;',
          '',
          'varying vec2 vUV;',
          'varying vec4 vColor;',
          'varying float vCounters;',
          '',
          'vec2 fix( vec4 i, float aspect ) {',
          '',
          '    vec2 res = i.xy / i.w;',
          '    res.x *= aspect;',
          '	 vCounters = counters;',
          '    return res;',
          '',
          '}',
          '',
          'void main() {',
          '',
          '    float aspect = resolution.x / resolution.y;',
          '',
          '    vColor = vec4( color, opacity );',
          '    vUV = uv;',
          '',
          '    mat4 m = projectionMatrix * modelViewMatrix;',
          '    vec4 finalPosition = m * vec4( position, 1.0 );',
          '    vec4 prevPos = m * vec4( previous, 1.0 );',
          '    vec4 nextPos = m * vec4( next, 1.0 );',
          '',
          '    vec2 currentP = fix( finalPosition, aspect );',
          '    vec2 prevP = fix( prevPos, aspect );',
          '    vec2 nextP = fix( nextPos, aspect );',
          '',
          '    float w = lineWidth * width;',
          '',
          '    vec2 dir;',
          '    if( nextP == currentP ) dir = normalize( currentP - prevP );',
          '    else if( prevP == currentP ) dir = normalize( nextP - currentP );',
          '    else {',
          '        vec2 dir1 = normalize( currentP - prevP );',
          '        vec2 dir2 = normalize( nextP - currentP );',
          '        dir = normalize( dir1 + dir2 );',
          '',
          '        vec2 perp = vec2( -dir1.y, dir1.x );',
          '        vec2 miter = vec2( -dir.y, dir.x );',
          '        //w = clamp( w / dot( miter, perp ), 0., 4. * lineWidth * width );',
          '',
          '    }',
          '',
          '    //vec2 normal = ( cross( vec3( dir, 0. ), vec3( 0., 0., 1. ) ) ).xy;',
          '    vec4 normal = vec4( -dir.y, dir.x, 0., 1. );',
          '    normal.xy *= .5 * w;',
          '    normal *= projectionMatrix;',
          '    if( sizeAttenuation == 0. ) {',
          '        normal.xy *= finalPosition.w;',
          '        normal.xy /= ( vec4( resolution, 0., 1. ) * projectionMatrix ).xy;',
          '    }',
          '',
          '    finalPosition.xy += normal.xy * side;',
          '',
          '    gl_Position = finalPosition;',
          '',
          THREE.ShaderChunk.logdepthbuf_vertex,
          THREE.ShaderChunk.fog_vertex && '    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
          THREE.ShaderChunk.fog_vertex,
          '}'
        ].join('\n')
        THREE.ShaderChunk['meshline_frag'] = [
          '',
          THREE.ShaderChunk.fog_pars_fragment,
          THREE.ShaderChunk.logdepthbuf_pars_fragment,
          '',
          'uniform sampler2D map;',
          'uniform sampler2D alphaMap;',
          'uniform float useMap;',
          'uniform float useAlphaMap;',
          'uniform float useDash;',
          'uniform float dashArray;',
          'uniform float dashOffset;',
          'uniform float dashRatio;',
          'uniform float visibility;',
          'uniform float alphaTest;',
          'uniform vec2 repeat;',
          '',
          'varying vec2 vUV;',
          'varying vec4 vColor;',
          'varying float vCounters;',
          '',
          'void main() {',
          '',
          THREE.ShaderChunk.logdepthbuf_fragment,
          '',
          '    vec4 c = vColor;',
          '    if( useMap == 1. ) c *= texture2D( map, vUV * repeat );',
          '    if( useAlphaMap == 1. ) c.a *= texture2D( alphaMap, vUV * repeat ).a;',
          '    if( c.a < alphaTest ) discard;',
          '    if( useDash == 1. ){',
          '        c.a *= ceil(mod(vCounters + dashOffset, dashArray) - (dashArray * dashRatio));',
          '    }',
          '    gl_FragColor = c;',
          '    gl_FragColor.a *= step(vCounters, visibility);',
          '',
          THREE.ShaderChunk.fog_fragment,
          '}'
        ].join('\n')
        class MeshLineMaterial extends THREE.ShaderMaterial {
          constructor(parameters) {
            super({
              uniforms: Object.assign({}, THREE.UniformsLib.fog, {
                lineWidth: { value: 1 },
                map: { value: null },
                useMap: { value: 0 },
                alphaMap: { value: null },
                useAlphaMap: { value: 0 },
                color: { value: new THREE.Color(0xffffff) },
                opacity: { value: 1 },
                resolution: { value: new THREE.Vector2(1, 1) },
                sizeAttenuation: { value: 1 },
                dashArray: { value: 0 },
                dashOffset: { value: 0 },
                dashRatio: { value: 0.5 },
                useDash: { value: 0 },
                visibility: { value: 1 },
                alphaTest: { value: 0 },
                repeat: { value: new THREE.Vector2(1, 1) }
              }),

              vertexShader: THREE.ShaderChunk.meshline_vert,

              fragmentShader: THREE.ShaderChunk.meshline_frag
            })

            this.type = 'MeshLineMaterial'
            Object.defineProperties(this, {
              lineWidth: {
                enumerable: true,
                get() {
                  return this.uniforms.lineWidth.value
                },
                set(value) {
                  this.uniforms.lineWidth.value = value
                }
              },
              map: {
                enumerable: true,
                get() {
                  return this.uniforms.map.value
                },
                set(value) {
                  this.uniforms.map.value = value
                }
              },
              useMap: {
                enumerable: true,
                get() {
                  return this.uniforms.useMap.value
                },
                set(value) {
                  this.uniforms.useMap.value = value
                }
              },
              alphaMap: {
                enumerable: true,
                get() {
                  return this.uniforms.alphaMap.value
                },
                set(value) {
                  this.uniforms.alphaMap.value = value
                }
              },
              useAlphaMap: {
                enumerable: true,
                get() {
                  return this.uniforms.useAlphaMap.value
                },
                set(value) {
                  this.uniforms.useAlphaMap.value = value
                }
              },
              color: {
                enumerable: true,
                get() {
                  return this.uniforms.color.value
                },
                set(value) {
                  this.uniforms.color.value = value
                }
              },
              opacity: {
                enumerable: true,
                get() {
                  return this.uniforms.opacity.value
                },
                set(value) {
                  this.uniforms.opacity.value = value
                }
              },
              resolution: {
                enumerable: true,
                get() {
                  return this.uniforms.resolution.value
                },
                set(value) {
                  this.uniforms.resolution.value.copy(value)
                }
              },
              sizeAttenuation: {
                enumerable: true,
                get() {
                  return this.uniforms.sizeAttenuation.value
                },
                set(value) {
                  this.uniforms.sizeAttenuation.value = value
                }
              },
              dashArray: {
                enumerable: true,
                get() {
                  return this.uniforms.dashArray.value
                },
                set(value) {
                  this.uniforms.dashArray.value = value
                  this.useDash = value !== 0 ? 1 : 0
                }
              },
              dashOffset: {
                enumerable: true,
                get() {
                  return this.uniforms.dashOffset.value
                },
                set(value) {
                  this.uniforms.dashOffset.value = value
                }
              },
              dashRatio: {
                enumerable: true,
                get() {
                  return this.uniforms.dashRatio.value
                },
                set(value) {
                  this.uniforms.dashRatio.value = value
                }
              },
              useDash: {
                enumerable: true,
                get() {
                  return this.uniforms.useDash.value
                },
                set(value) {
                  this.uniforms.useDash.value = value
                }
              },
              visibility: {
                enumerable: true,
                get() {
                  return this.uniforms.visibility.value
                },
                set(value) {
                  this.uniforms.visibility.value = value
                }
              },
              alphaTest: {
                enumerable: true,
                get() {
                  return this.uniforms.alphaTest.value
                },
                set(value) {
                  this.uniforms.alphaTest.value = value
                }
              },
              repeat: {
                enumerable: true,
                get() {
                  return this.uniforms.repeat.value
                },
                set(value) {
                  this.uniforms.repeat.value.copy(value)
                }
              }
            })

            this.setValues(parameters)
          }
          copy(source) {
            super.copy(source)

            this.lineWidth = source.lineWidth
            this.map = source.map
            this.useMap = source.useMap
            this.alphaMap = source.alphaMap
            this.useAlphaMap = source.useAlphaMap
            this.color.copy(source.color)
            this.opacity = source.opacity
            this.resolution.copy(source.resolution)
            this.sizeAttenuation = source.sizeAttenuation
            this.dashArray.copy(source.dashArray)
            this.dashOffset.copy(source.dashOffset)
            this.dashRatio.copy(source.dashRatio)
            this.useDash = source.useDash
            this.visibility = source.visibility
            this.alphaTest = source.alphaTest
            this.repeat.copy(source.repeat)

            return this
          }
        }
        function memcpy(src, srcOffset, dst, dstOffset, length) {
          let i

          src = src.subarray || src.slice ? src : src.buffer
          dst = dst.subarray || dst.slice ? dst : dst.buffer

          src = srcOffset ? (src.subarray ? src.subarray(srcOffset, length && srcOffset + length) : src.slice(srcOffset, length && srcOffset + length)) : src

          if (dst.set) {
            dst.set(src, dstOffset)
          } else {
            for (i = 0; i < src.length; i++) {
              dst[i + dstOffset] = src[i]
            }
          }

          return dst
        }
        THREE.MeshLine = MeshLine;
	    THREE.MeshLineMaterial = MeshLineMaterial;
        AFRAME.registerComponent('tickline', {
          schema: {
            color: { default: '#000' },
            lineWidth: { default: 10 },
            lineWidthStyler: { default: '' },
            sizeAttenuation: { default: 0 },
            path: {
              default: [
                { x: -0.5, y: 0, z: 0 },
                { x: 0.5, y: 0, z: 0 }
              ],
              // Deserialize path in the form of comma-separated vec3s: `0 0 0, 1 1 1, 2 0 3`.
              parse: function (value) {
                return value.split(',').map(AFRAME.utils.coordinates.parse);
              },
              // Serialize array of vec3s in case someone does setAttribute('line', 'path', [...]).
              stringify: function (data) {
                return data.map(AFRAME.utils.coordinates.stringify).join(',');
              }
            }
          },	  
          init: function () {
            this.resolution = new THREE.Vector2 ( window.innerWidth, window.innerHeight ) ;

            var sceneEl = this.el.sceneEl;
            sceneEl.addEventListener( 'render-target-loaded', this.do_update.bind(this) );
            sceneEl.addEventListener( 'render-target-loaded', this.addlisteners.bind(this) );
          },	  
          addlisteners: function () {
            window.addEventListener( 'resize', this.do_update.bind (this) );
          },	  
          do_update: function () {

            var canvas = this.el.sceneEl.canvas;
            this.resolution.set( canvas.width,  canvas.height );
            //console.log( this.resolution );
            this.update();

          },	  
          update: function () {
            var material = new THREE.MeshLineMaterial({
              color: new THREE.Color(this.data.color),
              resolution: this.resolution,
              sizeAttenuation: this.data.sizeAttenuation,
              lineWidth: this.data.lineWidth
            });

            var vertices = [];

            this.data.path.forEach(function (vec3) {
              vertices.push(vec3.x || 0, vec3.y || 0, vec3.z || 0);
            });

            var widthFn = (
              typeof this.data.lineWidthStyler === 'string' &&
              this.data.lineWidthStyler.length > 0
            ) ? new Function('p', 'return ' + this.data.lineWidthStyler)
              : function() { return 1; };
            //? try {var w = widthFn(0);} catch(e) {warn(e);}
            var line = new THREE.MeshLine();
            line.setGeometry(new Float32Array(vertices), widthFn);

            this.el.setObject3D('mesh', new THREE.Mesh(line.geometry, material));
          },	  
          remove: function () {
            this.el.removeObject3D('mesh');
          }
        });
        
	    class DecalGeometry extends THREE.BufferGeometry {
            constructor( mesh, position, orientation, size ) {
                super(); 
                
                // buffers
                const vertices = [];
                const normals = [];
                const uvs = []; 
                
                // helpers
                const plane = new THREE.Vector3(); 
                
                // this matrix represents the transformation of the decal projector
                const projectorMatrix = new THREE.Matrix4();
                projectorMatrix.makeRotationFromEuler( orientation );
                projectorMatrix.setPosition( position );
                const projectorMatrixInverse = new THREE.Matrix4();
                projectorMatrixInverse.copy( projectorMatrix ).invert(); 
                
                // generate buffers
                generate(); 
                
                // build geometry
                this.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
                this.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
                this.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );

                function generate() {
                    let decalVertices = [];
                    const vertex = new THREE.Vector3();
                    const normal = new THREE.Vector3(); 
                    
                    // handle different geometry types
                    const geometry = mesh.geometry;
                    const positionAttribute = geometry.attributes.position;
                    const normalAttribute = geometry.attributes.normal; 
                    
                    // first, create an array of 'DecalVertex' objects
                    // three consecutive 'DecalVertex' objects represent a single face
                    // this data structure will be later used to perform the clipping

                    // indexed BufferGeometry
                    if ( geometry.index !== null ) {
                        const index = geometry.index;
                        for ( let i = 0; i < index.count; i ++ ) {
                            vertex.fromBufferAttribute( positionAttribute, index.getX( i ) );
                            normal.fromBufferAttribute( normalAttribute, index.getX( i ) );
                            pushDecalVertex( decalVertices, vertex, normal );
                        }
                    } 
                    
                    // non-indexed BufferGeometry
                    else {
                        for ( let i = 0; i < positionAttribute.count; i ++ ) {
                            vertex.fromBufferAttribute( positionAttribute, i );
                            normal.fromBufferAttribute( normalAttribute, i );
                            pushDecalVertex( decalVertices, vertex, normal );

                        }

                    }

                    // second, clip the geometry so that it doesn't extend out from the projector
                    decalVertices = clipGeometry( decalVertices, plane.set( 1, 0, 0 ) );
                    decalVertices = clipGeometry( decalVertices, plane.set( - 1, 0, 0 ) );
                    decalVertices = clipGeometry( decalVertices, plane.set( 0, 1, 0 ) );
                    decalVertices = clipGeometry( decalVertices, plane.set( 0, - 1, 0 ) );
                    decalVertices = clipGeometry( decalVertices, plane.set( 0, 0, 1 ) );
                    decalVertices = clipGeometry( decalVertices, plane.set( 0, 0, - 1 ) ); 
                    
                    // third, generate final vertices, normals and uvs                    
                    for ( let i = 0; i < decalVertices.length; i ++ ) {
                        const decalVertex = decalVertices[ i ]; 
                        
                        // create texture coordinates (we are still in projector space)
                        uvs.push( 0.5 + decalVertex.position.x / size.x, 0.5 + decalVertex.position.y / size.y ); 
                        
                        // transform the vertex back to world space
                        decalVertex.position.applyMatrix4( projectorMatrix ); 
                        
                        // now create vertex and normal buffer data
                        vertices.push( decalVertex.position.x, decalVertex.position.y, decalVertex.position.z );
                        normals.push( decalVertex.normal.x, decalVertex.normal.y, decalVertex.normal.z );
                    }
                }
                
                function pushDecalVertex( decalVertices, vertex, normal ) {
                    
                    // transform the vertex to world space, then to projector space
                    
                    vertex.applyMatrix4( mesh.matrixWorld );
                    vertex.applyMatrix4( projectorMatrixInverse );
                    normal.transformDirection( mesh.matrixWorld );
                    decalVertices.push( new DecalVertex( vertex.clone(), normal.clone() ) );
                }               
                function clipGeometry( inVertices, plane ) {
                    const outVertices = [];
                    const s = 0.5 * Math.abs( size.dot( plane ) );
                    
                    // a single iteration clips one face,
                    // which consists of three consecutive 'DecalVertex' objects
                    
                    for ( let i = 0; i < inVertices.length; i += 3 ) {
                        let total = 0;
                        let nV1;
                        let nV2;
                        let nV3;
                        let nV4;
                        const d1 = inVertices[ i + 0 ].position.dot( plane ) - s;
                        const d2 = inVertices[ i + 1 ].position.dot( plane ) - s;
                        const d3 = inVertices[ i + 2 ].position.dot( plane ) - s;
                        
                        const v1Out = d1 > 0;
                        const v2Out = d2 > 0;
                        const v3Out = d3 > 0; 
                        
                        // calculate, how many vertices of the face lie outside of the clipping plane
                        total = ( v1Out ? 1 : 0 ) + ( v2Out ? 1 : 0 ) + ( v3Out ? 1 : 0 );
                        
                        switch ( total ) {
                            case 0:{
                                // the entire face lies inside of the plane, no clipping needed
                                outVertices.push( inVertices[ i ] );
                                outVertices.push( inVertices[ i + 1 ] );
                                outVertices.push( inVertices[ i + 2 ] );
                                break;
                            }
                            case 1:{
                                // one vertex lies outside of the plane, perform clipping
                                if ( v1Out ) {
                                    nV1 = inVertices[ i + 1 ];
                                    nV2 = inVertices[ i + 2 ];
                                    nV3 = clip( inVertices[ i ], nV1, plane, s );
                                    nV4 = clip( inVertices[ i ], nV2, plane, s );
                                }
                                if ( v2Out ) {
                                    nV1 = inVertices[ i ];
                                    nV2 = inVertices[ i + 2 ];
                                    nV3 = clip( inVertices[ i + 1 ], nV1, plane, s );
                                    nV4 = clip( inVertices[ i + 1 ], nV2, plane, s );
                                    outVertices.push( nV3 );
                                    outVertices.push( nV2.clone() );
                                    outVertices.push( nV1.clone() );
                                    outVertices.push( nV2.clone() );
                                    outVertices.push( nV3.clone() );
                                    outVertices.push( nV4 );
                                    break;
                                }
                                if ( v3Out ) {
                                    nV1 = inVertices[ i ];
                                    nV2 = inVertices[ i + 1 ];
                                    nV3 = clip( inVertices[ i + 2 ], nV1, plane, s );
                                    nV4 = clip( inVertices[ i + 2 ], nV2, plane, s );
                                }
                                outVertices.push( nV1.clone() );
                                outVertices.push( nV2.clone() );
                                outVertices.push( nV3 );
                                outVertices.push( nV4 );
                                outVertices.push( nV3.clone() );
                                outVertices.push( nV2.clone() );
                                break;
                            }
                            case 2:{
                                // two vertices lies outside of the plane, perform clipping
                                if ( ! v1Out ) {
                                    nV1 = inVertices[ i ].clone();
                                    nV2 = clip( nV1, inVertices[ i + 1 ], plane, s );
                                    nV3 = clip( nV1, inVertices[ i + 2 ], plane, s );
                                    outVertices.push( nV1 );
                                    outVertices.push( nV2 );
                                    outVertices.push( nV3 );
                                }
                                if ( ! v2Out ) {
                                    nV1 = inVertices[ i + 1 ].clone();
                                    nV2 = clip( nV1, inVertices[ i + 2 ], plane, s );
                                    nV3 = clip( nV1, inVertices[ i ], plane, s );
                                    outVertices.push( nV1 );
                                    outVertices.push( nV2 );
                                    outVertices.push( nV3 );
                                }
                                if ( ! v3Out ) {
                                    nV1 = inVertices[ i + 2 ].clone();
                                    nV2 = clip( nV1, inVertices[ i ], plane, s );
                                    nV3 = clip( nV1, inVertices[ i + 1 ], plane, s );
                                    outVertices.push( nV1 );
                                    outVertices.push( nV2 );
                                    outVertices.push( nV3 );
                                }
                                break;
                            }
                            case 3:{
                                // the entire face lies outside of the plane, discard
                                break;
                            }
                        }
                    }
                    return outVertices;
                }
                function clip( v0, v1, p, s ) {
                    const d0 = v0.position.dot( p ) - s;
                    const d1 = v1.position.dot( p ) - s;
                    const s0 = d0 / ( d0 - d1 );
                    const v = new DecalVertex( 
                        new THREE.Vector3( v0.position.x + s0 * ( v1.position.x - v0.position.x ), 
                                           v0.position.y + s0 * ( v1.position.y - v0.position.y ), 
                                           v0.position.z + s0 * ( v1.position.z - v0.position.z )), 
                        new THREE.Vector3( v0.normal.x + s0 * ( v1.normal.x - v0.normal.x ), 
                                           v0.normal.y + s0 * ( v1.normal.y - v0.normal.y ), 
                                           v0.normal.z + s0 * ( v1.normal.z - v0.normal.z ))
                    ); 
                    // need to clip more values (texture coordinates)? do it this way:
                    // intersectpoint.value = a.value + s * ( b.value - a.value );
                    return v;
                }
            }
        }
        class DecalVertex {
            constructor( position, normal ) {
                this.position = position;
                this.normal = normal;
            }
            clone() {
                return new this.constructor( this.position.clone(), this.normal.clone() );
            }
        }
        THREE.DecalGeometry = DecalGeometry;
        THREE.DecalVertex = DecalVertex;
        AFRAME.registerComponent('sticker', {
            schema: {
                enabled: {type:'boolean', default:true},
                texture: {type:'asset', default:'#sticker'}, 
                scale: {type: 'number'}
            },
            init: function () {
                this.helper = new THREE.Object3D();  
                this.decals = [];
            },
            update: function () {
                this.decalMaterial = new THREE.MeshPhongMaterial( { 
                    // color: 'red', 
                    side:THREE.DoubleSide,
                    //depthTest: true,   
                    //depthWrite: false,
                    transparent: true, 
                    polygonOffset: true, 
                    polygonOffsetFactor: - 4, 
                    map: new THREE.TextureLoader().load( THREE.ImageUtils.getDataURL(this.data.texture))
                    //map: new THREE.TextureLoader().load( 'https://cdn.glitch.global/a5690e54-af54-41cd-85d9-b745739e4a11/00055.png?v=1664334108075'), 
                });
            },
            events: {
                'grab-start': function(e) {
                    if (!this.data.enabled) return
                    
                    // get clicker raycaster intersection
                    let int = e.detail.hand.components.raycaster.intersections[0]
                    
                    // only work with a-plane
                    //if (int.object.geometry.type != "PlaneGeometry") return

                    var n = int.face.normal.clone();
                    n.transformDirection( int.object.matrixWorld );
                    n.add( int.point );

                    this.helper.position.copy( int.point );
                    this.helper.lookAt(n);
                    
                    var position = this.el.object3D.worldToLocal(int.point);
                    
                    let s = (this.data.scale!=0) ? this.data.scale : Math.random();
                    var size = new THREE.Vector3(s,s,s);
                    
                    var decalGeometry = new THREE.DecalGeometry( int.object, position, this.helper.rotation, size );
                                        
                    this.el.object3D.add(new THREE.Mesh( decalGeometry, this.decalMaterial )); 
                },
                hide: function(){
                    for (i=0;i<this.decals.length;i++){
                        this.decals[i].visible = false;
                    }
                },
                show: function(){
                    for (i=0;i<this.decals.length;i++){
                        this.decals[i].visible = true;
                    }
                },
                removelast: function(){
                    this.el.object3D.remove(this.decals.slice(-1)) 
                    this.decals.pop()
                },
                removeall: function(){
                    for (i=0;i<this.decals.length;i++){
                        this.el.object3D.remove(this.decals[i])
                    }
                    this.decals = [];
                }
            }
      })
        
        AFRAME.registerComponent('gltf-animator',{
            schema: {
                timeline: {type: 'string', default: "tl1"},//name of the object animation
                bones: {type: 'array'},
                to: {type: 'array'}
            },
            init: function () {
                this.el.addEventListener('model-loaded', this.update.bind(this));
                this.run=1;
            },
            update: function () {
                var mesh = this.el.getObject3D('mesh');
                if (!mesh) return;
                for (i=0;i<this.data.bones.length;i++){
                    var data = this.data.bones[i];
                    const bone = mesh.getObjectByName(data[0]); 
                    if (!bone) return;
                    //if (this.run <=this.data.bones.length) console.log('Original ', data[0], bone[data[1]])
                    this.run = this.run +1;
                    if (!this.data.to) return;
                    bone[data[1]].x = this.data.to[3 * i]
                    bone[data[1]].y = this.data.to[3 * i +1]
                    bone[data[1]].z = this.data.to[3 * i +2]
                }
            },
        })  
    },
    corrections: function(){
        Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
            get: function(){
                return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
            }
        })
        HTMLMediaElement.prototype.playpause = function(){
            let media = this;
            let volume = media.volume;
            media.volume = 0;
            var playPromise = media.play();
            
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    //console.log(1,media,volume)
                    media.currentTime = 0;
                    media.pause();
                    media.volume = volume;
                })
                .catch(error => {
                    // Auto-play was prevented
                });
            }
        }
        Array.prototype.equals = function (array) {
            // if the other array is a falsy value, return
            if (!array)
                return false;

            // compare lengths - can save a lot of time 
            if (this.length != array.length)
                return false;

            for (var i = 0, l=this.length; i < l; i++) {
                // Check if we have nested arrays
                if (this[i] instanceof Array && array[i] instanceof Array) {
                    // recurse into the nested arrays
                    if (!this[i].equals(array[i]))
                        return false;       
                }           
                else if (typeof this[i] === 'string') {
                    if (this[i] != array[i]) return false; 
                } else if (typeof this[i] !== 'string') {
                    if (Math.abs(Math.abs(this[i])-Math.abs(array[i]))> Math.pow(10,-(o.data.precision-1))){
                       return false; 
                    }
                    
                    /*
                    if (this[i] < 0.01 && array[i] < 0.01){
                        if (Math.abs(this[i].toFixed(o.data.precision-1)) != Math.abs(array[i].toFixed(o.data.precision-1))) return false;    
                    } else {
                        if (this[i].toFixed(o.data.precision-1) != array[i].toFixed(o.data.precision-1)) return false;    
                    }
                    */
                }            
            }       
            return true;
        }
        Object.defineProperty(Array.prototype, "equals", {enumerable: false});
        THREE.Matrix4.prototype.getInverse = function getInverse(matrix) {
			return this.copy(matrix).invert();
		}
        THREE.Quaternion.prototype.inverse = function () {
		  return this.invert();
	    };
        HTMLElement.prototype.alpha = function(a) {
            current_color = getComputedStyle(this).getPropertyValue("background-color");
            match = /rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*\d+[\.\d+]*)*\)/g.exec(current_color)
            a = a > 1 ? (a / 100) : a;
            this.style.backgroundColor = "rgba(" + [match[1],match[2],match[3],a].join(',') +")";
        }
        THREE.Material.prototype.setValues = function(values){
            if (values === undefined) return;

            for (const key in values) {
                const newValue = values[key];
                if (newValue === undefined) {
                    //console.warn('THREE.Material: \'' + key + '\' parameter is undefined.');
                    continue;
                } // for backward compatibility if shading is set in the constructor
                if (key === 'shading') {
                    //console.warn('THREE.' + this.type + ': .shading has been removed. Use the boolean .flatShading instead.');
                    this.flatShading = newValue === FlatShading ? true : false;
                    continue;
                }
                const currentValue = this[key];
                if (currentValue === undefined) {
                    //console.warn('THREE.' + this.type + ': \'' + key + '\' is not a property of this material.');
                    continue;
                }
                if (currentValue && currentValue.isColor) {
                    currentValue.set(newValue);
                } else if (currentValue && currentValue.isVector3 && newValue && newValue.isVector3) {
                    currentValue.copy(newValue);
                } else {
                    this[key] = newValue;
                }
            }
        }           
        THREE.BufferGeometry.prototype.applyMatrix = function (matrix) { return this.applyMatrix4(matrix); };  
        THREE.BufferAttribute.prototype.setDynamic = function ( value ) {
			this.setUsage( value === true ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage );
			return this;
		}
        THREE.BufferGeometry.prototype.addAttribute = function ( name, attribute ) {
			if ( ! ( attribute && attribute.isBufferAttribute ) && ! ( attribute && attribute.isInterleavedBufferAttribute ) ) {
				return this.setAttribute( name, new BufferAttribute( arguments[ 1 ], arguments[ 2 ] ) );
			}
			if ( name === 'index' ) {
				this.setIndex( attribute );
				return this;
			}
			return this.setAttribute( name, attribute );
		} 
        
        // block touch on buttons
        AFRAME.components['tracked-controls-webvr'].Component.prototype.handleTouch = function (id, buttonState) {}
        AFRAME.components['tracked-controls-webxr'].Component.prototype.handleTouch = function (id, buttonState) {}
        
        // Grabbable fix
        if (AFRAME.components["super-hands"]) {        
            
            // ammo integration    
            AFRAME.components.grabbable.Component.prototype.physicsStart = function (evt) {
                // initiate physics constraint if available and not already existing
                Object.keys(this.el.components).forEach(comp => {
                    if(comp.includes('ammo-constraint')) {
                        let target = this.el.getAttribute(comp).target;
                        if (!target) return
                        target.components['ammo-body'].syncToPhysics()
                        //target.object3D.position.addScalar(0.1)
                        //target.object3D.position.subScalar(0.0001)
                    } 
                })
                
                // register grabbed at grabber
                if (evt.detail.hand) {
                    evt.detail.hand.grabbedEl = [this.el]
                    evt.detail.hand.grabbedEl.push(evt.detail.hand.object3D.position.length())
                }
                
                o.toKinematic(this.el)
                this.data.usePhysics = 'never'
                
                if (this.data.usePhysics !== 'never' && this.el.body && evt.detail.hand.body && !this.constraints.has(evt.detail.hand)) {
                    const newConId = Math.random().toString(36).substr(2, 9);
                    this.el.setAttribute('ammo-constraint__' + newConId, {
                        target: evt.detail.hand,
                    });
                    this.constraints.set(evt.detail.hand, newConId);
                    return true;
                } // Prevent manual grab by returning true

                if (this.data.usePhysics === 'only') {
                    return true;
                }

                return false;
            }
            AFRAME.components.grabbable.Component.prototype.physicsEnd = function (evt) {
                const constraintId = this.constraints.get(evt.detail.hand);

                // unregister grabbed at grabber
                if (evt.detail.hand) evt.detail.hand.grabbedEl = []
                
                o.toDynamic(this.el)
                this.data.usePhysics = 'never'
                
                if (constraintId) {
                    this.el.removeAttribute('ammo-constraint__' + constraintId);
                    this.constraints.delete(evt.detail.hand);
                }
            }

            /*
            AFRAME.components.grabbable.Component.prototype.start = function (evt) {
                if (evt.defaultPrevented || !this.startButtonOk(evt)) {
                    return
                }
                
                // room for more grabbers?
                const grabAvailable = !Number.isFinite(this.data.maxGrabbers) ||
                    this.grabbers.length < this.data.maxGrabbers                

                if (this.grabbers.indexOf(evt.detail.hand) === -1 && grabAvailable) {
                  if (!evt.detail.hand.object3D) {
                    console.warn('grabbable entities must have an object3D')
                    return
                  }
                  this.grabbers.push(evt.detail.hand)
                    
                  // initiate physics if available, otherwise manual
                  if (!this.physicsStart(evt) && !this.grabber) {
                    this.grabber = evt.detail.hand
                    this.resetGrabber()
                  }
                  // notify super-hands that the gesture was accepted
                  if (evt.preventDefault) evt.preventDefault() 
                    
                  this.grabbed = true
                  this.el.addState(this.GRABBED_STATE)
                    
                }
            },
            */
            
            AFRAME.components.grabbable.Component.prototype.init = function () {
                this.GRABBED_STATE = 'grabbed'
                this.GRAB_EVENT = 'grab-start'
                this.UNGRAB_EVENT = 'grab-end'

                this.grabbed = false
                this.grabbers = []

                this.constraints = new Map()
                this.deltaPositionIsValid = false
                this.grabDistance = undefined
                this.grabDirection = { x: 0, y: 0, z: -1 }
                this.grabOffset = { x: 0, y: 0, z: 0 }
                // persistent object speeds up repeat setAttribute calls
                this.destPosition = { x: 0, y: 0, z: 0 }
                this.deltaPosition = new THREE.Vector3()
                this.targetPosition = new THREE.Vector3()
                this.physicsInit()
                
                // aabb dynamic support
                //this.el.dataset.aabbColliderDynamic = true;

                this.el.addEventListener(this.GRAB_EVENT, e => {
                    if (!o.sceneEl.is('vr-mode')){
                        e.detail.hand = $('#rhandcursor')[0];
                    }
                    this.start(e)
                })
                this.el.addEventListener(this.UNGRAB_EVENT, e => {
                    if (!o.sceneEl.is('vr-mode')){
                        e.detail.hand = $('#rhandcursor')[0];
                    }
                    this.end(e)
                })
                this.el.addEventListener('mouseout', e => {
                    let move = o.cameraRig.components['movement-controls'];
                    if (move && !move.velocityCtrl){
                        if (!o.sceneEl.is('vr-mode')){
                            e.detail.hand = $('#rhandcursor')[0];
                            this.el.emit('grab-end',e)
                            return
                        }
                        this.lostGrabber(e)
                    }
                })
            }   
            AFRAME.components.grabbable.Component.prototype.updateSchema = function (data) {
                var tempSchema = {
                    suppressX: { type: 'boolean', default: false }, 
                    suppressZ: { type: 'boolean', default: false },
                    wasDynamic: { type: 'boolean', default: false }, 
                }
                this.extendSchema(tempSchema);
            }
            
            AFRAME.components.grabbable.Component.prototype.update = function () {
                this.physicsUpdate()
                this.xFactor = ((this.data.invert) ? -1 : 1) * !this.data.suppressX
                this.zFactor = ((this.data.invert) ? -1 : 1) * !this.data.suppressZ
                this.yFactor = ((this.data.invert) ? -1 : 1) * !this.data.suppressY
            }
            AFRAME.components.grabbable.Component.prototype.tick = (function () {
                const q = new THREE.Quaternion()
                const v = new THREE.Vector3()
                return function () {
                    let entityPosition;
                    
                    if (this.grabber && this.grabber.origin != 'camera' && (o.status == 3 || mode.charAt(1)==8)) {
                        //this.grabber.object3D.getWorldPosition(v)
                        //let lock = this.el.getAttribute('lock') || {p:''}
                        //v.x *= (!this.xFactor || lock.p.includes('X'))?0:1;
                        //v.y *= (!this.yFactor || lock.p.includes('Y'))?0:1;
                        //v.z *= (!this.zFactor || lock.p.includes('Z'))?0:1;
                        
                        this.targetPosition.copy(this.grabDirection)
                        this.targetPosition
                            .applyQuaternion( this.grabber.object3D.getWorldQuaternion(q))
                            .setLength(this.grabDistance)
                            .add( this.grabber.object3D.getWorldPosition(v))
                            .add( this.grabOffset)
                        
                        if (this.deltaPositionIsValid) {
                            // relative position changes work better with nested entities
                            this.deltaPosition.sub(this.targetPosition)
                            entityPosition = this.el.getAttribute('position')
                            this.destPosition.x =
                              entityPosition.x - this.deltaPosition.x * this.xFactor
                            this.destPosition.y =
                              entityPosition.y - this.deltaPosition.y * this.yFactor
                            this.destPosition.z =
                              entityPosition.z - this.deltaPosition.z * this.zFactor
                            
                            this.el.setAttribute('position', this.destPosition)
                            
                        } else {
                            this.deltaPositionIsValid = true
                        }
                        this.deltaPosition.copy(this.targetPosition)
                        
                        if (this.el.components['ammo-body']) {
                            this.el.components['ammo-body'].syncToPhysics()
                        }
                        
                        //console.log('dest',this.destPosition)
                    }
                }
            })()
            
            AFRAME.components.stretchable.Component.prototype.stretchBody = function(a, b) {
                // TODO: update ammo shape
                return
                if (!a.body)
                    return;
                let c, d;
                for (let e = 0; e < a.body.shapes.length; e++)
                    // also move offset to match scale change
                    c = a.body.shapes[e],
                    c.halfExtents ? (c.halfExtents.scale(b, c.halfExtents),
                    c.updateConvexPolyhedronRepresentation()) : c.radius ? (c.radius *= b,
                    c.updateBoundingSphereRadius()) : !this.shapeWarned && (console.warn("Unable to stretch physics body: unsupported shape"),
                    this.shapeWarned = !0),
                    d = a.body.shapeOffsets[e],
                    d.scale(b, d);
                a.body.updateBoundingRadius()
            }
            
            AFRAME.components['super-hands'].Component.prototype.onHit = function (evt) {
                const hitEl = evt.detail[this.data.colliderEventProperty];
                let collidable = false;
                let hoverNeedsUpdate = 0;
                if (!hitEl) return;
                if (Array.isArray(hitEl)) {
                    for (let i = 0, sect; i < hitEl.length; i++) {
                        sect = evt.detail.intersections && evt.detail.intersections[i];
                        hoverNeedsUpdate += this.processHitEl(hitEl[i], sect);
                        if (hoverNeedsUpdate && hitEl[i].components && hitEl[i].components.collidable) {
                            hitEl[i].emit('collide-start',evt.detail)
                            collidable = true;
                        } 
                    }
                } else {
                    hoverNeedsUpdate += this.processHitEl(hitEl, null);
                    if (hoverNeedsUpdate && hitEl.components && hitEl.components.collidable) {
                        hitEl.emit('collide-start',evt.detail)
                        collidable = true;
                    }
                }
                if (hoverNeedsUpdate && ! collidable) this.hover();    
            }            
            AFRAME.components['super-hands'].Component.prototype.unHover = function (evt) {
                const clearedEls = evt.detail[this.data.colliderEndEventProperty];
                if (clearedEls) {
                    if (Array.isArray(clearedEls)) {
                        clearedEls.forEach(el => {
                            if (el.components && el.components.collidable){
                                el.emit('collide-end',evt.detail)    
                            } else {
                                this._unHover(el)    
                            }   
                        });
                    } else {
                        if (clearedEls.components && clearedEls.components.collidable){
                            clearedEls.emit('collide-end',evt.detail)    
                        } else {    
                            this._unHover(clearedEls);
                        }
                    }
                }
            }
        }
        
        //Alow ammo only
        AFRAME.systems.physics.prototype.init = async function() {
            var data = this.data;
            // If true, show wireframes around physics bodies.
            this.debug = data.debug;
            this.callbacks = {beforeStep: [], step: [], afterStep: []};
            this.listeners = {};
            this.driver = new AmmoDriver();
            await this.driver.init({
                gravity: data.gravity,
                debugDrawMode: data.debugDrawMode,
                solverIterations: data.iterations,
                maxSubSteps: data.maxSubSteps,
                fixedTimeStep: data.fixedTimeStep
            });
            this.initialized = true;
            if (this.debug) this.setDebug(true);
        }
        
        // mindAR integration
        if (AFRAME.systems['mindar-image-system']) {
            AFRAME.systems['mindar-image-system'].prototype._startVideo = function() {}
        }
        
        // AR.js location only integration
        if (AFRAME.components["arjs-webcam-texture"]) {
            AFRAME.components['arjs-webcam-texture'].Component.prototype.init = function() {
                /*
                this.scene = this.el.sceneEl
                this.texCamera = new I.OrthographicCamera(-.5, .5, .5, -.5, 0, 10)
                this.texScene = new I.Scene
                this.scene.renderer.autoClear = !1
                //this.video = document.createElement("video")
                //this.video.setAttribute("autoplay", !0)
                //this.video.setAttribute("playsinline", !0)
                //this.video.setAttribute("display", "none")
                document.body.appendChild(this.video)
                this.geom = new I.PlaneBufferGeometry
                this.texture = new I.VideoTexture(this.video)
                this.material = new I.MeshBasicMaterial({
                    map: this.texture
                });
                const A = new I.Mesh(this.geom, this.material);
                this.texScene.add(A)
                */
            }
            AFRAME.components['arjs-webcam-texture'].Component.prototype.play = function() {}
            AFRAME.components['arjs-webcam-texture'].Component.prototype.pause = function() {}  
        }
        if (AFRAME.components["gps-new-camera"]) {
            AFRAME.components["gps-new-camera" ].Component.prototype['_setupSafariOrientationPermissions'] = function() {}
            AFRAME.components["gps-new-camera" ].Component.prototype.play = function () {
                if (this.data.simulateLatitude === 0 && this.data.simulateLongitude === 0) {
                    if (this.threeLoc._watchPositionId === null) {
                        this.threeLoc._watchPositionId = navigator.geolocation.watchPosition(
                            (e) => {
                                this.threeLoc._gpsReceived(e);
                                if ( $('#latgps').length ) $('#latgps').text(e.coords.latitude.toFixed(7));
                                if ( $('#longps').length ) $('#longps').text(e.coords.longitude.toFixed(7));

                                let col = 'red'
                                let html=''; 
                                if (e.coords.accuracy < 5) {
                                    html+='GPS com alta precisão ('
                                    col = '#00ff00'
                                } else {
                                    html+='GPS com baixa precisão ('
                                }
                                $('#gpsmsg').text(html+ e.coords.accuracy.toFixed(0)+' m)')  
                                $('#gpsmsg').append('<span></span>')
                                $('#arloc span').css('background-color',col) 
                            },
                            (error) => {
                                if (this.threeLoc._eventHandlers["gpserror"]) {
                                    this.threeLoc._eventHandlers["gpserror"](error.code);
                                } else {
                                    alert(`GPS error: code ${error.code}`);
                                }
                            },{
                                enableHighAccuracy: true,
                                maximumAge: 0,
                            }
                        );
                        return true;
                    }
                    return false;
                }
            }
        }
    },
    
    //UTILs  
    colorToRGB: function(string){
        let c = new THREE.Color(string) 
        return 'rgb('+c.r*255+','+c.g*255+','+c.b*255+')'
    },
    replaceColorBase64: function(svg,from,to){
        let c = svg.replace("data:image/svg+xml;base64,","");
        c = window.atob(c);
        c = c.replace(/#eeeeec/g, "#"+new THREE.Color(to).getHexString());
        c = window.btoa(c);
        c = "data:image/svg+xml;base64,"+c
        return c
    },
    sortString: function(text){
        return text.split('').sort().join('');
    },
    drawRound: function(w,h,r){
        var roundedRectShape = new THREE.Shape();
        function roundedRect( ctx, x, y, w,h,r ) {
            ctx.moveTo( x, y + r );
            ctx.lineTo( x, y + h - r );
            ctx.quadraticCurveTo( x, y + h, x + r, y + h );
            ctx.lineTo( x + w - r, y + h );
            ctx.quadraticCurveTo( x + w, y + h, x + w, y + h - r );
            ctx.lineTo( x + w, y + r );
            ctx.quadraticCurveTo( x + w, y, x + w - r, y );
            ctx.lineTo( x + r, y );
            ctx.quadraticCurveTo( x, y, x, y + r );
        }
        roundedRect( roundedRectShape, -w/2, -h/2, w, h, r);
        return new THREE.ShapeBufferGeometry( roundedRectShape );
    },
    maxIfGreater: function(max,val){
        if (val > (max || 0)) return val;
        return max
    },
    maxIfBelow: function(max,val,ceil){
        if (val > (max || 0) && val < ceil) return val;
        return max
    },
    round: function (value, precision) {
        var multiplier = Math.pow(10, precision || 0);
        return Math.floor(value * multiplier) / multiplier;
    },
    smoothingString: function(arr,size,input){
        let count = 0;
        if (arr.length == size) var theRemovedElement = arr.shift(); 
        arr.push(input);
        arr.forEach(element => {
            if (element === input) count += 1;
        });
        if (count == size) return input;
        return 'none';
    },
    smoothing: function(arr,size,input){
        var sum = 0;
        if (arr.length == size) var theRemovedElement = arr.shift();
        arr.push(input);
        for( var i = 0; i < size; i++ ){
            //sum += parseInt( arr[i], 10 ); //don't forget to add the base
            sum += arr[i];
        }
        if (arr.length < size) size = arr.length
        return sum/arr.length;
    },
    radDeg: function (radians) {
        var pi = Math.PI;
        return radians * (180/pi);
    },
    arrRange: function(str){
        // transform range over time 1..2,3,4 in array [[1,2],[3],[4],[]]
        let parts = str.split(",");
        if (parts.length > 1) {
            for (i=0;i<parts.length;i++){
                parts[i] = o.parseRange(parts[i])    
            }
            return parts
        } 
        return [o.parseRange(str)]
    },
    colorRange: function(str){
        // transform color range over time blue..red,#fff...green,yellow in array
        if (str.includes('rgb') || str.includes('hsl')) {
            console.warn('use hex or names for colors')
            return undefined
        }
        let parts = str.split(",");
        if (parts.length > 1) {
            for (i=0;i<parts.length;i++){
                if (parts[i] == 'random') {
                    parts[i] = ['random']
                    continue
                } else if (parts[i] == 'none') {
                    parts[i] = ['none']
                    continue
                }
                let el = o.parseRange(parts[i])
                for (j=0;j<el.length;j++){
                    el[j] = new THREE.Color(el[j].trim())
                }
                parts[i] = el;
            }
            return parts 
        }
        return [o.parseRange(str).map(b => { 
            if (b == 'random'){ 
                return b 
            } else if (b == 'none') {
                return new THREE.Color()
            } else {
                return new THREE.Color(b.trim())
            }
        })]
    },
    parseRange: function(str){
        // transform float 1 in array [[1,1]]
        // transform range 1..0 in array [[1,0]]
        // transform range 1 0 0..2 0 0 in array [[1,0,0,2,0,0]]
        let parts = str.split("..").map(a => a.trim().split(" ").map(b => {
            const num = Number(b)
            return isNaN(num) ? b : num
        }))
        if (parts.length === 1) parts[1] = parts[0] // if there is no second part then copy
        return parts.flat(Infinity)
    },
    mapArr: function(act,from,to,arr1,arr2) {
        let arr = []
        for (let i=0; i<3; i++) {
            arr.push (o.map(act,from,to,arr1[i],arr2[i]))    
        }
        return arr
    },
    randomArr: function(arr){
        // descending order and get random array between
        let res = []
        if (arr.length == 2) {
            let n = o.randomNum(arr[0],arr[1])
            res = [n,n,n]    
        } else {
            for (i=0;i<arr.length/2;i++){
                res.push(o.randomNum(arr[i],arr[i+3]))
            }
        }
        return res
    },
    randomNum: function(num1, num2) {
        // descending order and get random between
        if (num1 == num2) return num1
        return THREE.MathUtils.randFloat(Math.min(num1, num2),Math.max(num1, num2))
    },
    maxFromArray: function(arr) {
        let res = []
        for (let i = 0; i<arr.length; i++) {
            if (arr[i].length ==2) {
                let max = Math.max(arr[i][0], arr[i][1], res[0] || 0);
                let min = Math.min(arr[i][0], arr[i][1], res[0] || 0);
                let chk = Math.max(Math.abs(max),Math.abs(min));
                (Math.abs(max) == chk) ? res[0] = max : res[0] = min
            } else {
                for (let j = 0; j< 3; j ++) {
                    let max = Math.max(arr[i][j],arr[i][j+3],res[j] || 0);
                    let min = Math.min(arr[i][j],arr[i][j+3],res[j] || 0);
                    let chk = Math.max(Math.abs(max),Math.abs(min));
                    (Math.abs(max) == chk) ? res[j] = max : res[j] = min
                }
            }
        }
        return res
    },
    normalFromTangent: (function () {
        var zAxis = new THREE.Vector3(0, 0, 1);
	    var tempQuaternion = new THREE.Quaternion();
        var lineEnd = new THREE.Vector3(0, 1, 0);
        return function (tangent) {
            tempQuaternion.setFromUnitVectors(zAxis, tangent);
            lineEnd.applyQuaternion(tempQuaternion);
            return lineEnd;    
        }
    })(),
    getWorldPos: function (el){
        var worldPos = new THREE.Vector3(); 
        worldPos.setFromMatrixPosition(el.object3D.matrixWorld);
        return worldPos
    },
    addHelper: function(el){
        //var helper = new THREE.BoxHelper(el.getObject3D('mesh'));
        //el.object3D.add(helper);
        let axes = new THREE.AxesHelper(0.2);
        el.setObject3D("axes-helper",axes);
    },
    map: function(value, fromStart,  fromEnd, toStart, toEnd){
        const fromDiff = Math.max(fromEnd - fromStart);
        const toDiff = Math.max(toEnd - toStart);
        const scale = toDiff / (fromDiff || 1);
        return (value - fromStart) * scale + toStart || 0;
    },
    clamp: function(num, min, max){
        return Math.min(Math.max(num, min), max);
    },
    randFloatOne: function(){
        let rand = Math.random();
        if (Math.random()<0.5) rand = -Math.abs(rand);
        return rand;
    },
    randInt: function(max){
        return Math.floor(Math.random() * max) + 1
    },
    lerp: function(start, end, amt){
        return (1-amt)*start+amt*end
    },
    between: function(val,a, b) {
        if (val == a || val == b) return false
        let bol = false
        let sig = Math.max(a,b)
        let max = Math.max(a,val)
        let min = Math.min(b,val)
        if (sig == a){
            if (min != val && max != val) bol = true
        } else {
            if (min == val && max == val) bol = true
        }
        return bol            
    },
    getOccurrence: function(array, value) {
        var count = 0;
        array.forEach((v) => (v === value && count++));
        return count;
    },
    getPointInBetweenByPerc: function(pointA, pointB, percentage) {
        var dir = pointB.clone().sub(pointA);
        var len = dir.length();
        dir = dir.normalize().multiplyScalar(len*percentage);
        return pointA.clone().add(dir);

    },
    openFullscreen: function() {
        var elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) { // Firefox 
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) { // Chrome, Safari and Opera 
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { // IE/Edge
            elem.msRequestFullscreen();
        } else if (elem.webkitEnterFullscreen){
            elem.webkitEnterFullscreen();
        }
    },
    closeFullscreen: function() {
        // screen.orientation.unlock().then( 
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox 
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera 
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge 
            document.msExitFullscreen();
        } else if (elem.webkitExitFullscreen){
            elem.webkitExitFullscreen();
        }
    },
    tryKeepScreenAlive: function(minutes) {
        if (!navigator.wakeLock || dev) return;
        navigator.wakeLock.request("screen").then(lock => {
            setTimeout(() => lock.release(), minutes * 60 * 1000);
        });
    },
    svgImg: function(symbol){
        let img = document.createElement("a-image")
        img.setAttribute('src',this[symbol])
        return img
    },
    toKinematic: function(el){
        if (el.getAttribute('ammo-body') && el.getAttribute('ammo-body').type == 'dynamic'){
            el.addState('wasDynamic')
            el.setAttribute('ammo-body','type','kinematic') 
            el.setAttribute('ammo-body','type','dynamic') 
            el.setAttribute('ammo-body','type','kinematic') 
        }
    },
    toDynamic: function(el){
        if (el.getAttribute('ammo-body') && el.is('wasDynamic')){
            el.removeState('wasDynamic') 
            el.setAttribute('ammo-body','type','dynamic') 
        }
    },
    sceneLoaded: function(func){
      if (this.sceneEl.hasLoaded){
          func()
      } else {
        this.sceneEl.addEventListener('loaded', function () {
            func()
        },{once:true});
      }
    },
    checkPause: function(self){
        if (o.status != 3 && !self.el.hasAttribute("nonstop") && self.data.active) {
            if (self.data.active) self.wasActive = true;
            self.data.active = false;
        } else if (o.status == 3 && self.wasActive){
            self.wasActive = false;
            self.data.active = true;
        }
    },
    crypto: function() {
        THREE.FileLoader.prototype.load = function (url, onLoad, onProgress, onError ) {
            if ( url === undefined ) url = '';
            if ( this.path !== undefined ) url = this.path + url;
            url = this.manager.resolveURL( url );
            const scope = this;
            const cached = o.Cache.get( url );
            if ( cached !== undefined ) {
                scope.manager.itemStart( url );
                setTimeout( function () {
                    if (dev) console.log('cached',url)
                    if ( onLoad ) onLoad( oorbitLoader(url,cached) );
                    scope.manager.itemEnd( url );
                }, 0 );
                return cached;
            }
            // Check if request is duplicate
            if ( o.Cache.loading[ url ] !== undefined ) {
                o.Cache.loading[ url ] = [];
                o.Cache.loading[ url ].push( {
                    onLoad: onLoad,
                    onProgress: onProgress,
                    onError: onError
                } );
                return;
            }
            // Check for data: URI
            const dataUriRegex = /^data:(.*?)(;base64)?,(.*)$/;
            const dataUriRegexResult = url.match( dataUriRegex );
            let request;
            // Safari can not handle Data URIs through XMLHttpRequest so process manually
            if ( dataUriRegexResult ) {
                const mimeType = dataUriRegexResult[ 1 ];
                const isBase64 = !! dataUriRegexResult[ 2 ];
                let data = dataUriRegexResult[ 3 ];
                data = decodeURIComponent( data );
                if ( isBase64 ) data = atob( data );
                try {
                    let response;
                    const responseType = ( this.responseType || '' ).toLowerCase();
                    switch ( responseType ) {
                        case 'arraybuffer':
                        case 'blob':
                            const view = new Uint8Array( data.length );
                            for ( let i = 0; i < data.length; i ++ ) {view[ i ] = data.charCodeAt( i );}
                            ( responseType === 'blob' )?response = new Blob( [ view.buffer ], { type: mimeType } ):response = view.buffer;
                            break;
                        case 'document':
                            const parser = new DOMParser();
                            response = parser.parseFromString( data, mimeType );
                            break;
                        case 'json':
                            response = JSON.parse( data );
                            break;
                        default: // 'text' or other
                            response = data;
                            break;
                    }
                    // Wait for next browser tick like standard XMLHttpRequest event dispatching does
                    setTimeout( function () {
                        if ( onLoad ) onLoad( response );
                        scope.manager.itemEnd( url );
                    }, 0 );
                } catch ( error ) {
                    // Wait for next browser tick like standard XMLHttpRequest event dispatching does
                    setTimeout( function () {
                        if ( onError ) onError( error );
                        scope.manager.itemError( url );
                        scope.manager.itemEnd( url );
                    }, 0 );
                }
            } 
            else {
                // Initialise array for duplicate requests
                o.Cache.loading[ url ] = [];
                o.Cache.loading[ url ].push( {
                    onLoad: onLoad,
                    onProgress: onProgress,
                    onError: onError
                } );
                request = new XMLHttpRequest();
                request.open( 'GET', url, true );
                request.addEventListener( 'load',function ( event) {
                    let response = request.response;
                    
                    if (dev) console.log('first',url)

                    const callbacks = o.Cache.loading[ url ];
                    delete o.Cache.loading[ url ];
                    
                    if ( this.status === 200 || this.status === 0 ) {
                        if ( this.status === 0 ) console.warn( 'THREE.FileLoader: HTTP Status 0 received.' );
                        
                        o.Cache.add( url, response );
                        
                        for ( let i = 0, il = callbacks.length; i < il; i ++ ) {
                            const callback = callbacks[ i ];
                            if (callback.onLoad) callback.onLoad( oorbitLoader(url,response) );
                        }
                        scope.manager.itemEnd( url );
                    } 
                    else {                       
                        for ( let i = 0, il = callbacks.length; i < il; i ++ ) {
                            const callback = callbacks[ i ];
                            if ( callback.onError ) callback.onError( event );
                        }
                        scope.manager.itemError( url );
                        scope.manager.itemEnd( url );
                    }
                }, false );
                request.addEventListener( 'loadend',function ( event ) {
                    //console.log(3)    
                }, false );
                request.addEventListener( 'progress', function ( event ) {
                    const callbacks = o.Cache.loading[ url ];
                    for ( let i = 0, il = callbacks.length; i < il; i ++ ) {
                        const callback = callbacks[ i ];
                        if ( callback.onProgress ) callback.onProgress( event );
                    }
                },false);
                request.addEventListener( 'error', function ( event ) {
                    const callbacks = o.Cache.loading[ url ];
                    delete o.Cache.loading[ url ];
                    for ( let i = 0, il = callbacks.length; i < il; i ++ ) {
                        const callback = callbacks[ i ];
                        if ( callback.onError ) callback.onError( event );
                    }
                    scope.manager.itemError( url );
                    scope.manager.itemEnd( url );
                }, false );
                request.addEventListener( 'abort', function ( event ) {
                    const callbacks = o.Cache.loading[ url ];
                    delete o.Cache.loading[ url ];
                    for ( let i = 0, il = callbacks.length; i < il; i ++ ) {
                        const callback = callbacks[ i ];
                        if ( callback.onError ) callback.onError( event );
                    }
                    scope.manager.itemError( url );
                    scope.manager.itemEnd( url );
                }, false );
                if ( this.responseType !== undefined ) request.responseType = this.responseType;
                if ( this.withCredentials !== undefined ) request.withCredentials = this.withCredentials;
                if ( request.overrideMimeType ) request.overrideMimeType( this.mimeType !== undefined ? this.mimeType : 'text/plain' );
                for ( const header in this.requestHeader ) {
                    request.setRequestHeader( header, this.requestHeader[ header ] );
                }
                request.send( null );
            }
            scope.manager.itemStart( url );
            return request;
        }
        const oorbitLoader = function(a,b){ //url,response  
            if (a.includes("teclado") || a.includes(".glb") || a.includes(".gltf") || a.includes("oculus") || a.includes('draco') || a.includes('.bin') || a=='' || !a || !(b instanceof ArrayBuffer)) return b

            const view = copy(new Uint8Array(b)); 
            let dataString = THREE.LoaderUtils.decodeText(view);
            let max = dataString.indexOf("buffers"); //materials
            let min = dataString.indexOf("asset");
            let validString = dataString.substr(min,max);
            validString = reg(validString)
            view.set(enc.encode(validString), min);
            return view.buffer
        }
        const copy = function(src)  {
            var dst = new Uint8Array(src.byteLength);
            dst.set(new Uint8Array(src));
            return dst;
        }
        const reg = function(str) {
            str = str.replace(new RegExp('\x62\x6c\x6f\x62\x73', 'g'),'\x6e\x6f\x64\x65\x73');
            str = str.replace(new RegExp('\x74\x72\x61\x73\x6e\x6c', 'g'),'\x74\x72\x61\x6e\x73\x6c'); 
            return str
        }
        const enc = new TextEncoder("utf-8");
    }, // ok
    copyToClipboard: function(str,suc,err) {
        navigator.clipboard
        .writeText(str)
        .then(()=>{
            if (suc) suc()
        })
        .catch(()=>{
            if (err) err()
        });
    }
});     