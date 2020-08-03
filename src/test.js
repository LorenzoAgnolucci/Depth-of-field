import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import london_hall from "../models/hintze_hall_nhm_london_surface_model/scene.gltf"
import {GUI} from "three/examples/jsm/libs/dat.gui.module.js";
import px from "../images/background/cube/px.png"
import nx from "../images/background/cube/nx.png"
import py from "../images/background/cube/py.png"
import ny from "../images/background/cube/ny.png"
import pz from "../images/background/cube/pz.png"
import nz from "../images/background/cube/nz.png"
import Stats from "three/examples/jsm/libs/stats.module"
import depthVertexShader from "./BasicVertexShader.glsl"
import depthFragmentShader from "./DepthFragmentShader.glsl"
import cocFragmentShader from "./CoCFragmentShader.glsl"
import blurFragmentShader from "./BlurFragmentShader.glsl"
import DoFFragmentShader from "./DoFFragmentShader.glsl"
import {Scene} from "three";

var mouse = new THREE.Vector2();

function main(){
	var scene = new THREE.Scene();
	scene.background = new THREE.CubeTextureLoader().load([px, nx, py, ny, pz, nz])

	var axesHelper = new THREE.AxesHelper(5);
	scene.add(axesHelper);

	var camera = new THREE.PerspectiveCamera(
		75,                                   // Field of view
		window.innerWidth / window.innerHeight, // Aspect ratio
		0.1,                                  // Near clipping pane
		200                                  // Far clipping pane
	);

	camera.position.set(3, 1, 0);
	// camera.lookAt(new THREE.Vector3(-5, 0, -10));

	var renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(0xeeeeee);
	renderer.setPixelRatio( window.devicePixelRatio);
	document.body.appendChild(renderer.domElement);

	var geometry = new THREE.BoxGeometry();
	var material = new THREE.MeshStandardMaterial({color: "#32a852"});
	var cube = new THREE.Mesh(geometry, material);
	cube.position.set(-5, 0, 0);
	scene.add(cube);

	var otherCube = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color: "#97c111"}))
	otherCube.position.set(-44, 0, 4);
	scene.add(otherCube);

	var sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
	var sphereMaterial = new THREE.MeshStandardMaterial({color: "#bf21a2"});
	var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
	sphere.position.set(-8, 0, -4);
	scene.add(sphere)

	var planeGeometry = new THREE.PlaneGeometry(20, 20, 50, 50);
	var planeMaterial = new THREE.MeshStandardMaterial({color: "#0f66f8"});
	var plane = new THREE.Mesh(planeGeometry, planeMaterial);
	plane.position.set(-15, -4, 0);
	plane.rotateX(4.71);
	scene.add(plane);


	var loader = new GLTFLoader();

	loader.load(london_hall, function ( gltf ) {

		gltf.scene.position.set(-5, 20, -27);
		gltf.scene.scale.set(5, 5, 5);
		scene.add( gltf.scene );

	}, undefined, function ( error ) {

		console.error( error );

	} );



	var light = new THREE.AmbientLight("#c9c7c7", 1); // soft white light
	scene.add(light);

	var directionalLight = new THREE.DirectionalLight("#c9c7c7", 2);
	directionalLight.target = sphere;
	scene.add(directionalLight);

	var cameraParameters = {
		focalDepth : 0.11,
		focalLength : 35,
		fstop: 2.2
	}

	var depthScene;
	var depthCamera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	var depthShaderMaterial = new THREE.ShaderMaterial({
		vertexShader: depthVertexShader,
		fragmentShader: depthFragmentShader,
		uniforms: {
			cameraNear: { value: camera.near },
			cameraFar: { value: camera.far },
			tDiffuse: { value: null },
			tDepth: { value: null }
		}
	});

	var depthPlane = new THREE.PlaneBufferGeometry(2, 2);
	var depthQuad = new THREE.Mesh(depthPlane, depthShaderMaterial);
	depthScene = new Scene();
	depthScene.add(depthQuad);


	var cocScene;
	var cocShaderMaterial = new THREE.ShaderMaterial({
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
	})

	var cocPlane = new THREE.PlaneBufferGeometry(2, 2);
	var cocQuad = new THREE.Mesh(cocPlane, cocShaderMaterial);
	cocScene = new Scene();
	cocScene.add(cocQuad);

	var verticalBlurScene;
	var verticalBlurShaderMaterial = new THREE.ShaderMaterial({
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
	});
	var verticalBlurPlane = new THREE.PlaneBufferGeometry(2, 2);
	var verticalBlurQuad = new THREE.Mesh(verticalBlurPlane, verticalBlurShaderMaterial);
	verticalBlurScene = new Scene();
	verticalBlurScene.add(verticalBlurQuad);

	var horizontalBlurScene;
	var horizontalBlurShaderMaterial = new THREE.ShaderMaterial({
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
	});
	var horizontalBlurPlane = new THREE.PlaneBufferGeometry(2, 2);
	var horizontalBlurQuad = new THREE.Mesh(horizontalBlurPlane, horizontalBlurShaderMaterial);
	horizontalBlurScene = new Scene();
	horizontalBlurScene.add(horizontalBlurQuad);

	var DoFScene;
	var DoFShaderMaterial = new THREE.ShaderMaterial({
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
	});
	var DoFPlane = new THREE.PlaneBufferGeometry(2, 2);
	var DoFQuad = new THREE.Mesh(DoFPlane, DoFShaderMaterial);
	DoFScene = new Scene();
	DoFScene.add(DoFQuad);

	var basicTarget = getRenderTarget();

	var cocTarget = getRenderTarget();

	var blurTarget = getRenderTarget();

	var DoFTarget = getRenderTarget();


	var gui = new GUI();

	var guiControls = new function(){
		this.whichScene = "DoF";
		this.resetParameters = function(){
			cocShaderMaterial.uniforms.focalDepth.value = cameraParameters.focalDepth;
			cocShaderMaterial.uniforms.focalLength.value = cameraParameters.focalLength;
			cocShaderMaterial.uniforms.fstop.value = cameraParameters.fstop;
		}
	}
	{
		const folder = gui.addFolder("Render scene");
		folder.add(guiControls, "whichScene", ["Depth", "CoC", "DoF"]).name("Scene").onChange(whichSceneToRender);
		folder.open();
	}
	{
		const folder = gui.addFolder("Camera parameters");
		folder.add(cocShaderMaterial.uniforms.focalDepth, "value", 0.0, 1.0).name("Focal depth").step(0.001).listen();
		folder.add(cocShaderMaterial.uniforms.focalLength, "value", 12.0, 100.0).name("Focal length").step(1.0).listen();
		folder.add(cocShaderMaterial.uniforms.fstop, "value", 1.4, 22.0).name("F-stop").step(0.1).listen();
		folder.add(cocShaderMaterial.uniforms.mouseFocus, "value").name("Focus mouse").listen();
		folder.add(guiControls, "resetParameters").name("Reset parameters");
		folder.open();
	}

	var folderDoFParameters = gui.addFolder("DoF parameters")
	folderDoFParameters.add(DoFShaderMaterial.uniforms.dofEnabled, "value").name("DoF enabled").listen();
	folderDoFParameters.add(DoFShaderMaterial.uniforms.showFocus, "value").name("Show focus").listen();
	folderDoFParameters.open()

	var stats = new Stats();
	document.body.appendChild(stats.dom);

	animate();

	function animate(){
		whichSceneToRender();
		stats.update();
		requestAnimationFrame(animate);
	}

	function whichSceneToRender(){
		switch(guiControls.whichScene){
			case "Depth":
				renderScene(depthScene);
				break;
			case "CoC":
				renderScene(cocScene);
				break;
			case "DoF":
				renderDoF();
				break;
		}
	}

	function renderScene(sceneToRender){
		hideGUIFolder(folderDoFParameters, false);

		renderer.setRenderTarget(basicTarget);
		renderer.render(scene, camera);

		depthShaderMaterial.uniforms.tDiffuse.value = basicTarget.texture;
		depthShaderMaterial.uniforms.tDepth.value = basicTarget.depthTexture;

		cocShaderMaterial.uniforms.tDiffuse.value = basicTarget.texture;
		cocShaderMaterial.uniforms.tDepth.value = basicTarget.depthTexture;

		renderer.setRenderTarget(null);
		renderer.render(sceneToRender, depthCamera);
	}

	function renderDoF(){
		hideGUIFolder(folderDoFParameters, true);

		renderer.setRenderTarget(basicTarget);
		renderer.render(scene, camera);

		depthShaderMaterial.uniforms.tDiffuse.value = basicTarget.texture;
		depthShaderMaterial.uniforms.tDepth.value = basicTarget.depthTexture;

		cocShaderMaterial.uniforms.tDiffuse.value = basicTarget.texture;
		cocShaderMaterial.uniforms.tDepth.value = basicTarget.depthTexture;

		renderer.setRenderTarget(cocTarget);
		renderer.render(cocScene, depthCamera);

		verticalBlurShaderMaterial.uniforms.tDiffuse.value = cocTarget.texture;
		verticalBlurShaderMaterial.uniforms.tDepth.value = cocTarget.depthTexture;

		renderer.setRenderTarget(blurTarget);
		renderer.render(verticalBlurScene, depthCamera);

		horizontalBlurShaderMaterial.uniforms.tDiffuse.value = blurTarget.texture;
		horizontalBlurShaderMaterial.uniforms.tDepth.value = blurTarget.depthTexture;

		renderer.setRenderTarget(DoFTarget);
		renderer.render(horizontalBlurScene, depthCamera);

		DoFShaderMaterial.uniforms.tDiffuse.value = DoFTarget.texture;
		DoFShaderMaterial.uniforms.tDepth.value = DoFTarget.depthTexture;
		DoFShaderMaterial.uniforms.tOriginal.value = basicTarget.texture;

		renderer.setRenderTarget(null);
		renderer.render(DoFScene, depthCamera);
	}

	document.addEventListener( 'mousemove', onDocumentMouseMove, false );

	var controls = new OrbitControls(camera, renderer.domElement);
	// controls.enableDamping = true;
	controls.target = new THREE.Vector3(-3, 1, 0);

	controls.addEventListener('change', function(){
		whichSceneToRender();
	});

	controls.update();      //required if damping is enabled

	window.addEventListener("resize", _ => {
		renderer.setSize(window.innerWidth, window.innerHeight);
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
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
	let target = new THREE.WebGLMultisampleRenderTarget(window.innerWidth, window.innerHeight);
	target.samples = 4;
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