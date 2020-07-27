in vec4 vPosition;
in vec4 prevVPosition;

void main(void) {
    vec3 vel = (vPosition.xyz / vPosition.w) - ((prevVPosition.xyz / prevVPosition.w));
    gl_FragColor = vec4(vel, 1.0); // * vec4(10.0, 10.0, 10.0, 1.0);
    // gl_FragColor = vec4(10.0, 10.0, 10.0, 1.0);
}
