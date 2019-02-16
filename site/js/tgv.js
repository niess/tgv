// Generated by CoffeeScript 2.3.2
(function() {
  var GDML, UI, Viewer, app, base, base1, base2,
    modulo = function(a, b) { return (+a % (b = +b) + b) % b; };

  Viewer = class Viewer {
    constructor() {
      void 0;
    }

    run() {
      var loader, renderer, scene, ui;
      // Create the ui
      ui = new UI;
      // Initialise the renderer
      renderer = new THREE.WebGLRenderer({
        antialias: true
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
      document.body.appendChild(renderer.domElement);
      // Create the scene
      scene = new THREE.Scene;
      // Deferred configuration of the scene
      scene.unveil = function(scale) {
        var camera, controls, h, render, w;
        // Configure the lighting
        scene.add(new THREE.AmbientLight(0xffffff));
        // Add axes
        scene.add(new THREE.AxesHelper(0.05 * scale));
        // Create and initialise the camera
        [w, h] = [window.innerWidth, window.innerHeight];
        camera = new THREE.PerspectiveCamera(75, w / h, 1e-03 * scale, 10 * scale);
        camera.position.x = 0.5 * scale;
        camera.position.y = 0.5 * scale;
        camera.position.z = 0.5 * scale;
        // Set the camera controls
        controls = new THREE.TrackballControls(camera, renderer.domElement);
        controls.rotateSpeed = 3.0;
        controls.zoomSpeed = 0.5;
        // Return the rendering routine
        render = function() {
          requestAnimationFrame(render);
          renderer.render(scene, camera);
          controls.update();
          return ui.update();
        };
        return render;
      };
      // Load and render the GDML
      loader = new THREE.FileLoader;
      return loader.load("gdml/Phase-II-modDS.gdml", function(data) {
        var gdml, geometry, render, scale;
        // Load the GDML objects
        gdml = new GDML(data);
        scene.add(gdml.objects);
        console.log(gdml.objects);
        // Get the bounding sphere of the World volume
        geometry = gdml.objects.getObjectByName("World/contour").geometry;
        geometry.computeBoundingSphere();
        scale = geometry.boundingSphere.radius;
        // Start the rendering loop
        render = scene.unveil(scale);
        return render();
      }, function(xhr) {
        return console.log(`${Math.round(xhr.loaded / xhr.total * 100)}% loaded`);
      }, function(err) {
        return console.log(err);
      });
    }

  };

  // Extend strings
  if ((base = String.prototype).hash == null) {
    base.hash = function() {
      var chr, h, i, j, ref;
      h = 0;
      if (this.length === 0) {
        return h;
      }
      for (i = j = 0, ref = this.length - 1; (0 <= ref ? j <= ref : j >= ref); i = 0 <= ref ? ++j : --j) {
        chr = this.charCodeAt(i);
        h = ((h << 5) - h) + chr;
        h |= 0;
      }
      return h;
    };
  }

  if ((base1 = String.prototype).startsWith == null) {
    base1.startsWith = function(s) {
      return this.slice(0, s.length) === s;
    };
  }

  if ((base2 = String.prototype).endsWith == null) {
    base2.endsWith = function(s) {
      return s === '' || this.slice(-s.length) === s;
    };
  }

  GDML = class GDML {
    constructor(data) {
      var build, element, geometry, j, k, l, len, len1, len2, len3, m, material, name, name_of, parse, parsers, ref, ref1, ref2, ref3, ref_of, solid, solids, state, unit_of, units, volume, volumes, world;
      // Parse the GDML as an XML file
      data = new DOMParser().parseFromString(data, "text/xml");
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
      // Build the materials
      this.materials = {};
      ref = data.getElementsByTagName("material");
      for (j = 0, len = ref.length; j < len; j++) {
        material = ref[j];
        [name, state] = [name_of(material), material.getAttribute("state")];
        if (state === "gas") {
          this.materials[name] = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            wireframe: true,
            transparent: true,
            opacity: 0.5,
            name: name
          });
        } else {
          this.materials[name] = new THREE.MeshBasicMaterial({
            color: modulo(name.hash(), 0xffffff),
            transparent: true,
            opacity: 0.5,
            name: name
          });
        }
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
      for (m = 0, len3 = ref3.length; m < len3; m++) {
        volume = ref3[m];
        volumes[name_of(volume)] = {
          solid: solids[ref_of(volume, "solid")],
          material: this.materials[ref_of(volume, "material")],
          children: volume.getElementsByTagName("physvol")
        };
      }
      // Build the physical structures
      build = function(name, volume) {
        var group, len4, mesh, n, object, physical, position, ref4, rotation, subvolume, unit;
        if (volume.solid != null) {
          mesh = new THREE.Mesh(volume.solid, volume.material);
        } else {
          mesh = new THREE.Group;
        }
        mesh.visible = true;
        if (volume.children.length === 0) {
          mesh.name = name;
          return mesh;
        }
        if (volume.solid != null) {
          group = new THREE.Group;
          mesh.name = `${name}/contour`;
          group.add(mesh);
        } else {
          group = mesh;
        }
        group.name = name;
        ref4 = volume.children;
        for (n = 0, len4 = ref4.length; n < len4; n++) {
          physical = ref4[n];
          subvolume = volumes[ref_of(physical, "volume")];
          object = build(name_of(physical), subvolume);
          group.add(object);
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
        return group;
      };
      world = data.getElementsByTagName("world")[0];
      this.objects = build("World", volumes[world.getAttribute("ref")]);
    }

  };

  UI = class UI {
    constructor() {
      this.stats = new Stats;
      document.body.appendChild(this.stats.domElement);
    }

    update() {
      return this.stats.update();
    }

  };

  // Run the viewer
  app = new Viewer;

  app.run();

}).call(this);
