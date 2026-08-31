import * as THREE from 'three';

/**
 * Live hair recolor: desaturates the sampled diffuse texture to luminance,
 * then tints by a uniform color - works on any hair material regardless of
 * its original photographed color, so one hairstyle mesh supports an
 * effectively unlimited number of colors instead of needing a pre-baked
 * texture per color.
 */
export function makeHairTintable(material: THREE.MeshStandardMaterial, initialColorHex: string) {
  const uTintColor = { value: new THREE.Color(initialColorHex) };
  const uTintStrength = { value: 0.9 };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTintColor = uTintColor;
    shader.uniforms.uTintStrength = uTintStrength;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uTintColor;\nuniform float uTintStrength;'
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float hairLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        vec3 tinted = hairLum * uTintColor * 1.6;
        diffuseColor.rgb = mix(diffuseColor.rgb, tinted, uTintStrength);`
      );
  };
  material.needsUpdate = true;

  return {
    setColor(hex: string) {
      uTintColor.value.set(hex);
    },
    setStrength(strength: number) {
      uTintStrength.value = strength;
    },
  };
}

export const HAIR_COLOR_PRESETS = [
  '#1b1310', '#3b2314', '#5a3222', '#7a4a25', '#a86b2e',
  '#c9a24a', '#8c1f1f', '#5b2a86', '#d94f9c', '#e8e8e8',
];
