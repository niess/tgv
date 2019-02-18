class Viewer
    constructor: ->
        undefined


    run: ->
        # Create the ui
        ui = new UI

        # Initialise the renderer
        renderer = new THREE.WebGLRenderer {antialias:true}
        renderer.setSize window.innerWidth, window.innerHeight
        renderer.setPixelRatio(
            if window.devicePixelRatio then window.devicePixelRatio else 1)
        document.body.appendChild renderer.domElement

        # Create the scene
        scene = new THREE.Scene

        # Deferred configuration of the scene
        scene.unveil = (scale) ->
            # Configure the lighting
            scene.add new THREE.AmbientLight 0xffffff

            # Add axes
            scene.add new THREE.AxesHelper 0.05 * scale

            # Create and initialise the camera
            [w, h] = [window.innerWidth, window.innerHeight]
            camera = new THREE.PerspectiveCamera(
                75, w / h, 1e-03 * scale,  10 * scale)
            camera.position.x = 0.5 * scale
            camera.position.y = 0.5 * scale
            camera.position.z = 0.5 * scale

            # Set the camera controls
            controls = new THREE.TrackballControls camera, renderer.domElement
            controls.rotateSpeed = 3.0
            controls.zoomSpeed = 0.5

            # Return the rendering routine
            render = ->
                requestAnimationFrame render
                renderer.render scene, camera

                do controls.update
                do ui.update
            render

        # Load and render the GDML
        loader = new THREE.GDMLLoader
        loader.load(
            "gdml/Phase-II-modDS.gdml"
            (mesh, materials) ->
                # Get the bounding sphere of the World volume
                do mesh.geometry.computeBoundingSphere
                scale = mesh.geometry.boundingSphere.radius

                # Add the GDML objects to the scene
                scene.add mesh

                # Start the rendering loop
                render = scene.unveil scale
                do render
            (xhr) ->
                console.log(
                    "#{Math.round(xhr.loaded / xhr.total * 100)}% loaded")
            (err) ->
                console.log err
        )


class UI
    constructor: ->
        @stats = new Stats
        document.body.appendChild @stats.domElement


    update: ->
        do @stats.update


# Run the viewer
app = new Viewer
do app.run
