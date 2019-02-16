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
        loader = new THREE.FileLoader
        loader.load(
            "gdml/Phase-II-modDS.gdml"
            (data) ->
                # Load the GDML objects
                gdml = new GDML data
                scene.add gdml.objects

                console.log gdml.objects

                # Get the bounding sphere of the World volume
                geometry = gdml
                    .objects
                    .getObjectByName("World/contour")
                    .geometry
                do geometry.computeBoundingSphere
                scale = geometry.boundingSphere.radius

                # Start the rendering loop
                render = scene.unveil scale
                do render
            (xhr) ->
                console.log "#{Math.round(xhr.loaded / xhr.total * 100)}% loaded"
            (err) ->
                console.log err
        )


# Extend strings
String::hash ?= ->
    h = 0
    if @length == 0
        return h

    for i in [0 .. @length - 1]
        chr = @charCodeAt i
        h = ((h << 5) - h) + chr
        h |= 0
    h
String::startsWith ?= (s) -> @slice(0, s.length) == s
String::endsWith   ?= (s) -> s == '' or @slice(-s.length) == s


class GDML
    constructor: (data) ->
        # Parse the GDML as an XML file
        data = new DOMParser().parseFromString data, "text/xml"

        # Shortcut for getting the name of a GDML element
        name_of = (element) -> element.getAttribute "name"

        # Shortcut for fetching a GDML reference
        ref_of = (element, tag) ->
            element.getElementsByTagName("#{tag}ref")[0].getAttribute "ref"

        # System of units
        units =
            rad: 1.0
            deg: Math.PI / 180.0
            mm: 1.0
            m: 1e+03

        unit_of = (element, category) ->
            units[element.getAttribute(category)]

        # Build the materials
        @materials = {}
        for material in data.getElementsByTagName "material"
            [name, state] = [name_of(material), material.getAttribute("state")]
            if state == "gas"
                @materials[name] = new THREE.MeshBasicMaterial
                    color: 0xcccccc
                    wireframe: true
                    transparent: true
                    opacity: 0.5
                    name: name
            else
                @materials[name] = new THREE.MeshBasicMaterial
                    color: name.hash() %% 0xffffff
                    transparent: true
                    opacity: 0.5
                    name: name

        # Build the solids
        solids = {}
        parsers =
            box: (solid) ->
                unit = unit_of solid, "lunit"
                new THREE.BoxGeometry(
                    unit * solid.getAttribute "x"
                    unit * solid.getAttribute "y"
                    unit * solid.getAttribute "z"
                )

            polycone: (solid) ->
                lunit = unit_of solid, "lunit"
                aunit = unit_of solid, "aunit"
                [phi0, dphi] = [
                    aunit * solid.getAttribute "startphi"
                    aunit * solid.getAttribute "deltaphi"
                ]
                zplanes = ([
                        lunit * zplane.getAttribute "rmin"
                        lunit * zplane.getAttribute "rmax"
                        lunit * zplane.getAttribute "z"
                    ] for zplane in solid.getElementsByTagName "zplane")

                points = (new THREE.Vector2(rmax, z)                           \
                         for [rmin, rmax, z] in zplanes[..].reverse())
                inner = (new THREE.Vector2(rmin, z)                            \
                         for [rmin, rmax, z] in zplanes if rmin > 0.0)
                Array::push.apply points, inner
                points.push points[0]

                permutate = new THREE.Matrix4
                permutate.set(
                    0, 0, 1, 0,
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 0, 1
                )
                new THREE.LatheGeometry points, 24, phi0, dphi
                    .applyMatrix permutate


            tube: (solid) ->
                lunit = unit_of solid, "lunit"
                aunit = unit_of solid, "aunit"
                [rmin, rmax, z, phi0, dphi] = [
                    lunit * solid.getAttribute "rmin"
                    lunit * solid.getAttribute "rmax"
                    lunit * solid.getAttribute "z"
                    aunit * solid.getAttribute "startphi"
                    aunit * solid.getAttribute "deltaphi"
                ]
                rmin = 0.0 if !rmin?
                phi1 = phi0 + dphi
                direction = (dphi < 0)

                shape = new THREE.Shape
                shape.absarc 0, 0, rmax, phi0, phi1, direction
                if dphi < 2 * Math.PI
                    if rmin > 0.0
                        shape.absarc(0, 0, rmin, phi1, phi0, !direction)
                        shape.closePath()
                    else
                        shape.closePath()
                else if rmin > 0.0
                    hole = new THREE.Path
                    hole.absarc 0, 0, rmin, phi0, phi1, direction
                    shape.holes.push hole

                new THREE.ExtrudeGeometry(shape,
                    depth: z
                    steps: 1
                    bevelEnabled: false
                    curveSegments: 24
                ).translate(0, 0, -0.5 * z)

            xtru: (solid) ->
                lunit = unit_of solid, "lunit"
                z = (lunit * element.getAttribute("zPosition")                 \
                     for element in solid.getElementsByTagName "section")
                if (z.length != 2) or (z[0] != -z[1])
                    console.error "unsuported xtru: #{name_of solid}"
                    return undefined
                z = 2 * z[1]

                shape = new THREE.Shape
                vertices = [...solid.getElementsByTagName "twoDimVertex"]
                shape.moveTo(
                    lunit * vertices[0].getAttribute "x"
                    lunit * vertices[0].getAttribute "y"
                )
                for vertex in vertices[1..]
                    shape.lineTo(
                        lunit * vertex.getAttribute "x"
                        lunit * vertex.getAttribute "y"
                    )
                shape.closePath()

                new THREE.ExtrudeGeometry(shape,
                    depth: z
                    steps: 1
                    bevelEnabled: false
                    curveSegments: vertices.length + 1
                ).translate(0, 0, -0.5 * z)

        for element in data.getElementsByTagName "solids"
            for solid in element.children
                parse = parsers[solid.tagName]
                if parse?
                    geometry = parse solid
                    if geometry?
                        name = name_of solid
                        geometry.name = name
                        solids[name] = geometry

        # Unpack the volumes entities and their references
        volumes = {}
        for volume in data.getElementsByTagName "volume"
            volumes[name_of volume] =
                solid: solids[ref_of volume, "solid"]
                material: @materials[ref_of volume, "material"]
                children: volume.getElementsByTagName "physvol"

        # Build the physical structures
        build = (name, volume) ->
            if volume.solid?
                mesh = new THREE.Mesh volume.solid, volume.material
            else
                mesh = new THREE.Group
            mesh.visible = true

            if volume.children.length == 0
                mesh.name = name
                return mesh

            if volume.solid?
                group = new THREE.Group
                mesh.name = "#{name}/contour"
                group.add mesh
            else
                group = mesh
            group.name = name

            for physical in volume.children
                subvolume = volumes[ref_of physical, "volume"]
                object = build name_of(physical), subvolume
                group.add object

                position = physical.getElementsByTagName("position")[0]
                if position?
                    unit = unit_of position, "unit"
                    object.position.set(
                        unit * position.getAttribute "x"
                        unit * position.getAttribute "y"
                        unit * position.getAttribute "z"
                    )

                rotation = physical.getElementsByTagName("rotation")[0]
                if rotation?
                    unit = unit_of rotation, "unit"
                    object.rotation.set(
                        -unit * rotation.getAttribute "x"
                        -unit * rotation.getAttribute "y"
                        -unit * rotation.getAttribute "z"
                    )

            return group

        world = data.getElementsByTagName("world")[0]
        @objects = build "World", volumes[world.getAttribute "ref"]


class UI
    constructor: ->
        @stats = new Stats
        document.body.appendChild @stats.domElement


    update: ->
        do @stats.update


# Run the viewer
app = new Viewer
do app.run
