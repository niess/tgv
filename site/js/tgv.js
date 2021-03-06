// Generated by CoffeeScript 2.3.2
(function() {
  var UI, Viewer, app;

  Viewer = class Viewer {
    constructor() {
      void 0;
    }

    run() {
      var loader, renderer, scene;
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
      scene.unveil = function(scale, materials) {
        var camera, h, render, ui, w;
        // Configure the lighting
        scene.add(new THREE.AmbientLight(0xffffff));
        // Add axes
        scene.add(new THREE.AxesHelper(0.05 * scale));
        // Create and initialise the camera
        [w, h] = [window.innerWidth, window.innerHeight];
        camera = new THREE.PerspectiveCamera(75, w / h, 1e-03 * scale, 10 * scale);
        // Create the ui
        ui = new UI(renderer, camera, renderer.domElement, materials);
        scene.add(ui.viewPoint);
        ui.viewPoint.position.x = 8565.19;
        ui.viewPoint.position.y = 3872.13;
        ui.viewPoint.position.z = 8839.75;
        // Return the rendering routine
        render = function() {
          requestAnimationFrame(render);
          renderer.render(scene, camera);
          return ui.update();
        };
        return render;
      };
      // Load and render the GDML
      loader = new THREE.GDMLLoader;
      return loader.load("gdml/Phase-II-modDS.gdml", function(mesh, materials) {
        var render, scale;
        // Get the bounding sphere of the World volume
        mesh.geometry.computeBoundingSphere();
        scale = mesh.geometry.boundingSphere.radius;
        // Add the GDML objects to the scene
        scene.add(mesh);
        // Start the rendering loop
        render = scene.unveil(scale, materials);
        return render();
      }, function(xhr) {
        return console.log(`${Math.round(xhr.loaded / xhr.total * 100)}% loaded`);
      }, function(err) {
        return console.log(err);
      });
    }

  };

  UI = class UI {
    constructor(renderer1, camera1, domElement, materials1) {
      var pitch, scope, yaw;
      this.onWindowResize = this.onWindowResize.bind(this);
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyUp = this.onKeyUp.bind(this);
      this.onMouseDown = this.onMouseDown.bind(this);
      this.onMouseMove = this.onMouseMove.bind(this);
      this.onMouseUp = this.onMouseUp.bind(this);
      this.onPointerLockChanged = this.onPointerLockChanged.bind(this);
      this.toggleView = this.toggleView.bind(this);
      this.renderer = renderer1;
      this.camera = camera1;
      this.domElement = domElement;
      this.materials = materials1;
      this.stats = new Stats;
      document.body.appendChild(this.stats.domElement);
      this.clock = new THREE.Clock(true);
      this.walkSpeed = 5000.0;
      [this._toggleViewReady, this._xView] = [true, false];
      scope = this;
      this._keyMap = {
        KeyA: function(state) {
          return scope._moveLeft = state;
        },
        KeyW: function(state) {
          return scope._moveForward = state;
        },
        KeyD: function(state) {
          return scope._moveRight = state;
        },
        KeyS: function(state) {
          return scope._moveBackward = state;
        },
        KeyQ: function(state) {
          return scope._moveDown = state;
        },
        KeyE: function(state) {
          return scope._moveUp = state;
        },
        KeyX: function(state) {
          return scope._toggleView = state;
        }
      };
      this._mouse = {
        locked: false,
        origin: new THREE.Vector2
      };
      // Smoothen the pointer lock API
      this.domElement.requestPointerLock = this.domElement.requestPointerLock || this.domElement.mozRequestPointerLock || this.domElement.webkitPointerLockElement;
      this._pointerLockElement = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
      document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
      // Wrap the camera
      pitch = new THREE.Object3D;
      pitch.add(this.camera);
      yaw = new THREE.Object3D;
      yaw.position.y = 1800;
      yaw.add(pitch);
      [this.viewPoint, this._pitch] = [yaw, pitch];
      // Bind events
      window.addEventListener("keydown", this.onKeyDown, false);
      window.addEventListener("keyup", this.onKeyUp, false);
      window.addEventListener("resize", this.onWindowResize, false);
      document.addEventListener("pointerlockchange", this.pointerLockChange, false);
      document.addEventListener("mozpointerlockchange", this.pointerLockChange, false);
      document.addEventListener("webkitpointerlockchange", this.pointerLockChange, false);
      this.domElement.addEventListener("mousedown", this.onMouseDown, false);
      this.domElement.addEventListener("mousemove", this.onMouseMove, false);
      this.domElement.addEventListener("mouseup", this.onMouseUp, false);
    }

    onWindowResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      return this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onKeyDown(event) {
      var action;
      console.log(event.code, "Down");
      action = this._keyMap[event.code];
      if (action != null) {
        this.clock.getDelta();
        return action(true);
      }
    }

    onKeyUp(event) {
      var action;
      console.log(event.code, "Up");
      action = this._keyMap[event.code];
      if (action != null) {
        return action(false);
      }
    }

    onMouseDown(event) {
      this.domElement.requestPointerLock();
      this._mouse.locked = true;
      this._mouse.origin.set(event.pageX, event.pageY);
      return console.log("Mouse Down", this._mouse.origin);
    }

    onMouseMove(event) {
      var dX, dY;
      if (!this._mouse.locked) {
        return;
      }
      dX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
      dY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
      this.viewPoint.rotation.y -= dX * 0.002;
      this._pitch.rotation.x -= dY * 0.002;
      return this._pitch.rotation.x = Math.max(-0.5 * Math.PI, Math.min(0.5 * Math.PI, this._pitch.rotation.x));
    }

    onMouseUp(event) {
      console.log("Mouse Up");
      this._mouse.locked = false;
      return document.exitPointerLock();
    }

    onPointerLockChanged() {
      if (!this._pointerLockElement) {
        return this._mouse.locked = false;
      }
    }

    toggleView() {
      var _, material, ref, ref1, results, results1;
      this._xView = !this._xView;
      if (this._xView) {
        ref = this.materials;
        results = [];
        for (_ in ref) {
          material = ref[_];
          if (material.type === "gas") {
            material.wireframe = true;
            material.visible = true;
          } else if (material.type === "liquid") {
            material.opacity = 0.25;
          } else {
            material.transparent = true;
            material.opacity = 0.5;
          }
          results.push(material.needsUpdate = true);
        }
        return results;
      } else {
        ref1 = this.materials;
        results1 = [];
        for (_ in ref1) {
          material = ref1[_];
          if (material.type === "gas") {
            material.wireframe = false;
            material.visible = false;
          } else if (material.type === "liquid") {
            material.opacity = 0.5;
          } else {
            material.transparent = false;
            material.opacity = 1;
          }
          results1.push(material.needsUpdate = true);
        }
        return results1;
      }
    }

    update() {
      var dX, dY, dZ, delta, update;
      this.stats.update();
      [update, delta] = [false, void 0];
      if (this._moveLeft && !this._moveRight) {
        dX = -1;
      } else if (this._moveRight && !this._moveLeft) {
        dX = 1;
      } else {
        dX = 0;
      }
      if (this._moveForward && !this._moveBackward) {
        dZ = -1;
      } else if (this._moveBackward && !this._moveForward) {
        dZ = 1;
      } else {
        dZ = 0;
      }
      if (this._moveUp && !this._moveDown) {
        dY = 1;
      } else if (this._moveDown && !this._moveUp) {
        dY = -1;
      } else {
        dY = 0;
      }
      if (dX !== 0) {
        if (delta == null) {
          delta = this.clock.getDelta();
        }
        this.viewPoint.translateX(this.walkSpeed * delta * dX);
        update = true;
      }
      if (dZ !== 0) {
        if (delta == null) {
          delta = this.clock.getDelta();
        }
        this.viewPoint.translateZ(this.walkSpeed * delta * dZ);
        update = true;
      }
      if (dY !== 0) {
        if (delta == null) {
          delta = this.clock.getDelta();
        }
        this.viewPoint.translateY(this.walkSpeed * delta * dY);
        update = true;
      }
      if (update) {
        this.camera.updateProjectionMatrix();
        console.log("Position:", this.viewPoint.position);
      }
      if (this._toggleView) {
        if (this._toggleViewReady) {
          this.toggleView();
          return this._toggleViewReady = false;
        }
      } else {
        return this._toggleViewReady = true;
      }
    }

  };

  // Run the viewer
  app = new Viewer;

  app.run();

}).call(this);
