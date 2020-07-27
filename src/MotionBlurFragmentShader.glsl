varying vec2 vUv;
uniform sampler2D tDiffuse;

uniform sampler2D tVelocity;

#define SAMPLES 10

void main() {
    vec2 vel = texture2D(tVelocity, vUv).xy;
    vec4 result = texture2D(tDiffuse, vUv);
    for(int i = 1; i <= SAMPLES; i ++) {
        vec2 offset = vel * (float(i - 1) / float(SAMPLES) - 0.5);
        result += texture2D(tDiffuse, vUv + offset);
    }
    result /= float(SAMPLES + 1);
    gl_FragColor = result;
}
