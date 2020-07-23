import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass";
// import { BokehShader } from "three/examples/jsm/shaders/BokehShader";
import { BokehShader } from "three/examples/jsm/shaders/BokehShader2"
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import tesla from "../models/tesla_model_s/scene.gltf"
import london_hall from "../models/hintze_hall_nhm_london_surface_model/scene.gltf"
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {GUI} from "three/examples/jsm/libs/dat.gui.module.js";
import px from "../models/background/cube/px.png"
import nx from "../models/background/cube/nx.png"
import py from "../models/background/cube/py.png"
import ny from "../models/background/cube/ny.png"
import pz from "../models/background/cube/pz.png"
import nz from "../models/background/cube/nz.png"
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass";
import {CopyShader} from "three/examples/jsm/shaders/CopyShader";
import Stats from "three/examples/jsm/libs/stats.module"
import depthVertexShader from "./DepthVertexShader.glsl"
import depthFragmentShader from "./DepthFragmentShader.glsl"
import cocFragmentShader from "./CoCFragmentShader.glsl"
import blurFragmentShader from "./BlurFragmentShader.glsl"
import DoFFragmentShader from "./DoFFragmentShader.glsl"
import {Scene} from "three";


function main(){
	var scene = new THREE.Scene();
	// TODO: Find a more elegant way to add background (maybe something like scene.background = new THREE.WebGLCubeRenderTarget( 1024, options ).fromEquirectangularTexture( renderer, texture );)
	// TODO: Otherwise see test_gui.js for an example
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
		gltf.scene.scale.set(5, 5, 5)
		gltf.scene.traverse( child => {
			if ( child.material ) child.material.metalness = 0.0;

		} );

		scene.add( gltf.scene );

	}, undefined, function ( error ) {

		console.error( error );

	} );



	var light = new THREE.AmbientLight("#c9c7c7", 1); // soft white light
	scene.add(light);

	var directionalLight = new THREE.DirectionalLight("#c9c7c7", 2);
	directionalLight.target = sphere;
	scene.add(directionalLight);

	var teslaLight = new THREE.DirectionalLight("#c9c7c7", 50);
	teslaLight.position.set(-10, 20, 10);
	scene.add(teslaLight);


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
			focalDepth: {value: cameraParameters.focalDepth}, //0.4
			focalLength: {value: cameraParameters.focalLength}, //0.1
			fstop: {value: cameraParameters.fstop}
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
			focalDepth: {value: cameraParameters.focalDepth}, //0.4
			focalLength: {value: cameraParameters.focalLength}, //0.1
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
			focalDepth: {value: cameraParameters.focalDepth}, //0.4
			focalLength: {value: cameraParameters.focalLength}, //0.1
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
			bokehBlurSize: {value: 4.0}
		}
	});
	var DoFPlane = new THREE.PlaneBufferGeometry(2, 2);
	var DoFQuad = new THREE.Mesh(DoFPlane, DoFShaderMaterial);
	DoFScene = new Scene();
	DoFScene.add(DoFQuad);

	var basicTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight );
	basicTarget.texture.format = THREE.RGBFormat;
	basicTarget.texture.minFilter = THREE.NearestFilter;
	basicTarget.texture.magFilter = THREE.NearestFilter;
	basicTarget.texture.generateMipmaps = false;
	basicTarget.stencilBuffer = false;
	basicTarget.depthBuffer = true;
	basicTarget.depthTexture = new THREE.DepthTexture();
	basicTarget.depthTexture.format = THREE.DepthFormat;
	basicTarget.depthTexture.type = THREE.UnsignedIntType;

	var cocTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
	// cocTarget.setSize(innerWidth / 2, innerHeight / 2);     // Lower resolution for blur
	cocTarget.texture.format = THREE.RGBFormat;
	cocTarget.texture.minFilter = THREE.NearestFilter;
	cocTarget.texture.magFilter = THREE.NearestFilter;
	cocTarget.texture.generateMipmaps = false;
	cocTarget.stencilBuffer = false;
	cocTarget.depthBuffer = true;
	cocTarget.depthTexture = new THREE.DepthTexture();
	cocTarget.depthTexture.format = THREE.DepthFormat;
	cocTarget.depthTexture.type = THREE.UnsignedIntType;

	var blurTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
	blurTarget.setSize(innerWidth, innerHeight);     // Lower resolution for blur
	blurTarget.texture.format = THREE.RGBFormat;
	blurTarget.texture.minFilter = THREE.NearestFilter;
	blurTarget.texture.magFilter = THREE.NearestFilter;
	blurTarget.texture.generateMipmaps = false;
	blurTarget.stencilBuffer = false;
	blurTarget.depthBuffer = true;
	blurTarget.depthTexture = new THREE.DepthTexture();
	blurTarget.depthTexture.format = THREE.DepthFormat;
	blurTarget.depthTexture.type = THREE.UnsignedIntType;

	var DoFTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
	DoFTarget.setSize(innerWidth, innerHeight);     // Lower resolution for DoF
	DoFTarget.texture.format = THREE.RGBFormat;
	DoFTarget.texture.minFilter = THREE.NearestFilter;
	DoFTarget.texture.magFilter = THREE.NearestFilter;
	DoFTarget.texture.generateMipmaps = false;
	DoFTarget.stencilBuffer = false;
	DoFTarget.depthBuffer = true;
	DoFTarget.depthTexture = new THREE.DepthTexture();
	DoFTarget.depthTexture.format = THREE.DepthFormat;
	DoFTarget.depthTexture.type = THREE.UnsignedIntType;

	// Effect Composer
/*
	var renderComposer = new EffectComposer(renderer, basicTarget);
	var renderPass = new RenderPass(scene, camera);
	renderComposer.addPass(renderPass);

	var depthComposer = new EffectComposer(renderer)
	depthComposer.addPass(new RenderPass(scene, camera))

	var depthShader = {
		vertexShader: depthVertexShader,
		fragmentShader: depthFragmentShader,
		uniforms: {
			cameraNear: { value: camera.near },
			cameraFar: { value: camera.far },
			tDiffuse: { value: null },
			tDepth: { value: null }
		}
	}
	var depthPass = new ShaderPass(depthShaderMaterial);
	depthPass.uniforms.tDepth.value = basicTarget.depthTexture;
	depthPass.uniforms.tDiffuse.value = basicTarget.texture;
	depthComposer.addPass(depthPass);
	var copyPass = new ShaderPass(CopyShader);
	copyPass.renderToScreen = true;
	depthComposer.addPass(copyPass);

 */
	var gui = new GUI();

	var guiControls = new function(){
		this.whichScene = "DoF";
	}
	{
		const folder = gui.addFolder("Rendered scene");
		folder.add(guiControls, "whichScene", ["Basic", "CoC", "Depth", "DoF"]).name("Scene")
		folder.open();
	}
	{
		const folder = gui.addFolder("Camera parameters");
		folder.add(cameraParameters, "focalDepth", 0.0, 1.0).name("Focal depth").step(0.01);
		folder.open();
	}

	var stats = new Stats();
	document.body.appendChild(stats.dom);

	animate();

	function animate(){
		switch(guiControls.whichScene){
			case "Basic":
				render();
				break;
			case "CoC":
				renderScene(cocScene);
				break;
			case "Depth":
				renderScene(depthScene);
				break;
			case "DoF":
				renderDoF();
				break;
		}
		stats.update();
		requestAnimationFrame(animate);
	}

	function render(){
		renderer.render(scene, camera);
	}

	function renderScene(sceneToRender){

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


	var controls = new OrbitControls(camera, renderer.domElement);
	// controls.enableDamping = true;
	controls.target = new THREE.Vector3(-3, 1, 0);
	controls.addEventListener('change', function(){
		switch(guiControls.whichScene){
			case "Basic":
				render();
				break;
			case "CoC":
				renderScene(cocScene);
				break;
			case "Depth":
				renderScene(depthScene);
				break;
			case "DoF":
				renderDoF();
				break;
		}
	});
	controls.update();      //required if dampling is enabled

	window.addEventListener("resize", _ => {
		renderer.setSize(window.innerWidth, window.innerHeight);
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	})

}

main();