const USUARIO_ADMIN = "Admin_Huila"; 
const CLAVE_ADMIN = "Huila2026";

let personal = JSON.parse(localStorage.getItem('db_patrulleros_huila')) || [];
let usuariosApp = JSON.parse(localStorage.getItem('db_usuarios_huila')) || [];
let indexActual = null;

// LÓGICA CONFIGURACIÓN GLOBAL (PRESIDENTE)
let configGlobal = JSON.parse(localStorage.getItem('config_global_huila')) || {
    nombre: "Nombre del Presidente",
    cc: "C.C. 12.123.651 Neiva",
    tel: "315-7830273"
};

// ================= RECUPERACIÓN DE CONTRASEÑA =================
let codigoRecuperacionTemp = "123456"; // Simulación de código enviado

function enviarCodigoRecuperacion() {
    const email = document.getElementById('rec-email').value;
    if(!email) return alert("Ingrese un correo válido.");
    
    const usuarioExiste = usuariosApp.find(u => u.email === email);
    if(!usuarioExiste) return alert("Correo no encontrado en el sistema.");
    
    alert(`Se ha enviado un código de recuperación al correo: ${email}\n(Para esta prueba, el código es: 123456)`);
    document.getElementById('codigo-group').style.display = "block";
}

function cambiarPasswordRecuperada() {
    const email = document.getElementById('rec-email').value;
    const codigo = document.getElementById('rec-codigo').value;
    const nuevaPass = document.getElementById('rec-nueva-pass').value;

    if(codigo === codigoRecuperacionTemp && nuevaPass.length > 3) {
        let userIndex = usuariosApp.findIndex(u => u.email === email);
        if(userIndex !== -1) {
            usuariosApp[userIndex].pass = nuevaPass;
            localStorage.setItem('db_usuarios_huila', JSON.stringify(usuariosApp));
            alert("Contraseña actualizada exitosamente.");
            cambiarSeccion('login-section');
            
            // Limpiar inputs
            document.getElementById('rec-email').value = "";
            document.getElementById('rec-codigo').value = "";
            document.getElementById('rec-nueva-pass').value = "";
            document.getElementById('codigo-group').style.display = "none";
        }
    } else {
        alert("Código incorrecto o contraseña muy corta.");
    }
}

// ================= SISTEMA DE LOGIN Y ROLES =================
function login() {
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('password').value;

    // Caso 1: Administrador Global
    if(user === USUARIO_ADMIN && pass === CLAVE_ADMIN) {
        document.body.classList.remove('user-mode'); 
        document.body.classList.add('admin-view'); // Identificador para el admin
        document.getElementById('logout-btn').style.display = "block";
        showDashboard();
        return;
    }

    // Caso 2: Patrullero (Usuario normal)
    const usuarioEncontrado = usuariosApp.find(u => u.doc === user && u.pass === pass);
    
    if(usuarioEncontrado) {
        document.body.classList.add('user-mode');
        document.body.classList.remove('admin-view');
        document.getElementById('logout-btn').style.display = "block";
        
        const pIndex = personal.findIndex(p => p.documento === user);
        if(pIndex !== -1) {
            verDetalle(pIndex);
            document.getElementById('details-section').style.display = 'block';
        } else {
            alert("Error: Ficha de carné no encontrada.");
        }
    } else {
        alert("Usuario o contraseña incorrectos.");
    }
}

// ================= REGISTRO =================
function registrarNuevoUsuario() {
    const nom = document.getElementById('reg-nombre').value;
    const doc = document.getElementById('reg-doc').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;

    if(nom && doc && email && pass) {
        if(usuariosApp.find(u => u.doc === doc)) {
            alert("Este documento ya está registrado.");
            return;
        }

        const nuevoUsuario = { nom, doc, email, pass, rol: 'usuario' };
        usuariosApp.push(nuevoUsuario);
        
        // Estructura actualizada con fases y tiempos
        personal.push({ 
            nombre: nom, 
            documento: doc, 
            rh: "O+", 
            foto: "", 
            firma: "",
            status: "aspirante", // Empieza como aspirante
            fase1_docs: { hojaVida: null, certEstudio: null, certBachiller: null },
            graduado: false,
            fechaIngreso: "",
            fechaInactivo: "",
            carnetAprobado: false,
            owner: doc 
        });

        localStorage.setItem('db_usuarios_huila', JSON.stringify(usuariosApp));
        localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));

        alert("Registro exitoso. Ahora puedes iniciar sesión.");
        
        // Vaciar campos
        document.getElementById('reg-nombre').value = "";
        document.getElementById('reg-doc').value = "";
        document.getElementById('reg-email').value = "";
        document.getElementById('reg-pass').value = "";

        cambiarSeccion('login-section');
    } else {
        alert("Por favor completa todos los campos.");
    }
}

// ================= CÁLCULO DE TIEMPOS =================
function calcularTiempoActivo(fechaIngreso, fechaInactivo, status) {
    if (!fechaIngreso) return "Sin fecha de ingreso";
    
    let inicio = new Date(fechaIngreso);
    let fin = (status === 'activo' || !fechaInactivo) ? new Date() : new Date(fechaInactivo);
    
    let diffTiempo = fin.getTime() - inicio.getTime();
    if(diffTiempo < 0) return "Fecha inválida";

    let dias = Math.floor(diffTiempo / (1000 * 3600 * 24));
    let anos = Math.floor(dias / 365);
    let meses = Math.floor((dias % 365) / 30);
    
    let resultado = [];
    if(anos > 0) resultado.push(`${anos} año(s)`);
    if(meses > 0) resultado.push(`${meses} mes(es)`);
    
    if(resultado.length === 0) return "Menos de un mes";
    
    return status === 'activo' ? `Activo hace: ${resultado.join(" y ")}` : `Inactivo tras: ${resultado.join(" y ")}`;
}

// ================= PANEL DASHBOARD Y LISTA =================
function renderizarLista() {
    const lista = document.getElementById('personnel-list');
    lista.innerHTML = "";
    personal.forEach((p, index) => {
        const li = document.createElement('li');
        li.style.cssText = "background:#222; margin:10px 0; padding:15px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid #d4af37;";
        
        let claseEstado = 'bg-inactivo';
        let textoEstado = 'Inactivo';
        
        if(p.status === 'activo') {
            claseEstado = 'bg-activo';
            textoEstado = 'Activo';
        } else if(p.status === 'aspirante') {
            claseEstado = 'bg-aspirante';
            textoEstado = 'Aspirante';
        }

        let htmlGraduado = p.graduado ? `<span class="badge-graduado">Graduado (@)</span>` : "";
        let htmlTiempo = (p.status !== 'aspirante' && p.fechaIngreso) ? `<span class="time-text">${calcularTiempoActivo(p.fechaIngreso, p.fechaInactivo, p.status)}</span>` : "";

        li.innerHTML = `
            <div onclick="verDetalle(${index})" style="cursor:pointer; flex-grow:1;">
                <b style="color:#d4af37;">${p.nombre}</b> ${htmlGraduado}
                <br>
                <small style="color:#aaa;">C.C. ${p.documento}</small>
                ${htmlTiempo}
            </div>
            <button class="status-badge ${claseEstado} admin-only" onclick="cambiarEstado(${index})">${textoEstado}</button>
        `;
        lista.appendChild(li);
    });
    localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
}

function cambiarEstado(index) {
    let p = personal[index];
    
    // No permitir cambiar de aspirante a activo si no está graduado y carnetizado (Fase 3)
    if(p.status === 'aspirante' && (!p.graduado || !p.carnetAprobado)) {
        if(!confirm("Advertencia: El usuario no ha completado las 3 fases (Graduación y Carnetización). ¿Desea forzar el cambio a ACTIVO de todos modos?")) {
            return;
        }
    }

    if(p.status === 'activo') {
        p.status = 'inactivo';
        p.fechaInactivo = new Date().toISOString().split('T')[0]; // Guarda la fecha en la que se inactivó
    } else {
        p.status = 'activo';
        p.fechaInactivo = ""; // Resetea fecha inactivo si vuelve a estar activo
        if(!p.fechaIngreso) {
            p.fechaIngreso = new Date().toISOString().split('T')[0];
        }
    }
    renderizarLista();
}

// ================= SISTEMA DE FASES =================
function toggleFase(idFase) {
    const element = document.getElementById(idFase + '-content');
    element.style.display = element.style.display === "block" ? "none" : "block";
}

function subirArchivoFase(input, tipoDoc) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            personal[indexActual].fase1_docs[tipoDoc] = e.target.result;
            localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
            actualizarUIFases();
            alert("Archivo subido correctamente.");
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function eliminarArchivoFase(tipoDoc) {
    if(!personal[indexActual].fase1_docs[tipoDoc]) {
        alert("No hay ningún archivo cargado para eliminar.");
        return;
    }

    if(confirm("¿Estás seguro de eliminar este documento permanentemente?")) {
        // 1. Borrar del objeto en memoria
        personal[indexActual].fase1_docs[tipoDoc] = null;
        
        // 2. Guardar en LocalStorage inmediatamente
        localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
        
        // 3. Resetear el input físico (esto es vital para poder subir otro después)
        const inputId = `input-${tipoDoc}`; // Asegúrate que tu HTML tenga id="input-hojaVida", etc.
        const inputElement = document.getElementById(inputId);
        if(inputElement) inputElement.value = "";

        // 4. Refrescar la interfaz
        actualizarUIFases();
        alert("Documento eliminado correctamente.");
    }
}

function descargarArchivoFase(tipoDoc) {
    let base64 = personal[indexActual].fase1_docs[tipoDoc];
    if(base64) {
        let a = document.createElement("a");
        a.href = base64;
        a.download = `Documento_${tipoDoc}_${personal[indexActual].nombre}`;
        a.click();
    }
}

function marcarGraduado() {
    // Validar Fase 1
    const p = personal[indexActual];
    if(!p.fase1_docs.hojaVida || !p.fase1_docs.certEstudio || !p.fase1_docs.certBachiller) {
        if(!confirm("Alerta: El aspirante no ha subido todos los documentos de la Fase 1. ¿Desea forzar la graduación?")) return;
    }
    
    p.graduado = true;
    localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
    actualizarUIFases();
    alert("Usuario marcado como Graduado (@). Fase 2 completada.");
}

function guardarFechaIngreso(fecha) {
    personal[indexActual].fechaIngreso = fecha;
    localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
}

function actualizarUIFases() {
    const p = personal[indexActual];

    // FASE 1 UI
    const docs = ['hojaVida', 'certEstudio', 'certBachiller'];
    docs.forEach(doc => {
        const span = document.getElementById(`estado-${doc}`);
        const btnD = document.getElementById(`btn-descarga-${doc}`);
        if(p.fase1_docs && p.fase1_docs[doc]) {
            span.innerText = "✓ Archivo Cargado";
            span.style.color = "#2ecc71";
            btnD.style.display = "inline-block";
        } else {
            span.innerText = "✗ Pendiente";
            span.style.color = "#e74c3c";
            btnD.style.display = "none";
        }
    });

    // FASE 2 UI
    if(p.graduado) {
        document.getElementById('msg-fase2-user').innerText = "✅ ¡Felicidades, te has graduado exitosamente!";
        document.getElementById('msg-fase2-user').style.color = "#2ecc71";
        document.getElementById('btn-marcar-graduado').innerText = "Ya está Graduado";
        document.getElementById('btn-marcar-graduado').style.background = "#555";
    } else {
        document.getElementById('msg-fase2-user').innerText = "⏳ Aún no estás graduado. Espera la validación del administrador.";
        document.getElementById('msg-fase2-user').style.color = "#aaa";
        document.getElementById('btn-marcar-graduado').innerText = "Marcar como GRADUADO (@)";
        document.getElementById('btn-marcar-graduado').style.background = "var(--gold)";
    }

    // FECHA INGRESO UI (Solo Admin)
    document.getElementById('admin-fecha-ingreso').value = p.fechaIngreso || "";

    // FASE 3 UI (Desbloqueo Carnet)
    const panelCarnet = document.getElementById('panel-edicion-carnet');
    if(p.graduado) {
        panelCarnet.classList.remove('seccion-bloqueada');
        document.getElementById('fase3-content').innerHTML = '<p style="color:#2ecc71;">✅ Fase 3 desbloqueada. Desliza hacia abajo para llenar y guardar tu carné.</p>';
    } else {
        panelCarnet.classList.add('seccion-bloqueada');
        document.getElementById('fase3-content').innerHTML = '<p style="color:#e74c3c;">⏳ Debes completar la graduación para desbloquear la carnetización.</p>';
    }

    // Estado del botón y checkbox de guardado de carné
    document.getElementById('check-consentimiento').checked = p.carnetAprobado;
    validarConsentimiento(); // Refresca UI del botón
}

// ================= GESTIÓN DEL CARNÉ =================
function validarConsentimiento() {
    const isChecked = document.getElementById('check-consentimiento').checked;
    const btnGuardar = document.getElementById('btn-guardar-carnet');
    const btnDescargar = document.getElementById('btn-descargar-pdf');
    const isAdmin = document.body.classList.contains('admin-view');

    // El admin puede saltarse esto, el usuario no
    if(isChecked || isAdmin) {
        btnGuardar.style.opacity = "1";
        btnGuardar.style.pointerEvents = "auto";
    } else {
        btnGuardar.style.opacity = "0.5";
        btnGuardar.style.pointerEvents = "none";
    }

    // Mostrar botón de descargar solo si ya se aprobó/guardó
    if(personal[indexActual].carnetAprobado) {
        btnGuardar.innerText = "ACTUALIZAR DATOS DEL CARNÉ";
        btnDescargar.style.display = "block";
    } else {
        btnGuardar.innerText = "GUARDAR DATOS DEL CARNÉ";
        btnDescargar.style.display = "none";
    }
}

function guardarCarnetAutorizado() {
    const p = personal[indexActual];
    p.carnetAprobado = true;
    
    // Si el usuario guardó el carnet y estaba de aspirante + graduado, sugerir al admin pasarlo a activo.
    // Nosotros solo actualizamos el flag.
    localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
    
    alert("Carné generado y guardado exitosamente. Ya aparece en el sistema del administrador.");
    validarConsentimiento();
}

function verDetalle(index) {
    indexActual = index;
    const p = personal[index];
    
    // Si son registros viejos y no tienen la estructura nueva, actualizarla
    if(!p.fase1_docs) p.fase1_docs = { hojaVida: null, certEstudio: null, certBachiller: null };
    if(p.graduado === undefined) p.graduado = false;
    if(p.carnetAprobado === undefined) p.carnetAprobado = (p.status === 'activo'); // Para antiguos

    document.getElementById('edit-name').value = p.nombre;
    document.getElementById('edit-doc-num').value = p.documento;
    document.getElementById('edit-rh').value = p.rh || "O+";
    
    document.getElementById('preview-photo').src = p.foto || "https://via.placeholder.com/150";
    document.getElementById('preview-signature').src = p.firma || "";

    aplicarConfigGlobal(); 
    updateLivePreview();
    actualizarUIFases();

    // Contraer todos los acordeones al abrir
    document.getElementById('fase1-content').style.display = "none";
    document.getElementById('fase2-content').style.display = "none";
    document.getElementById('fase3-content').style.display = "none";

    cambiarSeccion('details-section');
}

function updateLivePreview() {
    const nom = document.getElementById('edit-name').value;
    const doc = document.getElementById('edit-doc-num').value;
    const rh = document.getElementById('edit-rh').value;

    document.getElementById('view-name').innerText = nom || "NOMBRE";
    document.getElementById('view-doc').innerText = `C.C. ${doc || '000.000'}`;
    document.getElementById('view-rh').innerText = `RH: ${rh || 'O+'}`;

    personal[indexActual].nombre = nom;
    personal[indexActual].documento = doc;
    personal[indexActual].rh = rh;
    localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
}

function cargarImagen(input, tipo) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if(tipo === 'foto') {
                document.getElementById('preview-photo').src = e.target.result;
                personal[indexActual].foto = e.target.result;
            } else if(tipo === 'firma') {
                document.getElementById('preview-signature').src = e.target.result;
                personal[indexActual].firma = e.target.result;
            }
            localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function quitarImagen(tipo) {
    if(confirm(`¿Seguro que deseas eliminar la firma de este registro?`)) {
        if(tipo === 'firma') {
            document.getElementById('preview-signature').src = "";
            personal[indexActual].firma = "";
            document.getElementById('input-firma').value = "";
        }
        localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
    }
}

async function descargarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [54, 86] });
    
    const frente = document.getElementById('carnet-frente');
    const respaldo = document.getElementById('carnet-respaldo');

    const canvasF = await html2canvas(frente, { scale: 3, useCORS: true });
    doc.addImage(canvasF.toDataURL('image/png'), 'PNG', 0, 0, 54, 86);
    
    doc.addPage();
    
    const canvasR = await html2canvas(respaldo, { scale: 3, useCORS: true });
    doc.addImage(canvasR.toDataURL('image/png'), 'PNG', 0, 0, 54, 86);
    
    doc.save(`Carnet_${personal[indexActual].nombre}.pdf`);
}

function nuevoPatrullero() {
    personal.push({ 
        nombre: "NUEVO REGISTRO", 
        documento: "000.000", 
        rh: "O+", 
        foto: "", 
        firma: "",
        status: "aspirante", // Creado como aspirante
        fase1_docs: { hojaVida: null, certEstudio: null, certBachiller: null },
        graduado: false,
        fechaIngreso: "",
        carnetAprobado: false
    });
    renderizarLista();
    verDetalle(personal.length - 1);
}

// ================= UTILIDADES GLOBALES =================
function guardarConfigGlobal() {
    const nuevoNom = document.getElementById('global-pres-nombre').value;
    const nuevoCC = document.getElementById('global-pres-cc').value;
    const nuevoTel = document.getElementById('global-pres-tel').value;

    if(nuevoNom && nuevoCC && nuevoTel) {
        configGlobal = { nombre: nuevoNom, cc: nuevoCC, tel: nuevoTel };
        localStorage.setItem('config_global_huila', JSON.stringify(configGlobal));
        aplicarConfigGlobal();
        alert("Configuración de autoridad actualizada correctamente.");
    } else {
        alert("Por favor completa todos los campos.");
    }
}

function aplicarConfigGlobal() {
    if(document.getElementById('global-pres-nombre')) {
        document.getElementById('global-pres-nombre').value = configGlobal.nombre;
        document.getElementById('global-pres-cc').value = configGlobal.cc;
        document.getElementById('global-pres-tel').value = configGlobal.tel;
    }
    const viewCC = document.getElementById('view-pres-cc');
    const viewTel = document.getElementById('view-pres-tel');
    if(viewCC) viewCC.innerText = configGlobal.cc;
    if(viewTel) viewTel.innerText = configGlobal.tel;
}

function cambiarSeccion(id) {
    document.querySelectorAll('.container').forEach(c => c.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function showDashboard() { 
    renderizarLista(); 
    aplicarConfigGlobal(); 
    cambiarSeccion('dashboard-section'); 
}

function logout() { 
    location.reload(); 
}

function eliminarPatrullero() { 
    if(confirm("¿Estás seguro de eliminar permanentemente este registro?")) { 
        personal.splice(indexActual, 1); 
        showDashboard(); 
    }

    // Variable global para simular el usuario actual (esto lo define tu función login)
let usuarioActual = {
    rol: 'admin' // o 'usuario'
};

/**
 * Función principal para aplicar permisos según el rol
 * Ejecútala siempre que cargues los detalles de un patrullero
 */
function aplicarPermisosRol() {
    const seccionTerminos = document.getElementById('consentimiento-section');
    const btnGuardar = document.getElementById('btn-guardar-carnet');
    const inputFecha = document.getElementById('admin-fecha-ingreso');

    if (usuarioActual.rol === 'admin') {
        // 1. Ocultar términos para el Admin
        if (seccionTerminos) seccionTerminos.style.display = 'none';
        
        // 2. Habilitar botón de guardar automáticamente
        btnGuardar.style.opacity = "1";
        btnGuardar.style.pointerEvents = "auto";

        // 3. Si hay una fecha ya puesta, calcular el tiempo de una vez
        if (inputFecha.value) {
            calcularTiempoExacto(inputFecha.value);
        }
    } else {
        // Si es usuario normal, mostrar términos y bloquear botón hasta que acepte
        if (seccionTerminos) seccionTerminos.style.display = 'block';
        validarConsentimiento(); 
    }
}

/**
 * Calcula años y meses exactos desde la fecha de ingreso
 */
function calcularTiempoExacto(fechaIngreso) {
    if (!fechaIngreso) return;

    const fechaInicio = new Date(fechaIngreso);
    const fechaFin = new Date();

    let anios = fechaFin.getFullYear() - fechaInicio.getFullYear();
    let meses = fechaFin.getMonth() - fechaInicio.getMonth();

    // Ajuste por si el mes actual es menor al mes de inicio
    if (meses < 0 || (meses === 0 && fechaFin.getDate() < fechaInicio.getDate())) {
        anios--;
        meses += 12;
    }

    // Ajuste fino para los días
    if (fechaFin.getDate() < fechaInicio.getDate()) {
        meses--;
        if (meses < 0) {
            anios--;
            meses = 11;
        }
    }

    const textoContador = document.getElementById('contador-tiempo-activo');
    if (textoContador) {
        textoContador.innerText = `Tiempo activo: ${anios} años y ${meses} meses`;
    }
}

/**
 * Esta función sobreescribe la que ya tienes para que guarde y calcule
 */
function guardarFechaIngreso(valor) {
    // Aquí iría tu lógica actual de guardar en LocalStorage o Base de Datos
    console.log("Fecha guardada:", valor);
    
    // Actualizar el contador visual inmediatamente
    calcularTiempoExacto(valor);
}

// Modificación de tu función de validación de checkbox
function validarConsentimiento() {
    // Si es admin, ignoramos la validación del checkbox y siempre habilitamos
    if (usuarioActual.rol === 'admin') return;

    const check = document.getElementById('check-consentimiento');
    const btn = document.getElementById('btn-guardar-carnet');
    
    if (check.checked) {
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
    } else {
        btn.style.opacity = "0.5";
        btn.style.pointerEvents = "none";
    }
}
function eliminarArchivoFase(tipoDoc) {
    if(confirm("¿Quieres borrar este documento?")) {
        personal[indexActual].fase1_docs[tipoDoc] = null;
        localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
        
        // ESTA ES LA CLAVE: Resetea el input en el HTML para que permita subir el mismo archivo u otro
        let inputFile = document.getElementById('input-' + tipoDoc); // Asegúrate de que el id de tus inputs sea "input-hojaVida", etc.
        if(inputFile) inputFile.value = ""; 
        
        actualizarUIFases();
        alert("Documento eliminado. Ya puedes cargar el correcto.");
    }
}
// ====================================================================
// ================= SISTEMA DE CÓDIGO QR Y VISOR PÚBLICO =============
// ====================================================================

// 1. Generar el QR automáticamente
function generarQR(documento) {
    const qrImg = document.getElementById('qr-code-img');
    if(!qrImg) return;

    // Si no hay documento, ocultamos el QR para que no salga el icono roto
    if(!documento || documento === "000.000") {
        qrImg.style.display = "none";
        return;
    }

    const baseUrl = window.location.href.split('?')[0];
    const publicUrl = `${baseUrl}?view=${documento}`;
    
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}`;
    qrImg.style.display = "block"; // Aseguramos que sea visible
function verDetalle(index) {
    indexActual = index;
    const p = personal[index];
    
    // ... (todo tu código actual de verDetalle) ...

    actualizarUIFases();
    generarQR(p.documento); // <--- AGREGA ESTA LÍNEA AL FINAL
    cambiarSeccion('details-section');
}
}

// ⚠️ IMPORTANTE: Modifica tu función actual 'updateLivePreview' para que llame a generarQR().
// Solo tienes que agregar 'generarQR(doc);' al final de la función updateLivePreview que ya tienes.
/* Quedaría algo así:
    personal[indexActual].rh = rh;
    localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
    generarQR(doc); // <- ESTA ES LA LÍNEA QUE DEBES AÑADIR
*/

// 2. Detectar si alguien entró escaneando el código QR
window.addEventListener('DOMContentLoaded', (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    const documentoEscaneado = urlParams.get('view');

    if (documentoEscaneado) {
        // Alguien escaneó el QR, le mostramos el visor seguro
        mostrarVisorPublico(documentoEscaneado);
        aplicarSeguridadVisor();
    }
});

// 3. Crear la pantalla que ve el usuario que escanea
function mostrarVisorPublico(docBuscado) {
    // Borramos todo el HTML de la página original para que solo vean el resultado del escaneo
    document.body.innerHTML = ""; 
    
    // Aplicamos estilos de fondo para el visor
    document.body.style.display = "flex";
    document.body.style.flexDirection = "column";
    document.body.style.alignItems = "center";
    document.body.style.justifyContent = "center";
    document.body.style.background = "#0f0f0f";
    document.body.style.color = "white";
    document.body.style.padding = "20px";
    document.body.style.fontFamily = "'Segoe UI', sans-serif";

    // Buscamos al patrullero en la base de datos
    let patrulleros = JSON.parse(localStorage.getItem('db_patrulleros_huila')) || [];
    let p = patrulleros.find(pat => pat.documento === docBuscado);

    let htmlRespuesta = "";

    // CASO 1: El administrador lo borró del panel o no existe
    if (!p) {
        htmlRespuesta = `
            <div style="background: #c0392b; padding: 25px; border-radius: 10px; text-align: center; max-width: 400px; border: 2px solid #ff4757;">
                <h2 style="color: white; margin:0 0 15px 0;">⚠️ ALERTA DE SEGURIDAD</h2>
                <p style="font-size: 16px;">Este patrullero <b>NO EXISTE</b> en el sistema.</p>
                <p style="font-size: 14px; color: #f1f2f6;">Podría ser un intento de suplantación o la persona dejó de ser parte del grupo definitivamente.</p>
            </div>
        `;
    } 
    // CASO 2: Está inactivo según el panel del administrador
    else if (p.status === "inactivo" || p.status === "aspirante") {
        htmlRespuesta = `
            <div style="background: #e74c3c; padding: 20px; border-radius: 10px; text-align: center; max-width: 400px; margin-bottom: 25px; box-shadow: 0 0 15px rgba(231, 76, 60, 0.4);">
                <h2 style="color: white; margin:0 0 10px 0;">🛑 ESTADO: INACTIVO</h2>
                <p style="font-size: 16px;">El patrullero <b>${p.nombre}</b> se encuentra inactivo.</p>
                <p style="font-size: 14px; font-weight: bold; color: #ffcccc;">Su carnet es INVÁLIDO y no podrá ejercer las funciones que tiene su cargo.</p>
            </div>
            ${generarCarnetSeguroHTML(p)}
        `;
    } 
    // CASO 3: Está Activo
    else if (p.status === "activo") {
        let tiempo = calcularTiempoActivo(p.fechaIngreso, p.fechaInactivo, p.status); // Usa tu función existente
        htmlRespuesta = `
            <div style="background: #27ae60; padding: 20px; border-radius: 10px; text-align: center; max-width: 400px; margin-bottom: 25px; box-shadow: 0 0 15px rgba(39, 174, 96, 0.4);">
                <h2 style="color: white; margin:0 0 10px 0;">✅ ESTADO: ACTIVO</h2>
                <p style="font-size: 16px;">El patrullero <b>${p.nombre}</b> está debidamente autorizado.</p>
                <p style="font-size: 15px; font-weight: bold; color: #d1ffd6;">${tiempo}</p>
            </div>
            ${generarCarnetSeguroHTML(p)}
        `;
    }

    document.body.innerHTML = htmlRespuesta;
}

// 4. Generar el carnet blindado para la vista pública
function generarCarnetSeguroHTML(p) {
    return `
    <div style="width: 310px; background: linear-gradient(to bottom, #f1c40f 0%, #f1c40f 22%, #fff 42%, #2980b9 70%, #1a2a6c 100%); border-radius: 15px; overflow: hidden; display: flex; flex-direction: column; align-items: center; padding-bottom: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.5); position:relative;">
        
        <div style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:999;"></div>
        
        <div style="color: #000; font-weight: bold; padding: 25px 15px 10px; text-align: center; font-size: 14px;">PATRULLA</div>
        <div style="width: 150px; height: 185px; border: 2px solid #fff; background: #eee; overflow: hidden; margin-top: 10px;">
            <img src="${p.foto || 'https://via.placeholder.com/150'}" style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;">
        </div>
        <div style="color: #fff; text-align: center; width: 100%; padding: 10px; flex-grow: 1;">
            <div style="font-weight: bold; font-size: 17px; text-transform: uppercase; margin-bottom: 5px;">${p.nombre}</div>
            <div style="font-size: 13px; border-top: 1px solid rgba(255,255,255,0.4); display: inline-block; padding-top: 5px;">CARGO DE PATRULLERO</div>
            <div style="font-weight: bold; font-size: 14px; margin-top: 5px;">C.C. ${p.documento}</div>
            <div style="font-weight: bold; font-size: 14px; margin-top: 5px;">RH: ${p.rh}</div>
        </div>
    </div>
    <p style="color:#777; font-size:12px; margin-top: 20px; text-align:center;">
        🔒 Documento oficial. Prohibida su copia o descarga.
    </p>
    `;
}

// 5. Aplicar medidas Anti-Descarga y Anti-Exploración
function aplicarSeguridadVisor() {
    // Bloquea el clic derecho (Menú contextual)
    document.addEventListener('contextmenu', event => event.preventDefault());
    
    // Bloquea atajos de teclado como Guardar (Ctrl+S) e Imprimir (Ctrl+P)
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'u' || e.key === 'i')) {
            e.preventDefault();
            alert("Acción de seguridad bloqueada.");
        }
    });

    // Bloquea que puedan arrastrar la foto hacia el escritorio
    document.addEventListener('dragstart', event => event.preventDefault());
    
    // Evita la selección de texto
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
}

// ======================================================
// 1. SINCRONIZAR CON LA NUBE (BOTÓN VERDE)
// ======================================================
function actualizarPatrulleroEnNube() {
    if (indexActual === null || !personal[indexActual]) {
        alert("Primero selecciona un patrullero.");
        return;
    }

    const p = personal[indexActual];

    // Guardamos en Firebase usando la C.C. como ID del documento
    db.collection("patrulleros").doc(p.documento).set({
        nombre: p.nombre,
        documento: p.documento,
        rh: p.rh,
        status: p.status, // Activo o Inactivo
        fechaIngreso: p.fechaIngreso,
        foto: p.foto || ""
    })
    .then(() => {
        alert("¡Datos sincronizados! El QR ahora es válido en la nube.");
        generarQR(p.documento); // Generar el QR actualizado
    })
    .catch((error) => {
        console.error("Error al sincronizar:", error);
        alert("Error al conectar con la base de datos.");
    });
}

// ======================================================
// 2. GENERAR CÓDIGO QR CENTRADO
// ======================================================
function generarQR(documento) {
    const qrImg = document.getElementById('qr-code-img');
    if(!qrImg) return;

    // Tu link oficial de GitHub Pages + el archivo visor.html
    const urlBase = "https://jackhamilton2006-sys.github.io/huila-carnet/visor.html"; 
    const publicUrl = `${urlBase}?id=${documento}`;
    
    // Generar el código QR
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}`;
    
    // Mostrar la imagen solo cuando esté cargada para evitar el icono de error
    qrImg.onload = () => {
        qrImg.style.display = "block";
    };

    qrImg.onerror = () => {
        qrImg.style.display = "none";
    };
}

// ======================================================
// 3. CORRECCIÓN: BORRAR ARCHIVO FASE 1
// ======================================================
function eliminarArchivoFase(tipoDoc) {
    if(confirm("¿Seguro que quieres borrar este archivo?")) {
        personal[indexActual].fase1_docs[tipoDoc] = null;
        localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
        
        // Resetear el input para permitir subir otro
        let input = document.getElementById('input-' + tipoDoc);
        if(input) input.value = ""; 
        
        actualizarUIFases();
        alert("Archivo borrado correctamente.");
    }
}
}
