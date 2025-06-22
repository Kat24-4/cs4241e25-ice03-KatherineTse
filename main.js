// import our three.js reference
import * as THREE from 'https://unpkg.com/three/build/three.module.js'
import { Pane } from 'https://unpkg.com/tweakpane'

const app = {
    constructor() {
        this.onClickBinder = () => this.init()
        const header = document.createElement('h1')
        header.setAttribute("id", "header")
        header.style.display = 'flex'
        header.style.flexDirection = 'column'
        header.style.justifyContent = 'center'
        header.style.alignItems = 'center'
        header.innerText = 'Click Anywhere to Start!'
        document.body.appendChild(header)
        document.addEventListener('click', this.onClickBinder)
    },

    init() {
        document.removeEventListener('click', this.onClickBinder)
        document.getElementById('header').remove()

        // Starting object. Will be populated with camera, lighting objects, etc.
        this.scene = new THREE.Scene()

        // Create a new camera
        this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 1, 1000 )
        this.camera.position.z = 80

        // create AudioListener and add it to camera
        this.listener = new THREE.AudioListener()
        this.camera.add( this.listener)

        // Specify the type of renderer to use. In this case, it's a WebGL renderer.
        this.renderer = new THREE.WebGLRenderer()

        // Fill the entire window
        this.renderer.setSize( window.innerWidth, window.innerHeight )

        // Creates the canvas element and appends it to our page
        document.body.appendChild( this.renderer.domElement )

        this.createLights()
        this.knot = this.createKnot()

        this.createSound()

        // Take whatever function you're calling this on and creates a
        // permanent execution context. Ensures that when we call render(),
        // "this" is not assumed to be the global "this" but the function reference.
        // Called "hard binding"
        this.render = this.render.bind( this )
        this.render()

        // store material color hex so that it can be changed by user
        this.materialSettings = {
            color: `#${this.knot.material.color.getHexString()}`,
        }

        // create a new tweakpane instance
        this.pane = new Pane({ title: "Shape Settings"})
        // setup our pane to control the know rotation on the y axis
        this.pane.addBinding( this.knot.rotation, 'y', {
            min: 0,
            max: 360,
            step: 1
        } )
        // setup pane to control color of the object
        this.pane.addBinding( this.materialSettings, 'color').on('change', (ev) => {
            this.knot.material.color.set(ev.value);
        })
        // setup pane to control how shiny the object is
        this.pane.addBinding( this.knot.material, 'shininess', {
            min: 0,
            max: 3000,
            step: 1
        })
    },

    createLights() {
        // Create one point light and add it to the scene
        const pointLight = new THREE.DirectionalLight( 0xcccccc, 2 )

        // Set the point light's position
        pointLight.position.z = 100

        // Add the light to the scene
        this.scene.add( pointLight )
    },

    // Creates the torus knot geometry that we'll display in our scene
    createKnot() {
        const knotgeo = new THREE.TorusKnotGeometry( 10, 3, 300, 64 );

        // The material (texture) for the shape we want to draw
        const mat     = new THREE.MeshPhongMaterial({ color:0xff0000, shininess:3000 })//THREE.MeshNormalMaterial()
        const knot    = new THREE.Mesh( knotgeo, mat )

        // Add the knot tho the scene
        this.scene.add( knot )

        // get starting positions to use for animation
        this.originalPositions = knot.geometry.attributes.position.array.slice();

        return knot
    },

    createSound() {
        // add audio to the listener we created in init
        this.sound = new THREE.Audio ( this.listener )

        // create a loader and add the audio we want to play
        this.audioLoader = new THREE.AudioLoader()
        this.audioLoader.load( 'brain-implant-cyberpunk-sci-fi-trailer-action-intro-330416.mp3', ( buffer ) => {
            this.sound.setBuffer( buffer );
            this.sound.setLoop(true);
            this.sound.setVolume(0.5);
            this.sound.play();
        })

        // create an analyser that will we will use to animate our object
        this.analyser = new THREE.AudioAnalyser( this.sound, 32)
    },

    update() {
        // get the position verticies of the object
        const position = this.knot.geometry.attributes.position;
        const posArray = position.array;

        // get time to use to animate the shape
        let time = performance.now() * 0.003

        // k is the scale of the noise and use the audio to determine the scale based off the audio frequency
        let k = this.analyser.getAverageFrequency() / 1000;
        const amp = 0.3; //amplitude

        // update the positions based on the Perlin Noise, scale, and amplitude
        for (let i = 0; i < position.count; i++) {
            // start with original position so that changes are more obvious
            let x = this.originalPositions[i * 3]
            let y = this.originalPositions[i * 3 + 1]
            let z = this.originalPositions[i * 3 + 2]

            const n = noise.perlin3( x * k + time, y * k, z * k)
            const scale = 1 + amp * n;

            const p = new THREE.Vector3(x, y, z).multiplyScalar(scale);

            posArray[i * 3] = p.x
            posArray[i * 3 + 1] = p.y
            posArray[i * 3 + 2] = p.z
        }

        // tell program that the shape and positions need to be updated and normalize the Vertex
        position.needsUpdate = true;
        this.knot.geometry.computeVertexNormals();
    },

    // Animation loop
    render() {
        // Slowing increment the rotation angle over time to animate the knot
        this.knot.rotation.x += 0.006
        // this.knot.rotation.y += 0.001

        this.update()

        // Render using the scene and camera specified earlier
        this.renderer.render( this.scene, this.camera )

        // Schedules a function to be called the next time the graphics engine
        // refreshes your browser window. Necessary for the animation to occur.
        window.requestAnimationFrame( this.render )
    }
}

window.onload = ()=> app.constructor()