import * as THREE from 'three';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import velocityVertexShader from "./VelocityVertexShader.glsl"
import velocityFragmentShader from "./VelocityFragmentShader.glsl"
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass";
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass";
import depthVertexShader from "./DepthVertexShader.glsl";
import depthFragmentShader from "./DepthFragmentShader.glsl";
import {Scene} from "three";


var scene = new THREE.Scene();

var axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

var camera = new THREE.PerspectiveCamera(
	75,                                   // Field of view
	window.innerWidth / window.innerHeight, // Aspect ratio
	0.1,                                  // Near clipping pane
	200                                  // Far clipping pane
);

camera.position.set(5, 3, 0);

var renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xeeeeee);
renderer.setPixelRatio( window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

var plane = new THREE.Mesh(new THREE.PlaneGeometry(5, 10, 5, 10), new THREE.MeshStandardMaterial({
	color: "#236cdb"
}));
plane.rotation.x = -Math.PI * 0.5;
scene.add(plane);

var ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 8), new THREE.MeshStandardMaterial({
	color: "#d90fec", wireframe: true
}));

ball.castShadow = true;
scene.add(ball);

var light = new THREE.DirectionalLight("#c9c7c7", 2);
light.target = ball;
scene.add(light);

var ambient = new THREE.AmbientLight("#c9c7c7", 3);
scene.add(ambient);

const velocityShader = {
	uniforms: {
		prevProjectionMatrix: {value: new THREE.Matrix4()},
		prevModelViewMatrix: {value: new THREE.Matrix4()}
	},
	vertexShader: velocityVertexShader,
	fragmentShader: velocityFragmentShader
}

var velScene;
var velCamera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
var velShaderMaterial = new THREE.ShaderMaterial({
	vertexShader: velocityVertexShader,
	fragmentShader: velocityFragmentShader,
	uniforms: {
		prevProjectionMatrix: {value: new THREE.Matrix4()},
		prevModelViewMatrix: {value: new THREE.Matrix4()}
	}
});

var velPlane = new THREE.PlaneBufferGeometry(2, 2);
var velQuad = new THREE.Mesh(velPlane, velShaderMaterial);
velScene = new Scene();
velScene.add(velQuad);

var target = getRenderTarget();

/*
var firstComposer = new EffectComposer(renderer);
firstComposer.addPass(new RenderPass(scene, camera));
var velocityPass = new ShaderPass(velocityShader);
velocityPass.renderToScreen = true;
firstComposer.addPass(velocityPass);
*/

var clock = new THREE.Clock();
var time = 0;
var delta = 0;

render();
var tmpProjMat = new THREE.Matrix4();
var tmpMVMat = new THREE.Matrix4();


function render() {
	requestAnimationFrame(render);
	delta = clock.getDelta();
	time += delta;
	ball.rotation.x = time * 10;
	ball.position.y = 0.5 + Math.abs(Math.sin(time * 3)) * 2;
	ball.position.z = Math.cos(time) * 4;

	renderer.setRenderTarget(target);
	renderer.render(scene, camera);
	// camera.updateMatrix();
	// camera.updateMatrixWorld();

	tmpProjMat = camera.projectionMatrix;
	tmpMVMat = camera.modelViewMatrix;

	renderer.setRenderTarget(null);
	renderer.render(velScene, velCamera);

	velShaderMaterial.uniforms.prevProjectionMatrix.value = tmpProjMat;
	velShaderMaterial.uniforms.prevModelViewMatrix.value = tmpMVMat;


	// firstComposer.render(delta);
}

var controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;
controls.target = new THREE.Vector3(-3, 1, 0);

controls.addEventListener('change', function(){
	render();
});

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