#include <packing>

varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;

uniform float focalDepth;       // Focal distance value in meters
uniform float focalLength;      // Focal length in mm
uniform float fstop;        // F-stop value

uniform float widthTexel;       // 1.0 / window.innerWidth
uniform float heightTexel;      // 1.0 / window.innerHeight
uniform bool horizontalBlur;        //True -> Horizontal, False -> Vertical


float readDepth( sampler2D depthSampler, vec2 coord ) {
    float fragCoordZ = texture2D( depthSampler, coord ).x;
    float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
    return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
}

void main() {
    float weight[7] = float[](0.1633, 0.1531, 0.12245, 0.0918, 0.051, 0.02, 0.009);
    vec2 blurDirection;
    if(horizontalBlur){
        blurDirection = vec2(widthTexel, 0.0);
    }
    else{
        blurDirection = vec2(0.0, heightTexel);
    }

    vec3 fragColor = texture2D(tDiffuse, vUv).rgb * weight[0];

    for(int i=1; i<7; i++){
        fragColor += texture2D(tDiffuse, (vUv + float(i) * blurDirection)).rgb * weight[i];
        fragColor += texture2D(tDiffuse, (vUv - float(i) * blurDirection)).rgb * weight[i];
    }

    gl_FragColor.rgb = fragColor;

    gl_FragColor.a = 1.0;
}
