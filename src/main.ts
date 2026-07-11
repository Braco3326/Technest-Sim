import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  Color4,
} from '@babylonjs/core'

const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement
const engine = new Engine(canvas, true)
const scene = new Scene(engine)

scene.clearColor = new Color4(0.05, 0.05, 0.12, 1)

const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3, 15, Vector3.Zero(), scene)
camera.attachControl(canvas, true)
camera.lowerRadiusLimit = 2
camera.upperRadiusLimit = 50

new HemisphericLight('light', new Vector3(0, 1, 0), scene)

engine.runRenderLoop(() => scene.render())
window.addEventListener('resize', () => engine.resize())
