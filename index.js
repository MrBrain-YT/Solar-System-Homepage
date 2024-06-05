
import * as THREE from 'three';
import { OrbitControls } from 'OrbitControls';
import { GLTFLoader } from 'GLTFLoader';
import { EffectComposer } from 'EffectComposer';
import { RenderPass } from 'RenderPass';
import { ShaderPass } from 'ShaderPass';
import { OutlinePass } from 'OutlinePass';
import { OutputPass } from 'OutputPass';
import { FXAAShader } from 'FXAAShader';

let sun, planets = [], controls;
let starsFall, fallingStars = []
let planets_distance_data = {};
let planets_speed_data = {};
let planets_model_data = {};
let planets_name_data_dict = {};
let planets_desription_data = {};
let planets_go_text_data = {};
let planets_name_data = [];
let nebulae = [];

const raycaster = new THREE.Raycaster();
const clock = new THREE.Clock();

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const composer = new EffectComposer( renderer );
// Другие элементы сцены...
const renderPass = new RenderPass( scene, camera );
composer.addPass( renderPass );

// Outline Pass
const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
outlinePass.edgeStrength = 3; // Intensity of the edge glow
outlinePass.edgeGlow = 0.5; // Intensity of the glow
outlinePass.edgeThickness = 2; // Thickness of the edge lines
outlinePass.pulsePeriod = 0; // Pulse period for the outline, 0 = no pulse
outlinePass.visibleEdgeColor.set('#ffffff'); // Color of the edge
outlinePass.hiddenEdgeColor.set('#190a05'); // Color of the edge occluded
composer.addPass(outlinePass);
outlinePass.selectedObjects = [];

const outputPass = new OutputPass();
composer.addPass( outputPass );

const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
composer.addPass(fxaaPass);

function randomGaussian(mean, sigma) {
    let u1, u2;
    do {
        u1 = Math.random();
        u2 = Math.random();
    } while (u1 <= Number.EPSILON);

    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * sigma + mean;
}

function createNebula(x, y, z, _spread, _count) {
    const nebulaGeometry = new THREE.BufferGeometry();
    const count = _count; // Количество частиц в туманности
    const nebulaParticles = [];
    const colors = [];
    const color1 = new THREE.Color(0x5555ff); // Голубой
    const color2 = new THREE.Color(0x8a2be2); // Фиолетовый

    // Центр туманности
    const centerX = x;
    const centerY = y;
    const centerZ = z;

    // Разброс частиц
    const spread = _spread;

    for (let i = 0; i < count; i++) {
        const x = randomGaussian(centerX, spread);
        const y = randomGaussian(centerY, spread);
        const z = randomGaussian(centerZ, spread);
        nebulaParticles.push(x, y, z);

        // Интерполировать цвет в зависимости от расстояния до центра
        const distance = Math.sqrt(x * x + y * y + z * z);
        const t = Math.min(distance / (spread * 3), 1);
        const color = color1.clone().lerp(color2, t);
        colors.push(color.r, color.g, color.b);
    }

    nebulaGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nebulaParticles, 3));
    nebulaGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const nebulaMaterial = new THREE.PointsMaterial({
        size: 4,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.6
    });

    const nebula = new THREE.Points(nebulaGeometry, nebulaMaterial);
    scene.add(nebula);
    nebulae.push(nebula);
}

// Обработка событий мыши
const mouse = new THREE.Vector2();
function onMouseMove(event) {
    // Преобразование координат мыши в нормализованные координаты устройства (-1 to +1)
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ( ( event.clientX - rect.left ) / ( rect.right - rect.left ) ) * 2 - 1;
    mouse.y = - ( ( event.clientY - rect.top ) / ( rect.bottom - rect.top) ) * 2 + 1;
}

let current_targetPosition = new THREE.Vector3();
let current_target;
let isMoving = false;
let isMovingHome = false;
function onMouseClick(event) {
    camera.updateMatrixWorld();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
        const selectedObject = intersects[0].object;
        let local_current_target = selectedObject;
        if (local_current_target.name == "sun"){
            isMovingHome = false;
            isMoving = true;
            if (is_show_planet_info){
                let planet_info_enabled = document.getElementById("planet_info");
                planet_info_enabled.classList.add("planet_info_enabled");
            }
            document.getElementById("curren_planet_model").setAttribute("src", "models/sun.glb");
            document.getElementById("current_name_planet").innerHTML = "Sun";
            document.getElementById("current_description_planet").querySelector('#text_wraper').innerHTML = "Sun";
            document.getElementById("to_url_project_planet").innerHTML = "Go to sun";
            current_target = selectedObject;
            return 0;
        }
        else{
            planets.forEach(planet => {
                if (local_current_target.parent == planet){
                    isMovingHome = false;
                    isMoving = true;
                    if (is_show_planet_info){
                        let planet_info_enabled = document.getElementById("planet_info");
                        planet_info_enabled.classList.add("planet_info_enabled");
                    }
                    let name_attr = planets_model_data[local_current_target.name];
                    current_target = selectedObject;
                    if (Object.keys(planets_model_data).includes(local_current_target.name)){
                        document.getElementById("curren_planet_model").setAttribute("src", name_attr);
                        document.getElementById("current_name_planet").innerHTML = planets_name_data_dict[local_current_target.name];
                        document.getElementById("current_description_planet").querySelector('#text_wraper').innerHTML = planets_desription_data[local_current_target.name];
                        document.getElementById("to_url_project_planet").innerHTML = planets_go_text_data[local_current_target.name];
                    }else {
                        document.getElementById("curren_planet_model").setAttribute("src", planets_model_data["Saturn001"]);
                        document.getElementById("current_name_planet").innerHTML = planets_name_data_dict["Saturn001"];
                        document.getElementById("current_description_planet").querySelector('#text_wraper').innerHTML = planets_desription_data["Saturn001"];
                        document.getElementById("to_url_project_planet").innerHTML = planets_go_text_data["Saturn001"];
                        
                    }
                    
                }
            });
        }
        
    }
}

function init() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    let new_inner_planets_list = ''
    // Солнце
    const SunModelPath = 'models/sun.glb'; // Замените на актуальный путь к файлу
    const normalMapPath = 'images/sun_normal_map.png'; // Путь к файлу карты нормалей
    const bumpMapPath = 'images/sun_bump_map.png'; // Путь к файлу карты нормалей

    const loader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    // Загружаем карты
    const normalMap = textureLoader.load(normalMapPath);
    const bumpMap = textureLoader.load(bumpMapPath);

    // Загружаем модель
    loader.load(SunModelPath, function(gltf) {
        const sun = gltf.scene; // Получаем сцену из загруженной модели
        
        sun.position.set(0, 0, 0); // Устанавливаем позицию солнца
        sun.scale.set(0.013, 0.013, 0.013); // Устанавливаем масштаб модели

        // Пройдемся по всем мешам в объекте и установим карту нормалей, если материал поддерживает это
        sun.traverse((child) => {
            if (child.isMesh && child.material) {
                // Если у объекта один материал
                if (Array.isArray(child.material)) {
                    // Устанавливаем карту нормалей для каждого материала
                    child.material.forEach(material => {
                        material.normalMap = normalMap;
                        material.bumpMap = bumpMap;
                    });
                } else {
                    // Устанавливаем карту нормалей для одного материала
                    child.material.normalMap = normalMap;
                    child.material.bumpMap = bumpMap;
                }
            }
        });

        // Добавляем модель солнца в основную сцену
        scene.add(sun);
        
    }, undefined, function(error) {
        console.error('An error happened', error);
    });
    new_inner_planets_list += `<div id="item_planet" onclick="stop_prop(event)">
        <div id="image_planet"><model-viewer id="planet_model" disable-pan oncontextmenu="return false;" disable-zoom src="`+ SunModelPath +`" ar ar-modes="webxr scene-viewer quick-look" camera-controls shadow-intensity="0"></model-viewer></div>
        <div id="name_planet">`+ "Sun" +`</div>
        <div id="description_planet"><div id="text_wraper">`+ "Sun" +`</div></div>
        <a id="go_to_project_button" href="#">`+ "Go to sun" +`</a>
    </div>`;


    // Планеты
    const planetData = [
        { name: 'Mercury', scale: 0.003, distance: 10, width: 32, height: 32, speed: 0.0010, model: "models/mercury.glb", three_name: "Cube008", description:"test", go_text:"go", href:"#"},
        { name: 'Venus', scale: 0.0045, distance: 18, width: 32, height: 32, speed: 0.0009, model: "models/venus.glb", three_name: "cylindrically_mapped_sphereMesh", description:"test", go_text:"go", href:"#"},
        { name: 'Earth', scale: 0.005, distance: 25, width: 32, height: 32, speed: 0.0008, model: "models/earth.glb", three_name: "Cube001", description:"test", go_text:"go", href:"#"},
        { name: 'Mars', scale: 0.004, distance: 32, width: 32, height: 32, speed: 0.0007, model: "models/mars.glb", three_name: "mars", description:"test", go_text:"go", href:"#"},
        { name: 'Jupiter', scale: 0.012, distance: 42, width: 32, height: 32, speed: 0.0006, model: "models/jupiter.glb", three_name: "cubemap", description:"test", go_text:"go", href:"#"},
        { name: 'Saturn', scale: 0.009, distance: 61, width: 32, height: 32, speed: 0.0005, model: "models/saturn.glb", three_name: "Saturn001", description:"test", go_text:"go", href:"#"},
        { name: 'Uranium', scale: 0.006, distance: 77, width: 27, height: 32, speed: 0.0004, model: "models/uranus.glb", three_name: "Uranus", description:"test", go_text:"go", href:"#"},
        { name: 'Neptune', scale: 0.009, distance: 90, width: 32, height: 32, speed: 0.0003, model: "models/neptune.glb", three_name: "Neptune", description:"test", go_text:"go", href:"#"}
    ];

    let planet_list = document.getElementById("planets_list_wrapper");
    
    
    // Простая планета (добавьте больше с разными параметрами)
    for (let i = 0; i < planetData.length; i++) {
        const planet_data = planetData[i];
        const planetGeometry = new THREE.SphereGeometry(planet_data.scale, planet_data.width, planet_data.height);
        
        loader.load(planet_data.model, (gltf) => {
            const model = gltf.scene;
    
            // Настройка масштаба модели
            const scale = planet_data.scale; // Используйте масштаб из данных или дефолтный
            model.scale.set(scale, scale, scale);
            model.rotation.set(0.2,0,0)
    
            // Сохранение данных для анимации или других целей
            planets_distance_data[planet_data.name] = planet_data.distance
            planets_speed_data[planet_data.name] = planet_data.speed;
            
            planets_name_data.push(planet_data.name);
    
            // Добавление в сцену
            outlinePass.selectedObjects.push(model);
            scene.add(model);
            planets_model_data[planet_data.three_name] = planet_data.model;
            planets_name_data_dict[planet_data.three_name] = planet_data.name;
            planets_desription_data[planet_data.three_name] = planet_data.description;
            planets_go_text_data[planet_data.three_name] = planet_data.go_text;
            planets.push(model);
            
        });

        new_inner_planets_list += `<div id="item_planet" onclick="stop_prop(event)"">
                <div id="image_planet"><model-viewer id="planet_model" disable-pan oncontextmenu="return false;" disable-zoom src="`+ planet_data.model +`" ar ar-modes="webxr scene-viewer quick-look" camera-controls shadow-intensity="0"></model-viewer></div>
                <div id="name_planet">`+ planet_data.name +`</div>
                <div id="description_planet"><div id="text_wraper">`+ planet_data.description +`</div></div>
                <a id="go_to_project_button" href="`+ planet_data.href +`">`+ planet_data.go_text +`</a>
            </div>`;
    }
    
    planet_list.innerHTML = new_inner_planets_list;

    // Освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 2, 100);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // Звёздный фон
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Траектория движения планет
    for (let i = 0; i < planetData.length; i++) {
      const planet_data = planetData[i];
      const orbitGeometry = new THREE.TorusGeometry(planet_data.distance, 0.001, 16, 100);
      const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xD4D4D4 });
      const orbit = new THREE.LineLoop(orbitGeometry, orbitMaterial);
      orbit.rotation.x = Math.PI / 2;
      scene.add(orbit);
    }

    // Падающие звёзды
    const fallingStarsGeometry = new THREE.BufferGeometry();
    const fallingStarsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
    const fallingStarsVertices = [];

    for (let i = 0; i < 3; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = Math.random() * 500 + 100;  // Выше экрана, чтобы казалось, что они падают сверху
        const z = (Math.random() - 0.5) * 2000;
        fallingStarsVertices.push(x, y, z);

        // Вектор скорости для каждой падающей звезды
        fallingStars.push(new THREE.Vector3(
            ((Math.random() - 0.5) * 0.1) * 50,  // Скорость по X
            (-Math.random() * 0.5 - 0.5) * 5,   // Скорость по Y, чтобы падать вниз
            ((Math.random() - 0.5) * 0.1) * 50   // Скорость по Z
        ));
    }

    fallingStarsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fallingStarsVertices, 3));
    starsFall = new THREE.Points(fallingStarsGeometry, fallingStarsMaterial);
    scene.add(starsFall);

    createNebula(1000,300,400, 200, 500000);
    createNebula(-400,100,300, 80, 5000);
    createNebula(-50,-400,-500, 100, 20000);

    camera.position.x = 140;
    camera.position.y = 30;

    // OrbitControls для вращения камеры
    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 10; // Минимальное расстояние, на которое можно приблизить камеру
    controls.maxDistance = 140; // Максимальное расстояние, на которое можно отдалить камеру
    controls.enablePan = false;
    controls.update(); // Обновляем контроллер после начальной установки камеры

    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('mousedown', onMouseClick);

    window.addEventListener("keydown", (e) => {
        if (e.key == "Escape"){
            isMoving = false;
            isMovingHome = true;
        }else if (e.keyCode == 81){
            back_news();
        }else if (e.keyCode == 69){
            next_news();
        }
        console.log(e)
    });

    window.addEventListener("dblclick", (event) => {
        camera.updateMatrixWorld();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
            const selectedObject = intersects[0].object;
            let local_current_target = selectedObject;
            if (local_current_target.name == "sun"){
                isMoving = false;
                isMovingHome = true;
                current_target = selectedObject;
            }else{
                planets.forEach(planet => {
                    if (local_current_target.parent == planet){
                        isMoving = false;
                        isMovingHome = true;
                        current_target = selectedObject;
                    }
                });
            }
        }
    });

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
        // Если есть пересечения, добавляем первый объект в список для подсветки
        const selectedObject = intersects[0].object;
        outlinePass.selectedObjects = [selectedObject];
    } else {
        // Если нет пересечений, убираем подсветку
        outlinePass.selectedObjects = [];
    }

    if (isMoving) {
        current_target.parent.updateWorldMatrix(true, false); 
        let position = current_target.parent.position;
        current_targetPosition = position.clone();
        // Плавно перемещаем камеру к целевой позиции
        current_targetPosition.x += 15;
        current_targetPosition.y += 10;
        const deltaTime = clock.getDelta();
        camera.position.lerp(current_targetPosition, 5 * deltaTime);
        controls.target = current_target.parent.position;
        
    }

    if (isMovingHome) {
        camera.updateMatrixWorld();
        let vector = new THREE.Vector3(0, 10, 0);
        controls.target = vector;
        let new_position = new THREE.Vector3(140, 30, 0); 

        // Вычисляем расстояние до целевой позиции
        let distance = camera.position.distanceTo(new_position);

        // Если камера близко к целевой позиции, останавливаем движение
        if (distance < 5) { 
            isMovingHome = false; 
            camera.position.copy(new_position); // Устанавливаем камеру точно в целевую позицию
        } else {
            const deltaTime = clock.getDelta();
            camera.position.lerp(new_position, 5 * deltaTime);
        }

        let planet_info_enabled = document.getElementById("planet_info");
        planet_info_enabled.classList.remove("planet_info_enabled");
    }

    // Вращение планет вокруг Солнца
    let planet_index = 0;
    planets.forEach(planet => {
        planet.rotation.y += 0.01;
        planet.position.x = Math.cos(Date.now() * planets_speed_data[planets_name_data[planet_index]]) * planets_distance_data[planets_name_data[planet_index]];
        planet.position.z = Math.sin(Date.now() * planets_speed_data[planets_name_data[planet_index]]) * planets_distance_data[planets_name_data[planet_index]];
        planet_index += 1;
    });
    
    //sun.rotation.y += 0.01; // Скорость вращения Солнца (можно изменить)

    // Анимация падающих звёзд
    const positions = starsFall.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i] += fallingStars[i / 3].x;
        positions[i + 1] += fallingStars[i / 3].y;
        positions[i + 2] += fallingStars[i / 3].z;

        // Перезапуск звёзд, если они выходят за пределы видимой области
        if (positions[i + 1] < -200) {
            positions[i] = (Math.random() - 0.5) * 2000;
            positions[i + 1] = Math.random() * 500 + 100;
            positions[i + 2] = (Math.random() - 0.5) * 2000;
        }
    }

    starsFall.geometry.attributes.position.needsUpdate = true;  // Обновляем позиции для отображения

    // Анимация туманностей
    nebulae.forEach(nebula => {
        const deltaTime = clock.getDelta();
        nebula.rotation.y += 0.0001; // Вращение туманности

        // Плавное изменение прозрачности туманности
        // nebula.material.opacity = 0.5 + 0.8 * Math.sin(Date.now() * 0.001);
    });

    controls.update(); // Обновляем контроллер в каждом кадре
    //renderer.render(scene, camera);
    composer.render();
}



init();