varying vec2 vUv;

uniform mat4 prevProjectionMatrix;
uniform mat4 prevModelViewMatrix;

out vec4 vPosition;
out vec4 prevVPosition;

void main() {
    vUv = uv;
    vPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    prevVPosition = prevProjectionMatrix * prevModelViewMatrix * vec4(position, 1.0);
    gl_Position = vPosition;
}
