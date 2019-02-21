class Viewer
    constructor: ->
        undefined


    run: ->
        # Initialise the renderer
        renderer = new THREE.WebGLRenderer {antialias:true}
        renderer.setSize window.innerWidth, window.innerHeight
        renderer.setPixelRatio(
            if window.devicePixelRatio then window.devicePixelRatio else 1)
        document.body.appendChild renderer.domElement

        # Create the scene
        scene = new THREE.Scene

        # Deferred configuration of the scene
        scene.unveil = (scale, materials) ->
            # Configure the lighting
            scene.add new THREE.AmbientLight 0xffffff

            # Add axes
            scene.add new THREE.AxesHelper 0.05 * scale

            # Create and initialise the camera
            [w, h] = [window.innerWidth, window.innerHeight]
            camera = new THREE.PerspectiveCamera(
                75, w / h, 1e-03 * scale,  10 * scale)

            # Create the ui
            ui = new UI renderer, camera, renderer.domElement, materials
            scene.add ui.viewPoint
            ui.viewPoint.position.x = 8565.19
            ui.viewPoint.position.y = 3872.13
            ui.viewPoint.position.z = 8839.75

            # Return the rendering routine
            render = ->
                requestAnimationFrame render
                renderer.render scene, camera

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
                render = scene.unveil scale, materials
                do render
            (xhr) ->
                console.log(
                    "#{Math.round(xhr.loaded / xhr.total * 100)}% loaded")
            (err) ->
                console.log err
        )


class UI
    constructor: (@renderer, @camera, @domElement, @materials) ->
        @stats = new Stats
        document.body.appendChild @stats.domElement
        @clock = new THREE.Clock true

        @walkSpeed = 5000.0
        [@_toggleViewReady, @_xView] = [true, false]

        scope = this
        @_keyMap =
            KeyA: (state) -> scope._moveLeft = state
            KeyW: (state) -> scope._moveForward = state
            KeyD: (state) -> scope._moveRight = state
            KeyS: (state) -> scope._moveBackward = state
            KeyQ: (state) -> scope._moveDown = state
            KeyE: (state) -> scope._moveUp = state
            KeyX: (state) -> scope._toggleView = state

        @_mouse =
            locked: false
            origin: new THREE.Vector2

        # Smoothen the pointer lock API
        @domElement.requestPointerLock = @domElement.requestPointerLock or
                                         @domElement.mozRequestPointerLock or
                                         @domElement.webkitPointerLockElement
        @_pointerLockElement = document.pointerLockElement or
                               document.mozPointerLockElement or
                               document.webkitPointerLockElement
        document.exitPointerLock = document.exitPointerLock or
                                   document.mozExitPointerLock or
                                   document.webkitExitPointerLock

        # Wrap the camera
        pitch = new THREE.Object3D
        pitch.add @camera
        yaw = new THREE.Object3D
        yaw.position.y = 1800
        yaw.add pitch
        [@viewPoint, @_pitch] = [yaw, pitch]

        # Bind events
        window.addEventListener "keydown", @onKeyDown, false
        window.addEventListener "keyup", @onKeyUp, false
        window.addEventListener "resize", @onWindowResize, false
        document.addEventListener(
            "pointerlockchange", @pointerLockChange, false)
        document.addEventListener(
            "mozpointerlockchange", @pointerLockChange, false)
        document.addEventListener(
            "webkitpointerlockchange", @pointerLockChange, false)
        @domElement.addEventListener "mousedown", @onMouseDown, false
        @domElement.addEventListener "mousemove", @onMouseMove, false
        @domElement.addEventListener "mouseup", @onMouseUp, false


    onWindowResize: =>
        @camera.aspect = window.innerWidth / window.innerHeight
        do @camera.updateProjectionMatrix
        @renderer.setSize window.innerWidth, window.innerHeight


    onKeyDown: (event) =>
        console.log event.code, "Down"

        action = @_keyMap[event.code]
        if action?
            do @clock.getDelta
            action(true)


    onKeyUp: (event) =>
        console.log event.code, "Up"

        action = @_keyMap[event.code]
        action(false) if action?


    onMouseDown: (event) =>
        do @domElement.requestPointerLock
        @_mouse.locked = true
        @_mouse.origin.set event.pageX, event.pageY
        console.log "Mouse Down", @_mouse.origin


    onMouseMove: (event) =>
        return if not @_mouse.locked
        dX = event.movementX or event.mozMovementX or event.webkitMovementX or 0
        dY = event.movementY or event.mozMovementY or event.webkitMovementY or 0

        @viewPoint.rotation.y -= dX * 0.002
        @_pitch.rotation.x -= dY * 0.002
        @_pitch.rotation.x = Math.max(
            -0.5 * Math.PI
            Math.min 0.5 * Math.PI, @_pitch.rotation.x
        )


    onMouseUp: (event) =>
        console.log "Mouse Up"
        @_mouse.locked = false
        do document.exitPointerLock


    onPointerLockChanged: =>
        if (!@_pointerLockElement)
            @_mouse.locked = false


    toggleView: =>
        @_xView = !@_xView
        if @_xView
            for _, material of @materials
                if material.type == "gas"
                    material.wireframe = true
                    material.visible = true
                else if material.type == "liquid"
                    material.opacity = 0.25
                else
                    material.transparent = true
                    material.opacity = 0.5
                material.needsUpdate = true
        else
            for _, material of @materials
                if material.type == "gas"
                    material.wireframe = false
                    material.visible = false
                else if material.type == "liquid"
                    material.opacity = 0.5
                else
                    material.transparent = false
                    material.opacity = 1
                material.needsUpdate = true


    update: ->
        do @stats.update

        [update, delta] = [false, undefined]
        if @_moveLeft and !@_moveRight
            dX = -1
        else if @_moveRight and !@_moveLeft
            dX = 1
        else
            dX = 0
        if @_moveForward and !@_moveBackward
            dZ = -1
        else if @_moveBackward and !@_moveForward
            dZ = 1
        else
            dZ = 0
        if @_moveUp and !@_moveDown
            dY = 1
        else if @_moveDown and !@_moveUp
            dY = -1
        else
            dY = 0

        if dX != 0
            delta = do @clock.getDelta if !delta?
            @viewPoint.translateX(@walkSpeed * delta * dX)
            update = true
        if dZ != 0
            delta = do @clock.getDelta if !delta?
            @viewPoint.translateZ(@walkSpeed * delta * dZ)
            update = true
        if dY != 0
            delta = do @clock.getDelta if !delta?
            @viewPoint.translateY(@walkSpeed * delta * dY)
            update = true
        if update
            do @camera.updateProjectionMatrix
            console.log "Position:", @viewPoint.position

        if @_toggleView
            if @_toggleViewReady
                do @toggleView
                @_toggleViewReady = false
        else
                @_toggleViewReady = true


# Run the viewer
app = new Viewer
do app.run
