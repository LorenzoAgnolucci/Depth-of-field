import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import tesla from "../models/tesla_model_s/scene.gltf"
import london_hall from "../models/hintze_hall_nhm_london_surface_model/scene.gltf"
import spalding_ball from "../models/spalding_basket_ball/scene.gltf"
import basket_bullet_ball from "../models/basket_bullet_10_lb/scene.gltf"
import {GUI} from "three/examples/jsm/libs/dat.gui.module.js";
import px from "../models/background/cube/px.png"
import nx from "../models/background/cube/nx.png"
import py from "../models/background/cube/py.png"
import ny from "../models/background/cube/ny.png"
import pz from "../models/background/cube/pz.png"
import nz from "../models/background/cube/nz.png"
import Stats from "three/examples/jsm/libs/stats.module"
import depthVertexShader from "./DepthVertexShader.glsl"
import depthFragmentShader from "./DepthFragmentShader.glsl"
import cocFragmentShader from "./CoCFragmentShader.glsl"
import blurFragmentShader from "./BlurFragmentShader.glsl"
import DoFFragmentShader from "./DoFFragmentShader.glsl"
import {Scene} from "three";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass";
import {FXAAShader} from "three/examples/jsm/shaders/FXAAShader";
import {MotionBlurPass} from "three/examples/jsm/postprocessing/MotionBlurPassCustom";



var mouse = new THREE.Vector2();

var params = {
	enabled: true,
	cameraBlur: true,
	animate: true,
	samples: 15,
	expandGeometry: 0,
	interpolateGeometry: 1,
	smearIntensity: 0.5,
	speed: 20,
	renderTargetScale: 1
};

function main(){
	var scene = new THREE.Scene();


	var camera = new THREE.PerspectiveCamera(
		75,                                   // Field of view
		window.innerWidth / window.innerHeight, // Aspect ratio
		0.1,                                  // Near clipping pane
		200                                  // Far clipping pane
	);

	camera.position.set(3, 1, 0);

	var renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(0xeeeeee);
	renderer.setPixelRatio( window.devicePixelRatio);
	document.body.appendChild(renderer.domElement);

	var standardMaterial = new THREE.MeshStandardMaterial( {
		color: "#1136ac",
		metalness: 0.5,
	} );

	var geom = new THREE.SphereBufferGeometry(0.5, 16, 8)
	var ball = new THREE.Mesh(geom, standardMaterial);
	// ball.position.set(-10, 0, 0);
	// scene.add(ball);


	var loader = new GLTFLoader();

	loader.load(london_hall, function ( gltf ) {

		gltf.scene.position.set(-5, 20, -27);
		gltf.scene.scale.set(5, 5, 5);
		scene.add( gltf.scene );

	}, undefined, function ( error ) {

		console.error( error );

	} );

	var loaderSpalding = new GLTFLoader();

	var basketBall;
	loaderSpalding.load(basket_bullet_ball, function ( gltf ) {

		gltf.scene.position.set(-5, 0, 0);
		gltf.scene.scale.set(3, 3, 3);
		scene.add( gltf.scene );

		basketBall = gltf.scene;

	}, undefined, function ( error ) {

		console.error( error );

	} );

	var light = new THREE.AmbientLight("#c9c7c7", 1); // soft white light
	scene.add(light);

	var directionalLight = new THREE.DirectionalLight("#c9c7c7", 2);
	scene.add(directionalLight);

	var cameraParameters = {
		focalDepth : 0.11,
		focalLength : 35,
		fstop: 2.2
	};


	var antialiasingPass = new ShaderPass( FXAAShader );
	antialiasingPass.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
	antialiasingPass.renderToScreen = true;

	var depthTarget = getRenderTarget();
	var motionPass = new MotionBlurPass( scene, camera );

	/*
	var DoFTarget = getRenderTarget();
	var basicComposer = new EffectComposer(renderer, DoFTarget);
	basicComposer.addPass(new RenderPass(scene, camera));
	// motionPass.renderToScreen = true;
	basicComposer.addPass(motionPass);
	basicComposer.addPass(antialiasingPass);

	 */

	const depthShader = {
		vertexShader: depthVertexShader,
		fragmentShader: depthFragmentShader,
		uniforms: {
			cameraNear: { value: camera.near },
			cameraFar: { value: camera.far },
			tDiffuse: { value: null },
			tDepth: { value: null }
		}
	};

	var depthComposer = new EffectComposer(renderer);
	var depthPass = new ShaderPass(depthShader);
	// depthPass.renderToScreen = true;
	depthComposer.addPass(depthPass);


	depthComposer.addPass(motionPass)

	depthComposer.addPass(antialiasingPass);


	const CoCShader = {
		vertexShader: depthVertexShader,
		fragmentShader: cocFragmentShader,
		uniforms: {
			cameraNear: { value: camera.near },
			cameraFar: { value: camera.far },
			tDiffuse: { value: null },
			tDepth: { value: null },
			focalDepth: {value: cameraParameters.focalDepth},
			focalLength: {value: cameraParameters.focalLength},
			fstop: {value: cameraParameters.fstop},
			mouseFocus: {value: true},
			mouseCoords: {value: mouse}
		}
	};

	var CoCComposer = new EffectComposer(renderer);
	var CoCPass = new ShaderPass(CoCShader);
	// CoCPass.renderToScreen = true;
	CoCComposer.addPass(CoCPass);

	CoCComposer.addPass(motionPass);

	CoCComposer.addPass(antialiasingPass);

	const horizontalBlurShader = {
		vertexShader: depthVertexShader,
		fragmentShader: blurFragmentShader,
		uniforms: {
			cameraNear: {value: camera.near},
			cameraFar: {value: camera.far},
			tDiffuse: {value: null},
			tDepth: {value: null},
			focalDepth: {value: cameraParameters.focalDepth},
			focalLength: {value: cameraParameters.focalLength},
			fstop: {value: cameraParameters.fstop},
			widthTexel: {value: 1.0 / window.innerHeight.toFixed(1)},
			heightTexel: {value: 1.0 / window.innerWidth.toFixed(1)},
			horizontalBlur: {value: true}
		}
	}

	const verticalBlurShader = {
		vertexShader: depthVertexShader,
		fragmentShader: blurFragmentShader,
		uniforms: {
			cameraNear: {value: camera.near},
			cameraFar: {value: camera.far},
			tDiffuse: {value: null},
			tDepth: {value: null},
			focalDepth: {value: cameraParameters.focalDepth},
			focalLength: {value: cameraParameters.focalLength},
			fstop: {value: cameraParameters.fstop},
			widthTexel: {value: 1.0 / window.innerHeight.toFixed(1)},
			heightTexel: {value: 1.0 / window.innerWidth.toFixed(1)},
			horizontalBlur: {value: false}
		}
	}

	const DoFShader = {
		vertexShader: depthVertexShader,
		fragmentShader: DoFFragmentShader,
		uniforms: {
			tDiffuse: {value: null},
			tDepth: {value: null},
			tOriginal: {value: null},
			texelHeight: {value: 1.0 / window.innerHeight.toFixed(1)},
			texelWidth: {value: 1.0 / window.innerWidth.toFixed(1)},
			bokehBlurSize: {value: 3.0},
			dofEnabled: {value: true},
			showFocus: {value: false}
		}
	};

	var DoFComposer = new EffectComposer(renderer);
	DoFComposer.addPass(CoCPass);
	var verticalBlurPass = new ShaderPass(verticalBlurShader);
	DoFComposer.addPass(verticalBlurPass);
	var horizontalBlurPass = new ShaderPass(horizontalBlurShader);
	horizontalBlurPass.renderToScreen = false;
	DoFComposer.addPass(horizontalBlurPass);
	var DoFPass = new ShaderPass(DoFShader);
	// DoFPass.renderToScreen = true;


	DoFComposer.addPass(DoFPass);

	DoFComposer.addPass(motionPass);


	DoFComposer.addPass(antialiasingPass);


	var gui = new GUI();

	var guiControls = new function(){
		this.whichScene = "DoF";
		this.resetParameters = function(){
			CoCPass.uniforms.focalDepth.value = cameraParameters.focalDepth;
			CoCPass.uniforms.focalLength.value = cameraParameters.focalLength;
			CoCPass.uniforms.fstop.value = cameraParameters.fstop;
		}
	}
	{
		const folder = gui.addFolder("Render scene");
		folder.add(guiControls, "whichScene", ["Depth", "CoC", "DoF"]).name("Scene").onChange(whichSceneToRender);
		folder.open();
	}
	{
		const folder = gui.addFolder("Camera parameters");
		folder.add(CoCPass.uniforms.focalDepth, "value", 0.0, 1.0).name("Focal depth").step(0.001).listen();
		folder.add(CoCPass.uniforms.focalLength, "value", 12.0, 100.0).name("Focal length").step(1.0).listen();
		folder.add(CoCPass.uniforms.fstop, "value", 1.4, 22.0).name("F-stop").step(0.1).listen();
		folder.add(CoCPass.uniforms.mouseFocus, "value").name("Focus mouse").listen();
		folder.add(guiControls, "resetParameters").name("Reset parameters");
		folder.open();
	}

	var folderDoFParameters = gui.addFolder("DoF parameters")
	folderDoFParameters.add(DoFPass.uniforms.dofEnabled, "value").name("DoF enabled").listen();
	folderDoFParameters.add(DoFPass.uniforms.showFocus, "value").name("Show focus").listen();
	folderDoFParameters.open()

	var motionFolder = gui.addFolder( 'motion blur' );
	motionFolder.add( params, 'enabled' );
	motionFolder.add( params, 'cameraBlur' );
	motionFolder.add( params, 'samples', 0, 50 );
	motionFolder.add( params, 'smearIntensity', 0, 4 );
	motionFolder.add( params, 'expandGeometry', 0, 1 );
	motionFolder.add( params, 'interpolateGeometry', 0, 1 );
	/*
	motionFolder.add( params, 'renderTargetScale', 0, 1 )
		.onChange( v => {
			motionPass.renderTargetScale = v;
			onWindowResize();

		} );

	 */

	motionFolder.add( motionPass.debug, 'display', {
		'Motion Blur': MotionBlurPass.DEFAULT,
		'Velocity': MotionBlurPass.VELOCITY,
		'Geometry': MotionBlurPass.GEOMETRY
	} ).onChange( val => motionPass.debug.display = parseFloat(val) );
	motionFolder.open();

	var animFolder = gui.addFolder( 'animation' );
	animFolder.add( params, 'animate' );
	animFolder.add( params, 'speed', 0, 50 );
	animFolder.open();

	var stats = new Stats();
	document.body.appendChild(stats.dom);

	var clock = new THREE.Clock();
	var animTime = 0.0;

	animate();

	function animate(){

		// basicComposer.render()
		renderer.setRenderTarget(depthTarget);
		renderer.render(scene, camera);
		// basicComposer.render(0.1)
		whichSceneToRender();
		stats.update();
		requestAnimationFrame(animate);
	}
	var animatedOneFramePast = false;
	function whichSceneToRender(){

		// set the variables
		motionPass.enabled = params.enabled;
		motionPass.samples = params.samples;
		motionPass.expandGeometry = params.expandGeometry;
		motionPass.interpolateGeometry = params.interpolateGeometry;
		motionPass.renderCameraBlur = params.cameraBlur;
		motionPass.smearIntensity = params.smearIntensity;

		// basicComposer.render(0.1)


		depthPass.uniforms.tDiffuse.value = depthTarget.texture;
		depthPass.uniforms.tDepth.value = depthTarget.depthTexture;

		CoCPass.uniforms.tDiffuse.value = depthTarget.texture;
		CoCPass.uniforms.tDepth.value = depthTarget.depthTexture;
		CoCPass.uniforms.mouseCoords.value = mouse;

		const deltaTime = clock.getDelta();
		motionPass.debug.dontUpdateState = !params.animate;

		if ( params.animate || animatedOneFramePast === false) {

			animTime += deltaTime * params.speed;
			if(basketBall){
				basketBall.position.y = Math.sin( animTime ) * 10;
			}

			// bo.rotation.x = animTime;
			// bo.position.z = Math.cos(animTime);

			animatedOneFramePast = !params.animate;


		} else if ( params.animate ) {

			animatedOneFramePast = false;

		}

		switch(guiControls.whichScene){
			case "Depth":
				hideGUIFolder(folderDoFParameters, false);
				depthComposer.render(0.01);
				break;
			case "CoC":
				hideGUIFolder(folderDoFParameters, false);
				CoCComposer.render(0.01);
				break;
			case "DoF":
				hideGUIFolder(folderDoFParameters, true);
				DoFPass.uniforms.tOriginal.value = depthTarget.texture;
				DoFComposer.render(0.1);
				break;
		}
	}

	document.addEventListener( 'mousemove', onDocumentMouseMove, false );

	var controls = new OrbitControls(camera, renderer.domElement);
	controls.target = new THREE.Vector3(-3, 1, 0);

	controls.addEventListener('change', function(){
		whichSceneToRender();
	});

	controls.update();

	window.addEventListener("resize", _ => {
		renderer.setSize(window.innerWidth, window.innerHeight);
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		antialiasingPass.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
	})

	function onDocumentMouseMove( event ) {
		event.preventDefault();
		mouse.x = ((event.clientX - 8.0) / window.innerWidth); // Subtract 8 pixels for the white bezel on the left of the canvas
		mouse.y = 1.0 - ((event.clientY) / window.innerHeight);
	}
}

function hideGUIFolder(folder, isShown){
	if(isShown){
		folder.domElement.style.display = "";
	}
	else{
		folder.domElement.style.display = "none";
	}
}

function getRenderTarget(){
	let target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
	target.texture.format = THREE.RGBFormat;
	target.texture.encoding = THREE.sRGBEncoding;

	target.texture.minFilter = THREE.NearestFilter;
	target.texture.magFilter = THREE.NearestFilter;
	target.texture.generateMipmaps = false;
	target.stencilBuffer = false;
	target.depthBuffer = true;
	target.depthTexture = new THREE.DepthTexture();
	target.depthTexture.format = THREE.DepthFormat;
	target.depthTexture.type = THREE.UnsignedIntType;
	return target;
}

main();