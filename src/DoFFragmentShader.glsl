#include <packing>

varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform sampler2D tOriginal;

uniform float bokehBlurSize;
uniform float texelWidth;
uniform float texelHeight;

float getWeight(float dist, float maxDist){
    return 1.0 - dist/maxDist;
}

void main() {
    float bokehBlurWeightTotal = 0.0;
    vec3 blurColor = vec3(0.0);

    vec3 sourceColor = texture2D(tOriginal, vUv).rgb;

    float CoC = max(texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv).b);

    for (float i=-bokehBlurSize; i<bokehBlurSize+1.0; i++){
        for (float j=-bokehBlurSize; j<bokehBlurSize+1.0; j++){
            vec2 dir = vec2(i, j) * vec2(texelWidth, texelHeight);
            float dist = length(dir);
            if (dist > bokehBlurSize){
                continue;
            }
            vec2 curUv = dir + vUv;
            float weight = getWeight(dist, bokehBlurSize);
            bokehBlurWeightTotal += weight;
            blurColor +=  weight * texture2D(tOriginal, curUv).rgb;
        }
    }
    blurColor /= bokehBlurWeightTotal;

    gl_FragColor.rgb = mix(sourceColor, blurColor, CoC);
    gl_FragColor.a = 1.0;
}