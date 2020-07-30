import * as THREE from 'three';
import { Pass } from "../postprocessing/Pass.js";

var MotionBlurPass = function ( scene, camera, options = {} ) {

	Pass.call( this );

	options = Object.assign( {

		enabled: true,
		renderCameraBlur: true,
		samples: 15,
		interpolateGeometry: 0.5,
		smearIntensity: 0.25,

	}, options );

	Object.defineProperty( this, 'enabled', {

		set: val => {

			if ( val === false ) {

				this._prevPosMap.clear();
				this._cameraMatricesNeedInitializing = true;

			}

			this._enabled = val;

		},

		get: () => this._enabled

	} );

	this.needsSwap = true;

	// settings
	this.enabled = options.enabled;
	this.samples = options.samples;
	this.interpolateGeometry = options.interpolateGeometry;
	this.smearIntensity = options.smearIntensity;
	this.renderCameraBlur = options.renderCameraBlur;

	this.scene = scene;
	this.camera = camera;

	this.debug = {

		display: MotionBlurPass.DEFAULT,
		dontUpdateState: false

	};

	// list of positions from previous frames
	this._prevPosMap = new Map();
	this._frustum = new THREE.Frustum();
	this._projScreenMatrix = new THREE.Matrix4();
	this._cameraMatricesNeedInitializing = true;
	this._prevClearColor = new THREE.Color();
	this._clearColor = new THREE.Color( 0, 0, 0 );

	// render targets
	this._velocityBuffer =
		new THREE.WebGLRenderTarget( 256, 256, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.HalfFloatType
		} );
	// this._velocityBuffer.texture.name = "MotionBlurPass.Velocity";
	this._velocityBuffer.texture.generateMipmaps = false;

	this._prevCamProjection = new THREE.Matrix4();
	this._prevCamWorldInverse = new THREE.Matrix4();

	this._velocityMaterial = this.getVelocityMaterial();
	this._geomMaterial = this.getGeometryMaterial();
	this._compositeMaterial = this.getCompositeMaterial();

	this._compositeCamera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	this._compositeScene = new THREE.Scene();

	this._quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), this._compositeMaterial );
	this._quad.frustumCulled = false;
	this._compositeScene.add( this._quad );

};

MotionBlurPass.prototype = Object.assign( Object.create( Pass.prototype ), {

	constructor: MotionBlurPass,

	dispose: function () {

		this._velocityBuffer.dispose();
		this._prevPosMap.clear();

	},

	setSize: function ( width, height ) {

		this._velocityBuffer.setSize( width, height );

	},

	render: function ( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		// Set the clear state
		this._prevClearColor.copy( renderer.getClearColor() );
		var prevClearAlpha = renderer.getClearAlpha();
		var prevAutoClear = renderer.autoClear;
		renderer.autoClear = false;
		renderer.setClearColor( this._clearColor, 0 );

		// Traversal function for iterating down and rendering the scene
		var self = this;
		var newMap = new Map();
		function recurse( obj ) {

			if ( obj.visible === false ) return;

			if ( obj.type === 'Mesh' ) {

				self._drawMesh( renderer, obj );

				// Recreate the map of drawn geometry so we can
				// drop references to removed meshes
				if ( self._prevPosMap.has( obj ) ) {

					newMap.set( obj, self._prevPosMap.get( obj ) );

				}

			}

			for ( var i = 0, l = obj.children.length; i < l; i ++ ) {

				recurse( obj.children[ i ] );

			}

		}

		renderer.compile( this.scene, this.camera );

		// If we're rendering the blurred view, then we need to render
		// to the velocity buffer, otherwise we can render a debug view
		if ( this.debug.display === MotionBlurPass.DEFAULT ) {

			renderer.setRenderTarget( this._velocityBuffer );

		} else {

			renderer.setRenderTarget( this.renderToScreen ? null : writeBuffer );

		}

		// reinitialize the camera matrices to the current pos because if
		// the pass has been disabeled then the matrices will be out of date

		/*
				if ( this._cameraMatricesNeedInitializing ) {

					this._prevCamWorldInverse.copy( this.camera.matrixWorldInverse );
					this._prevCamProjection.copy( this.camera.projectionMatrix );
					this._cameraMatricesNeedInitializing = false;

				}


		 */



		this._projScreenMatrix.multiplyMatrices( this.camera.projectionMatrix, this.camera.matrixWorldInverse );
		this._frustum.setFromProjectionMatrix( this._projScreenMatrix );
		renderer.clear();
		recurse( this.scene );

		// replace the old map with a new one storing only
		// the most recently traversed meshes
		// this._prevPosMap.clear();
		// this._prevPosMap = newMap;

		this._prevCamWorldInverse.copy( this.camera.matrixWorldInverse );
		this._prevCamProjection.copy( this.camera.projectionMatrix );

		// compose the final blurred frame
		if ( this.debug.display === MotionBlurPass.DEFAULT ) {

			var cmat = this._compositeMaterial;
			cmat.uniforms.sourceBuffer.value = readBuffer.texture;
			cmat.uniforms.velocityBuffer.value = this._velocityBuffer.texture;

			if ( cmat.defines.SAMPLES !== this.samples ) {

				cmat.defines.SAMPLES = Math.max( 0, Math.floor( this.samples ) );
				cmat.needsUpdate = true;

			}

			renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer)
			renderer.render( this._compositeScene, this._compositeCamera);
			// renderer.clear();

		}

		// Restore renderer settings
		renderer.setClearColor( this._prevClearColor, prevClearAlpha );
		renderer.autoClear = prevAutoClear;

	},

	_getMaterialState( obj ) {

		var data = this._prevPosMap.get( obj );
		if ( data === undefined ) {

			data = {

				matrixWorld: obj.matrixWorld.clone(),
				geometryMaterial: this._geomMaterial.clone(),
				velocityMaterial: this._velocityMaterial.clone(),
				boneMatrices: null,
				boneTexture: null,

			};
			this._prevPosMap.set( obj, data );

		}

		return data;

	},

	_saveMaterialState( obj ) {

		var data = this._prevPosMap.get( obj );

		data.matrixWorld.copy( obj.matrixWorld );

	},

	_drawMesh( renderer, obj ) {

		var renderCameraBlur = this.renderCameraBlur;
		var interpolateGeometry = this.interpolateGeometry;
		var smearIntensity = this.smearIntensity;
		var overrides = obj.motionBlur;
		if ( overrides ) {

			if ( 'renderCameraBlur' in overrides ) renderCameraBlur = overrides.renderCameraBlur;
			if ( 'interpolateGeometry' in overrides ) interpolateGeometry = overrides.interpolateGeometry;
			if ( 'smearIntensity' in overrides ) smearIntensity = overrides.smearIntensity;

		}


		var skip = ( obj.material.transparent || obj.material.alpha < 1 ) || obj.frustumCulled && ! this._frustum.intersectsObject( obj )
		if ( skip ) {

			if ( this._prevPosMap.has( obj ) && this.debug.dontUpdateState === false ) {

				this._saveMaterialState( obj );

			}
			return;

		}


		var data = this._getMaterialState( obj );
		var mat = this.debug.display === MotionBlurPass.GEOMETRY ? data.geometryMaterial : data.velocityMaterial;
		mat.uniforms.interpolateGeometry.value = Math.min( 1, Math.max( 0, interpolateGeometry ) );
		mat.uniforms.smearIntensity.value = smearIntensity;

		var projMat = renderCameraBlur ? this._prevCamProjection : this.camera.projectionMatrix;
		var invMat = renderCameraBlur ? this._prevCamWorldInverse : this.camera.matrixWorldInverse;
		mat.uniforms.prevProjectionMatrix.value.copy( projMat );
		mat.uniforms.prevModelViewMatrix.value.multiplyMatrices( invMat, data.matrixWorld );

		renderer.renderBufferDirect( this.camera, null, obj.geometry, mat, obj, null );

		if ( this.debug.dontUpdateState === false ) {

			this._saveMaterialState( obj );

		}

	},

	// Shaders

	getVertexTransform: function () {

		// Returns the body of the vertex shader for the velocity buffer and
		// outputs the position of the current and last frame positions
		return `
		vec3 transformed;
		
		// Get the normal
		${ THREE.ShaderChunk.beginnormal_vertex }
		${ THREE.ShaderChunk.defaultnormal_vertex }
		
		// Get the current vertex position
		transformed = vec3( position );
		newPosition = modelViewMatrix * vec4(transformed, 1.0);
		
		// Get the previous vertex position
		transformed = vec3( position );
		prevPosition = prevModelViewMatrix * vec4(transformed, 1.0);
		
		// The delta between frames
		vec3 delta = newPosition.xyz - prevPosition.xyz;
		vec3 direction = normalize(delta);
		
		// Stretch along the velocity axes
		float stretchDot = dot(direction, transformedNormal);
		
		newPosition =  projectionMatrix * newPosition;
		prevPosition = prevProjectionMatrix * prevPosition;
		gl_Position = mix(newPosition, prevPosition, interpolateGeometry * (1.0 - step(0.0, stretchDot) ) );
		`;

	},

	getVelocityMaterial: function () {

		return new THREE.ShaderMaterial( {

			uniforms: {
				prevProjectionMatrix: { value: new THREE.Matrix4() },
				prevModelViewMatrix: { value: new THREE.Matrix4() },
				prevBoneTexture: { value: null },
				interpolateGeometry: { value: 1 },
				smearIntensity: { value: 1 }
			},

			vertexShader:
				`
				uniform mat4 prevProjectionMatrix;
				uniform mat4 prevModelViewMatrix;
				uniform float interpolateGeometry;
				varying vec4 prevPosition;
				varying vec4 newPosition;
				void main() {
					${ this.getVertexTransform() }
				}`,

			fragmentShader:
				`
				uniform float smearIntensity;
				varying vec4 prevPosition;
				varying vec4 newPosition;
				void main() {
					vec3 vel;
					vel = (newPosition.xyz / newPosition.w) - (prevPosition.xyz / prevPosition.w);
					gl_FragColor = vec4(vel * smearIntensity, 1.0);
				}`
		} );

	},

	getGeometryMaterial: function () {

		return new THREE.ShaderMaterial( {

			uniforms: {
				prevProjectionMatrix: { value: new THREE.Matrix4() },
				prevModelViewMatrix: { value: new THREE.Matrix4() },
				prevBoneTexture: { value: null },
				interpolateGeometry: { value: 1 },
				smearIntensity: { value: 1 }
			},

			vertexShader:
				`
				uniform mat4 prevProjectionMatrix;
				uniform mat4 prevModelViewMatrix;
				uniform float interpolateGeometry;
				varying vec4 prevPosition;
				varying vec4 newPosition;
				varying vec3 color;
				void main() {
					${ this.getVertexTransform() }
					color = (modelViewMatrix * vec4(normal.xyz, 0)).xyz;
					color = normalize(color);
				}`,

			fragmentShader:
				`
				varying vec3 color;
				void main() {
					gl_FragColor = vec4(color, 1);
				}`
		} );

	},

	getCompositeMaterial: function () {

		return new THREE.ShaderMaterial( {

			defines: {
				SAMPLES: 30
			},

			uniforms: {
				sourceBuffer: { value: null },
				velocityBuffer: { value: null }
			},

			vertexShader:
				`
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}
				`,

			fragmentShader:
				`
				varying vec2 vUv;
				uniform sampler2D sourceBuffer;
				uniform sampler2D velocityBuffer;
				void main() {
					vec2 vel = texture2D(velocityBuffer, vUv).xy;
					vec4 result = texture2D(sourceBuffer, vUv);
					for(int i = 1; i <= SAMPLES; i++) {
						vec2 offset = vel * (float(i - 1) / float(SAMPLES) - 0.5);
						result += texture2D(sourceBuffer, vUv + offset);
					}
					result /= float(SAMPLES + 1);
					gl_FragColor = result;
				}
				`

		} );

	}

} );

MotionBlurPass.DEFAULT = 0;
MotionBlurPass.VELOCITY = 1;
MotionBlurPass.GEOMETRY = 2;

export {MotionBlurPass}