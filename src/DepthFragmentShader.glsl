#include <packing>

uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;

in vec2 vUv;

float readDepth( sampler2D depthSampler, vec2 coord ) {
    float fragCoordZ = texture2D( depthSampler, coord ).x;
    float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
    return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
}

void main() {
    float depth = readDepth( tDepth, vUv );

    gl_FragColor.rgb = vec3( depth );
    gl_FragColor.a = 1.0;
}