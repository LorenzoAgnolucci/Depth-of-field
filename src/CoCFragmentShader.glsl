#include <packing>

varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;

uniform float focalDepth;  //focal distance value in meters
uniform float focalLength; //focal length in mm
uniform float fstop; //f-stop value


float readDepth( sampler2D depthSampler, vec2 coord ) {
    float fragCoordZ = texture2D( depthSampler, coord ).x;
    // float viewZ = ( cameraNear * cameraFar ) / ( ( cameraFar - cameraNear ) * fragCoordZ - cameraFar );
    float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
    // return ( viewZ + cameraNear ) / ( cameraNear - cameraFar );
    return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
}

void main() {
    float depth = readDepth( tDepth, vUv );
    float aperture = focalLength / fstop;
    // float objectDistance = - cameraFar * cameraNear / (depth * (cameraFar - cameraNear) - cameraFar);
    float objectDistance = depth;

    float CoC = abs(aperture * (focalLength * (objectDistance - focalDepth)) / (objectDistance * (focalDepth - focalLength)));
    CoC = clamp(CoC, 0.0, 1.0);

    float signedDistance = depth - focalDepth;
    float magnitude = smoothstep(0.0, focalLength, abs(signedDistance));

    gl_FragColor.rg = vec2(
        step(signedDistance, 0.0) * magnitude,
        step(0.0, signedDistance) * magnitude
    );
    // gl.FragColor.rgb = vec3(CoC);
    gl_FragColor.a = 1.0;
}