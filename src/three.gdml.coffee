class THREE.GDMLLoader
    constructor: ->
        @_loader = new THREE.FileLoader


    load: (resource, onLoad, onProgress, onError) ->
        @_loader.load(
            resource
            (data) ->
                gdml = THREE.GDMLLoader.parse data
                onLoad gdml.mesh, gdml.materials
            onProgress
            onError
        )


    @parse: (resource) ->
        # Parse the GDML as an XML file
        data = new DOMParser().parseFromString resource, "text/xml"

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

        # Default material color, set from the name
        default_color = (name) ->
            h = 0
            if name.length == 0
                return h

            for i in [0 .. name.length - 1]
                chr = name.charCodeAt i
                h = ((h << 5) - h) + chr
                h |= 0
            h %% 0xffffff


        # Build the materials
        materials = {}
        for material in data.getElementsByTagName "material"
            [name, state] = [name_of(material), material.getAttribute("state")]
            if state == "gas"
                m = new THREE.MeshBasicMaterial
                    color: 0xcccccc
                    wireframe: false
                    visible: false
            else if state == "liquid"
                m = new THREE.MeshBasicMaterial
                    color: default_color name
                    transparent: true
                    opacity: 0.5
            else
                m = new THREE.MeshBasicMaterial
                    color: default_color name
            [m.name, m.state] = [name, state]
            materials[name] = m

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
                material: materials[ref_of volume, "material"]
                children: volume.getElementsByTagName "physvol"

        # Build the physical structures
        build = (name, volume) ->
            if volume.solid?
                mesh = new THREE.Mesh volume.solid, volume.material
            else
                mesh = new THREE.Group
            mesh.name = name
            mesh.visible = true

            if volume.children.length == 0
                return mesh

            for physical in volume.children
                subvolume = volumes[ref_of physical, "volume"]
                object = build name_of(physical), subvolume
                mesh.add object

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

            return mesh

        world = data.getElementsByTagName("world")[0]
        mesh = build "World", volumes[world.getAttribute "ref"]
        return
            mesh: mesh
            materials : materials
