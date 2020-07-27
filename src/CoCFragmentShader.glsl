#include <packing>

varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;

uniform float focalDepth;       // Focal distance value in meters
uniform float focalLength;      // Focal length in mm
uniform float fstop;        // F-stop value

uniform bool mouseFocus;
uniform vec2 mouseCoords;

float readDepth( sampler2D depthSampler, vec2 coord ) {
    float fragCoordZ = texture2D( depthSampler, coord ).x;
    // float viewZ = ( cameraNear * cameraFar ) / ( ( cameraFar - cameraNear ) * fragCoordZ - cameraFar );
    float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
    // return ( viewZ + cameraNear ) / ( cameraNear - cameraFar );
    return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
}

void main() {
    float depth = readDepth( tDepth, vUv );
    float focalDepthMM = focalDepth * 1000.0;       // Focal depth in millimeters
    if(mouseFocus){
        float mouseDepth = readDepth(tDepth, mouseCoords);
        float mouseFocalDepth = - cameraFar * cameraNear / (mouseDepth * (cameraFar - cameraNear) - cameraFar);
        focalDepthMM = mouseFocalDepth * 1000.0;
    }
    float objectDistance = - cameraFar * cameraNear / (depth * (cameraFar - cameraNear) - cameraFar);
    objectDistance = objectDistance * 1000.0;       // Object distance in millimeters

    float CoC = (focalLength / fstop) * (focalLength * (objectDistance - focalDepthMM)) / (objectDistance * (focalDepthMM - focalLength));      // From NVIDIA Chapter 23 (or Wikipedia Circle of Confusion)
    CoC = clamp(CoC, -1.0, 1.0);

    if(CoC >= 0.0){
        gl_FragColor.b = CoC;
    }
    else{
        gl_FragColor.g = abs(CoC);
    }

    gl_FragColor.a = 1.0;
}