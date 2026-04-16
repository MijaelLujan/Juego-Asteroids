
class InputHandler {

  constructor() {

    // _sostenidas: guarda las teclas que están presionadas AHORA MISMO.
    // Una tecla entra cuando se presiona (keydown) y sale cuando se suelta (keyup).
    // Sirve para acciones continuas: mientras mantengas A, la nave gira.
    // Usamos Set (conjunto) en lugar de array porque Set no permite duplicados
    // y tiene búsqueda instantánea con .has() — más eficiente que buscar en array.
    this._sostenidas = new Set();

    // _recienPresionadas: guarda las teclas presionadas EN ESTE FRAME.
    // La diferencia con _sostenidas es que esta se vacía al final de cada frame.
    // Sirve para acciones de una sola vez: aunque mantengas Space 60 frames,
    // solo dispara UNA vez por pulsación.
    this._recienPresionadas = new Set();

    // Escuchar cuando el usuario PRESIONA una tecla.
    // Usamos arrow function (e) => {} en lugar de function(e) {}
    // porque las arrow functions heredan el 'this' del contexto donde
    // fueron escritas — en este caso, la instancia de InputHandler.
    // Con function(e) {} el 'this' sería el objeto window, no InputHandler.
    window.addEventListener('keydown', (e) => {

      // e.code identifica la tecla por su posición física en el teclado,
      // no por el caracter que produce. 'KeyA' siempre es la A,
      // independientemente del idioma del teclado.
      this._sostenidas.add(e.code);
      this._recienPresionadas.add(e.code);

      // e.preventDefault() evita el comportamiento por defecto del navegador.
      // Sin esto, Space haría scroll en la página mientras juegas.
      if (['Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    // Escuchar cuando el usuario SUELTA una tecla.
    // Solo la quitamos de _sostenidas — en _recienPresionadas
    // la dejamos hasta que limpiar() la borre al final del frame.
    window.addEventListener('keyup', (e) => {
      this._sostenidas.delete(e.code);
    });
  }


  // sostenida(codigo): devuelve true mientras la tecla esté presionada.
  // Ship la usa para rotación y empuje — acciones que duran mientras
  // mantienes la tecla.
  // Ejemplo de uso: input.sostenida('KeyA')  →  true / false
  sostenida(codigo) {
    return this._sostenidas.has(codigo);
  }


  // pulsada(codigo): devuelve true SOLO en el primer frame de la pulsación.
  // El frame siguiente ya devuelve false aunque la tecla siga presionada.
  // Útil para disparar, pausar, confirmar en menú.
  // Ejemplo de uso: input.pulsada('Space')  →  true solo el primer frame
  pulsada(codigo) {
    return this._recienPresionadas.has(codigo);
  }


  // limpiar(): vacía las teclas recién presionadas.
  // Game llama esto al FINAL de cada frame, después de que todos los
  // objetos ya tuvieron su oportunidad de consultar pulsada().
  // Si lo llamaras al PRINCIPIO, algún objeto podría perderse la pulsación.
  limpiar() {
    this._recienPresionadas.clear();
  }
}




// ═══════════════════════════════════════════════════════════════════════════
//  CLASE BULLET  (bala)
//
//  Representa un proyectil disparado por la nave.
//  Una bala solo sabe moverse y dibujarse.
//  No sabe si golpeó algo — eso lo decide CollisionSystem (clase futura).
// ═══════════════════════════════════════════════════════════════════════════

class Bullet {

  // x, y     — posición donde nace la bala (punta de la nave)
  // angulo   — dirección de viaje, heredada del ángulo actual de la nave
  // vxNave,
  // vyNave   — velocidad actual de la nave en ese momento.
  //            Si la nave va rápido hacia adelante y dispara,
  //            la bala también va más rápido en esa dirección.
  //            Sin esto, disparar mientras la nave se mueve se vería raro.
  constructor(x, y, angulo, vxNave, vyNave) {
    this.x = x;
    this.y = y;

    // Velocidad propia de la bala en px por segundo
    const VELOCIDAD = 380;

    // Math.cos(angulo) y Math.sin(angulo) convierten el ángulo
    // en un vector de dirección (valores entre -1 y 1).
    // Multiplicar por VELOCIDAD escala ese vector a la velocidad deseada.
    // Sumar vxNave * 0.5 agrega la mitad de la inercia de la nave —
    // no el 100% para que no sea exagerado.
    this.vx = Math.cos(angulo) * VELOCIDAD + vxNave * 0.5;
    this.vy = Math.sin(angulo) * VELOCIDAD + vyNave * 0.5;

    // Tiempo de vida en segundos. Cuando llega a 0, Game la elimina.
    // 0.8 segundos a 380px/s = unos 300px de alcance máximo.
    this.vida = 0.8;

    // Radio del círculo de colisión (se usará en CollisionSystem)
    this.radio = 3;
  }


  // update(dt): mover la bala y descontar su tiempo de vida.
  // dt = delta time = segundos transcurridos desde el frame anterior.
  // Multiplicar velocidad por dt hace que el movimiento sea igual
  // independientemente de los FPS del dispositivo.
  update(dt) {
    this.x    += this.vx * dt;  // mover en X
    this.y    += this.vy * dt;  // mover en Y
    this.vida -= dt;             // descontar tiempo de vida
    // Nota: las balas NO tienen wrap de pantalla.
    // Salen por el borde y desaparecen cuando vida <= 0.
  }


  // estaMuerta: propiedad calculada (getter).
  // En lugar de escribir bullet.vida <= 0 en cada lugar,
  // usamos bullet.estaMuerta que es más legible.
  // La palabra clave 'get' hace que se use como propiedad, no como método:
  //   bullet.estaMuerta    (sin paréntesis)  ← correcto
  //   bullet.estaMuerta()  (con paréntesis)  ← incorrecto
  get estaMuerta() {
    return this.vida <= 0;
  }


  // draw(ctx): dibujar la bala en el canvas.
  // ctx = contexto 2D del canvas, prestado por Game.
  // La bala no guarda el ctx — lo recibe cuando lo necesita.
  draw(ctx) {

    // Alpha = opacidad. Calculamos cuánta vida le queda
    // en proporción a 0.3 segundos (los últimos 0.3s del viaje).
    // Math.min asegura que no supere 1 (100% opaco).
    // Efecto: los últimos 0.3 segundos la bala se va desvaneciendo.
    const alpha = Math.min(this.vida / 0.3, 1);

    // ctx.save() guarda el estado actual del contexto (colores, opacidad, etc.)
    // para poder restaurarlo con ctx.restore() al final.
    // Así los cambios que hagamos aquí no afectan al dibujo de otros objetos.
    ctx.save();
      ctx.globalAlpha = alpha;         // aplicar transparencia calculada

      ctx.beginPath();                 // iniciar un nuevo trazo
      ctx.arc(                         // dibujar un círculo
        this.x, this.y,                // centro
        this.radio,                    // radio
        0, Math.PI * 2                 // ángulo inicio y fin (círculo completo)
      );

      ctx.fillStyle   = '#fff';        // color de relleno: blanco
      ctx.shadowColor = '#0ff';        // color del resplandor: cyan
      ctx.shadowBlur  = 10;            // intensidad del resplandor
      ctx.fill();                      // rellenar el círculo

    ctx.restore();  // restaurar el estado guardado — quita el globalAlpha
  }
}




// ═══════════════════════════════════════════════════════════════════════════
//  CLASE SHIP  (nave del jugador)
//
//  Game no sabe cómo se mueve ni cómo se dibuja —
//  solo llama a update() y draw() y Ship se encarga.
// ═══════════════════════════════════════════════════════════════════════════

class Ship {

  // ancho, alto — dimensiones del canvas.
  // Ship las necesita para dos cosas:
  //   1. Posicionarse en el centro al nacer
  //   2. Hacer wrap cuando sale por un borde
  constructor(ancho, alto) {
    this.ancho = ancho;
    this.alto  = alto;

    // Posición inicial: centro exacto del canvas
    this.x = ancho / 2;
    this.y = alto  / 2;

    // Velocidad actual en cada eje, en px por segundo.
    // Empieza en 0 — la nave está quieta.
    this.vx = 0;
    this.vy = 0;

    // Ángulo de orientación en radianes.
    // -Math.PI / 2 = -90 grados = apuntando hacia ARRIBA.
    // En canvas, el ángulo 0 apunta a la derecha y crece en sentido horario.
    // Por eso -90° apunta arriba.
    this.angulo = -Math.PI / 2;

    // ── Constantes de física ─────────────────────────────────────────────
    // Qué tan rápido gira la nave (radianes por segundo)
    this.VEL_ROTACION = 3;

    // Fuerza del motor (px/s² — aceleración, no velocidad)
    // Cada segundo que mantienes W, la nave gana 200px/s de velocidad
    this.EMPUJE = 200;

    // Velocidad máxima que puede alcanzar (px/s)
    // Sin este límite la nave se iría acelerando infinitamente
    this.VEL_MAX = 250;

    // Fricción: multiplicador que se aplica a la velocidad cada frame.
    // 0.98 significa que cada frame la nave conserva el 98% de su velocidad.
    // Efecto acumulado: la nave se frena gradualmente al soltar el empuje,
    // simulando la inercia del espacio.
    this.FRICCION = 0.98;

    // Radio del círculo de colisión (se usará en CollisionSystem)
    this.radio = 10;

    // Estado de la nave
    this.viva = true;       // false cuando la nave explota
    this.empujando = false; // true mientras W está presionada

    // Cooldown de disparo: tiempo restante antes de poder volver a disparar.
    // Empieza en 0 para que pueda disparar desde el primer frame.
    this.cooldown = 0;

    // Tiempo mínimo entre disparos en segundos.
    // 0.18s = unos 5-6 disparos por segundo como máximo.
    this.COOLDOWN_MAX = 0.18;
  }


  // disparar(): intenta crear una bala.
  // Si el cooldown no ha terminado, devuelve null (no puede disparar).
  // Si puede disparar, devuelve un nuevo objeto Bullet.
  // Game recibe ese objeto y lo agrega al array de balas.
  // Ship NO toca el array de balas — solo fabrica la bala y la entrega.
  disparar() {
    if (this.cooldown > 0) return null;  // todavía en cooldown, no puede disparar

    this.cooldown = this.COOLDOWN_MAX;   // reiniciar el contador de espera

    // La bala nace en la PUNTA de la nave, no en su centro.
    // La punta está a 15px adelante en la dirección actual del ángulo.
    // Math.cos y Math.sin del ángulo nos dan el vector de dirección,
    // multiplicar por 15 nos da el offset desde el centro hasta la punta.
    const puntoX = this.x + Math.cos(this.angulo) * 15;
    const puntoY = this.y + Math.sin(this.angulo) * 15;

    // Crear y devolver la bala. Le pasamos la velocidad actual de la nave
    // para que Bullet pueda sumarla a su propia velocidad.
    return new Bullet(puntoX, puntoY, this.angulo, this.vx, this.vy);
  }


  // update(dt, input): actualizar la física y posición de la nave.
  // dt    = segundos desde el frame anterior
  // input = instancia de InputHandler para leer las teclas
  update(dt, input) {

    // ── Rotación ────────────────────────────────────────────────────────
    // A = girar en sentido antihorario (restar ángulo)
    // D = girar en sentido horario (sumar ángulo)
    // Multiplicar por dt hace que la rotación sea igual a cualquier FPS.
    if (input.sostenida('KeyA'))
      this.angulo -= this.VEL_ROTACION * dt;
    if (input.sostenida('KeyD'))
      this.angulo += this.VEL_ROTACION * dt;

    // ── Empuje ──────────────────────────────────────────────────────────
    // Guardar el estado de empuje en this.empujando
    // para que draw() pueda usarlo (aunque draw no recibe input).
    this.empujando = input.sostenida('KeyW');

    if (this.empujando) {
      // Math.cos(this.angulo) y Math.sin(this.angulo) dan la dirección
      // hacia donde apunta la nave (vector unitario de dirección).
      // Multiplicar por EMPUJE y dt da la aceleración de este frame.
      // Sumarlo a vx/vy acumula velocidad en esa dirección.
      this.vx += Math.cos(this.angulo) * this.EMPUJE * dt;
      this.vy += Math.sin(this.angulo) * this.EMPUJE * dt;
    }

    // ── Fricción ────────────────────────────────────────────────────────
    // Se aplica siempre, haya empuje o no.
    // Cada frame la velocidad se multiplica por 0.98 (pierde 2%).
    // Efecto: la nave se frena sola pero nunca para bruscamente.
    this.vx *= this.FRICCION;
    this.vy *= this.FRICCION;

    // ── Velocidad máxima ────────────────────────────────────────────────
    // Math.hypot calcula la magnitud total del vector velocidad
    // (equivale a √(vx² + vy²) — el Teorema de Pitágoras).
    // Si esa magnitud supera VEL_MAX, escalamos ambos componentes
    // proporcionalmente para que la dirección se mantenga
    // pero la velocidad quede en exactamente VEL_MAX.
    const spd = Math.hypot(this.vx, this.vy);
    if (spd > this.VEL_MAX) {
      this.vx = (this.vx / spd) * this.VEL_MAX;
      this.vy = (this.vy / spd) * this.VEL_MAX;
    }

    // ── Mover ───────────────────────────────────────────────────────────
    // Aplicar la velocidad a la posición.
    // Multiplicar por dt = movimiento independiente de los FPS.
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // ── Wrap de pantalla ────────────────────────────────────────────────
    // Si la nave sale completamente por un borde (con margen M = 20px),
    // aparece por el borde opuesto.
    // El margen de 20px evita que la nave "salte" visualmente antes
    // de desaparecer del todo — espera a que salga un poco más allá.
    const M = 20;
    if (this.x < -M)             this.x = this.ancho + M;  // salió por izquierda → aparece derecha
    if (this.x > this.ancho + M) this.x = -M;               // salió por derecha → aparece izquierda
    if (this.y < -M)             this.y = this.alto  + M;   // salió por arriba → aparece abajo
    if (this.y > this.alto  + M) this.y = -M;               // salió por abajo → aparece arriba

    // ── Cooldown ────────────────────────────────────────────────────────
    // Bajar el contador de espera entre disparos cada frame.
    // Math.max(0, ...) evita que llegue a valores negativos.
    this.cooldown = Math.max(0, this.cooldown - dt);
  }


  // draw(ctx): dibujar la nave en el canvas.
  draw(ctx) {

    // ctx.save() — guardar el estado del contexto.
    // Vamos a hacer translate y rotate que mueven el "origen" del canvas.
    // Sin save/restore, esos cambios afectarían a todos los objetos
    // que se dibujen después.
    ctx.save();

      // Mover el origen del canvas al centro de la nave.
      // A partir de aquí, las coordenadas (0, 0) representan
      // el centro de la nave en el mundo.
      ctx.translate(this.x, this.y);

      // Rotar el contexto según el ángulo actual de la nave.
      // Todo lo que dibujemos a partir de aquí aparecerá rotado.
      ctx.rotate(this.angulo);

      // ── Dibujar el triángulo de la nave ─────────────────────────────
      // Las coordenadas son relativas al centro de la nave (0, 0)
      // y a su ángulo 0 (apuntando a la derecha).
      // ctx.rotate ya se encarga de orientarla correctamente.
      ctx.strokeStyle = '#7ef';   // color azul claro
      ctx.lineWidth   = 1.5;

      ctx.beginPath();
      ctx.moveTo( 15,  0);   // punta delantera (derecha)
      ctx.lineTo(-10, -9);   // esquina trasera arriba
      ctx.lineTo( -6,  0);   // ranura central trasera (detalle visual)
      ctx.lineTo(-10,  9);   // esquina trasera abajo
      ctx.closePath();       // cierra el trazo de vuelta al moveTo
      ctx.stroke();          // dibujar solo el contorno (sin relleno)

    // ctx.restore() — restaurar el estado guardado.
    // Deshace el translate y rotate para que el siguiente
    // objeto se dibuje con coordenadas normales.
    ctx.restore();
  }
}




// ═══════════════════════════════════════════════════════════════════════════
//  CLASE ASTEROID  (asteroide)
//
//  Un asteroide sabe su posición, su forma irregular, su tamaño
//  y cómo moverse. No sabe nada de colisiones ni de otros objetos.
// ═══════════════════════════════════════════════════════════════════════════

class Asteroid {

  // x, y          — posición inicial
  // tamano        — 3 (grande), 2 (mediano), 1 (pequeño)
  // ancho, alto   — dimensiones del canvas para el wrap
  // vx, vy        — velocidad opcional. Si no se pasa (null),
  //                 se genera una dirección aleatoria.
  //                 Se pasa cuando el asteroide nace de una división,
  //                 para controlar exactamente hacia dónde va.
  constructor(x, y, tamano, ancho, alto, vx = null, vy = null) {
    this.x      = x;
    this.y      = y;
    this.tamano = tamano;
    this.ancho  = ancho;
    this.alto   = alto;

    // Radio según tamaño — determina qué tan grande se dibuja
    // y también se usa como radio de colisión.
    // Los valores son px: grande=44, mediano=26, pequeño=14
    const radios = { 3: 44, 2: 26, 1: 14 };
    this.radio   = radios[tamano];

    // ── Velocidad ───────────────────────────────────────────────────────
    if (vx !== null && vy !== null) {
      // Si se pasaron velocidades (hijo de explosión), usarlas directamente
      this.vx = vx;
      this.vy = vy;
    } else {
      // Si no, generar una dirección y velocidad aleatoria según tamaño.
      // Los grandes son lentos (40px/s), los pequeños son rápidos (110px/s).
      // La idea: los fragmentos pequeños son más peligrosos porque van rápido.
      const velocidades = { 3: 40, 2: 70, 1: 110 };
      const vel         = velocidades[tamano];
      const angulo      = Math.random() * Math.PI * 2;  // dirección aleatoria

      // Convertir ángulo a vector de velocidad
      this.vx = Math.cos(angulo) * vel;
      this.vy = Math.sin(angulo) * vel;
    }

    // Ángulo de orientación visual inicial (aleatorio)
    // Este ángulo crece cada frame con this.spin para que el asteroide gire.
    this.angulo = Math.random() * Math.PI * 2;

    // Velocidad de giro en radianes por segundo.
    // (Math.random() - 0.5) * 2 da un valor entre -1 y 1.
    // Multiplicar por spinMax da el rango según tamaño.
    // Puede ser negativo (giro en sentido contrario).
    // Los pequeños giran más rápido (hasta 1.2 rad/s).
    const spinMax = { 3: 0.4, 2: 0.7, 1: 1.2 };
    this.spin     = (Math.random() - 0.5) * 2 * spinMax[tamano];

    // ── Forma irregular ─────────────────────────────────────────────────
    // En lugar de guardar coordenadas fijas, guardamos "factores de escala"
    // para cada punto del polígono.
    // Ejemplo: si el radio es 44 y el factor de un punto es 0.8,
    // ese punto queda a 44 * 0.8 = 35.2px del centro.
    //
    // Ventaja: si necesitamos el mismo asteroide más pequeño (hijo),
    // usamos los mismos factores con un radio menor.
    // La forma se parece pero es más chica.
    //
    // 9 a 12 puntos por asteroide (aleatorio)
    const numPuntos = 9 + Math.floor(Math.random() * 4);

    // Array.from({ length: N }, fn) crea un array de N elementos
    // donde cada elemento es el resultado de llamar fn().
    // Cada factor está entre 0.7 y 1.3 del radio base.
    this.forma = Array.from(
      { length: numPuntos },
      () => 0.7 + Math.random() * 0.6
    );
  }


  // update(dt): mover el asteroide y hacerlo girar.
  // Sin fricción, sin aceleración — velocidad constante.
  // Un asteroide en el espacio no frena.
  update(dt) {
    this.x      += this.vx   * dt;  // mover en X
    this.y      += this.vy   * dt;  // mover en Y
    this.angulo += this.spin * dt;  // girar

    // Wrap de pantalla.
    // Usamos el radio como margen para que el asteroide
    // desaparezca completamente antes de reaparecer por el otro lado.
    const M = this.radio;
    if (this.x < -M)             this.x = this.ancho + M;
    if (this.x > this.ancho + M) this.x = -M;
    if (this.y < -M)             this.y = this.alto  + M;
    if (this.y > this.alto  + M) this.y = -M;
  }


  // draw(ctx): dibujar el polígono irregular del asteroide.
  draw(ctx) {
    ctx.save();
      ctx.translate(this.x, this.y);   // mover origen al centro del asteroide
      ctx.rotate(this.angulo);          // rotar según el ángulo actual

      // Color según tamaño para diferenciarlos visualmente
      const colores = { 3: '#8af', 2: '#adf', 1: '#cff' };
      ctx.strokeStyle = colores[this.tamano];
      ctx.lineWidth   = 1.5;

      ctx.beginPath();

      // Recorrer cada punto de la forma y dibujarlo.
      // forEach recibe (valor, indice) — aquí factor e i.
      this.forma.forEach((factor, i) => {

        // Ángulo de este punto dentro del círculo.
        // Dividir i entre el total de puntos y multiplicar por 2π
        // distribuye los puntos uniformemente alrededor del círculo.
        const a = (i / this.forma.length) * Math.PI * 2;

        // Radio real de este punto = radio base * factor de jitter.
        // El jitter (variación aleatoria) es lo que hace el polígono irregular.
        const r = this.radio * factor;

        // Convertir ángulo y radio a coordenadas X, Y
        // (coordenadas polares → coordenadas cartesianas)
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;

        // El primer punto usa moveTo (levantar el lápiz y posicionarlo).
        // Los siguientes usan lineTo (dibujar línea desde el punto anterior).
        if (i === 0) ctx.moveTo(px, py);
        else         ctx.lineTo(px, py);
      });

      ctx.closePath();  // conectar el último punto con el primero
      ctx.stroke();     // dibujar el contorno

    ctx.restore();
  }
}




// ═══════════════════════════════════════════════════════════════════════════
//  CLASE GAME  (controlador principal)
//
//  Game coordina todo. No dibuja ni mueve nada directamente —
//  delega en cada objeto. Su trabajo es:
//    - Crear y guardar todos los objetos del juego
//    - Llamar update() y draw() en cada uno cada frame
//    - Administrar los arrays (agregar y eliminar objetos)
//    - Contener el loop principal
// ═══════════════════════════════════════════════════════════════════════════

class Game {

  constructor() {

    // Obtener la referencia al elemento canvas del HTML por su id
    this.canvas = document.getElementById('lienzo');

    // getContext('2d') devuelve el objeto de dibujo 2D del canvas.
    // A través de este objeto se hacen TODAS las operaciones de dibujo.
    this.ctx = this.canvas.getContext('2d');

    // Guardar dimensiones para usarlas en spawnAsteroides y otros lugares
    this.ancho = this.canvas.width;   // 600px
    this.alto  = this.canvas.height;  // 400px

    // Crear la instancia de InputHandler.
    // A partir de aquí, input escucha el teclado.
    this.input = new InputHandler();

    // Crear la nave, pasándole las dimensiones del canvas
    this.ship = new Ship(this.ancho, this.alto);

    // Arrays que contienen los objetos activos del juego.
    // Game es el único dueño de estos arrays —
    // solo él agrega y elimina objetos.
    this.asteroides = [];
    this.balas      = [];

    // Crear los asteroides iniciales
    this.spawnAsteroides(3);

    // Guardar el timestamp del frame anterior para calcular dt.
    // performance.now() devuelve milisegundos con alta precisión.
    this.last = performance.now();

    // Arrancar el loop. Se llama una vez aquí y luego
    // se llama a sí mismo al final de cada frame.
    this.loop(performance.now());
  }


  // spawnAsteroides(cantidad): crear N asteroides grandes en posiciones aleatorias.
  // Se asegura de que no aparezcan demasiado cerca del centro,
  // donde siempre está la nave, para darle al jugador tiempo de reaccionar.
  spawnAsteroides(cantidad) {
    for (let i = 0; i < cantidad; i++) {
      let x, y;

      // Bucle do-while: genera una posición y la rechaza si está
      // dentro de un radio de 120px del centro del canvas.
      // Se repite hasta encontrar una posición válida.
      do {
        x = Math.random() * this.ancho;
        y = Math.random() * this.alto;
      } while (Math.hypot(x - this.ancho / 2, y - this.alto / 2) < 120);

      // Agregar el nuevo asteroide al array
      this.asteroides.push(
        new Asteroid(x, y, 3, this.ancho, this.alto)
        //                  ↑ tamaño 3 = grande
      );
    }
  }


  // update(dt): actualizar la lógica del juego.
  // Todo lo que "ocurre" en el juego pasa aquí.
  // El orden importa: primero mover, luego disparar, luego limpiar.
  update(dt) {

    // Actualizar la nave — le pasamos dt y el input
    this.ship.update(dt, this.input);

    // ── Disparo ─────────────────────────────────────────────────────────
    // sostenida('Space') permite mantener presionado para cadencia.
    // ship.disparar() respeta el cooldown interno — si está en cooldown
    // devuelve null y no hacemos nada.
    if (this.input.sostenida('Space')) {
      const bala = this.ship.disparar();
      if (bala) this.balas.push(bala);  // solo agregar si no es null
    }

    // ── Actualizar balas ─────────────────────────────────────────────────
    // forEach actualiza cada bala (mueve + descuenta vida)
    this.balas.forEach(b => b.update(dt));

    // filter crea un nuevo array con solo las balas que NO están muertas.
    // Es la forma idiomática en JS de "eliminar elementos de un array".
    // b.estaMuerta es el getter que definimos en Bullet.
    this.balas = this.balas.filter(b => !b.estaMuerta);

    // ── Actualizar asteroides ────────────────────────────────────────────
    this.asteroides.forEach(a => a.update(dt));
  }


  // draw(): dibujar todos los objetos en el canvas.
  // No tiene lógica de juego — solo visual.
  // El orden de dibujo importa: lo último que se dibuja queda encima.
  draw() {
    const ctx = this.ctx;  // atajo local para no escribir this.ctx cada vez

    // Limpiar el canvas con negro.
    // Sin esto, cada frame se dibujaría encima del anterior
    // y veríamos un rastro de todos los movimientos.
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.ancho, this.alto);

    // Dibujar asteroides primero (quedan "detrás")
    this.asteroides.forEach(a => a.draw(ctx));

    // Dibujar balas (quedan encima de los asteroides)
    this.balas.forEach(b => b.draw(ctx));

    // Dibujar nave al final (queda encima de todo)
    this.ship.draw(ctx);
  }


  // loop(now): el corazón del juego.
  // Se llama ~60 veces por segundo gracias a requestAnimationFrame.
  // 'now' es el timestamp actual en milisegundos, proporcionado
  // automáticamente por requestAnimationFrame.
  loop(now) {

    // Calcular dt: cuántos SEGUNDOS pasaron desde el frame anterior.
    // (now - this.last) da milisegundos → dividir por 1000 da segundos.
    // Math.min(..., 0.05) limita dt a máximo 50ms (20 FPS mínimo).
    // Sin este límite, si la pestaña queda inactiva varios segundos
    // y luego vuelve, dt sería enorme y los objetos "saltarían".
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;  // guardar para el próximo frame

    this.update(dt);   // 1. actualizar lógica
    this.draw();       // 2. dibujar resultado

    // limpiar() DESPUÉS de update y draw para que todos los objetos
    // del frame actual hayan podido consultar pulsada() antes de que
    // se vacíe el registro de teclas recién presionadas.
    this.input.limpiar();

    // Pedir el siguiente frame al navegador.
    // requestAnimationFrame sincroniza con el refresco de la pantalla (60fps).
    // La arrow function preserva 'this' — sin ella, 'this' dentro de loop
    // sería undefined cuando requestAnimationFrame lo llame.
    requestAnimationFrame((ts) => this.loop(ts));
  }
}


// ── Arranque ─────────────────────────────────────────────────────────────────
// Una sola línea. Crear la instancia de Game dispara el constructor,
// que crea todos los objetos y arranca el loop.
new Game();