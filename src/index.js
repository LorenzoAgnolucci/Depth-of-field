import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass";
// import { BokehShader } from "three/examples/jsm/shaders/BokehShader";
import { BokehShader } from "three/examples/jsm/shaders/BokehShader2"
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
// import tesla from "../models/tesla_model_s/scene.gltf"
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
		50                                  // Far clipping pane
	);

	camera.position.set(5, 1, 0);
	// camera.lookAt(new THREE.Vector3(-5, 0, -10));

	var renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(0xeeeeee);
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

	/*
	var loader = new GLTFLoader();

	loader.load( tesla, function ( gltf ) {

		gltf.scene.position.z = -30
		gltf.scene.scale.set(0.5, 0.5, 0.5)
		scene.add( gltf.scene );

	}, undefined, function ( error ) {

		console.error( error );

	} );

	 */

	var light = new THREE.AmbientLight(0x404040, 1); // soft white light
	scene.add(light);

	var directionalLight = new THREE.DirectionalLight(0xffffff, 2);
	directionalLight.target = sphere;
	scene.add(directionalLight);

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
			focalDepth: {value: 0.4},
			focalLength: {value: 0.1},
			fstop: {value: 2.2}
		}
	})

	var cocPlane = new THREE.PlaneBufferGeometry(2, 2);
	var cocQuad = new THREE.Mesh(cocPlane, cocShaderMaterial);
	cocScene = new Scene();
	cocScene.add(cocQuad);

	var target = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight );
	target.texture.format = THREE.RGBFormat;
	target.texture.minFilter = THREE.NearestFilter;
	target.texture.magFilter = THREE.NearestFilter;
	target.texture.generateMipmaps = false;
	target.stencilBuffer = false;
	target.depthBuffer = true;
	target.depthTexture = new THREE.DepthTexture();
	target.depthTexture.format = THREE.DepthFormat;
	target.depthTexture.type = THREE.UnsignedIntType;

	// Effect Composer
/*
	var renderComposer = new EffectComposer(renderer, target);
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
	depthPass.uniforms.tDepth.value = target.depthTexture;
	depthPass.uniforms.tDiffuse.value = target.texture;
	depthComposer.addPass(depthPass);
	var copyPass = new ShaderPass(CopyShader);
	copyPass.renderToScreen = true;
	depthComposer.addPass(copyPass);

 */
	var gui = new GUI();

	var guiControls = new function(){
		this.boolRenderDepth = true;
	}
	{
		const folder = gui.addFolder("Choose scene");
		folder.add(guiControls, 'boolRenderDepth').name("render depth")
		folder.open();
	}

	var stats = new Stats();
	document.body.appendChild(stats.dom);

	animate();

	function animate(){
		if(guiControls.boolRenderDepth){
			renderDepth();
		}
		else{
			render();
		}
		stats.update();
		requestAnimationFrame(animate);
	}

	function render(){
		renderer.render(scene, camera);
	}

	function renderDepth(){

		renderer.setRenderTarget(target);
		renderer.render(scene, camera);

		depthShaderMaterial.uniforms.tDiffuse.value = target.texture;
		depthShaderMaterial.uniforms.tDepth.value = target.depthTexture;

		cocShaderMaterial.uniforms.tDiffuse.value = target.texture;
		cocShaderMaterial.uniforms.tDepth.value = target.depthTexture;

		renderer.setRenderTarget(null);
		renderer.render(cocScene, depthCamera);
		// renderer.render(depthScene, depthCamera);
	}


	var controls = new OrbitControls(camera, renderer.domElement);
	controls.target = new THREE.Vector3(-3, 1, 0);
	controls.addEventListener('change', function(){
		if(guiControls.boolRenderDepth){
			renderDepth();
		}
		else{
			render();
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