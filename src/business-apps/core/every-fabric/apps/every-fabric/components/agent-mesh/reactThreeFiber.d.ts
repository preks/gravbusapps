import type { Object3DNode } from '@react-three/fiber'
import type * as THREE from 'three'

declare module '@react-three/fiber' {
  interface ThreeElements {
    mesh: Object3DNode<THREE.Mesh, typeof THREE.Mesh>
    meshBasicMaterial: Object3DNode<THREE.MeshBasicMaterial, typeof THREE.MeshBasicMaterial>
    sphereGeometry: Object3DNode<THREE.SphereGeometry, typeof THREE.SphereGeometry>
    ambientLight: Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>
    directionalLight: Object3DNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>
  }
}

export {}
