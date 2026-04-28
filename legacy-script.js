const USUARIO_ADMIN = "Admin_Huila"; 
const CLAVE_ADMIN = "Huila2026";

let personal = JSON.parse(localStorage.getItem('db_patrulleros_huila')) || [];
let usuariosApp = JSON.parse(localStorage.getItem('db_usuarios_huila')) || [];
let indexActual = null;
let usuarioLogueado = null;

let configGlobal = JSON.parse(localStorage.getItem('config_global_huila')) || {
    nombre: "Nombre del Presidente", cc: "C.C. 12.123.651 Neiva", tel: "315-7830273"
};

// --- REGISTRO Y LOGIN ---

function registrarNuevoUsuario() {
    const nom = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const doc = document.getElementById('reg-doc').value;
    const pass = document.getElementById('reg-pass').value;

    if(!nom || !email || !doc || !pass) return alert("Complete todos los campos.");
    if(usuariosApp.find(u => u.doc === doc)) return alert("Este documento ya está registrado.");

    // Guardar en Base de Usuarios
    usuariosApp.push({ nom, email, doc, pass, fase: 1, graduado: false, fechaIngreso: null });
    
    // Crear Ficha de Personal Automática (Estado Aspirante)
    personal.push({ 
        nombre: nom, documento: doc, rh: "O+", foto: "", firma: "", 
        status: "aspirante", graduado: false, fechaIngreso: null, docsPDF: [] 
    });

    localStorage.setItem('db_usuarios_huila', JSON.stringify(usuariosApp));
    localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));

    // LIMPIEZA DE CAMPOS
    document.getElementById('reg-nombre').value = "";
    document.getElementById('reg-email').value = "";
    document.getElementById('reg-doc').value = "";
    document.getElementById('reg-pass').value = "";

    alert("Cuenta creada con éxito. Ahora inicie sesión.");
    cambiarSeccion('login-section');
}

function login() {
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('password').value;

    if(user === USUARIO_ADMIN && pass === CLAVE_ADMIN) {
        document.body.classList.remove('user-mode');
        document.getElementById('logout-btn').style.display = "block";
        showDashboard();
        return;
    }

    const u = usuariosApp.find(u => u.doc === user && u.pass === pass);
    if(u) {
        usuarioLogueado = u;
        document.body.classList.add('user-mode');
        document.getElementById('logout-btn').style.display = "block";
        
        if(!u.graduado) {
            actualizarInterfazFases();
            cambiarSeccion('phases-section');
        } else {
            const pIndex = personal.findIndex(p => p.documento === u.doc);
            verDetalle(pIndex);
        }
    } else { alert("Credenciales incorrectas."); }
}

// --- GESTIÓN DE FASES (ASPIRANTE) ---

function subirArchivosAspirante() {
    const input = document.getElementById('user-pdf-docs');
    if(input.files.length === 0) return alert("Seleccione sus archivos PDF.");

    // Simulación de carga (En LocalStorage guardamos solo el nombre por espacio)
    const p = personal.find(p => p.documento === usuarioLogueado.doc);
    p.docsPDF.push("Documentación_Fase1_Subida.pdf");
    
    usuarioLogueado.fase = 2;
    localStorage.setItem('db_usuarios_huila', JSON.stringify(usuariosApp));
    localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));

    alert("Documentos enviados. Fase 1 completada.");
    actualizarInterfazFases();
}

function actualizarInterfazFases() {
    if(usuarioLogueado.fase >= 2) {
        document.getElementById('fase1-box').style.opacity = "0.5";
        document.getElementById('fase1-status').innerText = "✅ COMPLETADA";
        document.getElementById('fase2-box').style.opacity = "1";
    }
    if(usuarioLogueado.graduado) {
        document.getElementById('fase2-box').style.opacity = "0.5";
        document.getElementById('txt-fase2').innerText = "✅ GRADUADO CON ÉXITO";
        document.getElementById('fase3-box').style.opacity = "1";
        document.getElementById('btn-ir-editor').style.display = "block";
    }
}

function irAlEditorPropio() {
    const idx = personal.findIndex(p => p.documento === usuarioLogueado.doc);
    verDetalle(idx);
}

// --- ADMINISTRACIÓN ---

function renderizarLista() {
    const lista = document.getElementById('personnel-list');
    lista.innerHTML = "";
    personal.forEach((p, index) => {
        const li = document.createElement('li');
        li.style.cssText = "background:#222; margin:10px 0; padding:15px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid #d4af37;";
        
        const claseEstado = p.status === 'activo' ? 'bg-activo' : (p.status === 'aspirante' ? 'bg-aspirante' : 'bg-inactivo');
        const textoEstado = p.status.toUpperCase();
        const tagG = p.graduado ? '<span class="tag-graduado">GRADUADO</span>' : '';

        li.innerHTML = `
            <div onclick="verDetalle(${index})" style="cursor:pointer; flex-grow:1;">
                <b style="color:#d4af37;">${p.nombre}</b> ${tagG}<br>
                <small style="color:#aaa;">C.C. ${p.documento}</small>
            </div>
            <button class="status-badge ${claseEstado}" onclick="cambiarEstado(${index})">${textoEstado}</button>
        `;
        lista.appendChild(li);
    });
}

function cambiarEstado(index) {
    if(personal[index].status === 'aspirante') return alert("Debe graduar al aspirante primero para activar.");
    personal[index].status = personal[index].status === 'activo' ? 'inactivo' : 'activo';
    renderizarLista();
    localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
}

function verDetalle(index) {
    indexActual = index;
    const p = personal[index];

    // Cargar Datos
    document.getElementById('edit-name').value = p.nombre;
    document.getElementById('edit-doc-num').value = p.documento;
    document.getElementById('edit-rh').value = p.rh;
    document.getElementById('edit-fecha-ingreso').value = p.fechaIngreso || "";
    
    // Visor de PDF para Admin
    document.getElementById('lista-pdf-admin').innerText = (p.docsPDF && p.docsPDF.length > 0) ? p.docsPDF.join(", ") : "Ninguno";

    // Tiempo de servicio
    if(p.fechaIngreso) {
        document.getElementById('info-tiempo').style.display = "block";
        document.getElementById('txt-tiempo-servicio').innerText = calcularTiempo(p.fechaIngreso, p.status);
    } else { document.getElementById('info-tiempo').style.display = "none"; }

    // Botón Graduar
    document.getElementById('btn-graduar-accion').style.display = (p.status === 'aspirante') ? 'block' : 'none';

    document.getElementById('preview-photo').src = p.foto || "https://via.placeholder.com/150";
    document.getElementById('preview-signature').src = p.firma || "";

    aplicarConfigGlobal();
    updateLivePreview();
    cambiarSeccion('details-section');
}

function graduarPatrullero() {
    const p = personal[indexActual];
    const u = usuariosApp.find(user => user.doc === p.documento);
    
    p.graduado = true;
    p.status = "activo";
    if(!p.fechaIngreso) p.fechaIngreso = new Date().toISOString().split('T')[0];
    
    if(u) { u.graduado = true; }
    
    localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
    localStorage.setItem('db_usuarios_huila', JSON.stringify(usuariosApp));
    alert("¡Patrullero graduado y activado!");
    verDetalle(indexActual);
}

// --- FUNCIONES DE CÁLCULO Y UTILIDAD ---

function calcularTiempo(fecha, status) {
    if(!fecha) return "";
    const inicio = new Date(fecha);
    const fin = (status === 'inactivo') ? new Date() : new Date(); // Si quisieras pausar, guardarías la fecha de baja
    
    let anos = fin.getFullYear() - inicio.getFullYear();
    let meses = fin.getMonth() - inicio.getMonth();
    
    if (meses < 0) { anos--; meses += 12; }
    let res = (status === 'inactivo') ? "ESTADO INACTIVO - Antigüedad: " : "Antigüedad: ";
    return res + `${anos} años y ${meses} meses`;
}

function updateLivePreview() {
    const nom = document.getElementById('edit-name').value.toUpperCase();
    const doc = document.getElementById('edit-doc-num').value;
    const rh = document.getElementById('edit-rh').value;

    document.getElementById('view-name').innerText = nom || "NOMBRE";
    document.getElementById('view-doc').innerText = "C.C. " + (doc || "000.000");
    document.getElementById('view-rh').innerText = "RH: " + (rh || "O+");

    personal[indexActual].nombre = nom;
    personal[indexActual].documento = doc;
    personal[indexActual].rh = rh;
}

function cargarImagen(input, tipo) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if(tipo === 'foto') {
                document.getElementById('preview-photo').src = e.target.result;
                personal[indexActual].foto = e.target.result;
            } else {
                document.getElementById('preview-signature').src = e.target.result;
                personal[indexActual].firma = e.target.result;
            }
            localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function actualizarFechaIngreso() {
    personal[indexActual].fechaIngreso = document.getElementById('edit-fecha-ingreso').value;
    localStorage.setItem('db_patrulleros_huila', JSON.stringify(personal));
    verDetalle(indexActual);
}

function recuperarClave() {
    const correo = prompt("Ingrese su correo electrónico:");
    const u = usuariosApp.find(u => u.email === correo);
    if(u) alert("Se ha enviado un código de recuperación a su correo. Clave temporal: 123456");
    else alert("Correo no encontrado.");
}

function validarGuardado() {
    const check = document.getElementById('check-ley-1581').checked;
    document.getElementById('btn-save-carnet').style.display = check ? 'block' : 'none';
}

function guardarExitoso() {
    alert("Carné guardado exitosamente en el sistema.");
    if(usuarioLogueado) logout(); else showDashboard();
}

// --- CONFIG GLOBAL Y NAVEGACIÓN ---

function guardarConfigGlobal() {
    configGlobal = {
        nombre: document.getElementById('global-pres-nombre').value,
        cc: document.getElementById('global-pres-cc').value,
        tel: document.getElementById('global-pres-tel').value
    };
    localStorage.setItem('config_global_huila', JSON.stringify(configGlobal));
    alert("Datos globales actualizados.");
    aplicarConfigGlobal();
}

function aplicarConfigGlobal() {
    document.getElementById('view-pres-cc').innerText = configGlobal.cc;
    document.getElementById('view-pres-tel').innerText = configGlobal.tel;
    if(document.getElementById('global-pres-nombre')) {
        document.getElementById('global-pres-nombre').value = configGlobal.nombre;
        document.getElementById('global-pres-cc').value = configGlobal.cc;
        document.getElementById('global-pres-tel').value = configGlobal.tel;
    }
}

async function descargarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: [54, 86] });
    const canvasF = await html2canvas(document.getElementById('carnet-frente'), { scale: 3 });
    doc.addImage(canvasF.toDataURL('image/png'), 'PNG', 0, 0, 54, 86);
    doc.addPage();
    const canvasR = await html2canvas(document.getElementById('carnet-respaldo'), { scale: 3 });
    doc.addImage(canvasR.toDataURL('image/png'), 'PNG', 0, 0, 54, 86);
    doc.save(`Carnet_${personal[indexActual].nombre}.pdf`);
}

function cambiarSeccion(id) {
    document.querySelectorAll('.container').forEach(c => c.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function showDashboard() { renderizarLista(); aplicarConfigGlobal(); cambiarSeccion('dashboard-section'); }
function logout() { location.reload(); }
function nuevoPatrullero() {
    personal.push({ nombre: "NUEVO", documento: "000", rh: "O+", status: "aspirante", foto: "", firma: "", graduado: false, docsPDF: [] });
    renderizarLista();
    verDetalle(personal.length - 1);
}
function eliminarPatrullero() {
    if(confirm("¿Eliminar este registro?")) { personal.splice(indexActual, 1); showDashboard(); }
}