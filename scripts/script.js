// Arreglos principales (incluye arreglo de objetos y arreglo numérico)
let registrosMantenimiento = JSON.parse(localStorage.getItem('simtele_mantenimiento')) || [];
let registrosSensores = JSON.parse(localStorage.getItem('simtele_sensores')) || [];

// Expresión regular exigida para código de sensor
const REGEX_SENSOR = /^SEN-\d{3}$/;

// Función auxiliar para mostrar mensajes de estado o error en el DOM
function mostrarMensaje(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = `feedback visible ${tipo}`;
}

// ---------------------------------------------------------
// GESTIÓN DE SESIÓN (LOGIN / LOGOUT PERSISTENTE)
// ---------------------------------------------------------
function verificarSesion() {
  const usuarioGuardado = localStorage.getItem('simtele_sesion_usuario');
  const vistaLogin = document.getElementById('vista-login');
  const vistaSistema = document.getElementById('vista-sistema');
  const spanUsuario = document.getElementById('nombre-usuario-activo');

  if (usuarioGuardado) {
    spanUsuario.textContent = usuarioGuardado;
    vistaLogin.classList.add('oculto');
    vistaSistema.classList.remove('oculto');
  } else {
    vistaLogin.classList.remove('oculto');
    vistaSistema.classList.add('oculto');
  }
}

function iniciarSesion(evento) {
  evento.preventDefault();

  const usuarioInput = document.getElementById('login-usuario').value.trim();
  const claveInput = document.getElementById('login-clave').value.trim();
  const errorLogin = document.getElementById('error-login');

  if (usuarioInput.length < 3) {
    mostrarMensaje(errorLogin, 'Error: Ingrese un nombre de usuario válido (mínimo 3 caracteres).', 'error');
    return;
  }

  if (claveInput.length < 4) {
    mostrarMensaje(errorLogin, 'Error: La contraseña debe tener al menos 4 caracteres.', 'error');
    return;
  }

  errorLogin.classList.remove('visible');
  localStorage.setItem('simtele_sesion_usuario', usuarioInput);
  evento.target.reset();
  verificarSesion();
}

function cerrarSesion() {
  localStorage.removeItem('simtele_sesion_usuario');
  verificarSesion();
}

// ---------------------------------------------------------
// MÓDULO 1: DETENCIÓN DE EMERGENCIA
// ---------------------------------------------------------
function calcularDetencionEmergencia(evento) {
  evento.preventDefault();

  const velocidadInput = document.getElementById('velocidad').value.trim();
  const tiempoInput = document.getElementById('tiempo').value.trim();
  const contenedorResultado = document.getElementById('resultado-detencion');

  const velocidad = parseFloat(velocidadInput);
  const tiempo = parseFloat(tiempoInput);

  if (velocidadInput === '' || tiempoInput === '' || isNaN(velocidad) || isNaN(tiempo)) {
    mostrarMensaje(contenedorResultado, 'Error: Ingrese valores numéricos válidos para velocidad y tiempo.', 'error');
    return;
  }

  if (velocidad <= 0 || tiempo <= 0) {
    mostrarMensaje(contenedorResultado, 'Error: La velocidad y el tiempo de reacción deben ser mayores a 0.', 'error');
    return;
  }

  // Fórmula: d = (v / 3.6) * t
  const distancia = (velocidad / 3.6) * tiempo;
  const distanciaFormateada = Number.isInteger(distancia) ? distancia : distancia.toFixed(2);
  const umbralDidactico = 50;

  if (distancia > umbralDidactico) {
    mostrarMensaje(
      contenedorResultado,
      `Distancia recorrida durante la reacción: ${distanciaFormateada} m. AVISO (Simulación): Supera el umbral didáctico de ${umbralDidactico} m.`,
      'warning'
    );
  } else {
    mostrarMensaje(
      contenedorResultado,
      `Distancia recorrida durante la reacción: ${distanciaFormateada} m. ESTADO (Simulación): Dentro del umbral didáctico de ${umbralDidactico} m.`,
      'success'
    );
  }
}

// ---------------------------------------------------------
// MÓDULO 2: MANTENIMIENTO (Arreglo de objetos + CRUD DOM)
// ---------------------------------------------------------
function renderizarTablaMantenimiento() {
  const tbody = document.getElementById('tbody-mantenimiento');
  tbody.innerHTML = '';

  if (registrosMantenimiento.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">No hay registros de mantenimiento cargados.</td></tr>';
    return;
  }

  registrosMantenimiento.forEach((item, indice) => {
    const fila = document.createElement('tr');

    let claseBadge = 'badge-normal';
    if (item.estado === 'Revisión') claseBadge = 'badge-revision';
    if (item.estado === 'Urgente') claseBadge = 'badge-urgente';

    fila.innerHTML = `
      <td>${item.componente}</td>
      <td>${item.horas} h</td>
      <td><span class="badge ${claseBadge}">${item.estado}</span></td>
      <td><button type="button" class="btn btn-danger" data-index="${indice}">Eliminar</button></td>
    `;
    tbody.appendChild(fila);
  });
}

function agregarRegistroMantenimiento(evento) {
  evento.preventDefault();

  const componenteInput = document.getElementById('componente');
  const horasInput = document.getElementById('horas');
  const estadoInput = document.getElementById('estado');
  const errorDiv = document.getElementById('error-mantenimiento');

  const componente = componenteInput.value.trim();
  const horasVal = horasInput.value.trim();
  const horas = parseFloat(horasVal);
  const estado = estadoInput.value;

  if (componente === '' || componente.length < 3) {
    mostrarMensaje(errorDiv, 'Error: Ingrese un nombre de componente válido (mínimo 3 caracteres).', 'error');
    return;
  }

  if (horasVal === '' || isNaN(horas) || horas < 0) {
    mostrarMensaje(errorDiv, 'Error: Las horas de uso deben ser un número mayor o igual a 0.', 'error');
    return;
  }

  errorDiv.classList.remove('visible');

  // Uso de push() en arreglo de objetos
  registrosMantenimiento.push({
    componente: componente,
    horas: horas,
    estado: estado
  });

  localStorage.setItem('simtele_mantenimiento', JSON.stringify(registrosMantenimiento));
  renderizarTablaMantenimiento();
  evento.target.reset();
}

function eliminarRegistroMantenimiento(indice) {
  // Uso de splice() para eliminar el elemento seleccionado
  registrosMantenimiento.splice(indice, 1);
  localStorage.setItem('simtele_mantenimiento', JSON.stringify(registrosMantenimiento));
  renderizarTablaMantenimiento();
}

// ---------------------------------------------------------
// MÓDULO 3: VIENTO Y OSCILACIÓN
// ---------------------------------------------------------
function analizarViento(evento) {
  evento.preventDefault();

  const inputs = document.querySelectorAll('.input-viento');
  const contenedorResultado = document.getElementById('resultado-viento');
  const mediciones = [];

  for (let i = 0; i < inputs.length; i++) {
    const valorTexto = inputs[i].value.trim();
    const valorNumero = parseFloat(valorTexto);

    if (valorTexto === '' || isNaN(valorNumero) || valorNumero < 0) {
      mostrarMensaje(
        contenedorResultado,
        `Error: La medición ${i + 1} debe ser un valor numérico mayor o igual a 0.`,
        'error'
      );
      return;
    }
    mediciones.push(valorNumero);
  }

  let suma = 0;
  let maximo = mediciones[0];

  mediciones.forEach((valor) => {
    suma += valor;
    if (valor > maximo) {
      maximo = valor;
    }
  });

  const promedio = suma / mediciones.length;
  const promedioFmt = Number.isInteger(promedio) ? promedio : promedio.toFixed(2);
  const maximoFmt = Number.isInteger(maximo) ? maximo : maximo.toFixed(2);

  let clasificacion = '';
  let tipoAlerta = 'success';

  if (promedio < 25) {
    clasificacion = 'Operación estable (Umbral didáctico < 25 km/h)';
    tipoAlerta = 'success';
  } else if (promedio <= 40) {
    clasificacion = 'Precaución por ráfagas moderadas (Umbral didáctico 25–40 km/h)';
    tipoAlerta = 'warning';
  } else {
    clasificacion = 'Alerta de oscilación elevada (Umbral didáctico > 40 km/h)';
    tipoAlerta = 'error';
  }

  mostrarMensaje(
    contenedorResultado,
    `Promedio: ${promedioFmt} km/h | Máximo: ${maximoFmt} km/h — Clasificación: ${clasificacion}.`,
    tipoAlerta
  );
}

// ---------------------------------------------------------
// MÓDULO 4: SENSORES (RegExp + Validación)
// ---------------------------------------------------------
function renderizarTablaSensores() {
  const tbody = document.getElementById('tbody-sensores');
  tbody.innerHTML = '';

  if (registrosSensores.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3">No hay lecturas de sensores registradas.</td></tr>';
    return;
  }

  registrosSensores.forEach((sensor) => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td><code>${sensor.codigo}</code></td>
      <td>${sensor.tipo}</td>
      <td>${sensor.lectura}</td>
    `;
    tbody.appendChild(fila);
  });
}

function registrarSensor(evento) {
  evento.preventDefault();

  const codigoInput = document.getElementById('codigo-sensor');
  const tipoInput = document.getElementById('tipo-sensor');
  const lecturaInput = document.getElementById('lectura-sensor');
  const errorDiv = document.getElementById('error-sensores');

  const codigo = codigoInput.value.trim().toUpperCase();
  const tipo = tipoInput.value;
  const lecturaTexto = lecturaInput.value.trim();
  const lectura = parseFloat(lecturaTexto);

  if (codigo === '') {
    mostrarMensaje(errorDiv, 'Error: El código del sensor no puede estar vacío.', 'error');
    return;
  }

  // Validación con RegExp /^SEN-\d{3}$/
  if (!REGEX_SENSOR.test(codigo)) {
    mostrarMensaje(
      errorDiv,
      'Error: Formato inválido. El código debe seguir el patrón SEN-000 (ejemplo: SEN-001).',
      'error'
    );
    return;
  }

  if (lecturaTexto === '' || isNaN(lectura)) {
    mostrarMensaje(errorDiv, 'Error: Debe ingresar una lectura numérica válida.', 'error');
    return;
  }

  errorDiv.classList.remove('visible');

  registrosSensores.push({
    codigo: codigo,
    tipo: tipo,
    lectura: lectura
  });

  localStorage.setItem('simtele_sensores', JSON.stringify(registrosSensores));
  renderizarTablaSensores();
  evento.target.reset();
}

// ---------------------------------------------------------
// INICIALIZACIÓN DE EVENTOS (addEventListener)
// ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Verificar si ya existe una sesión activa al cargar la página
  verificarSesion();

  // Eventos de Inicio y Cierre de Sesión
  document.getElementById('form-login').addEventListener('submit', iniciarSesion);
  document.getElementById('btn-cerrar-sesion').addEventListener('click', cerrarSesion);

  // Eventos de los 4 módulos originales
  document.getElementById('form-detencion').addEventListener('submit', calcularDetencionEmergencia);
  document.getElementById('form-mantenimiento').addEventListener('submit', agregarRegistroMantenimiento);
  document.getElementById('form-viento').addEventListener('submit', analizarViento);
  document.getElementById('form-sensores').addEventListener('submit', registrarSensor);

  // Delegación de eventos para eliminar filas en la tabla de mantenimiento
  document.getElementById('tbody-mantenimiento').addEventListener('click', (evento) => {
    if (evento.target.classList.contains('btn-danger')) {
      const indice = parseInt(evento.target.getAttribute('data-index'), 10);
      eliminarRegistroMantenimiento(indice);
    }
  });

  // Renderizado inicial de tablas (incluye datos guardados en localStorage)
  renderizarTablaMantenimiento();
  renderizarTablaSensores();
});