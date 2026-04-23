class Input{
  constructor(){
    this._sostenidas = new Set();
    this._recienPresionadas = new Set();

    window.addEventListener('keydown',(e) =>{
      this._sostenidas.add(e.code);
      this._recienPresionadas.add(e.code);
      if(['Space'].includes(e.code)){
        e.preventDefault();
      }
    });

    window.addEventListener('keyup',(e) =>{
      this._sostenidas.delete(e.code);
    });

    window.addEventListener('blur',() =>{
      this._sostenidas.clear();
      this._recienPresionadas.clear();
    });
  }

  sostenida(codigo){
    return this._sostenidas.has(codigo);
  }

  pulsada(codigo){
    return this._recienPresionadas.has(codigo);
  }

  limpiar(){
    this._recienPresionadas.clear();
  }
}

class Bullet{
  constructor(x, y, angulo, vxNave, vyNave){

    this.x = x;
    this.y = y;

    const VELOCIDAD = 380;

    this.vx = Math.cos(angulo) * VELOCIDAD + vxNave;
    this.vy = Math.sin(angulo) * VELOCIDAD + vyNave;

    this.vida = 1;

    this.radio = 2;
  }

  update(dt){
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vida -= dt;
  }

  get estaMuerta(){
    return this.vida <= 0;
  }

  draw(ctx){
    const alpha = Math.min(this.vida / 0.3, 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
  }
}

class Ship{
  constructor(ancho, alto){
    this.ancho = ancho;
    this.alto = alto;
    this.x = ancho / 2;
    this.y = alto / 2;
    this.vx = 0;
    this.vy = 0;
    this.angulo = -Math.PI / 2;
    this.VEL_ROTACION = 3;
    this.EMPUJE = 200;
    this.VEL_MAX = 250;
    this.FRICCION = 0.98;
    this.viva = true;
    this.empujando = false;

    this.cooldown = 0;
    this.COOLDOWN_MAX = 0.2;

    this.invulnerable = 0;
    this.radio = 10;
  }

  disparar(){
    if(this.cooldown > 0) return null;

    this.cooldown = this.COOLDOWN_MAX;

    const puntoX = this.x + Math.cos(this.angulo) * 15;
    const puntoY = this.y + Math.sin(this.angulo) * 15;

    return new Bullet(puntoX, puntoY, this.angulo, this.vx, this.vy);
  }

  respawn(){
    this.x = this.ancho / 2;
    this.y = this.alto / 2;
    this.vx = 0;
    this.vy = 0;
    this.angulo = -Math.PI / 2;
    this.viva = true;
  }

  update(dt, input){
    if(!this.viva) return;
    if(input.sostenida('KeyA'))
      this.angulo -= this.VEL_ROTACION * dt;
    if(input.sostenida('KeyD'))
      this.angulo += this.VEL_ROTACION * dt;

    this.empujando = input.sostenida('KeyW');
    if(this.empujando){
      this.vx += Math.cos(this.angulo) * this.EMPUJE * dt;
      this.vy += Math.sin(this.angulo) * this.EMPUJE * dt;
    }

    this.vx *= this.FRICCION;
    this.vy *= this.FRICCION;

    const spd = Math.hypot(this.vx, this.vy);
    if(spd > this.VEL_MAX){
      this.vx =(this.vx / spd) * this.VEL_MAX;
      this.vy =(this.vy / spd) * this.VEL_MAX;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const M = 20;
    if(this.x < -M) this.x = this.ancho + M;
    if(this.x > this.ancho + M) this.x = -M;
    if(this.y < -M) this.y = this.alto + M;
    if(this.y > this.alto + M) this.y = -M;

    this.cooldown = Math.max(0, this.cooldown - dt);

  }

  draw(ctx){
    ////ctx.save();
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angulo);

    ctx.strokeStyle = '#7ef';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-10, -9);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 9);
    ctx.closePath();
    ctx.stroke();

    if(this.empujando){
      const len = 8 + Math.random() * 10;
      ctx.beginPath();
      ctx.moveTo(-10, -5);
      ctx.lineTo(-10 - len, 0);
      ctx.lineTo(-10, 5);
      ctx.strokeStyle = `hsl(${20 + Math.random() * 30}, 100%, ${50 + Math.random() * 20}%)`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#f80';
      ctx.shadowBlur = 8;
      ctx.stroke();
    }

    ctx.restore();
  }
}

class Asteroid{
  constructor(x, y, tam, ancho, alto, vx = null, vy = null){
    this.x = x;
    this.y = y;
    this.tam = tam;
    this.ancho = ancho;
    this.alto = alto;

    const radios ={ 3: 44, 2: 26, 1: 14 };
    this.radio = radios[tam];

    if(vx !== null && vy !== null){
      this.vx = vx;
      this.vy = vy;
    } else{
      const velocidades ={ 3: 40, 2: 70, 1: 110 };
      const vel = velocidades[tam];
      const angulo = Math.random() * Math.PI * 2;
      this.vx = Math.cos(angulo) * vel;
      this.vy = Math.sin(angulo) * vel;
    }

    this.angulo = Math.random() * Math.PI * 2;
    const spinMax ={ 3: 0.4, 2: 0.7, 1: 1.2 };
    this.spin = Math.random() + spinMax[tam];

    const numPuntos = 8 + Math.floor(Math.random() * 5);
    this.forma = Array.from(
     { length: numPuntos },
     () => 0.7 + Math.random() * 0.6
    );
  }

  update(dt){
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angulo += this.spin * dt;

    const M = this.radio;
    if(this.x < -M) this.x = this.ancho + M;
    if(this.x > this.ancho + M) this.x = -M;
    if(this.y < -M) this.y = this.alto + M;
    if(this.y > this.alto + M) this.y = -M;
  }

  draw(ctx){
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angulo);

    const colores ={ 3: '#8af', 2: '#adf', 1: '#cff' };
    ctx.strokeStyle = colores[this.tam];
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    this.forma.forEach((factor, i) =>{
      const a =(i / this.forma.length) * Math.PI * 2;
      const r = this.radio * factor;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if(i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

class Game{
  constructor(){
    this.canvas = document.getElementById('lienzo');
    this.ctx = this.canvas.getContext('2d');
    this.ancho = this.canvas.width;
    this.alto = this.canvas.height;

    this.input = new Input();
    this.ship = new Ship(this.ancho, this.alto);
    this.asteroides = [];
    this.balas = [];

    this.score = 0;
    this.vidas = 3;
    this.gameOver = false;


    this.spawnAsteroides(3);
    this.spawneando = false;

    this.last = performance.now();
    this.loop(performance.now());
  }

  spawnAsteroides(cantidad){
    for(let i = 0; i < cantidad; i++){
      let x, y;
      do{
        x = Math.random() * this.ancho;
        y = Math.random() * this.alto;
      } while(Math.hypot(x - this.ancho / 2, y - this.alto / 2) < 120);

      this.asteroides.push(
        new Asteroid(x, y, 3, this.ancho, this.alto)
      );
    }
  }

  explosion(x, y, cantidad, color){
    for(let i = 0; i < cantidad; i++){
      const angulo = Math.random() * Math.PI * 2;
      const vel = 40 + Math.random() * 120;
      const vida = 0.4 + Math.random() * 0.5;
    }
  }

  splitAsteroide(a){
    if(a.tam <= 1) return;
    const velPadre = Math.hypot(a.vx, a.vy);
    const nx = a.vx / velPadre;
    const ny = a.vy / velPadre;
    const px = -ny, py = nx;
    const velHijo = velPadre * 1.3 + 20;
    this.asteroides.push(new Asteroid(a.x, a.y, a.tam - 1, this.ancho, this.alto,
      px * velHijo + nx * velHijo * 0.3,
      py * velHijo + ny * velHijo * 0.3));
    this.asteroides.push(new Asteroid(a.x, a.y, a.tam - 1, this.ancho, this.alto,
      -px * velHijo + nx * velHijo * 0.3,
      -py * velHijo + ny * velHijo * 0.3));
  }

  mataNave(){
    this.explosion(this.ship.x, this.ship.y, 25, '#7ef');
    this.ship.viva = false;
    this.vidas--;
    if(this.vidas <= 0){
      this.gameOver = true;
    } else{
      setTimeout(() => this.ship.respawn(), 0);
    }
  }

  update(dt){
    if(this.gameOver) return;

    this.ship.update(dt, this.input);

    if(this.input.sostenida('Space')){
      const bala = this.ship.disparar();
      if(bala) this.balas.push(bala);
    }

    this.balas.forEach(b => b.update(dt));
    this.balas = this.balas.filter(b => !b.estaMuerta);

    this.asteroides.forEach(a => a.update(dt));

    const balasVivas = [];
    for(const b of this.balas){
      let impacto = false;
      for(let i = this.asteroides.length - 1; i >= 0; i--){
        const a = this.asteroides[i];
        if(Math.hypot(b.x - a.x, b.y - a.y) < a.radio){
          this.asteroides.splice(i, 1);
          this.splitAsteroide(a);
          const colores ={ 3: '#8af', 2: '#adf', 1: '#cff' };
          this.explosion(a.x, a.y, a.tam * 5, colores[a.tam]);
          const puntos ={ 3: 20, 2: 50, 1: 100 };
          this.score += puntos[a.tam];
          impacto = true;
          break;
        }
      }
      if(!impacto) balasVivas.push(b);
    }
    this.balas = balasVivas;

    if(this.ship.viva && this.ship.invulnerable === 0){
      for(const a of this.asteroides){
        if(Math.hypot(this.ship.x - a.x, this.ship.y - a.y) < a.radio + this.ship.radio){
          this.mataNave();
          break;
        }
      }
    }

    if(this.asteroides.length === 0 && !this.spawneando){
      this.spawneando = true;
      setTimeout(() =>{
        this.spawnAsteroides(3);
        this.spawneando = false;
      }, 1200);
    }
  }

  draw(){
    const ctx = this.ctx;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.ancho, this.alto);

    this.asteroides.forEach(a => a.draw(ctx));
    this.balas.forEach(b => b.draw(ctx));
    this.ship.draw(ctx);

    ctx.save();
    ctx.font = '16px monospace';
    ctx.fillStyle = '#aef';
    ctx.shadowColor = '#0af';
    ctx.shadowBlur = 8;
    ctx.fillText('Puntos: ' + String(this.score).padStart(1, '0'), 12, 24);
    for(let i = 0; i < this.vidas; i++){
      const px = 12 + i * 22, py = 36;
      ctx.beginPath();
      ctx.moveTo(px + 8, py);
      ctx.lineTo(px, py + 14);
      ctx.lineTo(px + 16, py + 14);
      ctx.closePath();
      ctx.strokeStyle = '#7ef';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if(this.gameOver){
      ctx.font = '32px monospace';
      ctx.fillStyle = '#f55';
      ctx.shadowColor = '#f00';
      ctx.shadowBlur = 20;
      ctx.fillText('PERDISTE', this.ancho / 2 - 90, this.alto / 2);
    }
    ctx.restore();
  }

  loop(now){
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;

    this.update(dt);
    this.draw();
    this.input.limpiar();

    requestAnimationFrame((ts) => this.loop(ts));
  }
}

new Game();