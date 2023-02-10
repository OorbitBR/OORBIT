//Os Termos de Uso da Oorbit se aplicam na utilização deste programa. Acesso o termo em https://drive.google.com/file/d/1-7H0-xvh_AJkA2nK2jKVuQgbnv93JUew/view 

AFRAME.registerSystem('oorbit', {
    schema: {
        hasCursor: {type: "boolean",default: true}, //ok
        has3DMenu: {type: "boolean",default: true}, // if 3d menu will be used or not
        hasARMenu: {type: "boolean",default: false}, // if AR menu will be used or not
        has2DMenu: {type: "boolean",default: true}, // if 2d menu will be used or not
        hasIntro: {type: "boolean",default: false}, // if intro will be used or not
        hasLogos: {type: "boolean",default: false}, // if logos will be used or not
        cursorColor: {type: "color",default: "white"}, //ok
        loadingColor: {type: "color",default: "green"}, //ok
        menuColor: {type: "color",default: "#2EF9FF"}, // "#2EF9FF" , "#90EE90", "#FFCBDB"
        textColor: {type: "color",default: "black"},
        buttonColor: {type: "color",default: "#493889"},
        buttonDetailColor: {type: "color",default: "white"},
        questionBackColor: {type: "color",default: "#493889"},
        questionTextColor: {type: "color",default: "white"},

        targetClass: {type: "string",default: "mclickable",oneOf: ["any", "mclickable", "aclickable", "qclickable"]}, //ok
        targets: {type: "array",default: ['[hoverable]', '[grabbable]', '[clickable]', '[stretchable]', '[draggable]', '[droppable]', '[pinchable]', '[collidable]', '[selectable]', '[turnable]']}, //ok
        hoverTime: {type: "int",default: 4000}, //ok
        showRay: {type: "boolean",default: true}, //ok
        hasZoom: {type: "boolean",default: true}, // if show zoom btns
        hasPhysx: {type: "boolean",default: true}, // if show zoom btns
        cursorZoom: {type: "boolean",default: false}, // if zoom at cursor
        cursorFly: {type: "boolean",default: false}, // if cursor height affects camera height
        turnAxis: {type: "string",default: 'z',oneOf: ["x", "y", "z"]}, //ok,

        precision: {
            type: "int",
            default: 3
        }, // decimal places of models.  

        lightType: {type: 'string',default: 'realistic',oneOf: ["realistic", "default", "none", 'corner']},
    },
    init: function () {
        // Variables
        o = this; // this system
        this.version = '1.4.3';
        this.icons = []; // icons needed to change mode
        this.stream; // this media stream (mic and webcam)        
        this.media = []; // main media elements
        this.questions = []; // local copy of questions
        this.dur = []; // user actions durations
        this.results = [0, 0]; // questions results
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
        this.zoom = [1, 0]; // zoom level and fov
        this.multi; // if this is a group room
        this.econtrol = document.createElement('a-entity');
        this.ARsystem = [];
        this.ARvideo = document.createElement('video');
        this.ARwires = {all: []} // created wires
        this.ARmarks = [];
        this.ARparts = {};
        this.ARcameras = [];
        this.usedPins = []; // wired pins
        this.audioCtx;// auxiliary sounds
        this.triggers = [] // created triggers
        this.geo = [];
        this.isGrabbing = []; // array elements being grabbed
        this.isStretching = [];

        // Msg Variables
        this.iframe = {
            owner: "",
            source: "",
            origin: "",
            firstMsg: false,
            newMsg: false
        };

        // Definitors
        this.mode = !mode ? "g10" : mode; //g10
        this.status = 0; // 0 - loading, 1 - ready, 2 - intro, 3 - play, 4 - pause, 5 - replay, 6 - mute, 7 - questions, 8 - user action, 9 - exit
        this.permissions = {
            gyro: false,
            vr: false,
            ar: false,

            mic: false,
            vid: false,
            micmute: false,
            vidmute: false,

            gps: false,
            //no icons
            fix: false,
            msg: false,
            mute: false,
            sios: false
        };
        
        this.colLayers = {
            any: 1,
            mclickable: 2,
            qclickable: 3,
            aclickable: 4 
        } 

        // Defaults
        this.sceneEl.setAttribute('vr-mode-ui', 'enabled', false)
        this.sceneEl.setAttribute('loading-screen', 'enabled', false)
        this.sceneEl.setAttribute('device-orientation-permission-ui', 'enabled', false)
        this.sceneEl.setAttribute('keyboard-shortcuts', 'enterVR', false)
        if (dev) this.sceneEl.setAttribute('stats', "")

        // Corrections
        this.corrections()
        
        //load physics
        if (this.data.hasPhysx) this.setupPhysx()
        
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
            add: function (key, file) {
                if (this.enabled === false) return;
                this.files[key] = file;
            },
            get: function (key) {
                if (this.enabled === false) return;
                return this.files[key];
            },
            remove: function (key) {
                delete this.files[key];
            },
            clear: function () {
                this.files = {};
                this.loading = {};
            }
        };
        this.crypto();
        this.loader(assets);
        this.loadsvgs();
        this.mod = {};
        this.loading = {};
        o.pathfinder = new threePathfinding.Pathfinding();
        $('<a-entity id="wires"></a-entity>').insertBefore("#cameraRig")

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
            o.camera.setAttribute('look-controls', {
                touchEnabled: false,
                mouseEnabled: false
            })
            o.navigation()

            // Remove movimentação da camera se for modo fixo
            if (o.permissions.fix) o.camera.setAttribute('look-controls', 'enabled', false)

            // Load Questions
            if (questions != null) Object.assign(o.questions, questions);

            // SetupEnviroment
            o.setupEnvironment();

            // SetupOnline
            if (o.multi) o.setupOnline()

            // Assign Timeline
            if (timeline != null) Object.assign(o.timeline, timeline);

            // Return Point
            o.registerIniState();

            // initial raycaster
            //o.checkController();

            // Pause on leave
            document.addEventListener('visibilitychange', function () {
                if (!o.menu3DIsOpenOpen && o.status == 3) {
                    $('#playmsg').show();
                    o.sessionHandler("pause");
                }
                o.lostFocus = (document.visibilityState === 'hidden')
            })

            document.addEventListener("keydown", (e) => {
                if (e.key == "m") { // m key
                    o.pauseSession();
                    o.toggleMenu(o.status <= 2)
                } else if (e.key == "n") {
                    if (!o.sceneEl.components["stats"]) return
                    if ($(".rs-base").hasClass("a-hidden")) {
                        $(".rs-base").removeClass("a-hidden")
                    } else {
                        $(".rs-base").addClass("a-hidden")
                    }
                } else if (e.key == "r") {
                    console.log('pinchstarted')
                    o.rhand.components.ccontrol.grabAnchor.emit('fist')   
                    o.lhand.emit('fist') 
                } else if (e.key == "b") {
                    //o.fadeTo("#000",'10 0 10',function(){console.log('teste')})
                } else if (e.key == "Escape") {
                    if (o.sceneEl.is("vr-mode")) o.changeMode('2d-mode')
                }
            });

            window.addEventListener("wheel", event => {
                let sign = -Math.sign(event.wheelDelta)
                // turn opened
                if ($("#turn-btn").css('display') =='flex') {
                   o.setTurn(sign) 
                }
                // is grabbing something
                else if (o.isGrabbing.length > 0) {
                    for(i=0;i<o.isGrabbing.length;i++){
                        let grab = o.isGrabbing[i].components.grabbable;
                        
                        // not the best approach TODO: change to actual distance
                        if (!grab.data.grabZoom) continue
                        grab.grabDistance -= sign/10
                    }
                }
                // is stretchable
                else if (o.isStretching.length > 0) {
                    o.isStretching[0].object3D.scale.addScalar(sign/10)
                }
                else {
                    o.setZoom(sign, event.clientX, event.clientY)    
                }
            })

            if (hide && o.status != 0) $('#mode2D').click()
        })
        this.sceneEl.addEventListener('timeout', function () {
            errorHandler('slow')
        })

        this.sceneEl.addEventListener('stateremoved', function (evt) {
            if (evt.detail === 'vr-mode' || evt.detail === 'ar-mode') {
                //o.changeMode('2d-mode')    
            }
            if (evt.detail === 'grabbed' || evt.detail === 'dragged') {
                
                var index = o.isGrabbing.indexOf(evt.target);
                if (index !== -1) o.isGrabbing.splice(index, 1);
                
                if (o.sceneEl.is('2d-mode') && !o.permissions.fix) o.camera.setAttribute('look-controls', 'enabled', true)
            }
            else if (evt.detail === 'clicked' && evt.target.components && evt.target.components.stretchable){
                o.isStretching = [];
            } 
        })
        this.sceneEl.addEventListener('stateadded', function (evt) {
            if (evt.detail === 'grabbed' || evt.detail === 'dragged') {
                o.isGrabbing.push(evt.target);
                if (o.sceneEl.is('2d-mode') && !AFRAME.utils.device.isMobile()) o.camera.setAttribute('look-controls', 'enabled', false)
            }
            else if (evt.detail === 'clicked' && evt.target.components && evt.target.components.stretchable){
                o.isStretching.push(evt.target);
            } 
        })
        
        this.sceneEl.addEventListener('contactbegin', function(e){
            //console.log('start',e)
        })
        this.sceneEl.addEventListener('contactend', function(e){
            //console.log('end',e)
        })

        this.sceneEl.addEventListener("ended", function () {
            console.log('ended')
            o.sessionHandler(7)
        }, {once: true})

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

                    o.timeout1 = setTimeout(() => {
                        //o.ARsystem[1].unpause()   

                        o.getARMedia()

                    }, 1000);
                }
            } else if (o.ARsystem[0] == 1) {
                o.arResize()
            }
            o.arResize()
        }
    }, //ok
    tock: (function () {
        let position = new THREE.Vector3()
        return function (time, timeDelta, camera) {
            
            //lag correction
            if (timeDelta > 30) {
                //console.warn('low fps',timeDelta)
                this.delay += (timeDelta - 30);
                timeDelta = 30;
            }
            
            // pre correction
            if (o.timeline.pre != null && this.status != 5) {
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

            if (this.run != 0 && this.timeline.play != null) {
                this.timeline.play();
                delete this.timeline.play;
            }

            // runtime execution
            //let ti = (this.run/1000).toFixed(1)
            let ti = o.round(this.run / 1000, 1).toFixed(1)
            //if (dev && this.last != ti) console.log(ti, timeDelta)
            if (this.timeline[ti] != null) {
                if (this.last != ti) {
                    this.last = ti
                    if (!this.timeline[ti]()) delete this.timeline[ti];
                }
            }

            if ((document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) && $('#fsc').text() != 'fullscreen_exit') {
                $('#fsc').text('fullscreen_exit');
            } else if (!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) && $('#fsc').text() != 'fullscreen') {
                $('#fsc').text('fullscreen');
            }

            // correc menu position to camera height
            if (this.menuSphere) {
                this.menuSphere.object3D.position.copy(o.camera.object3D.position)
                if (this.fixMenu) this.menuSphere.object3D.rotation.copy( o.camera.object3D.rotation)
            }

            // 6DOF headset start height correction
            if (!this.dof6height) {
                let y = o.camera.object3D.position.y;
                if (this.status < 3 && y != 1.6 && y != 0) {
                    this.cameraRig.object3D.position.y += (1.6 - y);
                    this.dof6height = true
                }
            }

            // ios camera correction
            if (AFRAME.utils.device.isIOS() && o.camera.object3D.position.y != 1.6) o.camera.object3D.position.y = 1.6;

            // store interaction duration
            if (o.status == 7 || o.status == 8) o.dur[o.dur.length - 1] += timeDelta / 1000;
        }
    })(), //ok

    //Overlay
    checkMode: function (m) {
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
            $('#buttons').css('opacity', 0)
            $('#buttons').css('z-index', -10)
        }
        if ($('#warnings').length) AFRAME.utils.device.isMobile() ? $('#warnings p').last().show() : $('#warnings p').last().hide();

        if (geo) arr.push("gps")

        if (a == 'f') this.permissions.fix = true;
        if (b == 0) {
            $('#mode2D').html("Iniciar")
            if (a == "g" || a == "r" || a == "w" || a == "c") {
                arr.push("gyro")
                this.setIcons(arr, "Para efeito 360 os círculos abaixo precisam estar verdes.")
            }
            if (geo) this.setIcons(arr, "Para iniciar os círculos abaixo precisam estar verdes.")
        } else if (b == 6) {
            $('#multi').css('display', "flex")
            this.multi = true;
            if (master) {
                c = 0;
            } else if (userType == 'spectator') {
                c = 1;
            } else {
                c = 2;
            }
            switch (c) {
                case 0:
                    arr.push("mic", "vid")
                    this.setIcons(arr, "Você é o líder do grupo,para usar áudio e vídeo os ícones abaixo precisam estar verdes.")
                    break
                case 1:
                    arr.push("mic", "vid")
                    this.setIcons(arr, "Você é espectador do grupo,para usar áudio e vídeo os ícones abaixo precisam estar verdes.")
                    break
                default:
                    arr.push("vr", "gyro", "mic")
                    this.setIcons(arr, "Para realidade virtual em grupo os círculos abaixo precisam estar verdes.")
            }
        } else if (b == 7) {
            $('#multi').css('display', "flex")
            this.multi = true;
            if (master) {
                c = 0;
            } else if (userType == 'spectator') {
                c = 1;
            } else {
                c = 2;
            }
            switch (c) {
                case 0:
                    arr.push("mic")
                    this.setIcons(arr, "Você é o líder do grupo,para usar áudio o ícone abaixo precisa estar verde.")
                    break
                case 1:
                    arr.push("mic")
                    this.setIcons(arr, "Você é espectador do grupo,para usar áudio o ícone abaixo precisa estar verde.")
                    break
                default:
                    arr.push("vr", "gyro", "mic")
                    this.setIcons(arr, "Para realidade virtual em grupo os círculos abaixo precisam estar verdes.")
            }
        } else if (b == 8) {
            if (c == 0 || c == 1 || c == 5 || c == 7) {
                arr.push("ar")
                this.setIcons(arr, "Para realidade aumentada o círculo abaixo precisa estar verde.")
            } else if (c == 2 || c == 6 || c == 8) {
                $('#multi').css('display', "flex")
                this.multi = true;
                arr.push("ar", "mic")
                this.setIcons(arr, "Para realidade aumentada em grupo os círculos abaixo precisam estar verdes.")
            } else if (c == 4) {
                $('#multi').css('display', "flex")
                this.multi = true;
                (geo) ? arr.push("ar", "gyro", "mic") : arr.push("ar", "gyro", "mic", "gps");
                this.setIcons(arr, "Para realidade aumentada com GPS em grupo os círculos abaixo precisam estar verdes.")
            } else if (c == 3) {
                (geo) ? arr.push("gyro", "ar") : arr.push("gyro", "ar", "gps");
                this.setIcons(arr, "Para realidade aumentada com GPS os círculos abaixo precisam estar verdes.")
            }
        } else if (bc == 10 || bc == 20 || bc == 30 || bc == 40 || bc == 50 || bc == 90) {
            arr.push("gyro", "vr")
            this.setIcons(arr, "Para realidade virtual os círculos abaixo precisam estar verdes.")
        }
    }, //ok
    toggleButtons: function (m) {
        if (m == "2D") {
            if ($('#mode2D').is(":hidden")) {
                $('#mode2D').css('display', "inline-block");
                $('#buttons').css('align-items', "center");
                this.buttonClick($('#mode2D'), "2d-mode")
            }
            return
        } else if (m == "VR") {
            if ($('#modeVR').is(":hidden")) {
                $('#modeVR').css('display', "inline-block");
                this.buttonClick($('#modeVR'), "vr-mode")
            }
        } else if (m == "AR") {
            if ($('#modeAR').is(":hidden")) {
                if (this.mode.charAt(2) == 0) this.sceneEl.setAttribute('vr-mode-ui', {
                    enabled: true,
                    enterARButton: '#modeAR'
                })
                $('#modeAR').css('display', "inline-block");
                $('#modeAR').removeClass('a-hidden');
                this.buttonClick($('#modeAR'), "ar-mode")
            }
        }
        this.buttonClick($('#buttonError'), "2d-mode")
        $('#mode2D').hide();
        $('#buttons').css('align-items', "baseline")
        if (mode.charAt(0) != 0) $('#buttonError').show();
    }, //ok
    setIcons: function (arr, msg) {
        if ($('#sub')[0] != null) $('#sub').css('display', 'flex');
        this.icons = arr;
        for (i = 0; i < arr.length; i++) {
            $('#' + arr[i]).css('background-color', "red");
            $('#' + arr[i]).css('display', 'flex');
            switch (arr[i]) {
                case "sios":
                    o.siosAllow()
                    $('#' + arr[i]).on("click", () => {
                        o.siosAllow(true)
                    });
                    break;
                case "gyro":
                    o.gyroAllow()
                    $('#' + arr[i]).on("click", () => {
                        o.gyroAllow()
                    });
                    break;
                case "vr":
                    o.vrAllow('vr')
                    $('#' + arr[i]).on("click", () => {
                        o.vrAllow('vr')
                    });
                    break;
                case "ar":
                    o.streamAllow("ar")
                    $('#' + arr[i]).on("click", (e) => {
                        o.streamAllow("ar", e)
                    });
                    break;
                case "mic":
                    (this.permissions[arr[i]]) ? o.toggleIcons(arr[i], true) : o.streamAllow("mic");
                    $('#' + arr[i]).on("click", (e) => {
                        o.streamAllow("mic", e)
                    });
                    break;
                case "vid":
                    (this.permissions[arr[i]]) ? o.toggleIcons(arr[i], true) : o.streamAllow("vid");
                    $('#' + arr[i]).on("click", (e) => {
                        o.streamAllow("vid", e)
                    });
                    break;
                case "gps":
                    //o.gpsAllow("gps")
                    $('#' + arr[i]).on("click", (e) => {
                        o.gpsAllow("gps", e)
                    });
                    break;
                default:
            }
        }
        if ($('#hint h4')[0] != null) $('#hint h4').html(msg)
    }, //ok
    toggleIcons: function (icon, bol) {
        if (!$('#' + icon)[0] || !$('#advice')[0]) return;
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
            $('#' + icon).html(code);
            $('#' + icon).css('background-color', 'forestgreen');
            if (!(icon == 'vid' || icon == "mic")) {
                $('#' + icon).off("click");
                $('#' + icon).on("click", () => {
                    $('#advice').html(msg)
                });
                this.permissions[icon] = true;
            } else if (this.permissions[icon + 'mute']) {
                if (typeof getLocalMedia === "function") getLocalMedia(icon)
            }
            $('#advice').html(msg)
        } else {
            $('#' + icon).css('background-color', "red");
            $('#advice').html(error)
            if (icon == 'vid' || icon == "mic") {
                $('#' + icon).html(code + "_off");
                if (!localStream) return
                let tracks = (icon == 'vid') ? localStream.getVideoTracks() : localStream.getAudioTracks();
                tracks.forEach(function (track) {
                    track.stop();
                });
            }
        }
        if (this.permissions.gyro && this.permissions.vr) this.toggleButtons("VR")
        if (this.permissions.ar) this.toggleButtons("AR")
    }, //ok
    gyroAllow: function () {
        window.addEventListener("devicemotion", function (event) {
            if (event.rotationRate.alpha || event.rotationRate.beta || event.rotationRate.gamma) {
                o.permissions.gyro = true;
            }
        });
        if (window.DeviceMotionEvent && typeof window.DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission().then(response => {
                if (response == 'granted') o.toggleIcons("gyro", true)
            }).catch(function (error) {
                o.toggleIcons("gyro")
            })
        } else {
            if (AFRAME.utils.device.isMobile()) {
                (!window.DeviceMotionEvent) ? o.toggleIcons("gyro") : o.toggleIcons("gyro", true);
            } else {
                if (this.permissions.vr || AFRAME.utils.device.checkHeadsetConnected()) {
                    o.vrAllow("gyro")
                } else {
                    o.toggleIcons("gyro");
                }
            }
        }
    },
    vrAllow: function (icon) {
        if ("xr" in window.navigator) {
            if (navigator.xr.isSessionSupported) {
                navigator.xr.isSessionSupported('immersive-vr').then(
                    function (supported) {
                        (AFRAME.utils.device.checkHeadsetConnected()) ? o.toggleIcons(icon, true) : o.toggleIcons(icon)
                    }).catch(
                        function (error) {
                            o.toggleIcons(icon)
                        }
                    );
            } else if (navigator.xr.supportsSession) {
                navigator.xr.supportsSession('immersive-vr').then(
                    function (supported) {
                        (AFRAME.utils.device.checkHeadsetConnected()) ? o.toggleIcons(icon, true) : o.toggleIcons(icon)
                    }).catch(
                        function (error) {
                            o.toggleIcons(icon)
                        }
                    );
            }
        } else {
            navigator.getVRDisplays().then(displays => (displays.length > 0) ? o.toggleIcons(icon, true) : o.toggleIcons(icon))
        }
    },
    siosAllow: function (bol) {
        if (!bol) return this.toggleIcons('sios')
        if (!this.permissions.mute) {
            this.toggleIcons('sios', true)
        } else {
            this.sessionHandler('mute')
            this.toggleIcons('sios', true)
            this.permissions.sios = true;
        }
    },
    streamAllow: function (icon, e) {
        if (this.permissions[icon] && icon != "ar") {
            o.toggleIcons(icon, this.permissions[icon + 'mute'])
            this.permissions[icon + 'mute'] = !this.permissions[icon + 'mute']
            return
        } else {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return o.toggleIcons(icon)
            o.checkDevicesPermission(icon)
        }
    }, // ok 
    checkDevicesPermission: async function (icon) {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        let bol;
        for (i = 0; i < mediaDevices.length; i++) {
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
                }, {
                    once: true
                });
            }
            return o.toggleIcons(icon)
        }
    }, // ok
    pauseload: function (msg) {
        $('#circle-loader').hide();
        $('#progress-bar p').hide();
        $('#ebar i').html('error_outline');
        $('#ebar i').removeClass("rotate90");
        $('#ebar i').css('color', 'yellow');
        $('#loading-msg').html(msg);
    },
    resumeload: function (msg) {
        $('#circle-loader').show();
        $('#progress-bar p').show();
        $('#ebar i').html('arrow_circle_up');
        $('#ebar i').addClass("rotate90");
        $('#ebar i').css('color', '#F6F5F9');
        $('#loading-msg').html(msg);
    },
    gpsAllow: function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function (supported) {
                    o.toggleIcons("gps", true)
                    $('#buttons').css('opacity', 1)
                    $('#buttons').css('z-index', 1)
                    o.geo.push(supported.coords.latitude)
                    o.geo.push(supported.coords.longitude)

                    o.sceneEl.emit('gpsReady')

                    if (o.geo.length == 0 || geo) o.geo.push(o.geolocate(supported))

                    if (o.ARsystem[0] == 1) {
                        o.camera.setAttribute('gps-new-camera', {
                            gpsMinDistance: 5,
                            positionMinAccuracy: 5e3,
                        })
                        /*o.camera.setAttribute('gps-camera',{
                            gpsMinDistance:5,
                            positionMinAccuracy:5e3,
                        })*/
                    }
                },
                function (error) {
                    console.log(3, error)
                    o.toggleIcons("gps")
                });
        } else {
            o.toggleIcons("gps")
        }
    },
    buttonClick(el, mode) {
        el[0].addEventListener("click", function (e) {
            if (AFRAME.utils.device.isIOS() && !o.permissions.sios) {
                e.target.style.color = "#F6F5F9";
                e.target.style.backgroundImage = "linear-gradient(to bottom , #493889, #7963ba, #493889)";
                e.target.removeEventListener("click", function () { })
                o.buttonClick([e.target], mode)
                return
            }
            if (o.status != 1) return
            if (o.multi) {
                $('#loader').empty();
                $('#av-pick').attr("mode", mode)
                $('#av-pick').css('display', 'flex');
                return
            }
            $('a-scene canvas').hide()

            $('#overlay').fadeOut("slow");
            setTimeout(() => {
                $('#overlay').hide();
            }, 500)

            o.changeMode(mode);
            if (!hide) {
                //o.openFullscreen()
                //screen.orientation.lock("landscape").then((v)=>{}, (m)=>{});
                o.startMedia();
            }
            o.tryKeepScreenAlive(10);
            o.sessionHandler(2)
        }, {
            once: true
        })
    },
    changeMode: function (mode) {
        if (this.status == 3) {
            this.pauseSession();
            $('#playmsg').show();
        }
        mode = mode.toLowerCase()
        $('#oo').hide()
        $('#zoom-btn').hide();
        $('ar').hide();
        $('#ar_slider').hide();
        $('#playmsg').css('top', '13px');

        //removing states
        if (o.sceneEl.is('2d-mode')) {
            o.sceneEl.removeState("2d-mode")
        } else if (o.sceneEl.is('ar-mode')) {
            o.unloadAR()
            o.sceneEl.removeState("ar-mode")
        } else if (o.sceneEl.is('vr-mode')) {
            this.screenMsg('Retire o seu óculos.')
            setTimeout(function () {
                o.fadeTo('#000')
                o.sceneEl.exitVR()
                o.sceneEl.removeState("vr-mode")
                o.deleteSphere()
                o.return2D()
                //if (o.data.hasARMenu && !o.data.hasIntro) $('ar').css('display','flex')
                o.logo2d(true)
                o.toggleZoom(true)
                o.setZoom(null, 0, 0)
                o.zoom[1] = o.camera.components.camera.camera.fov
            }, 5000)
            return
        }

        this.fadeTo('#000')

        //adding states
        if (mode == "2d-mode") {
            this.return2D()
            if (!this.data.hasIntro) o.showARMenu()
        } else if (mode == "ar-mode") {
            o.canvas.style.backgroundColor = "transparent";
            o.loadAR()

            // hide 2d menu
            if (o.menu2DIsOpen) o.overlayMenu();

            o.sceneEl.addState('ar-mode')

            this.toggleZoom(false)

            if (!this.data.hasIntro) o.showARMenu()
            o.showARSlider('AR', true)
        } else if (mode == "vr-mode") {
            o.sceneEl.enterVR()
            o.sceneEl.addState('vr-mode')
            if (!o.data.hasIntro) o.toggleMenu(o.status <= 2);
            if (o.menu2DIsOpen) o.overlayMenu();
            this.logo2d(false)
            this.toggleZoom(false)
        }

        o.checkController()
        this.setZoom(null, 0, 0)
        this.zoom[1] = o.camera.components.camera.camera.fov;
    },
    return2D: function () {
        if (this.permissions.gyro && this.permissions.vr) {
            $('#oo').text('VR')
            $('#oo').show()
            o.showARSlider('VR')
            $('#playmsg').css('top', '-8px');
        } else if (this.permissions.ar) {
            $('#oo').text('AR')
            $('#oo').show()
            o.showARSlider('AR')
            $('#playmsg').css('top', '-8px');
        }
        o.canvas.style.backgroundColor = o.data.menuColor; //'#D0D0D0'
        o.sceneEl.addState("2d-mode")
        if (this.menu3DIsOpen) o.toggleMenu(o.status <= 2);
        if (!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement)) $('#fsc').text('fullscreen');
        if (!this.menu2DIsOpen && !this.data.hasIntro) o.overlayMenu();

        //msg system
    },
    showARSlider: function (mode, bol) {
        if ($('#ar_slider')[0]) {
            $('#ar_slider p:last-child').text(mode);
            $('#ar_slider p')[0].className = "active";
            $('#ar_slider p')[1].className = "notactive";
            $('#ar_slider input')[0].checked = bol;
            $('#ar_slider').show()
        }
    },
    showARMenu: function () {
        if (o.data.hasARMenu) {
            $('ar').css('display', 'flex')
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

        var requestOptions = {
            method: 'GET'
        };
        fetch("https://api.geoapify.com/v1/geocode/reverse?lat=" + supported.coords.latitude + "&lon=" + supported.coords.longitude + "&apiKey=fe9622d69c60445ab53b8d97dd7c0423", requestOptions)
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
    overlayMenu: function () {
        if (!this.data.has2DMenu || this.data.hasARMenu) return
        if (!this.menu2DIsOpen) {
            $("#overlay-menu").css('display', "flex")
            $("#overlay-menu i").on('click', function (e) {
                if (!o.sceneEl.is("2d-mode")) return
                if (e.target.id == "oo") {
                    o.changeMode(e.target.innerHTML + "-mode")
                } else if (e.target.id == "fsc") {
                    if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
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
    toggleMenu: function (first) {
        if (!this.data.has3DMenu) return
        if (!this.menu3DIsOpen) {
            let s = this.initiateSphere()
            if (first) {
                s.appendChild(this.createText(modName, "center", 0.025, "infinity", this.data.textColor, "0 0.12 -0.4", "0 0 0"))
                s.appendChild(this.createButton(0.25, 0.05, 0.025, this.data.buttonColor, this.data.buttonDetailColor, "0 0.04 -0.4", "mclickable", "Iniciar", 0.025, () => {
                    this.sessionHandler('play')
                }));
                //s.appendChild( this.createButton(0.1,0.04,0.02,'red',this.data.buttonDetailColor,"0 -0.04 -0.4","mclickable","Sair",0.025,()=>{this.changeMode('2d-mode')}));
            } else {
                if (!this.end) {
                    s.appendChild(this.createButton(0.15, 0.03, 0.015, this.data.buttonColor, this.data.buttonDetailColor, "0 0.02 -0.4", "mclickable", "Continuar", 0.015, () => {
                        this.sessionHandler('play')
                    }));
                }
                s.appendChild(this.createButton(0.15, 0.03, 0.015, this.data.buttonColor, this.data.buttonDetailColor, "0 -0.02 -0.4", "mclickable", "Repetir", 0.015, () => {
                    this.sessionHandler('replay')
                }));
                s.appendChild(this.createButton(0.06, 0.03, 0.015, this.data.buttonColor, this.data.buttonDetailColor, "-0.045 -0.06 -0.4", "mclickable", "Sair", 0.015, () => {
                    this.sessionHandler('exit')
                }));
                s.appendChild(this.createButton(0.06, 0.03, 0.015, this.data.buttonColor, this.data.buttonDetailColor, "0.045 -0.06 -0.4", "mclickable", "2D", 0.015, () => {
                    this.changeMode('2d-mode')
                }));
            }
            o.cameraRig.appendChild(s)
            //o.sceneEl.appendChild(s)
        } else {
            this.deleteSphere();
        }
        this.menu3DIsOpen = !this.menu3DIsOpen;
        this.changeTargetClass();
    },
    initiateSphere: function (op = 1) {
        if (this.menuSphere) {
            this.menuSphere.parentNode.removeChild(this.menuSphere);
            this.menuSphere = null;
        }
        let s = document.createElement('a-sphere');
        o.setAttributes(s,{
            'segments-height':9,
            'segments-width':18,
            radius:1,
            rotation:  "0 " + o.camera.getAttribute("rotation").y + " 0",
            hoverable: "",
            shader: 'flat',
        });
        s.setAttribute('material', {
            color: this.data.menuColor,
            side: "double",
            transparent: true,
            opacity: op
        });
        if (op == 1) {
            Array.prototype.forEach.call(o.lights, function (node) {
                node.object3D.visible = false
            });
            this.wires.object3D.visible = false;
            this.dim3.object3D.visible = false;
            if (this.econtrol) this.econtrol.object3D.visible = false;
        }
        let light = document.createElement('a-entity');
        light.setAttribute("position", "0 0.4 0")
        light.setAttribute("light", {
            type: "point",
            color: "#FFF",
            intensity: 2
        })
        s.appendChild(light)
        this.menuSphere = s;
        return s;
    },
    deleteSphere: function () {
        if (this.menuSphere) this.menuSphere.parentNode.removeChild(this.menuSphere);
        Array.prototype.forEach.call(o.lights, function (node) {
            node.object3D.visible = true
        });
        this.wires.object3D.visible = true;
        this.dim3.object3D.visible = true;
        if (this.econtrol) this.econtrol.object3D.visible = true;
        this.menuSphere = null;
    },
    toggleZoom: function (bol) {
        if (this.data.hasIntro) return;
        if (!this.data.hasZoom) return;
        (bol) ? $('#zoom-btn').css('display', 'flex') : $('#zoom-btn').hide();
        if (this.data.hasARMenu) {
            let right = '5px';
            if ($('ar main').css('right') == '0px') right = '176px';
            $('#zoom-btn').css({
                right: right,
                'flex-direction': 'column',
                'justify-content': '',
                width: '36px'
            });
        } else if (this.data.has2DMenu) {
            $('#zoom-btn').css({
                right: 'calc(50% - 160px/2)',
                'flex-direction': 'row',
                'justify-content': 'space-around',
                width: '160px'
            });
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
    msgSystem: function () {
        if (ARstate && ARmsg) {
            Object.assign(ARmsg.simulation, ARstate.simulation)
            o.translator(ARstate)
        }
        window.addEventListener("message", function (e) {
            if (!modName) return
            if (!e.origin.includes(pass) && !dev) return
            o.iframe.origin = e.origin;
            o.iframe.source = e.source;
            if (!o.iframe.firstMsg) {
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
                if (ARstate.simulation.status == "stopped" && o.status == 3) o.sessionHandler("pause")
                if (ARstate.simulation.status == "running" && !o.status == 3) {
                    ARmsg.simulation.status = "stopped";
                    ARstate.simulation.status = "stopped";
                    o.sendMsg(ARmsg)
                }
            }
        });
    },
    sendMsg: function (json) {
        // window.parent.postMessage( JSON.stringify(json),parent)
        //window.parent.postMessage( JSON.stringify(json),window.parent.location.origin)
        console.log('sending msg', JSON.stringify(json))
        if (!this.iframe.source) return
        this.iframe.source.postMessage(JSON.stringify(json), this.iframe.origin)
    },
    translator: function (sta) {
        this.translated = {}
        let path = []
        o.iterateObj(sta, path);

        // inform oorbit that a new translation arrived
        o.iframe.newMsg = true;
    }, // ok
    iterateObj: function (obj, path) {
        Object.keys(obj).forEach(function (item) {
            if (obj[item] && obj[item].constructor && obj[item].constructor.name === "Object") {
                path.push(item)
                o.iterateObj(obj[item], path)
            } else {
                let arr = [...path]
                if (arr.at(-1) == 'inputs' || arr.at(-1) == 'outputs') o.translated[item] = arr
            }
        })
        let gr = path.at(-1)
        path.pop()
        o.translated[gr] = [...path]
    }, // ok  
    getObj: function (obj, key) {
        let x = this.translated[key];
        if (!x) return
        switch (x.length) {
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
    setObj: function (obj, key, val, length) {
        // obj to be set
        // key of the obj to be set
        // val of the key. Can be a value or an obj
        let y = this.translated[key];
        if (!y) return null
        let x = []
        if (length) {
            for (i = 0; i < length; i++) {
                x.push(y[i])
            }
        } else {
            x = y;
        }
        switch (x.length) {
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
        if (typeof res[key] === 'object' && !Array.isArray(res[key]) && res[key] !== null) {
            Object.assign(res[key], val);
        }
        // if val is obj, set val only.
        else if (typeof val === 'object' && !Array.isArray(val) && val !== null) {
            res[key] = val.value;
        } else {
            res[key] = val;
        }
        return res[key]
    }, // ok
    setEvt: function (obj, key, val) {
        if (!ARstate || !ARmsg) return

        // update ang get new value
        let res = o.setObj(obj, key, val);

        let arr = o.translated[key];
        // define tag and type (builtin or external)
        let _obj = {
            name: key,
            type: arr[2]
        }

        if (res == null) {
            return console.warn(key + ' not defined')
        } else if (typeof res === 'object' && !Array.isArray(res)) {
            Object.assign(_obj, res)
        } else {
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
        if (!jQuery.isEmptyObject(assets)) {
            for (const type in assets) {
                for (const id in assets[type]) {
                    if (Array.isArray(assets[type][id])) {
                        o.addAsset(type, id, assets[type][id][0], assets[type][id][1])
                    } else {
                        o.addAsset(type, id, assets[type][id])
                    }
                }
            }
        }
        
        //adding background if used
        if (environment && environment.background) {
            let arr = ['cave','autumn','park','cinema','workshop','city','umbrellas','warehouse','building','square','night','snow','shore']
            let link = environment.background;
            if (arr.includes(link)) link = git+this.version+'/backgrounds/'+link+'.jpg';
            o.addAsset('imgs', 'worldback', link)
        }
        
        //adding floor if used
        if (environment && environment.floor) {
            let arr = ['grass','sand','snow','concrete']
            let link = environment.floor[0];
            if (arr.includes(link)) {
                link = git+this.version+'/floors/'+link;
                o.addAsset('imgs', 'floorDif', link+'_D_2k.jpg')   
                o.addAsset('imgs', 'floorNor', link+'_N_2k.jpg') 
                o.addAsset('imgs', 'floorRog', link+'_R_2k.jpg') 
                if (environment.floor[0] == 'snow') {
                    o.addAsset('imgs', 'floorHei', link+'_H_2k.jpg')     
                } else {
                    o.addAsset('imgs', 'floorAO', link+'_AO_2k.jpg') 
                }
            } else {
                link = git+version.OORBIT+'/floors/'+link+'.jpg';
                o.addAsset('imgs', 'floorDif', link)
            }
        }

        if (!$('a-assets').length) return o.updateBar(0, 1)
        var assets = $('a-assets')[0].querySelectorAll('audio, video, img, a-asset-item');
        let p = 0;
        let a = assets.length;
        // wait environment to load
        if ($("script[src*='environment']")[0] != null && this.sceneEl != null && !jQuery.isEmptyObject(environment)) {
            a++;
            this.sceneEl.addEventListener('econtrolloaded', (e) => {
                p = o.updateBar(p, a, e)
            }, {
                once: true
            });
        }
        // wait gps to load
        if (mode.charAt(2) == 3 || mode.charAt(2) == 4 || geo) {
            a++;
            this.sceneEl.addEventListener("gpsReady", (e) => {
                p = o.updateBar(p, a)
            }, {
                once: true
            });
            this.sceneEl.addEventListener('gpsError', (e) => {
                /*errorHandler('gps')*/
            });
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
                p = o.updateBar(p, a);
            }, {
                once: true
            });
            this.sceneEl.addEventListener('arError', (e) => {
                /*errorHandler('ar')*/
            });
        } 
        else if (geo) {
            o.pauseload('Libere o gps para localização');
            o.gpsAllow("gps")
        }

        // wait model entities to load
        let entities = this.el.sceneEl.querySelectorAll('[gltf-model], [gltf-submodel]');
        if (entities.length > 0) {
            for (var i = 0; i < entities.length; i++) {
                a++
                entities[i].addEventListener('model-loaded', (e) => {
                    p = o.updateBar(p, a, e)
                }, {
                    once: true
                });
            }
        }

        if (a == 0) this.updateBar(0, 1)
        for (var i = 0; i < assets.length; i++) {
            if (assets[i].localName == 'a-asset-item') {
                assets[i].addEventListener('loaded', (e) => {
                    p = o.updateBar(p, a, e)
                }, {
                    once: true
                });
            } else if (assets[i].localName == 'video' || assets[i].localName == 'audio') {
                assets[i].load();
                assets[i].addEventListener('canplaythrough', (e) => {
                    p = o.updateBar(p, a, e)
                }, {
                    once: true
                });
                o.media.push(assets[i])
            } else if (assets[i].localName == 'img') {
                assets[i].addEventListener('load', (e) => {
                    p = o.updateBar(p, a, e)
                }, {
                    once: true
                });
            }
        };
        for (i = 0; i < $('[sound]').length; i++) {
            this.media.push($('[sound]')[i])
        }
        for (i = 0; i < $('a-sound').length; i++) {
            this.media.push($('a-sound')[i])
        }
    },
    addAsset: function (type, id, asset, url) {
        let el;
        if (asset.charAt(0) == '.') asset = id + asset;
        if (url && url.includes('generic')) url = path + mod + url + "/" + asset;
        switch (type) {
            case 'models':
                el = document.createElement('a-asset-item')
                el.setAttribute('src', url || path + mod + "assets/model/" + asset)
                break
            case 'audios':
            case 'videos':
                el = document.createElement(type.slice(0, -1))
                el.setAttribute('src', url || path + mod + "assets/" + type.slice(0, -1) + "/" + asset)
                break
            case 'minds':
                if (id.length == 6) {
                    id = 1
                } else {
                    id = id.substr(5);
                }
                o.sceneEl.setAttribute('mindar-image', {
                    imageTargetSrc: url || path + mod + "assets/mind/" + asset,
                    maxTrack: id
                })
                break
            case 'imgs':
            case 'lmaps':
                el = document.createElement('img')
                el.setAttribute('src', url || path + mod + "assets/imgs/" + asset)
                break
            default:
        }
        if (!el) return
        el.id = id
        if (el) $('a-assets')[0].insertBefore(el, $('a-assets')[0].firstChild);
    },
    updateBar: function (p, a, e) {
        if (!$('#ebar')[0] || error) return
        p += 1 / a * 100;
        $('#ebar').css('width', p + '%')
        if (p >= 99.9) {
            p = 100;
            $('#ebar').css('width', p + '%')
            $('#ebar i').removeClass('rotate90');
            $('#circle-loader').hide();
            $('#ebar i').html('check_circle_outline');
            $('#ebar i').css('top', "2.8px");
            $('#ebar i').css('color', 'greenyellow');
            $('#loading-msg').html('Tudo Pronto!');

            o.sceneLoaded(() => {
                o.sessionHandler(1);
                if (hide) return $('#mode2D').click();
                if (!geo) {
                    $('#buttons').css('opacity', 1)
                    $('#buttons').css('z-index', 1)
                }
            })

        }
        if (!ARstate || !ARmsg || !this.permissions.msg) return p
        ARmsg.simulation.loading = p / 100
        ARstate.simulation.loading = p / 100
        if (o.iframe.firstMsg || dev) o.sendMsg(ARmsg)
        return p
    }, // ok
    loadsvgs: function (symbol) {
        this.happy = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" height="480" width="480"><path fill="forestGreen" d="M31.3 21.35q1.15 0 1.925-.775Q34 19.8 34 18.65t-.775-1.925q-.775-.775-1.925-.775t-1.925.775q-.775.775-.775 1.925t.775 1.925q.775.775 1.925.775Zm-14.6 0q1.15 0 1.925-.775.775-.775.775-1.925t-.775-1.925q-.775-.775-1.925-.775t-1.925.775Q14 17.5 14 18.65t.775 1.925q.775.775 1.925.775Zm7.3 13.6q3.3 0 6.075-1.775Q32.85 31.4 34.1 28.35h-2.6q-1.15 2-3.15 3.075-2 1.075-4.3 1.075-2.35 0-4.375-1.05t-3.125-3.1H13.9q1.3 3.05 4.05 4.825Q20.7 34.95 24 34.95ZM24 44q-4.1 0-7.75-1.575-3.65-1.575-6.375-4.3-2.725-2.725-4.3-6.375Q4 28.1 4 23.95q0-4.1 1.575-7.75 1.575-3.65 4.3-6.35 2.725-2.7 6.375-4.275Q19.9 4 24.05 4q4.1 0 7.75 1.575 3.65 1.575 6.35 4.275 2.7 2.7 4.275 6.35Q44 19.85 44 24q0 4.1-1.575 7.75-1.575 3.65-4.275 6.375t-6.35 4.3Q28.15 44 24 44Zm0-20Zm0 17q7.1 0 12.05-4.975Q41 31.05 41 24q0-7.1-4.95-12.05Q31.1 7 24 7q-7.05 0-12.025 4.95Q7 16.9 7 24q0 7.05 4.975 12.025Q16.95 41 24 41Z"/></svg>';

        this.sad = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" height="480" width="480"><path fill="red" d="M31.3 21.35q1.15 0 1.925-.775Q34 19.8 34 18.65t-.775-1.925q-.775-.775-1.925-.775t-1.925.775q-.775.775-.775 1.925t.775 1.925q.775.775 1.925.775Zm-14.6 0q1.15 0 1.925-.775.775-.775.775-1.925t-.775-1.925q-.775-.775-1.925-.775t-1.925.775Q14 17.5 14 18.65t.775 1.925q.775.775 1.925.775Zm7.3 5.8q-3.35 0-6.075 1.875T13.9 34h2.65q1.1-2.1 3.125-3.25t4.375-1.15q2.35 0 4.325 1.15T31.5 34h2.6q-1.25-3.1-4-4.975-2.75-1.875-6.1-1.875ZM24 44q-4.1 0-7.75-1.575-3.65-1.575-6.375-4.3-2.725-2.725-4.3-6.375Q4 28.1 4 23.95q0-4.1 1.575-7.75 1.575-3.65 4.3-6.35 2.725-2.7 6.375-4.275Q19.9 4 24.05 4q4.1 0 7.75 1.575 3.65 1.575 6.35 4.275 2.7 2.7 4.275 6.35Q44 19.85 44 24q0 4.1-1.575 7.75-1.575 3.65-4.275 6.375t-6.35 4.3Q28.15 44 24 44Zm0-20Zm0 17q7.1 0 12.05-4.975Q41 31.05 41 24q0-7.1-4.95-12.05Q31.1 7 24 7q-7.05 0-12.025 4.95Q7 16.9 7 24q0 7.05 4.975 12.025Q16.95 41 24 41Z"/></svg>';

        this.moon = 'data:image/svg+xml;utf8,<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 56 56" style="enable-background:new 0 0 56 56;" xml:space="preserve"><path fill="LightYellow" d="M46.369,28.793c-11.852,5.935-26.271,1.138-32.206-10.714c-2.748-5.488-3.191-11.524-1.702-17.016 C1.197,7.236-3.255,21.263,2.544,32.844C8.479,44.696,22.898,49.493,34.75,43.558c6.364-3.187,10.69-8.821,12.417-15.19 C46.903,28.513,46.64,28.658,46.369,28.793z"/></svg>';

        this.cloud = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAADAFBMVEUAAADp7O7j5+nt8PHn6+zk6On////h5efU2t3////////29/j////////////////9/f3W3N74+fn////////19vf+/v7////4+fn6+vv////+/v7////7/Pz////V293z9PX////////w8vPw8vP5+vrV297////9/f3+/v7////4+frw8vPy9PX////////x8vPm6uv////3+Pj8/Pz3+Pnt8PHX3d/3+Pjq7e7+/v7l6erW3N7n6uv9/f37/PzV29729/jq7e7r7u/3+Pn3+Pj+///9/f3w8vPu8PHV29329/jX3N/w8vPX3N/09fbt7/H+/v7f4+br7u/////s7u/+/v7m6uv19vfW297n6uzO1djW3N/X3d/U2t39/f3V297s7u/X3d/3+Pj9/v7l6erj5+j+/v709fbd4uTX3N/i5ujY3eD09fXv8fLe4+Xo6+zm6evo6+ze4+X9/f3b4OP5+vr////W3N7l6Orh5efq7e7i5uju8PHU2tzh5efW3N7s7/DX3d/X3d/9/f77/Pzs7vDZ3uH+/v7m6uva4OLl6evX3N/W3N7y9PTf4+b+///3+PjY3eDd4eTz9fXW297O1djn6uzU2t3V297N1Nf////m6evb4OLi5ufb4OPU2t3g5Ob09vbQ19rj5+j3+Pjn6uzt7/Hs7u/w8vP9/v7////P1djz9fX09fbT2dz5+vrT2dzn6uvy9PXc4ePh5efe4uTx8/P29/j29/fz9PXN1Nfm6uvQ19rl6Onp7O3U2tzY3eDb4OLs7/DR19rg5ObT2dzP1dj5+vrX3N/X3N/k5+nN1Nfg5Obw8vPi5ujW2974+fnu8PHe4+X09vb09vbh5ef19vfb4OLW3N7c4ePS2Nv+///Z3uDf4+X3+PjW297v8fL29/fY3eDz9PXx8/Th5ujz9fXh5efm6evx8/TW3N/19vfb4OLq7e7f4+X29/js7/Dd4uTT2dv5+vrf4+bu8PH////m6ev29/f39/jZ3uDj5ujj5+n19vf5+vqvHALMAAAA/nRSTlMAAgYECAOzCg67vwvPx7eu4REQy8MO2Kf5E6vce/HSFdOjf9njGhmQa3eLFt7OlZ3JvJkv6P7YKynG5JwcwE30eSXgzjMh1WHFzn/aI+gn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';

        this.iconHead = '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="-8 -8 40 40"><circle cx="-13" cy="12" r="16" fill="none" stroke="' + this.colorToRGB(this.data.loadingColor) + '" stroke-width="3" stroke-linecp="round" transition="stroke-dashoffset 1s linear" stroke-dasharray="565.48" transform="scale(-1,-1) translate(0,-24)"';

        this.iconPath = "M18.536 7.555c-1.188-.252-4.606-.904-5.536-1.088v-3.512c0-1.629-1.346-2.955-3-2.955s-3 1.326-3 2.955v7.457c-.554-.336-1.188-.621-1.838-.715-1.822-.262-3.162.94-3.162 2.498 0 .805.363 1.613 1.022 2.271 3.972 3.972 5.688 5.125 6.059 9.534h9.919v-1.748c0-5.154 3-6.031 3-10.029 0-2.448-1.061-4.157-3.464-4.668zm.357 8.022c-.821 1.483-1.838 3.319-1.891 6.423h-6.13c-.726-3.82-3.81-6.318-6.436-8.949-.688-.686-.393-1.37.442-1.373 1.263-.006 3.06 1.884 4.122 3.205v-11.928c0-.517.458-.955 1-.955s1 .438 1 .955v6.948c0 .315.256.571.572.571.314 0 .57-.256.57-.571v-.575c0-.534.49-.938 1.014-.833.398.079.686.428.686.833v1.273c0 .315.256.571.571.571s.571-.256.571-.571v-.83c0-.531.487-.932 1.008-.828.396.078.682.424.682.828v1.533c0 .315.256.571.571.571s.571-.256.571-.571v-.912c0-.523.545-.867 1.018-.646.645.305 1.166.932 1.166 2.477 0 1.355-.465 2.193-1.107 3.354z";
    }, // ok

    //Cursor
    setupCursor: function () {
        if (dev) console.log("Cursor initiated")

        let pair = ['lhand', 'rhand']
        for (i = 0; i < pair.length; i++) {
            let cursor = document.createElement('a-entity')
            cursor.setAttribute('class', "ignore-ray")
            cursor.setAttribute('geometry', {
                primitive: 'box',
                width: 0.015,
                height: 0.015,
                depth: 0.015,
            })
            cursor.setAttribute('material', {
                opacity: 0,
                alphaTest: 0.3
            })

            cursor.setAttribute('id', pair[i] + 'cursor')
            this[pair[i] + 'cursor'] = cursor;

            $("a-camera")[0].appendChild(cursor)
            cursor.appendChild(this.createSVGCursor(pair[i] + 'cursorimg'))
        }

        // crawling cursor
        AFRAME.components["raycaster"].Component.prototype.tock = function (time, delta) {
            var data = this.data;
            var prevCheckTime = this.prevCheckTime;

            if (!data.enabled) {
                return;
            }

            // Only check for intersection if interval time has passed.
            if (prevCheckTime && (time - prevCheckTime < data.interval)) {
                return;
            }

            // Update check time.
            this.prevCheckTime = time;

            this.checkIntersections();

            let cursor = $('#rhandcursor')[0];
            if (this.el.id == "lhand") cursor = $('#' + this.el.id + 'cursor')[0];
            if (this.intersections.length > 0) {
                if (this.el == o.camera) {
                    o.positionCursor(cursor, this.intersections.find(el => cursor !== el.object.el && !el.object.el.classList.contains("ignore-ray")))
                    let s = 1;
                    if (!AFRAME.utils.device.isMobile() && !o.sceneEl.is('vr-mode')) s = 0.01;
                    cursor.setAttribute('scale', s + ' ' + s + ' ' + s)
                    cursor.object3D.visible = true;
                    this.el.setAttribute('raycaster', 'lineColor', 'white')
                } else {
                    (!this.intersections[0].object.el.components.hoverable) ? this.el.setAttribute('raycaster', 'lineColor', 'blue') : this.el.setAttribute('raycaster', 'lineColor', 'white');
                }
            } else {
                cursor.setAttribute('scale', '1 1 1')
                cursor.object3D.visible = false;
                o.curveRay.removeAttribute('tickline')
                this.el.setAttribute('raycaster', 'lineColor', 'white')
            }
        }
    }, // ok
    positionCursor: function (el, intersection) { // intersection = entidade que foi atingida.
        let img = el.querySelectorAll('a-image')[0];
        if (intersection !== null && intersection !== undefined) {
            
            // if camera moves, move grabbed as well
            let move = o.cameraRig.components['movement-controls'];
            if (o.sceneEl.is('2d-mode') && !AFRAME.utils.device.isMobile()) {
                if (move && move.velocityCtrl && o.rhandcursor.grabbedEl && o.rhandcursor.grabbedEl.length > 0 && intersection.uv) {
                    o.camera.components.cursor.onMouseMove({
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX: intersection.uv.x, // bug estranho
                        clientY: intersection.uv.y
                    })
                }
            }
            //or
            //let move = o.cameraRig.components['movement-controls'];
            //if (o.camera.hasAttribute('raycaster') && move && move.velocityCtrl) return

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
            if (!intersection.face) return
            // change local normal into global normal
            var global_normal = intersection.face.normal.clone().applyMatrix4(mat).normalize().negate();

            // look at target coordinate = intersection coordinate + global normal vector
            var lookAtTarget = new THREE.Vector3().addVectors(intersection.point, global_normal);

            // correct cursor position for menus
            if (this.menu3DIsOpen && intersection.object.el.tagName == "A-SPHERE") lookAtTarget = new THREE.Vector3().addVectors(intersection.point, global_normal.multiplyScalar(-0.2));

            // cursor direction (avoid constantly rotating)
            img.object3D.lookAt(lookAtTarget);

            if (Math.abs(img.object3D.rotation.x) >= 1.56) {
                img.object3D.rotation.z = 0
            }
            if (Math.abs(img.object3D.rotation.y) >= 1.56) {
                img.object3D.rotation.x = 0
                img.object3D.rotation.z = 0
            }
            // scale down if near camera
            if (o.menu3DIsOpen || o.status == 7) {
                img.setAttribute('scale', '0.05 0.05 0.05')
            } else if (intersection.point.distanceTo(o.camera.object3D.position) < 2) {
                img.setAttribute('scale', '0.15 0.15 0.15')
            } else {
                img.setAttribute('scale', '0.3 0.3 0.3')
            }

            var cursorPosition = o.camera.object3D.worldToLocal(new THREE.Vector3().addVectors(intersection.point, global_normal.multiplyScalar(-this.offset)));
            
            if (o.sceneEl.is('2d-mode') && !AFRAME.utils.device.isMobile() && o.rhandcursor.grabbedEl && o.rhandcursor.grabbedEl[1]) cursorPosition.clampLength(o.rhandcursor.grabbedEl[1] * 0.9, o.rhandcursor.grabbedEl[1] * 1.1)
            
            el.setAttribute("position", cursorPosition);
            o.animateCursor(img, img.getAttribute("percentage"))
            img.object3D.visible = (o.data.hasCursor && (AFRAME.utils.device.isMobile() || o.sceneEl.is('vr-mode')))
        } 
        else {
            img.object3D.visible = false;
            o.curveRay.removeAttribute('tickline')
        }
    }, // ok
    createSVGCursor: function (id) {
        let cImg = document.createElement("a-image")
        o.setAttributes(cImg,{
            visible: true,
            id: id,
            class: "ignore-ray",
            scale: "0.3 0.3 0.3",
            percentage: 0
        })

        let x = -101;
        if (AFRAME.utils.device.isIOS()) x = 566; // ios fix            
        cImg.setAttribute('src', 'data:image/svg+xml;utf8,' + this.iconHead + ' stroke-dashoffset="' + x + '"></circle><circle cx="12" cy="12" r="3" fill="' + this.colorToRGB(this.data.cursorColor) + '"/></svg>')

        cImg.setAttribute('animation__on', {
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
            setTimeout(() => {
                el.object3D.scale.multiplyScalar(0.9)
            }, 80)
        })
        cImg.addEventListener('off', e => {
            let x = -101;
            if (AFRAME.utils.device.isIOS()) x = 566; // ios fix
            e.target.setAttribute('src', 'data:image/svg+xml;utf8,' + this.iconHead + ' stroke-dashoffset="' + x + '"></circle><circle cx="12" cy="12" r="3" fill="' + this.colorToRGB(this.data.cursorColor) + '"/></svg>')
            e.target.setAttribute('percentage', 0)
        })
        cImg.setAttribute('material', {
            alphaTest: 0.3,
            side: 'double'
        })
        return cImg;
    }, // ok 
    animateCursor: function (el, percentage) {
        if (this.clicking != null) {
            if (percentage == 0 || percentage == 1) return

            let x = parseInt(-98 + 100 * (percentage));
            if (AFRAME.utils.device.isIOS()) x = parseInt(-600 * (percentage / 6)); // ios fix -566

            el.setAttribute('src', 'data:image/svg+xml;utf8,' + this.iconHead + ' stroke-dashoffset="' + x + '"></circle><path stroke="grey" stroke-width="1" d="' + this.iconPath + '" fill="' + this.colorToRGB(this.data.cursorColor) + '" transform="scale(1,-1) translate(0,-24)"/></svg>')
        }
    }, // ok
    createIndication: (function (el) {
        let p1 = new THREE.Vector3()
        let p2 = new THREE.Vector3()
        let point = new THREE.Vector3()
        return function (el) {
            o.camera.object3D.getWorldPosition(p1);
            el.object3D.getWorldPosition(p2);
            let p = o.getPointInBetweenByPerc(p1, p2, 0.5) // change formula if heights are different

            p1.y = o.cameraRig.object3D.position.y;
            p.x *= 1.1

            let spline = new THREE.CatmullRomCurve3([p1, p, p2]);
            let html = "";

            for (let i = 0, l = 12; i < l; i++) {
                const t = i / l;
                spline.getPoint(t, point);
                html += point.x + " " + point.y + " " + point.z
                if (i < 11) html += ","
            }
            o.curveRay.setAttribute('tickline', {
                lineWidth: 15,
                path: html + ',' + p2.x + ' ' + p2.y + ' ' + p2.z,
                color: o.data.menuColor
            })
        }
    })(),

    //Controller
    setupControllers: function () {
        console.log('controllers initiated')

        this.dof3 = ['vrbox-controller', 'oculus-go']
        this.dof6 = ['oculus-touch', 'hand-tracking']
        let pair = ['left', 'right']

        let ctrl = '<a-entity id="controllerRig">';
        for (i = 0; i < pair.length; i++) {
            // hand id
            ctrl += '<a-entity id="' + pair[i].charAt(0) + 'hand" ';

            // 6DOF controllers
            for (j = 0; j < this.dof6.length; j++) {
                ctrl += this.dof6[j] + '-controls="hand: ' + pair[i] + '" ';
            }

            // 3DOF controllers
            if (i == 1) {
                for (j = 0; j < this.dof6.length; j++) {
                    ctrl += this.dof3[j] + ' ';
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

        // TODO:
        AFRAME.registerComponent('vrbox-controller-controls', {
            init: function () {
                let turn1 = 0;
                let turn2 = 0;
                let self = this;
                this.controllerPresent = false
                window.addEventListener("gamepadconnected", function (e) {
                    console.log('Simple gamepad connected')
                    let pads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
                    for (i = 0; i < pads.length; i++) {
                        if (!pads[i] || pads[i].pose) continue;
                        if (pads[i].axes.length > 0 && pads[i].buttons.length > 0) {
                            self.controllerPresent = pads[i];
                            // create model
                        }
                    }
                })
                window.addEventListener("gamepaddisconnected", function (e) {
                    let pads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
                    for (i = 0; i < pads.length; i++) {
                        if (o.pads != null && pads[i] == o.pads) o.pads = false
                        // delete model
                    }
                })
            },
            tick: function () {
                if (o.pads != null) {
                    for (i = 0; i < o.pads.buttons.length; i++) {
                        if (o.pads.buttons[i].pressed) this.action(o.pads.buttons[i])
                    }
                    if (o.pads.axes[0] != 0 || o.pads.axes[1] != 0) {
                        if (gp.axes[0] == -1) turn1++;
                        if (gp.axes[0] == 1) turn1--;
                        if (gp.axes[1] == 1) turn2++;
                        if (gp.axes[1] == -1) turn2--;
                        this.cRot(turn1, turn2)
                    }
                }
            },
            cRot: function (x, y) {
                let speed = 1.5;
                x = x * speed;
                y = y * speed;
                this.el.object3D.rotation.set(
                    THREE.Math.degToRad(x - 90),
                    THREE.Math.degToRad(y),
                    THREE.Math.degToRad(0)
                );
            },
            action: function (el) {
                //2,5,8,9,10,11 e 12 -> sem funções 
                //Botão 0 - menu
                //Botão 6 - escolher 
            },
            createModel: function () { }
        });
        
        AFRAME.registerComponent('ccontrol', {
            schema: {
                enabled: {type: 'boolean',default: true}, // detect or not collide
                fingerColliders: {type: 'array',default: ['all']}, // finger colliders
                controlCollider: {type: "boolean",default: true}, // control has collider
                detectGesture: {type: 'boolean',default: true}, // detect or not gestures (performance)
                smooth: {default: 20}, // smoothing gesture detection
                debugHand: {type: 'boolean',default: false},
                showCol: {type: 'boolean',default: false},
            },
            init: function () {
                //store positions of the bones
                this.positions = {
                    maxthumb: 0.132,
                    maxpinky: 0.15,
                    maxring: 0.18,
                    maxmiddle: 0.18,
                    maxindex: 0.18,
                }; 
                
                // Joints that may have colliders
                this.joints = [
                    'middle-finger-phalanx-proximal',
                    'pinky-finger-tip',
                    'ring-finger-tip',
                    'middle-finger-tip',
                    'index-finger-tip',
                    'thumb-tip',
                    'wrist',
                    'index-finger-phalanx-distal'
                ];
                this.bonesLoaded;
                this.controlLoaded;
                this.raycasterLoaded;
                this.rayAnchor = null;
                this.grabAnchor = null;
                this.controlLost = false;
                this.bones = [];
                this.skin;

                this.gesturesRules = {
                    a: [this.joints[4], 'greater', 0.85],
                    b: [this.joints[4], 'smaller', 0.55],

                    c: [this.joints[5], 'greater', 1],
                    d: [this.joints[5], 'smaller', 0.98],

                    e: [this.joints[3], 'greater', 0.85],
                    f: [this.joints[3], 'smaller', 0.55],

                    g: [this.joints[3], 'greater', 0.0555, this.joints[4]],

                    h: [this.joints[2], 'greater', 0.85],
                    i: [this.joints[2], 'smaller', 0.55],

                    j: ['negative']
                }
                this.gestures = {
                    adfgi: 'indexPointer',
                    bdfi: 'fist',
                    acfgi: 'gun',
                    //acei: 'raycasterOff',
                    //adei: 'raycasterOn',
                    adegi: 'scisor',
                    acegh: 'paper',
                    bcfi: 'thumbsUp',
                    bcfij: 'thumbsDown',
                }
                this.gestureBus = ['none','none','none'];
                this.timeout;
                
                this.controller;
                this.colliders = [];
                this.codeArray = [];
                
                if (this.data.debugHand /*&& this.el.id == 'rhand'*/) {
                    this.controller = 'hand-tracking';
                    this.el.components['hand-tracking-controls'].initMeshHandModel()
                    if (this.el.id.charAt(0) == 'r') {
                        this.el.setAttribute('rotation',"0 -90 180")
                        this.el.setAttribute('position',"0 1.4 0.2") 
                        /*
                        this.el.setAttribute('animation',{
                            property: 'rotation',
                            to: "40 -90 180",
                            dir: 'alternate',
                            loop: true,
                            easing: 'linear'
                        })*/
                        this.el.setAttribute('animation',{
                            property: 'position',
                            to: "0 1.4 -0.5",
                            dir: 'alternate',
                            loop: true,
                            dur:5000,
                            easing: 'linear'
                        })
                    }
                }
                
                if (!o.data.hasPhysx) {
                    this.data.controlCollider = false;
                    this.data.fingerColliders = [];
                    return console.warn("Physx not defined at oorbit")
                }

            }, // ok
            getHandBones: function () {
                // all mesh bones
                let bones = this.el.getObject3D('mesh').children;
                if (this.data.debugHand) bones = bones[0].children;
                if (!bones) return
                
                // storing important bones
                for (let i = 0; i < bones.length; i++) {
                    if (this.joints.includes(bones[i].name)) {
                        this.bones.push(bones[i]);
                    }
                    else if (bones[i].type == 'SkinnedMesh') {
                        this.skin = bones[i];
                    }
                }
                
                this.changeSkin()

                // add colliders to fingers and hand
                for (let i = 0; i < this.bones.length; i++) {
                    let name = this.bones[i].name;
                    if (this.data.fingerColliders[0] == 'all' || name == 'middle-finger-phalanx-proximal' || this.data.fingerColliders.includes(name) ) this.addFingerCollider(this.bones[i])     
                }
                this.bonesLoaded = true;
            },
            changeSkin: function(col = 'pink'){
                // color
                // map
                if (!this.skin) return
                this.skin.material = new THREE.MeshStandardMaterial({skinning: true, color: col});
                this.skin.material.needsUpdate = true; 
            },
            delHandBones: function(){
                for (i = 0; i < this.colliders.length; i++) {  
                    this.colliders[i][0].parentElement.removeChild(this.colliders[i][0])
                }    
                this.bonesLoaded = false;
                this.bones = [];
                this.skin = null;
                this.positions = {};
                this.rayAnchor = null;
                this.grabAnchor = null;
            },
            update: function (oldData) {
                var obj = AFRAME.utils.diff(oldData, this.data)
                if (obj.fingerColliders || obj.controlCollider) this.remove()
            }, // ok           
            remove: function () {
                if (this.bonesLoaded) this.delHandBones()
                if (this.controlLoaded) this.delControlCollider()
            }, // ok
            tick: function () {
                
                //no mesh
                if (!this.el.getObject3D('mesh')) {
                    this.remove()
                }
                    
                //hand-tracking
                else if (this.controller == 'hand-tracking') {
                    if (this.controlLoaded) this.delControlCollider()
                    if (!this.bonesLoaded) this.getHandBones()    
                    
                    if (this.data.enabled && this.el.getObject3D('mesh').visible) {
                        if (this.controlLost) {
                            for (let i = 0; i < this.colliders.length; i++) {
                                this.allowPhysx(this.colliders[i][0]);
                            }
                        }
                        this.controlLost = false;
                        
                        // update colliders
                        for (i = 0; i < this.colliders.length; i++) {  
                            this.getFingerPosition(this.colliders[i])
                        }
                    
                        // detect gestures
                        if (this.data.detectGesture) this.detectGesture();
                        
                    }else if (!this.controlLost) {
                        this.controlLost = true;
                        
                        if (dev) console.log(this.controller+' lost')
                        
                        for (let i = 0; i < this.colliders.length; i++) {
                            this.blockPhysx(this.colliders[i][0]);
                        }
                    }
                } else {
                    if (!this.data.enabled || !this.el.getObject3D('mesh').visible) {
                        if (this.controlLoaded) this.delControlCollider()
                    }
                }

                // fix: show controller mesh
                if (this.controller && this.controller.includes('oculus')) {
                    let cp = this.el.components[this.controller + '-controls'];
                    if (cp && cp.controllerObject3D && !cp.controllerObject3D.visible) {
                        cp.controllerObject3D.visible = true;
                        o.checkController()
                    }
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
            addPhysx: function(el){
                if (!o.data.hasPhysx) return console.warn("Physx not defined at oorbit")
                el.setAttribute('physx-body',{
                    type:'kinematic',
                    emitCollisionEvents: true,
                    mass: 0.01
                })
                el.setAttribute('physx-material',{
                    collisionGroup: 1,
                    collidesWithLayers: [1,2,3,4,99],
                    collisionLayers: [o.colLayers[o.data.targetClass]]
                })
                //this.allowPhysx(el);
            },
            allowPhysx: function(el){
                el.setAttribute('physx-material',{
                    collisionLayers: [o.colLayers[o.data.targetClass]]
                })
                el.object3D.visible = true;
            },
            blockPhysx: function(el){
                el.setAttribute('physx-material',{
                    collisionLayers: 99
                })
                el.object3D.visible = false;
            },
            addControlCollider: function(){
                if (!this.data.controlCollider) return
                // superhands added in event connect
                this.addPhysx(this.el)
                this.controlLoaded = true;
                this.el.setAttribute('class', 'finger-collider');
            },
            delControlCollider: function(){
                this.el.removeAttribute('physx-body')
                this.el.removeAttribute('physx-material')
                this.el.classList.remove('finger-collider');
                this.controlLoaded = false;
            },
            addFingerCollider: function (bone) {
                let col = document.createElement('a-entity');
                /*col.setAttribute('geometry', {
                    primitive: 'sphere',
                    segmentsWidth: 8,
                    segmentsheight: 8,
                    radius: 0.001,
                });*/
                col.setAttribute('geometry', {
                    primitive: 'box',
                    width: 0.001,
                    height: 0.001,
                    depth: 0.001
                });
                col.setAttribute('material', {
                    transparent: true,
                    opacity: ((this.data.showCol)?1:0)
                })
                col.setAttribute('class', 'finger-collider');
                
                if (bone.name == 'middle-finger-phalanx-proximal') {
                    col.setAttribute('id', this.el.id + '_anchor');
                    o.defineInteractor(col,'hand-tracking')
                    this.grabAnchor = col;
                } else {
                    if (bone.name == "index-finger-phalanx-distal") this.rayAnchor = col;
                    col.setAttribute('id', this.el.id.charAt(0)+'_'+bone.name);
                }
                
                this.addPhysx(col)

                this.el.appendChild(col)

                this.colliders.push([col,bone]);
            }, // ok             
            getFingerPosition: (function () {
                let pos = new THREE.Vector3();
                let ray = new THREE.Vector3();
                let qat = new THREE.Quaternion()
                let qat2 = new THREE.Quaternion()

                return function ([col,bone]) {
                    bone.getWorldPosition(pos);
                    bone.getWorldQuaternion(qat);
                    let p = this.positions;
                    let j = this.joints;
                    /*
                    p[bone.name] = pos;

                    if ( !p[j[5]] || !p[j[6]] || !p[j[4]] || !p[j[3]] || !p[j[2]] || !p[j[1]] ) return

                    // max distances for gesture detection
                    p.maxthumb = Math.max(p[j[5]].distanceTo(p[j[6]]), (p.maxthumb || 0))

                    p.maxindex = Math.max(p[j[4]].distanceTo(p[j[6]]), (p.maxindex || 0))
                    if (p.maxindex > 0.18) p.maxindex = 0;

                    p.maxmiddle = Math.max(p[j[3]].distanceTo(p[j[6]]), (p.maxmiddle || 0))

                    p.maxring = Math.max(p[j[2]].distanceTo(p[j[6]]), (p.maxring || 0))

                    p.maxpinky = Math.max(p[j[1]].distanceTo(p[j[6]]), (p.maxpinky || 0))
                    */
                    
                    this.el.object3D.worldToLocal(pos)
                    col.object3D.position.copy(pos); 
                    
                    if (bone.name == "index-finger-phalanx-distal") {
                        if (this.rayAnchor.hasAttribute('raycaster')){
                            
                            ray.subVectors(p['index-finger-tip'],p["index-finger-phalanx-distal"])
                            
                            ray.normalize()
                            
                            this.rayAnchor.setAttribute('raycaster',{
                                direction: ray.x+' '+ray.y+' '+ray.z
                            })
                        }
                                                
                        //col.object3D.applyQuaternion(qat)
                    }
                    else if (bone.name == "middle-finger-phalanx-proximal") {
    
                        col.object3D.setRotationFromMatrix(bone.matrixWorld); 
                    }
                    
                    p[bone.name] = pos.clone();
                }
            })(), // ok           
            detectGesture: function () {
                let p = this.positions;
                if (!this.bonesLoaded) return
                let code = '';
                
                for (const rule in this.gesturesRules) {
                    let a = this.gesturesRules[rule];
                    
                    if (a[0] == 'negative') {
                        if (p[this.joints[5]] && p[this.joints[5]].sub(p[this.joints[6]]).y < 0) code += rule;
                    } else {
                        if (!p[a[0]]) continue;
                        let b;
                        let c;
                        if (a[3] != null) {
                            b = p[a[0]].distanceTo(p[a[3]]);
                            c = a[2];
                        } else {
                            b = p[a[0]].distanceTo(p[this.joints[6]]);
                            c = a[2] * p['max' + a[0].split('-')[0]];
                        }
                        if (a[1] == "greater") {
                            if (b >= c) code += rule;
                        } else {
                            if (b < c) code += rule;
                        }
                    }
                    
                }
                code = o.sortString(code)
                code = o.smoothingString(this.codeArray, this.data.smooth, code)
                
                let sixG = this.gestures[code.substring(0, 6)];
                let fiveG = this.gestures[code.substring(0, 5)];
                let fourG = this.gestures[code.substring(0, 4)];

                if (sixG != null || fiveG != null || fourG != null) {
                    let gesture = sixG || fiveG || fourG;
                    if (this.gestureBus[0] != gesture) {
                        clearTimeout(this.timeout);
                        
                        // emit fist end to release grab
                        if (this.gestureBus[0] == 'fist' && this.grabAnchor) this.grabAnchor.emit('fistend') 
                        
                        this.gestureBus.unshift(gesture)
                        if (this.gestureBus.length == 4) {
                            let pop = this.gestureBus.pop()    
                        }
                        if (this.grabAnchor) this.grabAnchor.emit(gesture)
                        console.log(this.gestureBus)
                        this.setRaycaster()
                    }
                } else {
                    // emit fist end to release grab
                    if (this.gestureBus[0] == 'fist' && this.grabAnchor) this.grabAnchor.emit('fistend') 
                    
                    if (this.gestureBus[0] != 'none') {
                        this.gestureBus.unshift('none')
                        if (this.gestureBus.length == 4) {
                            let pop = this.gestureBus.pop()    
                        }
                        console.log(this.gestureBus)
                        this.timeout = setTimeout(function(){
                            if (this.raycasterLoaded) {
                                this.gestureBus.unshift('none')
                                if (this.gestureBus.length == 4) {
                                    let pop = this.gestureBus.pop()    
                                }
                                this.setRaycaster()  
                                console.log(this.gestureBus)
                            }
                        },2000)
                        this.setRaycaster()
                    }
                }
            }, // ok 

            // TODO: raycasterOff e raycasterOn
            setRaycaster: function () {
                if (this.gestureBus[0] == "gun") {
                    if (this.gestureBus[1] == "indexPointer" || this.gestureBus[2] == "indexPointer") {
                        this.grabAnchor.emit("gripup")
                    } else {
                        this.rayAnchor.setAttribute('raycaster', {
                            showLine: o.data.showRay,
                            objects: o.data.targets,
                        })
                        this.raycasterLoaded = true;
                    }
                } else if (this.gestureBus[0] == "indexPointer") {
                    if (this.gestureBus[1] == "gun" || this.gestureBus[2] == "gun") {
                        this.grabAnchor.emit("gripdown")
                    } else {
                        this.rayAnchor.setAttribute('raycaster', {
                            showLine: o.data.showRay,
                            objects: o.data.targets,
                        }) 
                        this.raycasterLoaded = true;
                    }
                } else if (this.gestureBus[0] == "none") {
                    if (!(this.gestureBus[1] == "gun" || this.gestureBus[1] == "indexPointer")) {
                        if (this.rayAnchor) this.rayAnchor.removeAttribute('raycaster')
                        this.raycasterLoaded = false;
                    }
                }
            },
            
            openMenu: function () {
                if (o.menu3DIsOpen) return
                if (o.data.has3DMenu) o.sessionHandler('pause')
            }, // ok            
            events: {
                //change Raycaster if controller connected
                controllerconnected: function (e) {
                    let name = e.detail.name.substring(0, e.detail.name.length - 9)
                    this.controller = name;
                    
                    this.remove()
                    o.checkController()

                    if (dev) console.log('controle adicionado', name)

                    // fix: show hand model
                    if (name == 'hand-tracking') this.el.components[e.detail.name].initMeshHandModel()
                    
                }, // ok
                controllerdisconnected: function (e) {
                    
                    if (dev) console.log('controle removido', this.controller /*e.detail.name.substring(0, e.detail.name.length - 9)*/)
                    
                    this.controller = null;
                    o.removeRaycaster(this.el)
                    
                    this.remove()
                    o.checkController()

                }, // ok

                // controller rays
                'raycaster-intersection': function (e) {
                    let els = o.emitFiltered(e);
                    e.target.emit('raycaster-intersection-filtered', {
                        els: els
                    })
                    //console.log(els)
                },               
                'raycaster-intersection-cleared': function(e){
                    let els = o.emitFiltered(e);
                    e.target.emit('raycaster-intersection-cleared',{els:els})  
                },

                //MENU
                thumbstickdown: function () {this.openMenu()},
                trackpaddown: function () {this.openMenu()},
                touchpaddown: function () {this.openMenu()},
                surfacedown: function () {this.openMenu()},

                /*
                // Movement
                thumbstickmoved: function (evt) {
                    if (evt.detail.y > 0.95) {
                        console.log("DOWN");
                    }
                    if (evt.detail.y < -0.95) {
                        console.log("UP");
                    }
                    if (evt.detail.x < -0.95) {
                        console.log("LEFT");
                    }
                    if (evt.detail.x > 0.95) {
                        console.log("RIGHT");
                    }
                },
                
                // Click
                triggerdown: function () {
                    console.log('triggerdown')
                },
                triggerup: function () {
                    console.log('triggerup')
                },
                */
                
                pinchstarted: function() {
                    if (this.grabAnchor) this.grabAnchor.emit('pinch')
                },
                pinchended: function() {
                    if (this.grabAnchor) this.grabAnchor.emit('pinchend')
                }
            }
        });
    },
    addGesture: function (rulesObj, gestureObj, erase = false) {
        if (!rulesObj || jQuery.isEmptyObject(rulesObj)) return
        if (!gestureObj || jQuery.isEmptyObject(gestureObj)) return
        $("[ccontrol]").each(function () {
            if (this.tagName == "A-MIXIN") return
            if (erase) {
                this.components['ccontrol'].gesturesRules = rulesObj;
                this.components['ccontrol'].gestures = gestureObj;
            }
            for (const rule in rulesObj) {
                this.components['ccontrol'].gesturesRules[rule] = rulesObj[rule]
            }
            for (const gesture in gestureObj) {
                this.components['ccontrol'].gestures[gesture] = gestureObj[gesture]
            }
        });
    },

    //Raycaster
    checkController: function () {
        let bol = false;
        let left = o.lhand.components.ccontrol.controller || "";
        let right = o.rhand.components.ccontrol.controller || "";
        
        /*
        let lcontrol = o.lhand.components.ccontrol;
        let rcontrol = o.rhand.components.ccontrol.controller;
        let left = lcontrol.controller || lcontrol.controlLost || "";
        let right = rcontrol.controller || rcontrol.controlLost || "";
        */
        
        //console.log(left, right)

        if (left.includes('touch')) bol = o.defineInteractor(o.lhand, 'oculus-touch');
        if (right.includes('touch')) bol = o.defineInteractor(o.rhand, 'oculus-touch');

        if (left.includes('go') && !bol) bol = o.defineInteractor(o.lhand, 'oculus-go');
        if (right.includes('go') && !bol) bol = o.defineInteractor(o.rhand, 'oculus-go');

        if (left.includes('hand-tracking') && !bol) bol = true;
        if (right.includes('hand-tracking') && !bol) bol = true;  
        
        if (!bol) o.defineInteractor(o.camera)
    }, // ok 
    defineInteractor: function (el, name) {
        o.removeRaycaster(o.camera)

        let up = 'gripup, triggerup, mouseup, touchend, fistend, pinchend';
        let down = 'gripdown, triggerdown, mousedown, touchstart, fist, pinch';
        let data = {
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
        }

        if (name == 'hand-tracking') {
            //if (dev) console.log('hand no raycaster')

            // add super-hands
            el.setAttribute('super-hands', data)
            return true
        } else if (name && name.includes('oculus')) {
            if (dev) console.log('laser raycaster')
            el.setAttribute('raycaster', {
                showLine: o.data.showRay,
                objects: o.data.targets,
                //origin: '0 0 -0.05',
                //direction: '0 -0.5 -1'
            })
            
            // add super-hands
            el.setAttribute('super-hands', data)
            return true
        } else if (el == o.camera) {
            $('#lhandcursor')[0].object3D.visible = false;
            $('#lhandcursor')[0].object3D.position.y = -1000;
            el.setAttribute('raycaster', {
                showLine: false,
                objects: o.data.targets
            })
            if (o.sceneEl.is('ar-mode') || (!AFRAME.utils.device.isMobile() && !o.sceneEl.is('vr-mode'))) {
                el.setAttribute('cursor', "rayOrigin", "mouse")
                $('#rhandcursor')[0].origin = 'mouse';
                $('#lhandcursorimg')[0].object3D.visible = false;
                $('#rhandcursorimg')[0].object3D.visible = false;
                if (dev) console.log('mouse raycaster')
            } else {
                $('#rhandcursor')[0].origin = 'camera';
                if (dev) console.log('camera raycaster')
            }
            let a = o.mode.charAt(0)
            if (!(a == "f" || a == "p" || a == "c") && AFRAME.utils.device.isMobile()) {
                this.data.hasCursor = true;
            } else {
                this.data.hasCursor = false;
            }
            
            // add super-hands
            el.setAttribute('super-hands', data)
            return false
        }
        
        
    }, // ok 
    removeRaycaster: function (el) {
        el.removeAttribute('raycaster')
        el.removeAttribute('super-hands')
        el.removeAttribute('cursor')
        $('#lhandcursor')[0].object3D.visible = false;
        $('#lhandcursor')[0].object3D.position.y = -1000;
        $('#rhandcursor')[0].object3D.visible = false;
        $('#rhandcursor')[0].object3D.position.y = -1000;
    }, // ok
    changeTargetClass: function () {
        switch (this.status) {
            case 0:
            case 1:
            case 2:
            case 5:
                this.data.targetClass = 'mclickable';
                break
            case 7:
                this.data.targetClass = 'qclickable';
                break
            case 8:
                this.data.targetClass = 'aclickable';
                break
            default:
                this.data.targetClass = 'any';
        }
        if (this.menu3DIsOpen) this.data.targetClass = 'mclickable';
        this.changeCollisionLayer(this.data.targetClass)
    }, // ok
    changeCollisionLayer: function (layer) {
        let rcol = o.rhand.querySelectorAll('[physx-material]');
        for (let i = 0; i<rcol.length; i++){
            rcol[i].setAttribute('physx-material','collisionLayers',[o.colLayers[layer]])
        }
        let lcol = o.lhand.querySelectorAll('[physx-material]');
        for (let i = 0; i<lcol.length; i++){
            lcol[i].setAttribute('physx-material','collisionLayers',[o.colLayers[layer]])
        }
    }, // ok
    intersectListener: function (evt, els, bol) {
        let a = o.mode.charAt(0)
        if (((a == "g" || a == "r" || a == "w") && AFRAME.utils.device.isMobile()) || (!AFRAME.utils.device.isMobile() && (o.sceneEl.is('vr-mode')))) {
            if (!els[0]) return
            if (o.clicking != els[0] && bol) {
                clearTimeout(o.timeout1);
                if (o.clicking != null) {
                    o.clicking.emit("hover-end", {
                        hand: $('#rhandcursor')[0]
                    })
                    $('#rhandcursorimg')[0].emit("off")
                }
                o.clicking = els[0];
                o.clicking.emit("hover-start", {
                    hand: $('#rhandcursor')[0]
                })
                $('#rhandcursorimg')[0].emit("on")
                o.timeout1 = setTimeout(function () {
                    console.log('timer click')
                    o.clicking.emit('grab-start', {
                        hand: $('#rhandcursor')[0]
                    })
                    o.clicking = null
                }, o.data.hoverTime);
            } else {
                if (o.clicking) {
                    o.clicking.emit("hover-end", {
                        hand: $('#rhandcursor')[0]
                    })
                    o.clicking = null
                }
                if (els[0].is('grabbed')) els[0].emit('grab-end', evt)

                $('#rhandcursorimg')[0].emit("off")
                clearTimeout(o.timeout1);
            }
        }
    }, // ok
    emitFiltered: function (e) {
        let els = e.detail.clearedEls || e.detail.els || e.detail.intersectedEls;
        if (!els && e.detail.body) els = [e.detail.body.el]
        let oldEl;
        let arr = [];
        for (i = 0; i < els.length; i++) {
            if (!oldEl) {
                oldEl = els[i];
            } else if (oldEl == els[i]) {
                continue
            }
            if ((els[i].classList.contains(o.data.targetClass) || o.data.targetClass == 'any') && (!els[i].object3D || els[i].object3D.visible)) arr.push(els[i])
        }
        return arr
    }, // ok
    clickListener: function () {
        if (document.addEventListener) {
            document.addEventListener('contextmenu', function (e) {
                e.preventDefault();
            }, false);
        } else {
            document.attachEvent('oncontextmenu', function () {
                window.event.returnValue = false;
            });
        }

        o.sceneEl.addEventListener("grab-end", function (e) {
            //console.log('grabend',e)
            e.target.lastClick = e.target.timeout2;
            clearTimeout(e.target.timeout2)
        })
        o.sceneEl.addEventListener("grab-start", function (e) {
            //console.log('grabstart',e)
            if (!(e.target.components.clickable || e.target.components.selectable)) return

            // left click
            if (e.detail.buttonEvent && e.detail.buttonEvent.detail && (e.detail.buttonEvent.detail.button == 2 || (e.detail.buttonEvent.detail.mouseEvent && e.detail.buttonEvent.detail.mouseEvent.button == 2))) {
                e.target.emit('leftclick')
            };
            let target = e.target;

            // longer click
            e.target.timeout2 = setTimeout(function () {
                target.emit('longclick')
            }, 500);

            // double click
            if (e.target.lastClick && e.target.timeout2 - e.target.lastClick < 250) {
                e.target.emit('dbclick')
                clearTimeout(e.target.timeout2)
            }
        })
    }, // ok

    //Marketing
    loadLogos: function () {
        let html = '';
        (path == '' || !path) ? html = mod : html = path;
        if (logo != null) $("a-assets").append('<img id="logocli" src="' + html + 'generic/logos/' + logo + '" crossorigin="anonymous">')
        if (orb != null) $("a-assets").append('<img id="logoorb" src="' + html + 'generic/' + orb + '" crossorigin="anonymous">')
    },
    createLogo: function (id, url, width, height, position) {
        let logo = document.createElement('a-image');
        logo.setAttribute('position', position);
        logo.setAttribute('width', width);
        logo.setAttribute('height', height);
        logo.setAttribute('material', 'alphaTest', 0.15)
        if (id != '' || id != null) logo.setAttribute('id', id);
        (url.slice(url.length - 3) == "svg") ? logo.setAttribute('material', 'src', url) : logo.setAttribute('src', url);
        return logo
    },
    logo2d: function (bol) {
        if (this.data.hasIntro) return
        if (!this.data.hasLogos) return
        if (logo != null) {
            $('#ar_client').attr('src', '#logocli');
            $('#ar_client').attr('class', 'white_logo');
            (bol) ? $('#ar_client').show() : $('#ar_client').hide();
        }
        if (orb != null) {
            $('#ar_oorbit').attr('src', '#logoorb');
            $('#ar_oorbit').attr('class', 'white_logo');
            (bol) ? $('#ar_oorbit').show() : $('#ar_oorbit').hide();
        }
    },
    showIntro: function (play) {
        if (!this.data.hasIntro) return
        if (!play) {
            let html = '';
            (path == '' || !path) ? html = mod : html = path;
            $("a-assets").append('<a-asset-item src="' + html + 'generic/logo.js" id="introModel"></a-asset-item>')
            $("a-assets").append('<audio id="introAudio" src="' + html + 'generic/logo.mp3" crossorigin="anonymous"></audio>')
            //$('#introAudio')[0].load()
        } else {
            let s = o.initiateSphere()
            o.cameraRig.appendChild(s);
            o.fixMenu = true;
            setTimeout(function () {
                s.appendChild(o.createText('Desenvolvido por:', "center", 0.025, "infinity", o.data.textColor, "0 0 -0.5", "0 0 0"))
                let m = document.createElement('a-entity');
                m.setAttribute('gltf-model', "#introModel")
                m.setAttribute('gltf-material', "opacity", 1)
                m.setAttribute('scale', "0.16 0.16 0.16")
                m.setAttribute('rotation', "90 0 0")
                m.setAttribute('position', "0 -0.08 -0.5")
                s.appendChild(m)
                if (logo) s.appendChild(o.createLogo('', "#logocli", 0.2, 0.17, "0 0.14 -0.5"))
                if (o.sceneEl.is('2d-mode')) {
                    o.camera.setAttribute('look-controls', 'enabled', false)
                    o.menuSphere.object3D.rotation.copy(o.camera.object3D.rotation)
                }
                if (!o.permissions.mute && !AFRAME.utils.device.isIOS()) {
                    o.permissions.mute = true;
                    o.sessionHandler('mute')
                }
                setTimeout(function () {
                    m.setAttribute('animation-mixer', {
                        timeScale: 0.55,
                        loop: 'once',
                        clampWhenFinished: true,
                    })
                    $('#introAudio')[0].volume = 1;
                    $('#introAudio')[0].play()
                }, 1200);
                setTimeout(function () {
                    o.deleteSphere()
                    o.fixMenu = false;
                    o.data.hasIntro = false;
                    o.sessionHandler(2);
                    if (!o.permissions.fix) o.camera.setAttribute('look-controls', 'enabled', true);
                    o.sceneEl.emit('introend')
                }, 8000)
            }, 1000)
        }
    },

    // Environment
    setupEnvironment: function () {
        if (environment != null && !jQuery.isEmptyObject(environment)) {
            Object.assign(o.environment, environment);
            if (o.environment.econtrol != null && !jQuery.isEmptyObject(o.environment.econtrol)) {
                if (o.econtrol.getAttribute('econtrol') != null) {
                    o.econtrol.parentElement.removeChild(o.econtrol)
                    o.econtrol = document.createElement('a-entity');
                }
                o.econtrol.setAttribute('econtrol', o.environment.econtrol);
                this.sceneEl.appendChild(o.econtrol)
                delete o.environment.econtrol;
            } else {
                console.warn("Environment não funciona corretamente sem econtrol!");
                o.econtrol.setAttribute('environment', o.environment);
                this.sceneEl.appendChild(o.econtrol)
            }
        } else {
            o.econtrol = null;
        }
    },
    
    // Physx
    setupPhysx: function() {
        //let bol = !(environment.econtrol && environment.econtrol.groundPhysics)
        let phy = {
            autoLoad: true,
            delay:0,
            useDefaultScene: false,
        }
        o.sceneEl.setAttribute('physx',phy)
    },
    
    // General
    createButton: function (w, h, r, c1, c2, position, targetClass, text, size, func) {
        let button;
        for (i = 0; i < 3; i++) {
            let el = document.createElement('a-entity');
            let _color = c1
            let round;
            switch (i) {
                case 0:
                    el.setAttribute('position', position);
                    el.setAttribute('clickable', "");
                    el.setAttribute('collidable', "layer", o.colLayers[targetClass]);
                    el.classList.add(targetClass);
                    button = el;
                    round = this.drawRound(w, h, r)
                    break;
                case 1:
                    _color = c2
                    round = this.drawRound(w * 0.95, h * 0.9, Math.min(w * 0.95, h * 0.9) / 2)
                    el.setAttribute('position', "0 0 0.001");
                    el.setAttribute('physx-no-collision',"")
                    button.appendChild(el)
                    break;
                default:
                    _color = c1
                    round = this.drawRound(w * 0.9, h * 0.81, Math.min(w * 0.9, h * 0.81) / 2)
                    el.setAttribute('position', "0 0 0.002");
                    el.setAttribute('physx-no-collision',"")
                    button.appendChild(el)
            }
            el.setAttribute('material', {
                shader: 'flat',
                color: _color
            })

            el.setObject3D('mesh', new THREE.Mesh(round, new THREE.MeshPhongMaterial({
                color: new THREE.Color(_color),
                side: THREE.DoubleSide
            })))
        }
        let textel = this.createText(text, "center", size, "infinity", c2, "0 0 " + (this.offset + 0.001), "0 0 0");
        textel.setAttribute('physx-no-collision',"")
        button.appendChild(textel)

        button.addEventListener("hover-start", function () {
            button.setAttribute('scale', "1.03 1.03 1.03")
            button.firstChild.setAttribute('material', "color", o.data.loadingColor)
            button.lastChild.setAttribute("color", o.data.loadingColor)
        })
        button.addEventListener("hover-end", function () {
            button.setAttribute('scale', "1 1 1")
            button.firstChild.setAttribute('material', "color", c2)
            button.lastChild.setAttribute("color", c2)
        })

        button.addEventListener("grab-start", function (e) {
            e.preventDefault()
            //e.stopImmediatePropagation();
            //console.log('start',e)
        })

        button.addEventListener("grab-end", function (e) {
            e.preventDefault()
            setTimeout(function(){
                func()    
            },200) 
            
            /*
            e.preventDefault()
            e.stopImmediatePropagation();
            //console.log('end',e)
            button.removeState('clicked')
            button.removeState('grabbed')
            setTimeout(function(){
                func()    
            },800)
            */
        })
        
        return button
    }, // testar on runtime
    createText: function (text, anchor, size, width, color, position, rotation, id) {
        let el = document.createElement("a-entity")
        let t = document.createElement("a-troika-text")
        t.setAttribute('value', text)
        t.setAttribute('align', 'justify')
        t.setAttribute('anchor', anchor)
        t.setAttribute('max-width', width)
        t.setAttribute('font-size', size)
        t.setAttribute('color', color)
        t.setAttribute('rotation', rotation)
        t.setAttribute('position', position)
        if ($("#" + id)[0] != null) this.deleteText(id)
        if (id != null) t.setAttribute('id', id)

        if (AFRAME.utils.device.isIOS()) {
            let t2 = document.createElement("a-troika-text")
            t2.setAttribute('value', '')
            el.appendChild(t)
            el.appendChild(t2)
            return el
        } else {
            return t
        }
    },
    removeEl: function (el) {
        if (!el) return
        el.parentElement.removeChild(el)
    },
    deleteText: function (id) {
        if ($("#" + id) != null) $("#" + id)[0].parentNode.removeChild($("#" + id)[0]);
    },
    screenMsg: function (msg, icon) {
        let s = o.initiateSphere();
        if (!icon) {
            s.appendChild(o.createText(msg, "center", 0.02, 0.45, o.data.textColor, "0 0 -0.4", "0 0 0"))
        } else {
            s.appendChild(o.createText(msg, "center", 0.02, 0.45, o.data.textColor, "0 0.15 -0.4", "0 0 0"))
            let svg = o.svgImg(icon)
            svg.setAttribute('scale', "0.15 0.15 0.15")
            svg.setAttribute('position', '0 0 -0.4')
            svg.setAttribute('material', 'alphaTest', 0.15)
            s.appendChild(svg)
        }
        o.cameraRig.appendChild(s)
    },
    setupTurnBtn: function () {
        $("#turn-btn").css("top", "10px")
        $("#turn-btn").css("left", "50%")
        if (this.data.hasARMenu) {
            $("#turn-btn").css("top", "50px")
            $("#turn-btn").css("left", "calc((100% - 176px)/2)");
        }
        $("#turn-btn").on('click', function (e) {
            e.target.style.transform = "scale(1.0)";
            setTimeout(() => {
                e.target.style.transform = "scale(1.1)"
            }, 100)
            o.setTurn(1)
        })
        this.lim_min_y = 0;
        this.lim_max_x = window.innerWidth;
        if (this.data.hasARMenu) {
            if ($('ar header').length) this.lim_min_y = $('ar header').height()
            if ($('ar main').length) this.lim_max_x = window.innerWidth - $('ar main').width()
        }
    }, // ok
    setTurn: function(sign){
        o.selected.forEach(function (item, index, arr) {
            //console.log(o.data.turnAxis)
            if (!item.components.turnable) return

            //o.toKinematic(item)

            item.object3D.rotation[o.data.turnAxis] += sign * Math.PI / 4
            
            if (Math.abs(item.object3D.rotation[o.data.turnAxis]) >= Math.PI * 2) item.object3D.rotation[o.data.turnAxis] = 0;
        })
    }, // ok
    setZoom: function (incr, x = this.lim_max_x / 2, y = window.innerHeight / 2) {
        if (o.sceneEl.is('ar-mode')) return
        if (x >= this.lim_max_x || (y < this.lim_min_y && y != 0) || !this.data.hasZoom) return
        this.zoom[0] += incr / 10
        if (this.zoom[0] >= 1.3) return this.zoom[0] = 1.2;
        if (this.zoom[0] <= 0.6) return this.zoom[0] = 0.7;
        if (!incr) {
            this.zoom[0] = 1;
            o.dim3.setAttribute('position', '0 0 0')
        }
        o.camera.setAttribute('fov', fov = this.zoom[1] * this.zoom[0])
        o.camera.components.camera.camera.updateProjectionMatrix();

        // zoom at cursor
        if (this.data.cursorZoom) {
            let poiV2 = new THREE.Vector2(x, y)
            let midV2 = new THREE.Vector2(this.lim_max_x / 2, (window.innerHeight - this.lim_min_y) / 2)
            let ratio = 2;
            poiV2.sub(midV2).divideScalar(ratio * 1000)

            o.dim3.object3D.position.x += poiV2.x * Math.sign(incr)
            o.dim3.object3D.position.y -= poiV2.y * Math.sign(incr)
        }
    }, // ok
    boxTrigger: function (id, d, h, w, position, trigger, op, append) {
        let bT = document.createElement('a-box')
        if (id) bT.setAttribute('id', id)
        bT.setAttribute('class', 'boxTrigger')
        bT.setAttribute('depth', d)
        bT.setAttribute('height', h)
        bT.setAttribute('width', w)
        bT.setAttribute('visible', true)
        bT.setAttribute('material', 'opacity', op)
        bT.setAttribute('position', position)
        bT.setAttribute('lasthit', 0)
        bT.setAttribute('clickable', '')
        bT.setAttribute('collidable', "layer", o.colLayers['any']);
        if (!trigger) return
        bT.addEventListener('grab-start', function (e) {
            //console.log('boxTrigger clicked')
            if (o.status != 3) return
            for (i = 0; i < trigger.ids.length; i++) {
                if (!$('#' + trigger.ids[i]).length) continue;
                for (j = 0; j < trigger.meshes.length; j++) {
                    let note = trigger.meshes[j];
                    if (note.charAt(1) == "#") note = note.charAt(0) + 's' + note.charAt(2);
                    let obj = {
                        name: trigger.meshes[j]
                    }
                    for (k = 0; k < trigger.on.length; k += 2) {
                        obj[trigger.on[k]] = trigger.on[k + 1]
                    }
                    $('#' + trigger.ids[i])[0].setAttribute('gltf-transform__' + note, '')
                    $('#' + trigger.ids[i])[0].setAttribute('gltf-transform__' + note, obj)

                    //let num = parseInt(e.target.getAttribute('lasthit'));
                    //num++
                    //e.target.setAttribute('lasthit',num)
                }
            }
            if (!trigger.boombox) return
            o.boombox.start(trigger.boombox[0], trigger.boombox[1], trigger.boombox[2], trigger.boombox[3]);
        })
        if (trigger.spring) {
            bT.addEventListener('grab-end', function (e) {
                if (o.status != 3) return
                //console.log('boxTrigger unclicked')
                //let num = parseInt(e.target.getAttribute('lasthit'));
                //num--;
                //e.target.setAttribute('lasthit',num)
                //if(num>0) return

                for (i = 0; i < trigger.ids.length; i++) {
                    if (!$('#' + trigger.ids[i]).length) continue;
                    for (j = 0; j < trigger.meshes.length; j++) {
                        let note = trigger.meshes[j];
                        if (note.charAt(1) == "#") note = note.charAt(0) + 's' + note.charAt(2);
                        let obj = {
                            name: trigger.meshes[j]
                        }
                        for (k = 0; k < trigger.off.length; k += 2) {
                            obj[trigger.off[k]] = trigger.off[k + 1] || !!0
                        }
                        $('#' + trigger.ids[i])[0].setAttribute('gltf-transform__' + note, obj)
                    }
                }

                if (!trigger.boombox) return
                o.boombox.stop(trigger.boombox[0], trigger.boombox[1], trigger.boombox[2]);
            })
        }
        o.triggers.push(bT)
        if (append) {
            $(append)[0].appendChild(bT)
        } else {
            return bT
        }
    }, // ok

    //Questions
    createQuestion: function (index, fb, op) {
        text = o.questions[index]
        if (this.status == 8) {
            this.status = 7;
            this.changeTargetClass();
            this.status = 8;
        }

        if (this.sceneEl.is("vr-mode")) {
            this.camera.setAttribute('look-controls', 'enabled', false)
        }

        // enquete concluded
        if (!text) {
            if (this.mode.charAt(0) != 'f') o.camera.setAttribute('look-controls', 'enabled', true)
            if (!questions) return
            if (fb == "feedback") {
                this.screenMsg('Obrigado pelo feedback!', "happy")
                this.fillForm()
                setTimeout(function () {
                    o.endQuestion()
                    o.dur[o.dur.length - 1] = Math.round(o.dur[o.dur.length - 1] - 3);
                }, 3000);
            } else {
                o.endQuestion()
            }
            return
        }

        // questions concluded
        if (text[text.length - 1].slice(0, 5) == "entry" && questions.length != this.questions.length && this.results != null && this.status == 7) {
            let html = 'Você acertou ' + this.results[1] + ' questões de ' + this.results[0] + '!';
            if (this.results[1] == 1) html = 'Você acertou ' + this.results[1] + ' questão de ' + this.results[0] + '!';
            if (this.results[1] / this.results[0] >= 0.6) {
                this.screenMsg(html, "happy")
            } else {
                this.screenMsg(html, "sad")
            }
            o.fillResults('question')
            setTimeout(function () {
                o.dur[o.dur.length - 1] = Math.round(o.dur[o.dur.length - 1] - 3);
                o.createQuestion(0)
            }, 3000);
            return
        }

        this.dur.push('q' + questions.indexOf(text))
        this.dur.push(0)

        let s = this.initiateSphere(op);
        o.cameraRig.appendChild(s);

        let tam = 0.4;
        if (o.sceneEl.is('vr-mode')) tam = 0.6;

        let correct;
        for (i = 0; i < text.length; i++) {
            let round;
            let adj = Math.ceil(text[i].length / 60);
            let el = document.createElement('a-entity');
            s.appendChild(el);
            el.setAttribute('material', {
                shader: 'flat',
                color: this.data.questionBackColor,
            })

            if (text[i].slice(0, 5) == "entry") {
                if (form && form != null) {
                    o.form[0] = form;
                    o.form.push(text[i])
                }
                return
            }

            // header creation
            if (i == 0) {
                el.setAttribute('position', "0 0.15 -" + tam);
                el.appendChild(this.createText(text[i], "center", 0.015, 0.45, this.data.questionTextColor, "0 0 0.001", "0 0 0"))
                round = this.drawRound(0.5, (0.03 + 0.02 * adj), 0.02)
                el.setAttribute('h', (0.15 - (0.03 + 0.02 * adj) / 2))
            }

            // options creation
            else {
                el.setAttribute('material', 'opacity', 0.7)
                el.setAttribute('class', "qclickable");
                el.setAttribute('hoverable', "");
                el.setAttribute('clickable', "");
                el.setAttribute('collidable', "layer", o.colLayers['qclickable']);
                if (text[i].charAt(0) == 'x') {
                    correct = el;
                    text[i] = text[i].substring(1)
                }
                el.appendChild(this.createText(text[i], "left", 0.015, 0.42, this.data.questionTextColor, "-0.21 0 0.001", "0 0 0"))
                round = this.drawRound(0.45, (0.02 + 0.02 * adj), 0.02)
                let pos = el.previousSibling.getAttribute('h') - (0.02 + 0.02 * adj) / 2 - 0.015;
                el.setAttribute('h', pos - (0.02 + 0.02 * adj) / 2)
                el.setAttribute('position', "0 " + pos + " -" + tam);

                el.addEventListener("hover-start", function () {
                    el.setAttribute('material', 'opacity', 1)
                })
                el.addEventListener("hover-end", function () {
                    el.setAttribute('material', 'opacity', 0.7)
                })
                el.addEventListener("grab-start", function () {
                    if (!correct) {
                        o.form.push(this.children[0].getAttribute("value"))

                        setTimeout(function () {
                            //o.questions.shift();
                            o.dur[o.dur.length - 1] = Math.round(o.dur[o.dur.length - 1] - 3);
                            o.questions.splice(index, 1);
                            if (o.status == 7) {
                                o.createQuestion(0, "feedback");
                            } else {
                                o.deleteSphere()
                                o.sceneEl.emit('action')
                            }
                        }, 3000)
                        this.setAttribute('material', 'color', '#008000')
                        $('.qclickable').removeClass("qclickable");
                        return
                    }
                    o.results[0]++;
                    correct.setAttribute('material', 'color', '#008000')

                    if (this == correct) {
                        s.appendChild(
                            o.createText("Resposta Certa!", "center", 0.015, 0.45, '#008000', "0 0.22 -0.4", "0 0 0"))
                        let svg = o.svgImg("happy")
                        svg.setAttribute('scale', "0.04 0.04 0.04")
                        svg.setAttribute('position', '0.09 0.22 -0.4')
                        s.appendChild(svg)
                        o.results[1]++;
                    } else {
                        s.appendChild(
                            o.createText("Resposta Errada!", "center", 0.015, 0.45, '#800000', "0 0.22 -0.4", "0 0 0"))
                        this.setAttribute('material', 'color', '#800000')
                        let svg = o.svgImg("sad")
                        svg.setAttribute('scale', "0.04 0.04 0.04")
                        svg.setAttribute('position', '0.09 0.22 -0.4')
                        s.appendChild(svg)
                    }
                    $('.qclickable').removeClass("qclickable");

                    setTimeout(function () {
                        //o.questions.shift();
                        o.dur[o.dur.length - 1] = Math.round(o.dur[o.dur.length - 1] - 3);
                        o.questions.splice(index, 1);
                        if (o.status == 7) {
                            o.createQuestion(0);
                        } else {
                            o.deleteSphere()
                            o.sceneEl.emit('action')
                        }
                    }, 3000)

                }, {
                    once: true
                })
            }
            el.setObject3D('mesh', new THREE.Mesh(round, new THREE.MeshPhongMaterial({
                color: new THREE.Color(this.data.buttonColor),
                side: THREE.DoubleSide
            })))
        }
    }, // ok
    endQuestion: function () {
        if (o.sceneEl.is("2d-mode")) {
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
    fillForm: function () {
        var data = {}
        for (i = 1; i <= ((o.form.length - 1) / 2); i++) {
            data[o.form[i]] = o.form[((o.form.length - 1) / 2) + i]
        }
        $.ajax({
            url: o.form[0],
            type: 'GET',
            mode: 'no-cors',
            crossDomain: true,
            dataType: "xml",
            data: data,
            success: function (jqXHR, textStatus, errorThrown) {
                console.log('Enviado com sucesso.')
            },
            error: function (jqXHR, textStatus, errorThrown) { }
        });
    }, // ok
    fillResults: function (type) {
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
        $.ajaxSetup({
            contentType: "application/json; charset=utf-8"
        });
        $.post(opath + "setresults", JSON.stringify(data),
            function (data) {
                console.log(data)
            }).fail(function (err) {
                console.log(err)
            });

        //o.results = null
        //o.dur = null
        //o.geo = null
    }, // ok

    //Baseline
    iniState: function () {
        this.fadeIn('#000')
        setTimeout(function () {
            $("a-scene *").each(function () {
                if (this.tagName == "A-ASSETS" || this.parentElement.tagName == "A-ASSETS" || this.tagName == "DIV" || this.tagName == "CANVAS" || this.tagName == "BUTTON" || this.id == "svgCursor" || this.classList.contains('environment') || this == o.lid) return
                let obj = {};
                let initial;
                let mixin;
                let self = this;
                for (i = 0; i < o.baseline.length; i++) {
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

                for (const name in this.components) {
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
                        self.setAttribute(name, 'reset', true)
                        continue
                    }

                    if (name == "gltf-model" || name == "gltf-submodel" || name.includes('gltf-transform') || name.includes('gltf-material') || name == "id" || name.includes('event-set')) continue

                    if (name == 'mixin') {
                        mixin = obj[name]
                        this.setAttribute("mixin", obj[name]);
                        continue
                    }
                    if (name == "animation-mixer") {
                        if (this.getAttribute("animation-mixer").clip == "*") {
                            let html = "clip:'' " + obj[name]
                            this.setAttribute(name, html);
                            this.setAttribute("animation-mixer", 'clip', "*");
                            continue
                        }
                    }
                    if (name.includes("animation")) continue

                    if (this.components[name] == '') {
                        if (obj[name] != '') {
                            this.setAttribute(name, obj[name]);
                        }
                    } else {
                        this.setAttribute(name, obj[name]);
                    }
                }
            });
            $('#rhandcursorimg')[0].setAttribute('scale', "0.3 0.3 0.3");
            $('#lhandcursorimg')[0].setAttribute('scale', "0.3 0.3 0.3");

            if (o.econtrol != null) o.setupEnvironment();
            setTimeout(function () {
                o.fadeOut()
                o.startMedia();
                o.sessionHandler(2);
            }, 200)
        }, 300)
    },
    registerIniState: function () {
        $("a-scene *").each(function () {
            if (this.tagName == "A-ASSETS" || this.parentElement.tagName == "A-ASSETS" || this.tagName == "DIV" || this.tagName == "CANVAS" || this.tagName == "BUTTON" || this.id == "svgCursor" || this.classList.contains('environment')) return
            let obj = {
                el: this
            }
            for (i = 0; i < this.attributes.length; i++) {
                let name = this.attributes[i].nodeName
                //if (name == "gltf-model" || name == "gltf-submodel" || name == "id") continue

                obj[name] = this.attributes[i].nodeValue;
            }
            if (this.tagName == "A-CAMERA") {
                let camerapos = o.camera.object3D.position;
                if (camerapos != null) {
                    obj['position'] = camerapos.x + ' ' + camerapos.y + ' ' + camerapos.z
                }
            }
            o.baseline.push(obj)
        });
        $('video').each(function () {
            if (this.classList.contains('peervideo')) return
            this.pause();
            this.currentTime = 0
        })
        $('audio').each(function () {
            if (this.classList.contains('peeraudio')) return
            this.pause();
            this.currentTime = 0
        })
        $('[sound]').each(function () {
            this.components.sound.stopSound()
        })
    },

    //Session
    startMedia: function () {
        for (i = 0; i < this.media.length; i++) {
            if (this.media[i].components != null && this.media[i].components.sound != null) {
                this.media[i].components.sound.playSound();
                this.media[i].components.sound.pauseSound();
            } else {
                this.media[i].playpause()
            }
        }
        
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
        
        if (!this.permissions.mute) {
            this.permissions.mute = true;
            this.sessionHandler('mute')
        }
    },
    sessionHandler: function (status, bol) {
        switch (status) {
            case 1:
                status = 'ready';
                break;
            case 2:
                status = 'intro';
                break;
            case 3:
                status = 'play';
                break;
            case 4:
                status = 'pause';
                break;
            case 5:
                status = 'replay';
                break;
            case 6:
                status = 'mute';
                break;
            case 7:
                status = 'question';
                break;
            case 8:
                status = 'action';
                break;
            case 9:
                status = 'end';
        }
        o.sceneEl.emit('status-' + status)
        this.masterControl(status)
        //0 - loading - no action
        if (status == "ready") {
            if (dev) console.log('status 1 ready')
            o.status = 1;
            // load pre
            if (o.timeline.pre != null) {
                this.timeline.pre();
                delete this.timeline.pre;
            }
        } 
        else if (status == "intro") { //2 - intro
            if (dev) console.log('status 2 intro')
            o.status = 2;
            // pre correction
            if (o.timeline.pre != null) {
                this.timeline.pre();
                delete this.timeline.pre;
            }

            $('a-scene canvas').show()
            o.camera.setAttribute('look-controls', {
                touchEnabled: true,
                mouseEnabled: true
            })
            if (this.data.hasIntro) {
                this.showIntro(true)
            } else {
                // load ini
                if (o.timeline.ini != null) {
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
                } else if (this.sceneEl.is("vr-mode")) {
                    $('ar').hide();
                    this.logo2d(false)
                    this.toggleZoom(false)
                    if (!this.menu3DIsOpen) this.toggleMenu(true);
                } else if (this.sceneEl.is("ar-mode")) {
                    this.logo2d(true)
                    this.toggleZoom(false)
                    if (this.data.hasARMenu) o.showARMenu()
                }
            }
        } 
        else if (status == "play") {
            if (dev) console.log('status 3 play')
            if (this.data.hasIntro) {
                this.sessionHandler(2)
                return
            }
            if (this.end && !this.replay) return
            if (this.data.has3DMenu && this.menu3DIsOpen) this.toggleMenu();
            if (!bol && (o.status == 7 || o.status == 8)) return
            if (o.override(bol)) {
                if (hide && this.status <= 2) this.startMedia();
                this.playSession()
                o.status = 3;
            }
            this.changeTargetClass()
        } 
        else if (status == "pause") {
            if (dev) console.log('status 4 pause')
            if (!o.override(bol)) return
            o.status = 4;
            this.pauseSession();
            if (this.sceneEl.is("2d-mode") && this.data.has2DMenu) return
            if (this.sceneEl.is("vr-mode") && this.data.has3DMenu) this.toggleMenu();
        } 
        else if (status == "replay") {
            if (dev) console.log('status 5 replay')
            if (!o.override(bol)) return
            o.status = 5;
            this.changeTargetClass()
            this.replay = true;
            this.pauseSession();
            this.wasPlaying = [];
            this.delay += this.run;
            this.run = 0;
            if (timeline != null) Object.assign(o.timeline, timeline);
            if (this.menu3DIsOpen) this.toggleMenu();
            if (this.menu2DIsOpen) this.overlayMenu();
            this.toggleZoom(false)
            $('#playmsg').show();
            $('#play').show();
            this.iniState();
        } 
        else if (status == "mute") {
            if (dev) console.log('status 6 mute', this.permissions.mute)
            if (this.permissions.mute) {
                $('#mute').html('volume_up');
                $('#mute').css('color', '#D0D0D0')
                for (i = 0; i < o.media.length; i++) {
                    if (o.media[i].components != null ){
                        if (o.media[i].components.sound != null) o.media[i].setAttribute('sound', 'volume', 1)
                        if (o.media[i].components.noise != null) o.media[i].setAttribute('noise', 'volume', 1)
                    } else {
                        o.media[i].muted = false;
                        if (o.media[i].id != 'introAudio') o.media[i].volume = 1;
                    }
                }
                
            } else {
                $('#mute').html('volume_off');
                $('#mute').css('color', 'red')
                for (i = 0; i < o.media.length; i++) {
                    if (o.media[i].components != null){
                        if (o.media[i].components.sound != null) o.media[i].setAttribute('sound', 'volume', 0)
                        if (o.media[i].components.noise != null) o.media[i].setAttribute('noise', 'volume', 0)
                    } else {
                        o.media[i].muted = true;
                        o.media[i].volume = 0;
                    }
                }
                
            }
            this.permissions.mute = !this.permissions.mute;
        } 
        else if (status == "question") { // questions
            if (dev) console.log('status 7 questions')
            o.status = 7;
            this.changeTargetClass();
            this.pauseSession();
            if (this.replay && this.end) return
            if (this.sceneEl.is("2d-mode") && this.data.has2DMenu) this.overlayMenu();
            this.createQuestion(0);
        } 
        else if (status == "action") { // user Action
            if (dev) console.log('status 8 action')
            if (o.status != 8) return
            if (this.sceneEl.is("2d-mode") && this.data.has2DMenu) this.overlayMenu();
            this.sessionHandler('play', true)
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
        else if (status == 'exit') { // exit
            if (dev) console.log('status 9 exit')
            if (!o.override(bol)) return
            if (!jQuery.isEmptyObject(this.questions)) return this.sessionHandler(7);
            for (i = 0; i < o.media.length; i++) {
                if (o.media[i].components != null && o.media[i].components.sound != null) {
                    o.media[i].components.sound.stopSound();
                } else {
                    o.media[i].currentTime = 0;
                    o.media[i].pause()
                }
            }
            if (this.sceneEl.is("2d-mode")) {
                this.camera.setAttribute('look-controls', 'enabled', false)
            }
            this.screenMsg('Obrigado por assistir!')
            setTimeout(function () {
                if (o.sceneEl.is("vr-mode")) {
                    o.screenMsg('Retire o seu óculos.')
                    setTimeout(function () {
                        (dev) ? document.location.reload(true) : window.location.href = "../estudar/index.html";
                    }, 10000);
                } else {
                    (dev) ? document.location.reload(true) : window.location.href = "../estudar/index.html";
                }
            }, 2500);
        }
    },
    pauseSession: function (ele) {
        $('video').each(function () {
            if (this.classList.contains('peervideo') || this.id == 'arvideo') return
            if (this.playing) {
                this.pause();
                //this.currentTime = o.run/1000;
                o.wasPlaying.push([this, "video", true])
            }
        })
        $('audio').each(function () {
            if (this.classList.contains('peeraudio')) return
            if (this.playing) {
                this.pause();
                //this.currentTime = o.run/1000;
                o.wasPlaying.push([this, "audio", true])
            }
        })
        $("a-scene *").each(function () {
            if (this.id == "svgCursor" || this.classList.contains('peer')) return
            if (this.components != null) {
                Object.keys(this.components).forEach(comp => {
                    if (comp == 'animation-mixer') {
                        if (this.components[comp].data.timeScale != 0) {
                            o.wasPlaying.push([this, comp, this.components[comp].data.timeScale]);
                            this.setAttribute("animation-mixer", {
                                timeScale: 0,
                                // startFrame: o.run
                            })
                        }
                    } else if (comp.includes('animation') && this.components[comp].animation != null && this.components[comp].animationIsPlaying && this != o.lid && (this.getAttribute('pOnP') != null && this.getAttribute('pOnP'))) {
                        this.components[comp].animationIsPlaying = false
                        o.wasPlaying.push([this, comp, true])
                    } else if (comp == "sound" && this.components.sound.isPlaying) {
                        this.components.sound.pool.children[0]["_progress"] = o.run / 1000;
                        this.components.sound.pauseSound();
                        o.wasPlaying.push([this, comp, true])
                    } else if (comp == "noise" && this.components.noise.audioNoiseNode) {
                        this.components.noise.stopNoise();
                        o.wasPlaying.push([this,comp,true])
                    }
                });
            }
        });
        $('#pause').text('play_arrow');
        $("#pause").attr("id", "play");
        if (o.movementType) o.cameraRig.setAttribute('movement-controls', {
            speed: 0.1,
            enabled: false
        });
    },
    playSession: function (ele) {
        o.wasPlaying.forEach((n) => {
            switch (n[1]) {
                case "video":
                case "audio":
                    n[0].play();
                    break
                case "animation-mixer":
                    n[0].setAttribute("animation-mixer", "timeScale", n[2])
                    break
                case "sound":
                    n[0].components.sound.playSound();
                    break
                case "noise":
                    n[0].components.noise.playNoise();
                break
                default:
                    n[0].components[n[1]].animationIsPlaying = true
            }
        });
        o.wasPlaying = [];
        $('#play').text('pause');
        $("#play").attr("id", "pause");
        $('#playmsg').hide();
        if (o.movementType) o.cameraRig.setAttribute('movement-controls', 'enabled', true);
    },
    userAction: function (type, data, bol, func) {
        this.status = 8;
        this.pauseSession();
        if (this.menu2DIsOpen) this.overlayMenu()
        if (this.menu3DIsOpen) this.toggleMenu()
        if (type == 'question') {
            o.createQuestion(data, '', bol ? 1 : 0)
            o.sceneEl.addEventListener('action', function () {
                o.sceneEl.removeEventListener('action', function () { })
                if (func) func();
                o.sessionHandler(8)
            }, {
                once: true
            })
        } else if (type == 'action') {
            this.dur.push('ac')
            this.dur.push(0)
            data.classList.add("aclickable");
            this.changeTargetClass()
            o.sceneEl.addEventListener('action', function () {
                data.classList.remove("aclickable");
                o.sceneEl.removeEventListener('action', function () { })
                if (func) func();
                if (bol) data.parentElement.removeChild(data);
                o.sessionHandler(8)
                o.dur[o.dur.length - 1] = Math.round(o.dur[o.dur.length - 1]);
            }, {
                once: true
            })
        }
    }, //ok
    rewind: function (time) {
        o.delay += o.run - time * 1000;
    }, //ok

    //Camera
    setupCamera: function () {
        let lid = document.createElement('a-plane');
        lid.setAttribute('width', 5);
        lid.setAttribute('height', 5);
        lid.setAttribute('material', {
            color: this.data.menuColor
        });
        lid.setAttribute('opacity', 0)
        lid.setAttribute('visible', false)
        lid.setAttribute('position', "0 0 -0.1");
        this.camera.appendChild(lid)
        this.lid = lid;
        lid.setAttribute("animation__fadein", {
            property: 'material.opacity',
            startEvents: 'fadein',
            from: 0,
            to: 1,
            dur: 150,
            easing: 'linear'
        })
        lid.setAttribute("animation__fadeout", {
            property: 'material.opacity',
            startEvents: 'fadeout',
            from: 1,
            to: 0,
            dur: 150,
            easing: 'linear'
        })

        o.camera.addEventListener("raycaster-intersection", function (e) {
            e.preventDefault()
            e.stopImmediatePropagation();
            let els = o.emitFiltered(e);
            e.target.emit('raycaster-intersection-filtered', {
                els: els
            })
            o.intersectListener(e, els, true)
        });
        o.camera.addEventListener("raycaster-intersection-cleared", function (e) {
            o.intersectListener(e, o.emitFiltered(e))
        });
    },
    fadeIn: function (color) {
        this.lid.setAttribute('material', {
            color: color || this.data.menuColor
        });
        this.lid.setAttribute('visible', true);
        this.lid.emit('fadein')
    },
    fadeOut: function () {
        this.lid.emit('fadeout')
        setTimeout(function () {
            o.lid.setAttribute('visible', false);
        }, 100);
    },
    fadeTo: function (color, pos, rot, fun) {
        this.fadeIn(color)
        setTimeout(function () {
            o.lid.setAttribute('visible', false)
            if (fun != null) fun();
            if (!pos) return;
            o.cameraRig.setAttribute('position', pos)
            if (!rot) return;
            o.cameraRig.setAttribute('rotation', rot)
        }, 250);
        setTimeout(function () {
            o.fadeOut()
        }, 500);
    },

    navigation: function () {
        o.camera.setAttribute('wasd-controls', 'enabled', false)

        $('a-assets').append('<a-mixin id="checkpoint" geometry="primitive: cylinder; radius: 0.5;height:0.01" material="color: #39BB82" checkpoint clickable hoverable></a-mixin>')
        
        o.cameraRig.addEventListener('navigation-start', function (e) {
            if (e.target.getAttribute('checkpoint-controls').mode == 'teleport') o.fadeIn('black')
        })
        o.cameraRig.addEventListener('navigation-end', function (e) {
            if (e.target.getAttribute('checkpoint-controls').mode == 'teleport') o.fadeOut()
        })
        o.curveRay = document.createElement('a-entity');
        o.sceneEl.appendChild(o.curveRay)

        let a = o.mode.charAt(0)
        if (a == 'f' || a == 'r') {
            this.movementType = false;
            //o.cameraRig.setAttribute('wasd-controls','enabled',false)
        } else if (a == 'w') {
            this.movementType = 'wasd'
            console.log(this.movementType + ' movement')
            o.cameraRig.setAttribute('movement-controls', {
                fly: o.data.cursorFly,
                controls: "gamepad,trackpad,keyboard,touch",
                enabled: false,
                speed: 0.2,
                camera: o.camera
            })
            // keyboard-controls: WASD + arrow controls for movement, and more.
            //touch-controls: Touch screen (or Cardboard button) to move forward. Touch-to-move-forward controls for mobile.
            // gamepad-controls: Gamepad-based rotation and movement.
            // trackpad-controls: Trackpad-based movement. 3dof (Gear VR, Daydream) controls for mobile.  
        } else if (a == "p" || a == "g" || a == "c") {
            this.movementType = 'checkpoint'
            console.log(this.movementType + ' movement')
            o.cameraRig.setAttribute('movement-controls', {
                controls: "checkpoint",
                enabled: false
            });
            o.cameraRig.setAttribute('checkpoint-controls', 'mode', 'animate');
            //o.cameraRig.setAttribute('checkpoint-controls','mode','teleport')
            //o.cameraRig.setAttribute('checkpoint-controls','animateSpeed',2) 
        }

        if (this.movementType && $('[nav]').length) {
            console.log('navmesh constrained')
            o.cameraRig.setAttribute('movement-controls', 'constrainToNavMesh', true)
        }
    },

    //Setup Online
    setupOnline: function () {
        AFRAME.registerComponent('onlinerig', {
            schema: {},
            init: function () {
                createdAudios = {}

                this.v = new THREE.Vector3()

                if (master && seats && seats.length > 0) {
                    o.cameraRig.setAttribute('position', seats[0][0])
                    o.cameraRig.setAttribute('rotation', seats[0][1])
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
                let arr = [o.cameraRig, o.camera, o.lhand, o.rhand];
                for (i = 0; i < arr.length; i++) {
                    if (!arr[i]) return
                    if (!arr[i].getAttribute('online-el')) arr[i].setAttribute('online-el', localCaller + '-' + i)
                }

                // registering self avatar
                if (o.selfAvatar.defined && !o.selfAvatar.sent) {
                    o.selfAvatar.sent = true;
                    o.cameraRig.components['online-el'].props = o.selfAvatar
                }

                for (const p in peer) {
                    if (remoteQueue[p + '-0'] && remoteQueue[p + '-0'][1]) {
                        if (!createdEls[p]) {
                            createdEls[p] = true;
                            this.createAvatar(p)
                        }
                    } else if (createdEls[p]) {
                        this.deleteAvatar(p)
                        delete createdEls[p]
                    }
                }
            },
            createAvatar: function (p) {
                console.log('avatar created', p)
                let props = remoteQueue[p + '-0'][1]

                let avatar = document.createElement('a-entity');
                avatar.setAttribute('class', 'peer');
                avatar.setAttribute('visible', false);
                avatar.setAttribute('online-el', p + '-0');
                //avatar.setAttribute('scale','0.3 0.3 0.3');

                let body = document.createElement('a-entity');
                body.setAttribute('class', 'body');
                body.setAttribute('position', '0 1.6 0');

                if (props.type == 'Homem') {
                    body.setAttribute('gltf-submodel', {
                        src: "#avatars",
                        part: "m2body"
                    });
                } else if (props.type == 'Homem1') {
                    body.setAttribute('gltf-submodel', {
                        src: "#avatars",
                        part: "m1body"
                    });
                } else if (props.type == 'Mulher') {
                    body.setAttribute('gltf-submodel', {
                        src: "#avatars",
                        part: "w1body"
                    });
                }
                body.setAttribute('gltf-material__hands', {
                    materials: "hands",
                    opacity: 0,
                });
                body.setAttribute('gltf-material__skin', {
                    materials: "skin",
                    color: props.color,
                });

                body.setAttribute('online-el', p + '-1');
                avatar.appendChild(body)

                let text = o.createText(props.name, "center", 0.15, "infinity", "black", "0 0.7 0", "0 0 0");
                text.setAttribute('rotation', '0 180 0');
                body.appendChild(text)

                let lhand = document.createElement('a-entity');
                lhand.setAttribute('class', 'lhand');
                lhand.setAttribute('visible', false);
                //lhand.setAttribute('gltf-submodel',{src: "#avatars",part: "lhand"});  

                //$("a-assets").append('<a-asset-item src="https://cdn.aframe.io/controllers/hands/leftHandLow.glb" id="lhandmodel"></a-asset-item>')

                lhand.setAttribute('gltf-model', "https://cdn.aframe.io/controllers/hands/leftHandLow.glb");

                lhand.setAttribute('gltf-material__skin', {
                    materials: "hands",
                    color: props.color,
                });
                lhand.setAttribute('online-el', p + '-2');
                avatar.appendChild(lhand)

                let rhand = document.createElement('a-entity');
                rhand.setAttribute('class', 'rhand');
                rhand.setAttribute('visible', false);
                //rhand.setAttribute('gltf-submodel',{src: "#avatars",part: "rhand"});  

                rhand.setAttribute('gltf-model', "https://cdn.aframe.io/controllers/hands/rightHandLow.glb");

                rhand.setAttribute('gltf-material__skin', {
                    materials: "hands",
                    color: props.color,
                });
                rhand.setAttribute('online-el', p + '-3');
                avatar.appendChild(rhand)

                if (onlineAudio[p + '-0']) {
                    let id = this.createAudio(avatar, p + '-0')
                    //set as positional sound?
                }
                o.dim3.appendChild(avatar)
            },
            deleteAvatar: function (p) {
                $('.peer').each(function () {
                    if (this.components['online-el'].data == p + '-0') {
                        this.parentElement.removeChild(this);
                    }
                })
            },
            createAudio: function (avatar, conid) {
                let audioEl = document.createElement('audio');
                audioEl.setAttribute("autoplay", "autoplay");
                audioEl.setAttribute("playsinline", "playsinline");

                let arr = Object.keys(onlineAudio);
                let index = arr.indexOf(conid);

                audioEl.setAttribute("id", "audio" + index);
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

                return "#audio" + index;
            },
        })
        o.sceneEl.setAttribute('onlinerig', '')
        o.selfAvatar = {
            type: "Homem",
            color: "#E8BEAC",
            name: "Orbinauta",
            defined: false,
            sent: false
        }
        $("#av-type p").on("click", function (e) {
            $("#av-type p").removeClass("av-active")
            o.selfAvatar.type = jQuery(this).text()
            jQuery(this).addClass("av-active")
        })
        $("#av-color p").on("click", function (e) {
            $("#av-color p").removeClass("av-active")
            o.selfAvatar.color = jQuery(this).css("background-color")
            if (!hide) $('#overlay').css("background-color", o.selfAvatar.color)
            jQuery(this).addClass("av-active")
        })
        $("#av-pick button").on("click", function (e) {
            let name = $('#av-pick input').val()
            if (!name) {
                $('#av-pick input').css('border', 'solid 2px red')
            } else {
                o.selfAvatar.name = name;
                o.selfAvatar.defined = true;
                $('#overlay').hide();
                o.changeMode($('#av-pick').attr("mode"));
                if (!hide) {
                    o.openFullscreen()
                    //screen.orientation.lock("landscape").then((v)=>{}, (m)=>{});
                    o.startMedia();
                }
                o.tryKeepScreenAlive(10);
                o.sessionHandler(2)

                // unmute avatars
                let arr = Object.keys(onlineAudio);
                for (i = 0; i < arr.length; i++) {
                    if ($('#audio' + i).length) {
                        $('#audio' + i)[0].muted = false;
                        $('#audio' + i)[0].volume = 1;
                    }
                }
            }
        })
    },
    pingDC: function (dcArr, el, data) {
        dcArr.forEach(function (item, index, arr) {
            if (item.readyState != "open") return
            let obj = {}
            obj[el] = data;
            item.send(JSON.stringify(obj))
        })
    },
    override: function (override) {
        if (this.multi && !master && (!override && peerConnected)) return false
        return true
    },
    masterControl: function (status) {
        if (!this.multi || !master) return
        dC2s.forEach(function (item) {
            if (item.readyState != "open") return
            item.send(JSON.stringify([status]))
        })
    },
    muteMedia: function (el) {
        if (!master) return
        let conid = jQuery(el.parentElement).data("conid")
        let mute = !el.checked
        let type = 'audio'
        if (el.name.slice(-1) == 'v') type = 'video'

        if (type == "audio") {
            let arr = Object.keys(onlineAudio);
            let index = arr.indexOf(conid);
            if (mute) {
                $('#audio' + index)[0].volume = 0;
                $('#audio' + index)[0].muted = true;
            } else {
                $('#audio' + index)[0].volume = 1;
                $('#audio' + index)[0].muted = false;
            }
        } else if (type == "video") {

        }
        dC2s.forEach(function (item) {
            if (item.readyState != "open") return
            item.send(JSON.stringify([conid, type, mute]))
        })

    },
    muteAllMedia: function (type = 'audio') {
        if (!master) return
        let mute = !el.checked
        if (type == 'video') type = 'video'

        if (type == "audio") {
            let arr = Object.keys(onlineAudio);
            for (i = 0; i < arr.length; i++) {
                if (mute) {
                    $('#audio' + index)[0].volume = 0;
                    $('#audio' + index)[0].muted = true;
                } else {
                    $('#audio' + index)[0].volume = 1;
                    $('#audio' + index)[0].muted = false;
                }
            }
        } else if (type == "video") {

        }
        dC2s.forEach(function (item) {
            if (item.readyState != "open") return
            item.send(JSON.stringify([conid, type, mute]))
        })

    },

    //AR
    setARSystem: function () {
        //create AR Video
        o.ARvideo.id = 'arvideo';
        o.ARvideo.setAttribute('autoplay', '');
        o.ARvideo.setAttribute('muted', '');
        o.ARvideo.setAttribute('playsinline', '');
        o.ARvideo.style.objectFit = 'fill';
        o.ARvideo.style.position = 'absolute'
        o.ARvideo.style.left = '0px'
        o.ARvideo.style.zIndex = '-2'
        o.ARvideo.addEventListener('loadedmetadata', () => {
            o.deleteSphere()
            o.ARvideo.setAttribute('width', o.ARvideo.videoWidth);
            o.ARvideo.setAttribute('height', o.ARvideo.videoHeight);
            if (o.ARsystem[0] >= 5) {
                o.ARsystem[1]._startAR();
            } else if (o.ARsystem[0] == 1) {
                o.arResize()
            }
            o.canvas.style.backgroundColor = "transparent";
            $("#ar_loading").hide()
        });

        if (o.sceneEl.systems['mindar-image-system']) {
            o.ARsystem.push(5)
            o.ARsystem.push(o.sceneEl.systems['mindar-image-system'])

        } else if (o.sceneEl.systems['mindar-face-system']) {
            o.ARsystem.push(7)
            o.ARsystem.push(o.sceneEl.systems['mindar-face-system'])

        } else if (AFRAME.components['gps-new-camera']) {
            o.ARsystem.push(1)
            //this.ARsystem.push(o.sceneEl.systems.arjs)
        } else if (o.sceneEl.systems.ar) {
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
    changeCamera: function () {
        if (!o.stream) return
        o.canvas.style.backgroundColor = o.data.menuColor; //'#D0D0D0'
        $("#ar_loading").show()

        let index = o.ARcameras.indexOf(o.ARcamera);
        if (index == o.ARcameras.length - 1) {
            o.ARcamera = o.ARcameras[0]
        } else {
            o.ARcamera = o.ARcameras[index + 1]
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
        } else if (o.ARsystem[0] == 1) {

        }
        o.getARMedia()
    },
    toggleAR: function () {
        if ($('ar main').css('right') == '0px') {
            $('ar main').animate({
                right: "-176px"
            }, 200);
            $('ar main footer').animate({
                right: "-176px"
            }, 200);
            $('#toggle-btn').animate({
                right: "5px"
            }, 200);
            $('#zoom-btn').animate({
                right: "5px"
            }, 200);
            $('#turn-btn').css('left', "50%");
            $('#toggle-btn i').removeClass('rot180')
            this.lim_max_x = window.innerWidth
        } else {
            $('ar main').animate({
                right: "0px"
            }, 200);
            $('ar main footer').animate({
                right: "0px"
            }, 200);
            $('#toggle-btn').animate({
                right: "176px"
            }, 200);
            $('#zoom-btn').animate({
                right: "176px"
            }, 200);
            $('#turn-btn').css('left', "calc((100% - 176px)/2)");
            $('#toggle-btn i').addClass('rot180')
            this.lim_max_x = window.innerWidth - $('ar main').width()
        }

    },
    loadAR: function () {
        if (o.data.hasIntro) {
            o.sceneEl.addEventListener('introend', function () {
                o.loadAR()
            }, {
                once: true
            })
            return
        }

        if (dev) console.log('loading AR')
        $("#ar_loading").show()

        // distach matrix from actual position
        o.arVisible(false)

        // reload media
        o.getARMedia()
    },
    getARMedia() {

        //if (o.mode.charAt(2) == 0 && !AFRAME.utils.device.checkARSupport()) return 

        o.toggleIcons('ar')
        let video = {
            facingMode: "environment",
            width: {
                max: 4619
            }, //ideal: 4032, 
            height: {
                ideal: 720,
                max: 1080
            }
        }
        //if (o.ARcamera) video = {deviceId: {exact:o.ARcamera}}
        let constraints = {
            video: video
        };
        $('#buttons').css('opacity', 0)
        $('#buttons').css('z-index', -10)

        navigator.mediaDevices.getUserMedia(constraints).then(
            (t => {
                // mirror for front cam
                if (t.getVideoTracks()[0].getSettings().facingMode == 'user') {
                    o.canvas.classList.add('mirrorcam')
                    o.ARvideo.classList.add('mirrorcam')
                } else {
                    o.canvas.classList.remove('mirrorcam')
                    o.ARvideo.classList.remove('mirrorcam')
                }

                if (o.status <= 1) {
                    o.toggleIcons('ar', true)
                    t.getTracks().forEach(function (i) {
                        i.stop();
                    })
                    o.sceneEl.emit('arReady')
                    if (!geo) {
                        $('#buttons').css('opacity', 1)
                        $('#buttons').css('z-index', 1)
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

                    } else if (o.ARsystem[0] == 1) {
                        o.dim3.setAttribute("arjs-webcam-texture", !0)
                        $("[arjs-webcam-texture]")[0].components['arjs-webcam-texture'].video = o.ARvideo;
                    }
                    o.ARvideo.srcObject = t;

                    $("#ar_loading").hide()
                }
            })).catch(
                (t => {
                    if (o.status > 1) {
                        if (o.ARcameras.length > 1) {
                            return o.changeCamera()
                        }
                        console.log(t)
                        alert("Câmera bloqueada")
                        o.changeMode('2d-mode')
                    } else {
                        if (!geo) {
                            $('#buttons').css('opacity', 1)
                            $('#buttons').css('z-index', 1)
                        }
                    }
                    o.unloadAR()
                })
            )
    },
    unloadAR: function () {
        if (dev) console.log('unloading AR')

        o.sceneLoaded(function () {

            // arjs pause 
            //system = o.sceneEl.systems['arjs']


            if (o.ARsystem[0] >= 5) {
                if (o.ARsystem[1].processingImage) {
                    o.ARsystem[1].processingImage = false;
                    o.ARsystem[1].stop()
                }
                o.arVisible(true)
            } else if (o.ARsystem[0] == 1) {

            }
            o.canvas.classList.remove('mirrorcam')
            o.data.targetClass = 'any'
        })
    },
    arVisible: function (bol) {
        let arr = $('[mindar-image-target]')
        for (i = 0; i < arr.length; i++) {
            if (!arr[i].object3D) continue
            // return matrix to original position
            arr[i].object3D.matrixAutoUpdate = bol;
            // make visible
            arr[i].object3D.visible = bol;
            //arr[i].object3D.matrixAutoUpdate = false;
            //arr[i].components['mindar-image-target'].updateWorldMatrix(null, )
        }
        o.cameraRig.object3D.position.y = (bol) ? -1.6 : 0;
        o.cameraRig.object3D.position.z = (bol) ? 5 : 0;
        let cam = o.camera.components.camera.camera;
        cam.near = (bol) ? 0.01 : 10;
        cam.fov = (bol) ? 45 : 80;
        o.zoom[1] = cam.fov;
        o.setZoom(null, 0, 0)
    },
    arResize: function () {
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
    slideMode: function (e) {
        e.disabled = true;
        if (e.checked) {
            o.changeMode(e.parentElement.children[3].innerHTML + '-mode')
            e.previousElementSibling.className = "notactive";
            e.nextElementSibling.nextElementSibling.className = "active";
        } else {
            o.changeMode('2d-mode')
            e.previousElementSibling.className = "active";
            e.nextElementSibling.nextElementSibling.className = "notactive";
        }
        setTimeout(function () {
            e.disabled = false;
        }, 1000);
    }, // ok
    simulate: function () {
        if (this.data.hasIntro && !this.data.hasARMenu) return

        if (this.status == 3) {
            this.sessionHandler('pause')
            $("#playProg p").text("Simular")
            $("#playProg i").text("play_arrow")
        } else {
            this.sessionHandler('play')
            $("#playProg p").text("Parar")
            $("#playProg i").text("stop")
        }

        ARstate.simulation.status = (this.status == 3) ? "running" : "stopped";
        ARmsg.simulation.status = (this.status == 3) ? "running" : "stopped";

        if (this.permissions.msg) o.sendMsg(ARmsg)
    }, // ok

    loadARMenu: function () {
        let foot = $('ar footer').detach();
        $('ar main').empty()
        $("ar main").append('<row></row>')
        $("ar main").append(foot)
        if (ARMenu instanceof Function) ARMenu()
        $("ar main footer").empty()
        $("ar main footer").append('<p id="ar_version">' + modName + ' <b>' + version + '</b></p>')
        o.selectListeners();
    }, // ok

    //ARTitles
    addARTitle: function (text, id) {
        let cl = "notactive";
        if ($("ar main row p").length == 0) cl = "active"

        // create row title
        $("ar main row").append('<p id="' + id + '" onclick="o.openSubMenu(this.id)" class="' + cl + '">' + text + '</p>')

        // create section
        $("ar main").append('<div id="' + id + '-sub" class="scroller"></div>')
        if (cl == "active") $('#' + id + '-sub').show();

        // correct centralization
        if ($("ar main row p").length == 1) {
            $("ar main row").css('justify-content', 'center')
        } else {
            $("ar main row").css('justify-content', 'space-between')
        }
    }, // ok
    openSubMenu: function (id) {
        o.loadARMenu()
        let cl = $('#' + id).attr('class')
        if (cl == 'active') return
        $('#' + id)[0].parentNode.querySelector('.active').className = "notactive";
        $('#' + id)[0].className = "active";
        $('.scroller').hide();
        $('#' + id + '-sub').show();
        //$("ar main footer").empty();
        //$("ar main footer").append('<p id="ar_version">'+modName+' <b>'+version+'</b></p>')
    }, // ok

    //ARSections
    addARSection: function (id, arr) {
        $("#" + id + '-sub').empty()
        for (i = 0; i < arr.length; i++) {
            $("#" + id + '-sub').append(arr[i])
        }
    }, // ok

    //ARParts
    addARPart: function (id, title, tag, code, arr) {
        $("#" + code).remove();
        let html = '';

        let position;
        // open parts that are visible in AR
        if (o.sceneEl.is('ar-mode')) {
            if (document.getElementById(code + 'AR').object3D.visible) position = true;
        }
        // open parts that have position
        else {
            if (ARstate) position = o.getObj(ARstate, tag).position;
        }

        html += '<article class="ar_part ar_check"><span><label><input type="checkbox"';
        if (position) html += ' checked';
        html += ' id="' + code + '_check" onclick="o.openPart(this.id)"><div><b>&#10003;</b></div></label><h5 onclick="o.openPart(this)">' + title + '</h5></span><ul id="' + code + '_colap"';
        if (position) html += ' style="display:block"';
        html += '>';
        for (i = 0; i < arr.length; i++) {
            html += '<li>' + arr[i] + '</li>';
        }
        html += '</ul></article>';
        $("#" + id + '-sub').append(html)
    },
    openPart: function (part, ini) {
        let ele;
        if (typeof part != 'string') {
            part = $(part.parentElement)[0].querySelector('label input').id;
            ele = document.getElementById(part)
            ele.checked = !ele.checked
        } else {
            ele = document.getElementById(part)
        }
        let type = part.slice(0, -6); //ani, MT0, MT1, UT0, SE0, SE1 
        let modelid = type + 'Model';
        let model = document.getElementById(modelid)

        if (!o.sceneEl.is('ar-mode')) {
            if (ele.checked) {
                ele.setAttribute('manual', true)
                document.getElementById(type + "_colap").style.display = "block";
                model.setAttribute('visible', true)
                model.emit('show')
            } else {
                ele.removeAttribute('manual')
                document.getElementById(type + "_colap").style.display = "none";
                model.setAttribute('visible', false)
                model.emit('hide')
            }
            return
        }

        if (ini) {
            model.setAttribute('visible', true)
            ele.checked = true
            document.getElementById(type + "_colap").style.display = "block";
            return
        }
        if (ele.checked) {
            model.setAttribute('visible', true)
            document.getElementById(type + "_colap").style.display = "block";
        } else {
            model.setAttribute('visible', false)
            document.getElementById(type + "_colap").style.display = "none";
            $("#turn-btn").css('display', "none")
        }
    },

    subCreate: function (n) {
        let html = "<section><h4 style='margin:0'>" + n + "</h4></section>"
        return html
    }, // ok
    checkCreate: function (n, id) {
        let html = '<article class="ar_check"><span><label id="' + id + '"><input onclick="o.checkClick(this.parentElement)" type="checkbox"><div><b>&#10003;</b></div></label><h5>' + n + '</h5></span></article>';
        return html
    }, // ok
    checkClick: function (el) {
        o.setEvt(ARstate, el.id, {
            value: el.firstChild.checked ? 1 : 0
        })

        if (el.id == 'dots_eraser') {
            let els = $('.dotX')
            for (i = 0; i < els.length; i++) {
                els[i].object3D.visible = !!el.firstChild.checked;
            }
        }

    }, // ok   
    infoCreate: function (n, id, info, unit) {
        let html = "<article class='ar_info'><span id='" + id + "'><p>" + n + "</p><p>" + info + "</p><p> " + unit + "</p></span>"
        return html
    }, // ok 
    warnCreate: function (n, id) {
        let html = "<p class='ar_warn' id='" + id + "'>" + n + "</p>"
        return html
    }, // ok 
    submitCreate: function (n, id) {
        let html = "<article class='ar_submit' id='" + id + "'><p>" + n + "</p></article>"
        return html
    },

    //ARSwitches
    switchCreate: function (title, arr, tag = 'main') {
        let html = "<section><h4>" + title + "</h4>"
        arr.forEach(function (item) {
            let active = "active";
            let notactive = "notactive";
            let checked;

            let val;
            if (tag == 'main') {
                val = o.getObj(ARstate, item[0])
            } else {
                val = o.getObj(ARstate, tag)[item[0]]
            }
            if (ARstate && val == 1) {
                active = "notactive";
                notactive = "active";
                checked = true;
            }

            html += '<article class="ar_slider"><p class="' + tag + '_switch ' + active + '"  onclick="o.switchClick(this)">' + item[1] + '</p><label><input type="checkbox"';
            if (checked) {
                html += ' checked data-val="0"';
            } else {
                html += ' data-val="1"';
            }
            html += ' id="' + item[0] + '" class="' + tag + '_switch" onclick="o.switchClick(this)"><article class="toggle round"></article></label><p class="' + tag + '_switch ' + notactive + '" onclick="o.switchClick(this)">' + item[2] + '</p></article>';
        });
        return html + '</section>';
    }, // ok
    switchClick: function (el) {
        let tag = el.classList[0] //.slice(0, -7);
        let act = el.classList[1]
        let ele = el.parentElement.querySelector('label input')
        let val = 0;

        if (!act) {
            if (el.checked) {
                el.parentElement.previousElementSibling.className = tag + " notactive";
                el.parentElement.nextElementSibling.className = tag + " active";
                val = 1;
            } else {
                el.parentElement.previousElementSibling.className = tag + " active";
                el.parentElement.nextElementSibling.className = tag + " notactive";
            }
        } else if (act == "notactive") {

            el.parentElement.querySelector('.active').className = tag + " notactive";
            el.className = tag + " active";

            if (!el.nextElementSibling) {
                ele.checked = true;
                val = 1
            } else {
                ele.checked = false
            }
        }

        if (tag == 'main_switch') {
            o.setEvt(ARstate, ele.id, {
                value: val
            })
        } else {
            let obj = {}
            obj[ele.id] = val
            o.setEvt(ARstate, tag.slice(0, -7), obj)
        }
    }, // ok

    //ARBtn
    btnCreate: function (title, n, tag = 'main') {
        let html = "<section><h4>" + title + "</h4><spans>"
        for (i = 0; i < n; i++) {
            html += "<span><span id='button_" + i + "' class='" + tag + "_arbutton' onmousedown='o.btnClick(this,1)' onmouseup='o.btnClick(this,0)'><span></span></span><p>B" + i + "</p></span>"
        }
        html += "</spans></section>";
        return html
    }, // ok
    btnClick: function (self, val) {
        let id = self.id;
        let tag = self.classList[0].slice(0, -9);
        let el = self.nextElementSibling;

        (val == 1) ? el.className = "active" : el.className = "notactive";

        if (tag == 'main') {
            o.setEvt(ARstate, id, {
                value: val
            })
        } else {
            let obj = {}
            obj[id] = val
            o.setEvt(ARstate, tag, obj)
        }

    }, // ok

    //ARSlide
    sliderCreate: function (title, tag) {
        if (!ARparams) return
        let arr = ARparams[tag + 'val'];
        let val = o.getObj(ARstate, tag);
        if (typeof val === 'object' && !Array.isArray(val) && val !== null) {
            val = val.value;
        }
        if (ARstate && arr && arr[0]) ARparams[tag + 'val'][0] = val
        let html = "<section><p>";
        if (tag == "ldr") {
            html += title;
        } else if (arr[3] != '') {
            html += title + " (" + arr[3] + ")";
        } else {
            html += title;
        }
        html += "</p><div class='slidecontainer'><input type='range' min='" + arr[1] + "' max='" + arr[2] + "' value='" + Math.round(o.map(arr[0], 0, 1, arr[1], arr[2])) + "' class='slider' id='" + tag + "_range' oninput='o.sliderClick(this.id)'>";
        (arr[4] != null) ? html += "<p style='position:absolute;bottom: 25px;left: 0px;'><i class='material-icons-outlined md-16'>" + arr[4] + "</i></p>" : html += "<p style='position:absolute;bottom: 25px;left: 5px;'>" + arr[1] + "</p>";
        html += "<b class='rangeval'>" + Math.round(o.map(arr[0], 0, 1, arr[1], arr[2])) + "</b>";
        (arr[5] != null) ? html += "<p style='position: absolute; bottom: 25px; right:-5px;'><i class='material-icons-outlined md-16'>" + arr[5] + "</i></p>" : html += "<p style='position: absolute; bottom: 25px; right:-5px;'>" + arr[2] + "</p>";
        html += "</div></section>";

        if (tag == "ldr") o.ldrChange(val)

        return html
    }, // ok
    sliderClick: function (id, bol) {
        var index = id.slice(0, -6);
        var slider = document.getElementById(id);
        var output = slider.parentElement.querySelector('.rangeval')
        let val = o.map(slider.value, ARparams[index + "val"][1], ARparams[index + "val"][2], 0, 1)
        ARparams[index + "val"][0] = val
        output.innerHTML = slider.value;
        if (index == "ldr") o.ldrChange(val)
        if (!bol) o.setEvt(ARstate, index, {
            value: parseFloat(val.toFixed(3))
        })
    }, // ok 
    ldrChange: function (val) {
        if (o.sceneEl.is('2d-mode')) {
            Array.prototype.forEach.call(o.lights, function (node) {
                let old = node.getAttribute('light').intensity;
                if (node.getAttribute('oldARint') == null) node.setAttribute("oldARint", old);
                node.setAttribute('light', 'intensity', o.map(val, 0, 1, 0.3, node.getAttribute("oldARint") * 2))
            });
        } else {
            $("video").css('filter', 'brightness(' + val * 200 + '%)')
        }
    }, // ok

    selectCreate: function (arr) { 
        let html = '<span class="material-icons-outlined md-20" style="visibility:hidden">add_box</span>';
        html += '<h5>' + arr[1] + '</h5>';
        html += o.returnOptions(arr[2], arr[0].slice(-1), arr[0].slice(0, -1), arr[3], arr[2].charAt(0));
        return html;
    }, //ARSelect
    selectMultiCreate: function (arr, minus) {
        let html = '<span class="material-icons-outlined md-20"';
        if (minus) {
            html += ' onclick="o.removeSelect(this)" data-arr="' + arr + '">indeterminate_check_box</span>'
        } else {
            html += ' onclick="o.addSelect(this)" data-arr="' + arr + '">add_box</span>'
        }
        html += '<h5>' + arr[1] + '</h5>';
        html += o.returnOptions(arr[2], arr[0].slice(-1), arr[0].slice(0, -1), arr[3], arr[2].charAt(0), true);
        return html;
    },
    addSelect: function (el) {
        let arr = el.dataset.arr.split(',');
        if ($('.' + arr[2] + arr[0].substring(arr[0].length - 1) + '.' + arr[0].slice(0, -1)).length == 3) return

        let arr2 = [arr[0], arr[1], arr[2]]
        let arr3 = []
        for (i = 3; i < arr.length; i++) {
            arr3.push(arr[i])
        }
        arr2[3] = arr3;
        $(el.parentElement).after('<li>' + o.selectMultiCreate(arr2, true) + '</li>');
        o.selectListeners()
    },
    removeSelect: function (el) {
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
    selectListeners: function (el) {
        $('.ar_part select').off('change')
        $('.ar_part select').on('change', function (e) {
            if (this.status == 3) $("#playProg").click()
            let old = $(e.target).attr('old')
            let id = e.target.classList[0]
            let localPin = id.substring(0, 1);
            let otherPin = $(e.target).val();
            let other;
            if (otherPin != '') {
                if (!otherPin.split(" ")[1]) {
                    other = o.ARparts.main
                } else {
                    other = otherPin.split(" ")[1];
                }
                // register old
                if (!old) {
                    $(e.target).attr('old', otherPin)
                } else if (old && otherPin != old) {
                    var index = o.usedPins.indexOf(old);
                    if (index !== -1) o.usedPins.splice(index, 1);
                    $(e.target).attr('old', otherPin);
                }
            } else {
                var index = o.usedPins.indexOf(old);
                if (index !== -1) o.usedPins.splice(index, 1);
                $(e.target).removeAttr("old");
            }
            let num = id.substring(id.length - 1);
            let type = e.target.classList[1];
            let el = type + num;
            if (other && !ARparams.multiple) o.usedPins.push(otherPin)

            // update other options
            document.querySelectorAll(".ar_part ul select").forEach(sel => {
                [...sel.children].forEach(opt => {
                    if (opt.value == '' || opt.selected) return

                    if (o.usedPins.includes(opt.value)) {
                        opt.disabled = true
                    } else {
                        opt.disabled = false;
                    }
                    $('.' + id + "." + type).each(function () {
                        if (opt.parentElement.classList[0] == id && opt.parentElement.classList[1] == type) {
                            if ($(this).val() == opt.value && !this.hasAttribute("data-multi")) opt.disabled = true
                        }
                    });
                });
            });

            // removing wires if changes
            if (o.ARwires[el] && o.ARwires[el][localPin] && old) {
                let arr = String(old).split(' ');
                if (!arr[1]) arr[1] = o.ARparts.main;

                let id = el + "_" + localPin + "_" + arr[1] + "_" + arr[0]

                o.removeWire(id)

                let arr2 = ARparams.autoPins[arr[0] + ' ' + arr[1]]
                if (arr2) {
                    for (i = 0; i < arr2.length; i += 2) {
                        let arr3 = String(arr2[i + 1]).split(' ');
                        let id = el + "_" + arr2[i] + "_" + arr3[1] + "_" + arr3[0]
                        o.removeWire(id)
                    }
                }
            }

            if (!(otherPin == '' || !otherPin)) {
                o.ARwires[el][localPin].push(otherPin);
                if (ARparams.autoPins[otherPin]) {
                    let arr = ARparams.autoPins[otherPin];
                    for (i = 0; i < arr.length; i += 2) {
                        o.ARwires[el][arr[i]].push(arr[i + 1]);
                    }
                }
            } else {
                otherPin = ARparams.none || -1
            }
            let obj = {}

            if (e.target.hasAttribute("data-multi")) {
                let pin = o.getObj(ARstate, o.ARparts[el].name)[id.slice(0, -1)]

                if (otherPin == ARparams.none || otherPin == -1) {
                    if (pin.length == 1) {
                        obj[id.slice(0, -1)] = otherPin;
                    } else if (Array.isArray(pin)) {
                        var index = pin.indexOf(old);
                        if (index !== -1) pin.splice(index, 1);
                        obj[id.slice(0, -1)] = pin;
                    }
                } else if (pin == ARparams.none || pin == -1) {
                    obj[id.slice(0, -1)] = [otherPin];
                } else {
                    var index = pin.indexOf(old);
                    if (index !== -1) pin.splice(index, 1);
                    pin.push(otherPin)
                    obj[id.slice(0, -1)] = pin;
                }
            } else {
                obj[id.slice(0, -1)] = otherPin;
            }
            o.setEvt(ARstate, o.ARparts[el].name, obj)
        });
    },
    returnOptions: function (name, num, type, pins, pin, multi) {
        let html = "<select ";
        if (multi) html += "data-multi='' "
        html += "class='" + name + num + " " + type + "'>";
        let html2 = "<option></option>";
        for (i = 0; i < pins.length; i++) {
            let disabled = false;
            let arr = String(pins[i]).split(' ');

            if (!ARparams.multiple) pins[i] = arr[0];

            if (o.ARwires[type + num] != null && o.ARwires[type + num][pin] && o.ARwires[type + num][pin].includes(pins[i]) && !multi) {
                html = "<select class='" + name + num + " " + type + "' old='" + pins[i] + "'>"
                html2 += "<option selected='selected'>";
            } else {
                html2 += "<option";
                if (o.usedPins.includes(pins[i])) {
                    disabled = true;
                }
                $('.' + name + num + "." + type).each(function () {
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
        return html + html2
    },

    //AR utils
    getPins: function (name) {
        return o.ARparts[name].pins
    },
    removeWire: function (id) {
        let arr = id.split('_')
        // Delete model
        const index = o.ARwires.all.indexOf(id);
        if (index > -1) {
            o.ARwires.all.splice(index, 1);
            $('#' + id)[0].parentNode.removeChild($('#' + id)[0])
        }
        // Delete from ARwires
        const index2 = o.ARwires[arr[0]][arr[1]].indexOf(arr[3] + ' ' + arr[2]);
        const index3 = o.ARwires[arr[0]][arr[1]].indexOf(arr[3]);
        if (index2 > -1) {
            o.ARwires[arr[0]][arr[1]].splice(index2, 1);
        } else if (index3 > -1) {
            o.ARwires[arr[0]][arr[1]].splice(index3, 1);
        }
    },

    //AR GPS
    addARMark: function () {
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
    remARMark: function () {
        let rem = o.ARmarks.pop();
        o.copyARMark()
    },
    copyARMark: function () {
        o.copyToClipboard(o.ARmarks.toString(),
            () => {
                $('#markmsg').text('Marks copiados.')
                setTimeout(function () {
                    $('#markmsg').text(o.ARmarks.length + ' marks criados')
                }, 1000)
            },
            () => {
                $('#markmsg').text('Erro ao copiar')
                setTimeout(function () {
                    $('#markmsg').text(o.ARmarks.length + ' marks criados')
                }, 1000)
            }
        )
    },
    setARMark: function (str, model) {
        let arr = str.split(",");
        for (i = 0; i < arr.length; i += 5) {
            let el = document.createElement("a-entity");
            if (model) {
                el.setAttribute('gltf-submodel', {
                    src: model,
                    part: arr[i + 1]
                })
            } else {
                el.setAttribute('geometry', {
                    primitive: 'sphere',
                    radius: 0.5
                })
            }
            el.setAttribute('gps-new-entity-place', {
                latitude: arr[i + 3],
                longitude: arr[i + 4]
            });
            el.classList.add(arr[i + 1]);
            el.object3D.position.y = arr[i + 2];
            o.dim3.appendChild(el);
            return el;
        }
    },

    //AR DOTS
    isPart: function (el, parent) {
        var bol;
        for (var n in el) {
            el = el.parentNode;
            if (el.nodeName == parent) {
                bol = true;
                break;
            }
        }
        return bol
    },

    corrections: function () {
        Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
            get: function () {
                return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
            }
        })
        HTMLMediaElement.prototype.playpause = function () {
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

            for (var i = 0, l = this.length; i < l; i++) {
                // Check if we have nested arrays
                if (this[i] instanceof Array && array[i] instanceof Array) {
                    // recurse into the nested arrays
                    if (!this[i].equals(array[i]))
                        return false;
                } else if (typeof this[i] === 'string') {
                    if (this[i] != array[i]) return false;
                } else if (typeof this[i] !== 'string') {
                    if (Math.abs(Math.abs(this[i]) - Math.abs(array[i])) > Math.pow(10, -(o.data.precision - 1))) {
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
        Object.defineProperty(Array.prototype, "equals", {
            enumerable: false
        });
        THREE.Matrix4.prototype.getInverse = function getInverse(matrix) {
            return this.copy(matrix).invert();
        }
        THREE.Quaternion.prototype.inverse = function () {
            return this.invert();
        };
        HTMLElement.prototype.alpha = function (a) {
            current_color = getComputedStyle(this).getPropertyValue("background-color");
            match = /rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*\d+[\.\d+]*)*\)/g.exec(current_color)
            a = a > 1 ? (a / 100) : a;
            this.style.backgroundColor = "rgba(" + [match[1], match[2], match[3], a].join(',') + ")";
        }
        THREE.Material.prototype.setValues = function (values) {
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
        THREE.BufferGeometry.prototype.applyMatrix = function (matrix) {
            return this.applyMatrix4(matrix);
        };
        THREE.BufferAttribute.prototype.setDynamic = function (value) {
            this.setUsage(value === true ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage);
            return this;
        }
        THREE.BufferGeometry.prototype.addAttribute = function (name, attribute) {
            if (!(attribute && attribute.isBufferAttribute) && !(attribute && attribute.isInterleavedBufferAttribute)) {
                return this.setAttribute(name, new BufferAttribute(arguments[1], arguments[2]));
            }
            if (name === 'index') {
                this.setIndex(attribute);
                return this;
            }
            return this.setAttribute(name, attribute);
        }

        // block touch on buttons
        AFRAME.components['tracked-controls-webvr'].Component.prototype.handleTouch = function (id, buttonState) { }
        AFRAME.components['tracked-controls-webxr'].Component.prototype.handleTouch = function (id, buttonState) { }

        // Grabbable fix
        if (AFRAME.components["super-hands"]) { 
            AFRAME.components.grabbable.Component.prototype.start = function (evt) {
                console.log('grab triggered')
                if (evt.defaultPrevented || !this.startButtonOk(evt)) {
                  return
                }
                // room for more grabbers?
                
                let hand = evt.detail.hand;
                
                const grabAvailable = !Number.isFinite(this.data.maxGrabbers) ||
                    this.grabbers.length < this.data.maxGrabbers

                if (this.grabbers.indexOf(hand) === -1 && grabAvailable) {
                    if (!hand.object3D) {
                        console.warn('grabbable entities must have an object3D')
                        return
                    }
                    this.grabbers.push(hand) 

                    // check if is pinchable
                    //if (!evt.target.hasAttribute('pinchable') && evt.detail[Object.keys(evt.detail)[0]].type == 'pinchstarted') return

                    // initiate physics if available, otherwise manual
                    
                    /*
                    if (this.el.hasAttribute('physx-body') && evt.detail.hand.hasAttribute('physx-body')){
                        console.log('physx-joint set')
                        
                        const newConId = Math.random().toString(36).substr(2, 9)
                        //const newConId = 'r'
                        this.constraints.set(evt.detail.hand, newConId)

                        //this.el.components['physx-body'].
                        this.el.setAttribute('physx-joint__' + newConId,{
                            target: evt.detail.hand,
                            type: 'D6',//'Distance',
                            collideWithTarget: true
                        })
                        this.el.setAttribute('physx-joint-constraint__' + newConId,{
                            lockedAxes: 'x,y,z,twist,swing'
                        })
                        

                    } else {
                        this.grabber = evt.detail.hand;
                        this.resetGrabber()    
                    }    
                    */
                    
                    // register grabbed at grabber
                    if (hand) {
                        hand.grabbedEl = [this.el]
                        hand.grabbedEl.push(hand.object3D.position.length())
                    }
                    
                    //this.el.getObject3D("mesh")
                                      
                    if (hand.classList.contains('finger-collider')) {
                        console.log(99)
                        evt.detail.hand.object3D.attach(this.el.object3D)
                        
                    } else if (!this.physicsStart(evt) && !this.grabber) {
                        this.grabber = hand
                        this.resetGrabber()
                    }
                    
                    // notify super-hands that the gesture was accepted
                    if (evt.preventDefault) { evt.preventDefault() }
                    this.grabbed = true
                    this.el.addState(this.GRABBED_STATE)
                }
                //console.log(2,this.grabber)
            }
            AFRAME.components.grabbable.Component.prototype.end = function (evt) {
                console.log('grab untriggered')
                const handIndex = this.grabbers.indexOf(evt.detail.hand)
                if (evt.defaultPrevented || !this.endButtonOk(evt)) { return }
                if (handIndex !== -1) {
                    this.grabbers.splice(handIndex, 1)
                    this.grabber = this.grabbers[0]
                }
                
                /*
                const constraintId = this.constraints.get(evt.detail.hand)
                if (constraintId) {
                    console.log('physx-joint removed')
                    this.el.removeAttribute('physx-joint__' + constraintId)    
                    this.constraints.delete(evt.detail.hand)
                }
                */
                if (evt.detail.hand) evt.detail.hand.grabbedEl = []

                if (evt.detail.hand.classList.contains('finger-collider')) { 
                    //evt.detail.hand.object3D.children[1].removeFromParent()

                    if (evt.detail.hand.object3D.children[1]) this.parentEl.attach(evt.detail.hand.object3D.children[1])
                }
                //this.physicsEnd(evt)

                if (!this.resetGrabber()) {
                  this.grabbed = false
                  this.el.removeState(this.GRABBED_STATE)
                }
                if (evt.preventDefault) { evt.preventDefault() }
            }

            AFRAME.components.grabbable.Component.prototype.init = function () {
                this.GRABBED_STATE = 'grabbed'
                this.GRAB_EVENT = 'grab-start'
                this.UNGRAB_EVENT = 'grab-end'

                this.grabbed = false
                this.grabbers = []

                this.constraints = new Map()
                this.deltaPositionIsValid = false
                this.grabDistance = undefined
                this.grabDirection = {
                    x: 0,
                    y: 0,
                    z: -1
                }
                this.grabOffset = {
                    x: 0,
                    y: 0,
                    z: 0
                }
                // persistent object speeds up repeat setAttribute calls
                this.destPosition = {
                    x: 0,
                    y: 0,
                    z: 0
                }
                this.deltaPosition = new THREE.Vector3()
                this.targetPosition = new THREE.Vector3()
                this.physicsInit()

                this.el.addEventListener(this.GRAB_EVENT, e => {
                    if (!o.sceneEl.is('vr-mode')) {
                        e.detail.hand = $('#rhandcursor')[0];
                    }
                    this.start(e)
                })
                this.el.addEventListener(this.UNGRAB_EVENT, e => {
                    if (!o.sceneEl.is('vr-mode')) {
                        e.detail.hand = $('#rhandcursor')[0];
                    }
                    this.end(e)
                })
                this.el.addEventListener('mouseout', e => {
                    let move = o.cameraRig.components['movement-controls'];
                    if (move && !move.velocityCtrl) {
                        if (!o.sceneEl.is('vr-mode')) {
                            e.detail.hand = $('#rhandcursor')[0];
                            this.el.emit('grab-end', e)
                            return
                        }
                        this.lostGrabber(e)
                    }
                })
                
                // oorbit update to include parents to attach obj back again
                this.obj3D = this.el.object3D;
                this.parentEl = this.el.object3D.parent;
            }
            AFRAME.components.grabbable.Component.prototype.updateSchema = function (data) {
                var tempSchema = {
                    grabZoom: {type: 'boolean',default: true},
                    suppressX: {type: 'boolean',default: false},
                    suppressZ: {type: 'boolean',default: false},
                    usePhysics: {type: 'boolean',default: false},
                    wasDynamic: {type: 'boolean',default: false},
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

                    if (this.grabber && this.grabber.origin != 'camera' && (o.status == 3 || mode.charAt(1) == 8)) {
                        //this.grabber.object3D.getWorldPosition(v)
                        //let lock = this.el.getAttribute('lock') || {p:''}
                        //v.x *= (!this.xFactor || lock.p.includes('X'))?0:1;
                        //v.y *= (!this.yFactor || lock.p.includes('Y'))?0:1;
                        //v.z *= (!this.zFactor || lock.p.includes('Z'))?0:1;

                        this.grabber.object3D.getWorldQuaternion(q)
                        this.grabber.object3D.getWorldPosition(v)
                        
                        this.targetPosition.copy(this.grabDirection)
                        
                        console.log(this.grabDistance,this.grabOffset)
                        
                        this.targetPosition
                            .applyQuaternion(q)
                            .setLength(this.grabDistance)
                            .add(v)
                            .add(this.grabOffset)

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
                        
                        
                        //this.el.object3D.quaternion.copy(q)

                        /*
                        if (this.el.components['amo-body']) {
                            this.el.components['amo-body'].syncToPhysics()
                        }
                        */
                        
                        //console.log('dest',this.destPosition)
                    }
                }
            })()
            
            AFRAME.components.stretchable.Component.prototype.tick = function (time, timeDelta) {
                if (!this.stretched) { return }
                this.scale.copy(this.el.getAttribute('scale'))
                this.stretchers[0].object3D.getWorldPosition(this.handPos)
                this.stretchers[1].object3D.getWorldPosition(this.otherHandPos)
                const currentStretch = this.handPos.distanceTo(this.otherHandPos)
                let deltaStretch = 1
                if (this.previousStretch !== null && currentStretch !== 0) {
                  deltaStretch = Math.pow(
                    currentStretch / this.previousStretch,
                    (this.data.invert)
                      ? -1
                      : 1
                  )
                }
                this.previousStretch = currentStretch
                if (this.previousPhysicsStretch == null) {
                  // establish correct baseline even if throttled function isn't called
                  this.previousPhysicsStretch = currentStretch
                }
                this.scale.multiplyScalar(deltaStretch)
                this.el.setAttribute('scale', this.scale)
                
                // TODO: center object in scale
                //this.el.object3D.position.lerpVectors(this.handPos,this.otherHandPos,0.5)
                
                // scale update for all nested physics bodies (throttled)
                this.updateBodies(time, timeDelta)
            }
        }      
        
        // mindAR integration
        if (AFRAME.systems['mindar-image-system']) {
            AFRAME.systems['mindar-image-system'].prototype._startVideo = function () { }
        }

        // AR.js location only integration
        if (AFRAME.components["arjs-webcam-texture"]) {
            AFRAME.components['arjs-webcam-texture'].Component.prototype.init = function () {
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
            AFRAME.components['arjs-webcam-texture'].Component.prototype.play = function () { }
            AFRAME.components['arjs-webcam-texture'].Component.prototype.pause = function () { }
        }
        if (AFRAME.components["gps-new-camera"]) {
            AFRAME.components["gps-new-camera"].Component.prototype['_setupSafariOrientationPermissions'] = function () { }
            AFRAME.components["gps-new-camera"].Component.prototype.play = function () {
                if (this.data.simulateLatitude === 0 && this.data.simulateLongitude === 0) {
                    if (this.threeLoc._watchPositionId === null) {
                        this.threeLoc._watchPositionId = navigator.geolocation.watchPosition(
                            (e) => {
                                this.threeLoc._gpsReceived(e);
                                if ($('#latgps').length) $('#latgps').text(e.coords.latitude.toFixed(7));
                                if ($('#longps').length) $('#longps').text(e.coords.longitude.toFixed(7));

                                let col = 'red'
                                let html = '';
                                if (e.coords.accuracy < 5) {
                                    html += 'GPS com alta precisão ('
                                    col = '#00ff00'
                                } else {
                                    html += 'GPS com baixa precisão ('
                                }
                                $('#gpsmsg').text(html + e.coords.accuracy.toFixed(0) + ' m)')
                                $('#gpsmsg').append('<span></span>')
                                $('#arloc span').css('background-color', col)
                            },
                            (error) => {
                                if (this.threeLoc._eventHandlers["gpserror"]) {
                                    this.threeLoc._eventHandlers["gpserror"](error.code);
                                } else {
                                    alert(`GPS error: code ${error.code}`);
                                }
                            }, {
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
    colorToRGB: function (string) {
        let c = new THREE.Color(string)
        return 'rgb(' + c.r * 255 + ',' + c.g * 255 + ',' + c.b * 255 + ')'
    },
    replaceColorBase64: function (svg, from, to) {
        let c = svg.replace("data:image/svg+xml;base64,", "");
        c = window.atob(c);
        c = c.replace(/#eeeeec/g, "#" + new THREE.Color(to).getHexString());
        c = window.btoa(c);
        c = "data:image/svg+xml;base64," + c
        return c
    },
    sortString: function (text) {
        return text.split('').sort().join('');
    },
    drawRound: function (w, h, r) {
        var roundedRectShape = new THREE.Shape();

        function roundedRect(ctx, x, y, w, h, r) {
            ctx.moveTo(x, y + r);
            ctx.lineTo(x, y + h - r);
            ctx.quadraticCurveTo(x, y + h, x + r, y + h);
            ctx.lineTo(x + w - r, y + h);
            ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
            ctx.lineTo(x + w, y + r);
            ctx.quadraticCurveTo(x + w, y, x + w - r, y);
            ctx.lineTo(x + r, y);
            ctx.quadraticCurveTo(x, y, x, y + r);
        }
        roundedRect(roundedRectShape, -w / 2, -h / 2, w, h, r);
        return new THREE.ShapeBufferGeometry(roundedRectShape);
    },
    maxIfGreater: function (max, val) {
        if (val > (max || 0)) return val;
        return max
    },
    maxIfBelow: function (max, val, ceil) {
        if (val > (max || 0) && val < ceil) return val;
        return max
    },
    round: function (value, precision) {
        var multiplier = Math.pow(10, precision || 0);
        return Math.floor(value * multiplier) / multiplier;
    },
    smoothingString: function (arr, size, input) {
        let count = 0;
        if (arr.length == size) var theRemovedElement = arr.shift();
        arr.push(input);
        arr.forEach(element => {
            if (element === input) count += 1;
        });
        if (count == size) return input;
        return 'none';
    },
    smoothing: function (arr, size, input) {
        var sum = 0;
        if (arr.length == size) var theRemovedElement = arr.shift();
        arr.push(input);
        for (var i = 0; i < size; i++) {
            //sum += parseInt( arr[i], 10 ); //don't forget to add the base
            sum += arr[i];
        }
        if (arr.length < size) size = arr.length
        return sum / arr.length;
    },
    radDeg: function (radians) {
        var pi = Math.PI;
        return radians * (180 / pi);
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
    getWorldPos: function (el) {
        var worldPos = new THREE.Vector3();
        worldPos.setFromMatrixPosition(el.object3D.matrixWorld);
        return worldPos
    },
    addHelper: function (el) {
        //var helper = new THREE.BoxHelper(el.getObject3D('mesh'));
        //el.object3D.add(helper);
        let axes = new THREE.AxesHelper(0.2);
        el.setObject3D("axes-helper", axes);
    },
    map: function (value, fromStart, fromEnd, toStart, toEnd) {
        const fromDiff = Math.max(fromEnd - fromStart);
        const toDiff = Math.max(toEnd - toStart);
        const scale = toDiff / (fromDiff || 1);
        return (value - fromStart) * scale + toStart || 0;
    },
    clamp: function (num, min, max) {
        return Math.min(Math.max(num, min), max);
    },
    randFloatOne: function () {
        let rand = Math.random();
        if (Math.random() < 0.5) rand = -Math.abs(rand);
        return rand;
    },
    randInt: function (max) {
        return Math.floor(Math.random() * max) + 1
    },
    lerp: function (start, end, amt) {
        return (1 - amt) * start + amt * end
    },
    between: function (val, a, b) {
        if (val == a || val == b) return false
        let bol = false
        let sig = Math.max(a, b)
        let max = Math.max(a, val)
        let min = Math.min(b, val)
        if (sig == a) {
            if (min != val && max != val) bol = true
        } else {
            if (min == val && max == val) bol = true
        }
        return bol
    },
    getOccurrence: function (array, value) {
        var count = 0;
        array.forEach((v) => (v === value && count++));
        return count;
    },
    getPointInBetweenByPerc: function (pointA, pointB, percentage) {
        var dir = pointB.clone().sub(pointA);
        var len = dir.length();
        dir = dir.normalize().multiplyScalar(len * percentage);
        return pointA.clone().add(dir);

    },
    getObjectsByProperty: function ( object, property, value, result = [] ) {

        // check the current object

        if ( object[ property ] === value ) result.push( object );

        // check children

        for ( let i = 0, l = object.children.length; i < l; i ++ ) {

            const child = object.children[ i ];

            o.getObjectsByProperty( child, property, value, result );

        }

      return result;

    },
    openFullscreen: function () {
        var elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) { // Firefox 
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) { // Chrome, Safari and Opera 
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { // IE/Edge
            elem.msRequestFullscreen();
        } else if (elem.webkitEnterFullscreen) {
            elem.webkitEnterFullscreen();
        }
    },
    closeFullscreen: function () {
        // screen.orientation.unlock().then( 
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox 
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera 
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge 
            document.msExitFullscreen();
        } else if (elem.webkitExitFullscreen) {
            elem.webkitExitFullscreen();
        }
    },
    tryKeepScreenAlive: function (minutes) {
        if (!navigator.wakeLock || dev) return;
        navigator.wakeLock.request("screen").then(lock => {
            setTimeout(() => lock.release(), minutes * 60 * 1000);
        });
    },
    svgImg: function (symbol) {
        let img = document.createElement("a-image")
        img.setAttribute('src', this[symbol])
        return img
    },
    /*
    toKinematic: function (el) {
        if (el.getAttribute('amo-body') && el.getAttribute('amo-body').type == 'dynamic') {
            el.addState('wasDynamic')
            el.setAttribute('amo-body', 'type', 'kinematic')
            el.setAttribute('amo-body', 'type', 'dynamic')
            el.setAttribute('amo-body', 'type', 'kinematic')
        }
    },
    toDynamic: function (el) {
        if (el.getAttribute('amo-body') && el.is('wasDynamic')) {
            el.removeState('wasDynamic')
            el.setAttribute('amo-body', 'type', 'dynamic')
        }
    },
    */
    sceneLoaded: function (func) {
        if (this.sceneEl.hasLoaded) {
            func()
        } else {
            this.sceneEl.addEventListener('loaded', function () {
                func()
            }, {
                once: true
            });
        }
    },
    checkPause: function (self) {
        if (o.status != 3 && !self.el.hasAttribute("nonstop") && self.data.enabled) {
            if (self.data.enabled) self.wasEnabled = true;
            self.data.enabled = false;
        } else if (o.status == 3 && self.wasEnabled) {
            self.wasEnabled = false;
            self.data.enabled = true;
        }
    },
    crypto: function () {
        THREE.FileLoader.prototype.load = function (url, onLoad, onProgress, onError) {
            if (url === undefined) url = '';
            if (this.path !== undefined) url = this.path + url;
            url = this.manager.resolveURL(url);
            const scope = this;
            const cached = o.Cache.get(url);
            if (cached !== undefined) {
                scope.manager.itemStart(url);
                setTimeout(function () {
                    if (dev) console.log('cached', url)
                    if (onLoad) onLoad(oorbitLoader(url, cached));
                    scope.manager.itemEnd(url);
                }, 0);
                return cached;
            }
            // Check if request is duplicate
            if (o.Cache.loading[url] !== undefined) {
                o.Cache.loading[url] = [];
                o.Cache.loading[url].push({
                    onLoad: onLoad,
                    onProgress: onProgress,
                    onError: onError
                });
                return;
            }
            // Check for data: URI
            const dataUriRegex = /^data:(.*?)(;base64)?,(.*)$/;
            const dataUriRegexResult = url.match(dataUriRegex);
            let request;
            // Safari can not handle Data URIs through XMLHttpRequest so process manually
            if (dataUriRegexResult) {
                const mimeType = dataUriRegexResult[1];
                const isBase64 = !!dataUriRegexResult[2];
                let data = dataUriRegexResult[3];
                data = decodeURIComponent(data);
                if (isBase64) data = atob(data);
                try {
                    let response;
                    const responseType = (this.responseType || '').toLowerCase();
                    switch (responseType) {
                        case 'arraybuffer':
                        case 'blob':
                            const view = new Uint8Array(data.length);
                            for (let i = 0; i < data.length; i++) {
                                view[i] = data.charCodeAt(i);
                            }
                            (responseType === 'blob') ? response = new Blob([view.buffer], {
                                type: mimeType
                            }) : response = view.buffer;
                            break;
                        case 'document':
                            const parser = new DOMParser();
                            response = parser.parseFromString(data, mimeType);
                            break;
                        case 'json':
                            response = JSON.parse(data);
                            break;
                        default: // 'text' or other
                            response = data;
                            break;
                    }
                    // Wait for next browser tick like standard XMLHttpRequest event dispatching does
                    setTimeout(function () {
                        if (onLoad) onLoad(response);
                        scope.manager.itemEnd(url);
                    }, 0);
                } catch (error) {
                    // Wait for next browser tick like standard XMLHttpRequest event dispatching does
                    setTimeout(function () {
                        if (onError) onError(error);
                        scope.manager.itemError(url);
                        scope.manager.itemEnd(url);
                    }, 0);
                }
            } else {
                // Initialise array for duplicate requests
                o.Cache.loading[url] = [];
                o.Cache.loading[url].push({
                    onLoad: onLoad,
                    onProgress: onProgress,
                    onError: onError
                });
                request = new XMLHttpRequest();
                request.open('GET', url, true);
                request.addEventListener('load', function (event) {
                    let response = request.response;

                    if (dev) console.log('first', url)

                    const callbacks = o.Cache.loading[url];
                    delete o.Cache.loading[url];

                    if (this.status === 200 || this.status === 0) {
                        if (this.status === 0) console.warn('THREE.FileLoader: HTTP Status 0 received.');

                        o.Cache.add(url, response);

                        for (let i = 0, il = callbacks.length; i < il; i++) {
                            const callback = callbacks[i];
                            if (callback.onLoad) callback.onLoad(oorbitLoader(url, response));
                        }
                        scope.manager.itemEnd(url);
                    } else {
                        for (let i = 0, il = callbacks.length; i < il; i++) {
                            const callback = callbacks[i];
                            if (callback.onError) callback.onError(event);
                        }
                        scope.manager.itemError(url);
                        scope.manager.itemEnd(url);
                    }
                }, false);
                request.addEventListener('loadend', function (event) {
                    //console.log(3)    
                }, false);
                request.addEventListener('progress', function (event) {
                    const callbacks = o.Cache.loading[url];
                    for (let i = 0, il = callbacks.length; i < il; i++) {
                        const callback = callbacks[i];
                        if (callback.onProgress) callback.onProgress(event);
                    }
                }, false);
                request.addEventListener('error', function (event) {
                    const callbacks = o.Cache.loading[url];
                    delete o.Cache.loading[url];
                    for (let i = 0, il = callbacks.length; i < il; i++) {
                        const callback = callbacks[i];
                        if (callback.onError) callback.onError(event);
                    }
                    scope.manager.itemError(url);
                    scope.manager.itemEnd(url);
                }, false);
                request.addEventListener('abort', function (event) {
                    const callbacks = o.Cache.loading[url];
                    delete o.Cache.loading[url];
                    for (let i = 0, il = callbacks.length; i < il; i++) {
                        const callback = callbacks[i];
                        if (callback.onError) callback.onError(event);
                    }
                    scope.manager.itemError(url);
                    scope.manager.itemEnd(url);
                }, false);
                if (this.responseType !== undefined) request.responseType = this.responseType;
                if (this.withCredentials !== undefined) request.withCredentials = this.withCredentials;
                if (request.overrideMimeType) request.overrideMimeType(this.mimeType !== undefined ? this.mimeType : 'text/plain');
                for (const header in this.requestHeader) {
                    request.setRequestHeader(header, this.requestHeader[header]);
                }
                request.send(null);
            }
            scope.manager.itemStart(url);
            return request;
        }
        const oorbitLoader = function (a, b) { //url,response  
            if (a.includes("teclado") || a.includes(".glb") || a.includes(".gltf") || a.includes("oculus") || a.includes('draco') || a.includes('.bin') || a == '' || !a || !(b instanceof ArrayBuffer)) return b

            const view = copy(new Uint8Array(b));
            let dataString = THREE.LoaderUtils.decodeText(view);
            let max = dataString.indexOf("buffers"); //materials
            let min = dataString.indexOf("asset");
            let validString = dataString.substr(min, max);
            validString = reg(validString)
            view.set(enc.encode(validString), min);
            return view.buffer
        }
        const copy = function (src) {
            var dst = new Uint8Array(src.byteLength);
            dst.set(new Uint8Array(src));
            return dst;
        }
        const reg = function (str) {
            str = str.replace(new RegExp('\x62\x6c\x6f\x62\x73', 'g'), '\x6e\x6f\x64\x65\x73');
            str = str.replace(new RegExp('\x74\x72\x61\x73\x6e\x6c', 'g'), '\x74\x72\x61\x6e\x73\x6c');
            return str
        }
        const enc = new TextEncoder("utf-8");
    }, // ok
    copyToClipboard: function (str, suc, err) {
        navigator.clipboard
            .writeText(str)
            .then(() => {
                if (suc) suc()
            })
            .catch(() => {
                if (err) err()
            });
    },
    setAttributes: function(el, attrs) {
        for(var key in attrs) {
        el.setAttribute(key, attrs[key]);
    }
}
});