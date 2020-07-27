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

float getWeight(float dist, float maxDist){
    return 1.0 - dist/maxDist;
}

void main() {
    float weight[5] = float[](0.3533, 0.1631, 0.12245, 0.1018, 0.081);
    vec2 blurDirection;
    if (horizontalBlur){
        blurDirection = vec2(widthTexel, 0.0);
    }
    else {
        blurDirection = vec2(0.0, heightTexel);
    }

    float fragColorGreen = texture2D(tDiffuse, vUv).g * weight[0];

    for (int i = 1; i < 5; i++){
        fragColorGreen += texture2D(tDiffuse, (vUv + float(i) * blurDirection)).g * weight[i];
        fragColorGreen += texture2D(tDiffuse, (vUv - float(i) * blurDirection)).g * weight[i];
    }

    gl_FragColor.g = fragColorGreen;
    gl_FragColor.b = texture2D(tDiffuse, vUv).b;

    gl_FragColor.a = 1.0;
}
