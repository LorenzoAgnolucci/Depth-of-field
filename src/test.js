import * as THREE from 'three';
import {OrbitControls} from "./OrbitControls";
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import london_hall from "../models/hintze_hall_nhm_london_surface_model/scene.gltf"
import spalding_ball from "../models/spalding_basket_ball/scene.gltf"
import {GUI} from "three/examples/jsm/libs/dat.gui.module.js";
import px from "../models/background/cube/px.png"
import nx from "../models/background/cube/nx.png"
import py from "../models/background/cube/py.png"
import ny from "../models/background/cube/ny.png"
import pz from "../models/background/cube/pz.png"
import nz from "../models/background/cube/nz.png"
import Stats from "three/examples/jsm/libs/stats.module"
import basicVertexShader from "./BasicVertexShader.glsl"
import depthFragmentShader from "./DepthFragmentShader.glsl"
import cocFragmentShader from "./CoCFragmentShader.glsl"
import blurFragmentShader from "./BlurFragmentShader.glsl"
import DoFFragmentShader from "./DoFFragmentShader.glsl"
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass";
import {FXAAShader} from "three/examples/jsm/shaders/FXAAShader";
import {MotionBlurPass} from "three/examples/jsm/postprocessing/MotionBlurPassCustom";


const mouse = new THREE.Vector2();

const cameraParameters = {
	focalDepth : 0.15,
	focalLength : 35,
	fstop: 5.6
};

const motionBlurParameters = {
	enabled: true,
	cameraBlur: true,
	animate: true,
	samples: 15,
	interpolateGeometry: 0.5,
	smearIntensity: 0.25,
	speed: 8,
};

function main(){

	///////////////////////
	//////// Scene ////////
	///////////////////////

	const scene = new THREE.Scene();
	scene.background = new THREE.CubeTextureLoader().load([px, nx, py, ny, pz, nz])

	const camera = new THREE.PerspectiveCamera(
		75,                                   // Field of view
		window.innerWidth / window.innerHeight, // Aspect ratio
		0.1,                                  // Near clipping pane
		100                                  // Far clipping pane
	);

	camera.position.set(3, 3, 0);

	const renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(0xeeeeee);
	renderer.setPixelRatio( window.devicePixelRatio);
	document.body.appendChild(renderer.domElement);

	const loaderLondonHall = new GLTFLoader();

	loaderLondonHall.load(london_hall, function ( gltf ) {

		gltf.scene.position.set(-5, 10, -15);
		gltf.scene.scale.set(3, 3, 3);
		scene.add( gltf.scene );

	}, undefined, function ( error ) {
		console.error( error );
	} );

	const loaderSpalding = new GLTFLoader();

	let basketBall, basketBall2;
	loaderSpalding.load(spalding_ball, function ( gltf ) {

		gltf.scene.position.set(-9, -10, 0);
		gltf.scene.scale.set(0.3, 0.3, 0.3);

		basketBall = gltf.scene;
		basketBall.rotation.y = Math.PI;
		scene.add(basketBall);
		basketBall2 = basketBall.clone();
		basketBall2.position.set(6, 0, 25);
		scene.add(basketBall2);

	}, undefined, function ( error ) {
		console.error( error );
	} );

	const light = new THREE.AmbientLight("#c9c7c7", 1); // soft white light
	scene.add(light);

	const directionalLight = new THREE.DirectionalLight("#c9c7c7", 2);
	scene.add(directionalLight);

	///////////////////////
	/// Effect composer ///
	///////////////////////

	const antialiasingPass = new ShaderPass( FXAAShader );
	antialiasingPass.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
	antialiasingPass.renderToScreen = true;

	const depthTarget = getRenderTarget();

	const motionPass = new MotionBlurPass( scene, camera, motionBlurParameters );

	const depthShader = {
		vertexShader: basicVertexShader,
		fragmentShader: depthFragmentShader,
		uniforms: {
			cameraNear: { value: camera.near },
			cameraFar: { value: camera.far },
			tDepth: { value: null }
		}
	};

	const depthComposer = new EffectComposer(renderer);
	const depthPass = new ShaderPass(depthShader);
	depthComposer.addPass(depthPass);
	depthComposer.addPass(motionPass)
	depthComposer.addPass(antialiasingPass);


	const CoCShader = {
		vertexShader: basicVertexShader,
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

	const CoCComposer = new EffectComposer(renderer);
	const CoCPass = new ShaderPass(CoCShader);
	CoCComposer.addPass(CoCPass);
	CoCComposer.addPass(motionPass);
	CoCComposer.addPass(antialiasingPass);


	const horizontalBlurShader = {
		vertexShader: basicVertexShader,
		fragmentShader: blurFragmentShader,
		uniforms: {
			tDiffuse: {value: null},
			widthTexel: {value: 1.0 / window.innerWidth.toFixed(1)},
			heightTexel: {value: 1.0 / window.innerHeight.toFixed(1)},
			horizontalBlur: {value: true}
		}
	}

	const verticalBlurShader = {
		vertexShader: basicVertexShader,
		fragmentShader: blurFragmentShader,
		uniforms: {
			tDiffuse: {value: null},
			widthTexel: {value: 1.0 / window.innerWidth.toFixed(1)},
			heightTexel: {value: 1.0 / window.innerHeight.toFixed(1)},
			horizontalBlur: {value: false}
		}
	}

	const DoFShader = {
		vertexShader: basicVertexShader,
		fragmentShader: DoFFragmentShader,
		uniforms: {
			tDiffuse: {value: null},
			tOriginal: {value: null},
			heightTexel: {value: 1.0 / window.innerHeight.toFixed(1)},
			widthTexel: {value: 1.0 / window.innerWidth.toFixed(1)},
			bokehBlurSize: {value: 3.0},
			dofEnabled: {value: true},
			showFocus: {value: false}
		}
	};

	const DoFComposer = new EffectComposer(renderer);
	DoFComposer.addPass(CoCPass);
	const verticalBlurPass = new ShaderPass(verticalBlurShader);
	DoFComposer.addPass(verticalBlurPass);
	const horizontalBlurPass = new ShaderPass(horizontalBlurShader);
	DoFComposer.addPass(horizontalBlurPass);
	const DoFPass = new ShaderPass(DoFShader);
	DoFComposer.addPass(DoFPass);
	DoFComposer.addPass(motionPass);
	DoFComposer.addPass(antialiasingPass);

	///////////////////////
	///////// GUI /////////
	///////////////////////

	const gui = new GUI();
	gui.width = 250;

	const guiControls = new function(){
		this.whichScene = "DoF";
		this.resetCameraParameters = function(){
			CoCPass.uniforms.focalDepth.value = cameraParameters.focalDepth;
			CoCPass.uniforms.focalLength.value = cameraParameters.focalLength;
			CoCPass.uniforms.fstop.value = cameraParameters.fstop;
		}
		this.resetMotionBlurParameters = function(){
			motionPass.enabled = motionBlurParameters.enabled;
			motionPass.samples = motionBlurParameters.samples;
			motionPass.interpolateGeometry = motionBlurParameters.interpolateGeometry;
			motionPass.renderCameraBlur = motionBlurParameters.cameraBlur;
			motionPass.smearIntensity = motionBlurParameters.smearIntensity;
		}
	}
	{
		const sceneFolder = gui.addFolder("Render scene");
		sceneFolder.add(guiControls, "whichScene", ["Depth", "CoC", "DoF", "Geometry", "Velocity"]).name("Scene").onChange(whichSceneToRender);
		sceneFolder.open();
	}
	{
		const cameraParametersFolder = gui.addFolder("Camera parameters");
		cameraParametersFolder.add(CoCPass.uniforms.focalDepth, "value", 0.0, 1.0).name("Focal depth").step(0.001).listen();
		cameraParametersFolder.add(CoCPass.uniforms.focalLength, "value", 12.0, 100.0).name("Focal length").step(1.0).listen();
		cameraParametersFolder.add(CoCPass.uniforms.fstop, "value", 1.4, 22.0).name("F-stop").step(0.1).listen();
		cameraParametersFolder.add(CoCPass.uniforms.mouseFocus, "value").name("Focus mouse").listen();
		cameraParametersFolder.add(guiControls, "resetCameraParameters").name("Reset parameters");
		cameraParametersFolder.open();
	}
	{
		// Defined as var because is passed to hideGUIFolder()
		var folderDoFParameters = gui.addFolder("DoF parameters")
		folderDoFParameters.add(DoFPass.uniforms.dofEnabled, "value").name("DoF enabled").listen();
		folderDoFParameters.add(DoFPass.uniforms.showFocus, "value").name("Show focus").listen();
		folderDoFParameters.open();
	}
	{
		const motionFolder = gui.addFolder("Motion blur");
		motionFolder.add(motionPass, "enabled").name("Motion blur enabled").listen();
		motionFolder.add(motionPass, "renderCameraBlur").name("Camera Blur").listen();
		motionFolder.add(motionPass, "samples", 0, 50).name("Samples").listen();
		motionFolder.add(motionPass, "smearIntensity", 0, 1).name("Smearing").listen();
		motionFolder.add(motionPass, "interpolateGeometry", 0, 1).name("InterpolateGeom").listen();
		motionFolder.add(guiControls, "resetMotionBlurParameters").name("Reset parameters");
		motionFolder.open();
	}
	{
		const animFolder = gui.addFolder('Animation');
		animFolder.add(motionBlurParameters, 'animate').name("Animate").listen();
		animFolder.add(motionBlurParameters, 'speed', 0, 10).name("Speed").listen();
		animFolder.open();
	}

	///////////////////////
	/////// Render ////////
	///////////////////////

	const stats = new Stats();
	document.body.appendChild(stats.dom);

	const clock = new THREE.Clock();
	let animTime = 0.0;

	animate();

	function animate(){
		renderer.setRenderTarget(depthTarget);
		renderer.render(scene, camera);
		whichSceneToRender();
		stats.update();
		requestAnimationFrame(animate);
	}
	
	function whichSceneToRender(){

		depthPass.uniforms.tDepth.value = depthTarget.depthTexture;

		CoCPass.uniforms.tDiffuse.value = depthTarget.texture;
		CoCPass.uniforms.tDepth.value = depthTarget.depthTexture;
		CoCPass.uniforms.mouseCoords.value = mouse;

		motionPass.debug.display = MotionBlurPass.DEFAULT;

		const deltaTime = clock.getDelta();

		motionPass.debug.dontUpdateState = !motionBlurParameters.animate;

		if ( motionBlurParameters.animate){

			animTime += deltaTime * motionBlurParameters.speed;

			if(basketBall){
				basketBall.position.y = Math.sin( animTime * 0.25) * 10;
			}
			if(basketBall2){
				basketBall2.position.y = -12.5 + Math.abs(Math.sin( animTime * 0.25)) * 15;
				basketBall2.position.x = -20 + Math.cos( animTime * 0.1) * 15;
			}
		}

		switch(guiControls.whichScene){
			case "Depth":
				hideGUIFolder(folderDoFParameters, false);
				depthComposer.render();
				break;
			case "CoC":
				hideGUIFolder(folderDoFParameters, false);
				CoCComposer.render();
				break;
			case "DoF":
				hideGUIFolder(folderDoFParameters, true);
				DoFPass.uniforms.tOriginal.value = depthTarget.texture;
				DoFComposer.render();
				break;
			case "Geometry":
				hideGUIFolder(folderDoFParameters, false);
				motionPass.debug.display = MotionBlurPass.GEOMETRY;
				DoFComposer.render();
				break;
			case "Velocity":
				hideGUIFolder(folderDoFParameters, false);
				motionPass.debug.display = MotionBlurPass.VELOCITY;
				DoFComposer.render();
				break;
		}
	}

	document.addEventListener( 'mousemove', onDocumentMouseMove, false );

	function onDocumentMouseMove( event ) {
		event.preventDefault();
		mouse.x = ((event.clientX - 8.0) / window.innerWidth); // Subtract 8 pixels for the white bezel on the left of the canvas
		mouse.y = 1.0 - ((event.clientY) / window.innerHeight);
	}

	{
		let controls = new OrbitControls(camera, renderer.domElement);
		controls.target = new THREE.Vector3(-3, 4, 0);

		controls.addEventListener('change', function(){
			whichSceneToRender();
		});

		controls.maxDistance = 9;
		controls.maxPolarAngle = 3 / 4 * Math.PI;
		controls.minPolarAngle = Math.PI / 4;
		controls.maxAzimuthAngle = 3 / 4 * Math.PI;
		controls.minAzimuthAngle = Math.PI / 4;
		controls.update();
	}

	window.addEventListener("resize", _ => {
		renderer.setSize(window.innerWidth, window.innerHeight);
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		antialiasingPass.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
	})

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