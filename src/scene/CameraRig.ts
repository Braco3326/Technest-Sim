/**
 * CameraRig — flies the ArcRotateCamera between the ENSEMBLE pose (the level's
 * environment preset) and a FOCUS pose auto-framing one device (ADR-0008).
 * Eased 250-350 ms (spec §2); prefers-reduced-motion → instant cut, no fly.
 * Camera-only module: imports no engine code and never mutates any graph state.
 */
import { ArcRotateCamera, Animation, CubicEase, EasingFunction, Vector3 } from '@babylonjs/core'
import { motionEnabled } from '../design/tokens'

export interface CameraPose {
  alpha: number
  beta: number
  radius: number
  target: Vector3
}

/** What the rig needs to frame a device: world bounds, nothing engine-side. */
export interface FrameTarget {
  center: Vector3
  /** Half-diagonal of the device's world bounding box (meters). */
  boundingRadius: number
}

export const FLY_MS = 300 // spec §2: 250-350 ms eased
const FPS = 60
/** Placeholder port panels face −Z (DeviceSpawner) — arrive looking at them. */
const FOCUS_ALPHA = -Math.PI / 2
const FOCUS_BETA = 1.15

export class CameraRig {
  private ensemble: CameraPose

  constructor(private camera: ArcRotateCamera) {
    this.ensemble = this.currentPose()
  }

  private currentPose(): CameraPose {
    return {
      alpha: this.camera.alpha,
      beta: this.camera.beta,
      radius: this.camera.radius,
      target: this.camera.target.clone(),
    }
  }

  /** Auto-frame the device's active panel (spec §2): ports face you, orbit free. */
  flyToDevice(frame: FrameTarget): void {
    this.fly({
      alpha: FOCUS_ALPHA,
      beta: FOCUS_BETA,
      radius: Math.min(6, Math.max(0.9, frame.boundingRadius * 2.6)),
      target: frame.center,
    })
  }

  flyToEnsemble(): void {
    this.fly(this.ensemble)
  }

  private fly(to: CameraPose): void {
    this.camera.getScene().stopAnimation(this.camera)
    if (!motionEnabled()) {
      // prefers-reduced-motion: instant cut (spec §2 — no fly, no nausea).
      this.camera.alpha = to.alpha
      this.camera.beta = to.beta
      this.camera.radius = to.radius
      this.camera.setTarget(to.target.clone())
      return
    }
    const frames = Math.round((FLY_MS / 1000) * FPS)
    const ease = new CubicEase()
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT)
    const scene = this.camera.getScene()
    // Normalize alpha so the fly takes the short way around the orbit.
    const alphaFrom = this.camera.alpha
    const alphaTo = alphaFrom + shortestAngle(alphaFrom, to.alpha)
    const animate = (property: string, from: number | Vector3, target: number | Vector3) => {
      const type = typeof from === 'number' ? Animation.ANIMATIONTYPE_FLOAT : Animation.ANIMATIONTYPE_VECTOR3
      const anim = new Animation(`cam:${property}`, property, FPS, type, Animation.ANIMATIONLOOPMODE_CONSTANT)
      anim.setKeys([
        { frame: 0, value: from },
        { frame: frames, value: target },
      ])
      anim.setEasingFunction(ease)
      scene.beginDirectAnimation(this.camera, [anim], 0, frames, false)
    }
    animate('alpha', alphaFrom, alphaTo)
    animate('beta', this.camera.beta, to.beta)
    animate('radius', this.camera.radius, to.radius)
    animate('target', this.camera.target.clone(), to.target.clone())
  }
}

/** Signed shortest rotation from a to b, in (−π, π]. */
export function shortestAngle(a: number, b: number): number {
  const twoPi = Math.PI * 2
  let d = (b - a) % twoPi
  if (d > Math.PI) d -= twoPi
  if (d <= -Math.PI) d += twoPi
  return d
}
