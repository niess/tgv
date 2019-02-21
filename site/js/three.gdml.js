// Generated by CoffeeScript 2.3.2
(function() {
  var modulo = function(a, b) { return (+a % (b = +b) + b) % b; };

  THREE.GDMLLoader = class GDMLLoader {
    constructor() {
      this._loader = new THREE.FileLoader;
    }

    load(resource, onLoad, onProgress, onError) {
      return this._loader.load(resource, function(data) {
        var gdml;
        gdml = THREE.GDMLLoader.parse(data);
        return onLoad(gdml.mesh, gdml.materials);
      }, onProgress, onError);
    }

    static parse(resource) {
      var build, data, default_color, element, geometry, j, k, l, len, len1, len2, len3, m, material, materials, mesh, n, name, name_of, parse, parsers, ref, ref1, ref2, ref3, ref_of, solid, solids, state, unit_of, units, volume, volumes, world;
      // Parse the GDML as an XML file
      data = new DOMParser().parseFromString(resource, "text/xml");
      // Shortcut for getting the name of a GDML element
      name_of = function(element) {
        return element.getAttribute("name");
      };
      // Shortcut for fetching a GDML reference
      ref_of = function(element, tag) {
        return element.getElementsByTagName(`${tag}ref`)[0].getAttribute("ref");
      };
      // System of units
      units = {
        rad: 1.0,
        deg: Math.PI / 180.0,
        mm: 1.0,
        m: 1e+03
      };
      unit_of = function(element, category) {
        return units[element.getAttribute(category)];
      };
      // Default material color, set from the name
      default_color = function(name) {
        var chr, h, i, j, ref;
        h = 0;
        if (name.length === 0) {
          return h;
        }
        for (i = j = 0, ref = name.length - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
          chr = name.charCodeAt(i);
          h = ((h << 5) - h) + chr;
          h |= 0;
        }
        return modulo(h, 0xffffff);
      };
      // Build the materials
      materials = {
        edges: new THREE.LineBasicMaterial({
          color: 0xffffff
        })
      };
      ref = data.getElementsByTagName("material");
      for (j = 0, len = ref.length; j < len; j++) {
        material = ref[j];
        [name, state] = [name_of(material), material.getAttribute("state")];
        if (state === "gas") {
          m = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            wireframe: false,
            visible: false
          });
        } else if (state === "liquid") {
          m = new THREE.MeshBasicMaterial({
            color: default_color(name),
            transparent: true,
            opacity: 0.5
          });
        } else {
          m = new THREE.MeshBasicMaterial({
            color: default_color(name)
          });
        }
        [m.name, m.state] = [name, state];
        materials[name] = m;
      }
      // Build the solids
      solids = {};
      parsers = {
        box: function(solid) {
          var unit;
          unit = unit_of(solid, "lunit");
          return new THREE.BoxGeometry(unit * solid.getAttribute("x"), unit * solid.getAttribute("y"), unit * solid.getAttribute("z"));
        },
        polycone: function(solid) {
          var aunit, dphi, inner, lunit, permutate, phi0, points, rmax, rmin, z, zplane, zplanes;
          lunit = unit_of(solid, "lunit");
          aunit = unit_of(solid, "aunit");
          [phi0, dphi] = [aunit * solid.getAttribute("startphi"), aunit * solid.getAttribute("deltaphi")];
          zplanes = (function() {
            var k, len1, ref1, results;
            ref1 = solid.getElementsByTagName("zplane");
            results = [];
            for (k = 0, len1 = ref1.length; k < len1; k++) {
              zplane = ref1[k];
              results.push([lunit * zplane.getAttribute("rmin"), lunit * zplane.getAttribute("rmax"), lunit * zplane.getAttribute("z")]);
            }
            return results;
          })();
          points = (function() {
            var k, len1, ref1, results;
            ref1 = zplanes.slice(0).reverse();
            results = [];
            for (k = 0, len1 = ref1.length; k < len1; k++) {
              [rmin, rmax, z] = ref1[k];
              results.push(new THREE.Vector2(rmax, z));
            }
            return results;
          })();
          inner = ((function() {
            var k, len1, results;
            if (rmin > 0.0) {
              results = [];
              for (k = 0, len1 = zplanes.length; k < len1; k++) {
                [rmin, rmax, z] = zplanes[k];
                results.push(new THREE.Vector2(rmin, z));
              }
              return results;
            }
          })());
          Array.prototype.push.apply(points, inner);
          points.push(points[0]);
          permutate = new THREE.Matrix4;
          permutate.set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
          return new THREE.LatheGeometry(points, 24, phi0, dphi).applyMatrix(permutate);
        },
        tube: function(solid) {
          var aunit, direction, dphi, hole, lunit, phi0, phi1, rmax, rmin, shape, z;
          lunit = unit_of(solid, "lunit");
          aunit = unit_of(solid, "aunit");
          [rmin, rmax, z, phi0, dphi] = [lunit * solid.getAttribute("rmin"), lunit * solid.getAttribute("rmax"), lunit * solid.getAttribute("z"), aunit * solid.getAttribute("startphi"), aunit * solid.getAttribute("deltaphi")];
          if (rmin == null) {
            rmin = 0.0;
          }
          phi1 = phi0 + dphi;
          direction = dphi < 0;
          shape = new THREE.Shape;
          shape.absarc(0, 0, rmax, phi0, phi1, direction);
          if (dphi < 2 * Math.PI) {
            if (rmin > 0.0) {
              shape.absarc(0, 0, rmin, phi1, phi0, !direction);
              shape.closePath();
            } else {
              shape.closePath();
            }
          } else if (rmin > 0.0) {
            hole = new THREE.Path;
            hole.absarc(0, 0, rmin, phi0, phi1, direction);
            shape.holes.push(hole);
          }
          return new THREE.ExtrudeGeometry(shape, {
            depth: z,
            steps: 1,
            bevelEnabled: false,
            curveSegments: 24
          }).translate(0, 0, -0.5 * z);
        },
        xtru: function(solid) {
          var element, k, len1, lunit, ref1, shape, vertex, vertices, z;
          lunit = unit_of(solid, "lunit");
          z = (function() {
            var k, len1, ref1, results;
            ref1 = solid.getElementsByTagName("section");
            results = [];
            for (k = 0, len1 = ref1.length; k < len1; k++) {
              element = ref1[k];
              results.push(lunit * element.getAttribute("zPosition"));
            }
            return results;
          })();
          if ((z.length !== 2) || (z[0] !== -z[1])) {
            console.error(`unsuported xtru: ${name_of(solid)}`);
            return void 0;
          }
          z = 2 * z[1];
          shape = new THREE.Shape;
          vertices = [...solid.getElementsByTagName("twoDimVertex")];
          shape.moveTo(lunit * vertices[0].getAttribute("x"), lunit * vertices[0].getAttribute("y"));
          ref1 = vertices.slice(1);
          for (k = 0, len1 = ref1.length; k < len1; k++) {
            vertex = ref1[k];
            shape.lineTo(lunit * vertex.getAttribute("x"), lunit * vertex.getAttribute("y"));
          }
          shape.closePath();
          return new THREE.ExtrudeGeometry(shape, {
            depth: z,
            steps: 1,
            bevelEnabled: false,
            curveSegments: vertices.length + 1
          }).translate(0, 0, -0.5 * z);
        }
      };
      ref1 = data.getElementsByTagName("solids");
      for (k = 0, len1 = ref1.length; k < len1; k++) {
        element = ref1[k];
        ref2 = element.children;
        for (l = 0, len2 = ref2.length; l < len2; l++) {
          solid = ref2[l];
          parse = parsers[solid.tagName];
          if (parse != null) {
            geometry = parse(solid);
            if (geometry != null) {
              name = name_of(solid);
              geometry.name = name;
              solids[name] = geometry;
            }
          }
        }
      }
      // Unpack the volumes entities and their references
      volumes = {};
      ref3 = data.getElementsByTagName("volume");
      for (n = 0, len3 = ref3.length; n < len3; n++) {
        volume = ref3[n];
        volumes[name_of(volume)] = {
          solid: solids[ref_of(volume, "solid")],
          material: materials[ref_of(volume, "material")],
          children: volume.getElementsByTagName("physvol")
        };
      }
      // Build the physical structures
      build = function(name, volume) {
        var edges, group, len4, line, mesh, o, object, physical, position, ref4, rotation, subvolume, unit;
        if (volume.solid != null) {
          mesh = new THREE.Mesh(volume.solid, volume.material);
          if (volume.material.state === "solid") {
            group = new THREE.Group;
            group.name = `${mesh.name}::Group`;
            edges = new THREE.EdgesGeometry(volume.solid);
            line = new THREE.LineSegments(edges, materials.edges);
            line.name = `${mesh.name}::Edges`;
            group.add(line);
            group.add(mesh);
            mesh = group;
          }
        } else {
          mesh = new THREE.Group;
        }
        mesh.name = name;
        mesh.visible = true;
        if (volume.children.length === 0) {
          return mesh;
        }
        ref4 = volume.children;
        for (o = 0, len4 = ref4.length; o < len4; o++) {
          physical = ref4[o];
          subvolume = volumes[ref_of(physical, "volume")];
          object = build(name_of(physical), subvolume);
          mesh.add(object);
          position = physical.getElementsByTagName("position")[0];
          if (position != null) {
            unit = unit_of(position, "unit");
            object.position.set(unit * position.getAttribute("x"), unit * position.getAttribute("y"), unit * position.getAttribute("z"));
          }
          rotation = physical.getElementsByTagName("rotation")[0];
          if (rotation != null) {
            unit = unit_of(rotation, "unit");
            object.rotation.set(-unit * rotation.getAttribute("x"), -unit * rotation.getAttribute("y"), -unit * rotation.getAttribute("z"));
          }
        }
        return mesh;
      };
      world = data.getElementsByTagName("world")[0];
      mesh = build("World", volumes[world.getAttribute("ref")]);
      return {
        mesh: mesh,
        materials: materials
      };
    }

  };

}).call(this);
