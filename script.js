const USUARIO_ADMIN = "Admin_Huila"; 
const CLAVE_ADMIN = "Huila2026";

let personal = [];
let usuariosApp = [];
let indexActual = null;
let usuarioActual = { rol: 'visitante' };

let configGlobal = {
    nombre: "Nombre del Presidente",
    cc: "C.C. 12.123.651 Neiva",
    tel: "315-7830273"
};

// ================= SINCRONIZACIÓN INICIAL CON FIREBASE =================
async function cargarDatosNube() {
    try {
        // Cargar Configuración Global
        const docConfig = await db.collection("configuracion").doc("global").get();
        if (docConfig.exists) {
            configGlobal = docConfig.data();
        }

        // Cargar Usuarios
        const snapshotUsers = await db.collection("usuarios").get();
        usuariosApp = [];
        snapshotUsers.forEach(doc => usuariosApp.push(doc.data()));

        // Cargar Patrulleros
        const snapshotPatrulleros = await db.collection("patrulleros").get();
        personal = [];
        snapshotPatrulleros.forEach(doc => personal.push(doc.data()));

        // Actualizar la lista si estamos en el panel de administrador
        if (document.getElementById('dashboard-section').style.display !== 'none') {
            renderizarLista();
            aplicarConfigGlobal();
        }
    } catch (error) {
        console.error("Error cargando de Firebase:", error);
    }
}

// ================= SISTEMA DE LOGIN Y ROLES =================
function login() {
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('password').value;

    if(user === USUARIO_ADMIN && pass === CLAVE_ADMIN) {
        usuarioActual.rol = 'admin';
        document.body.classList.remove('user-mode'); 
        document.body.classList.add('admin-view'); 
        document.getElementById('logout-btn').style.display = "block";
        showDashboard();
        return;
    }

    const usuarioEncontrado = usuariosApp.find(u => u.doc === user && u.pass === pass);
    
    if(usuarioEncontrado) {
        usuarioActual.rol = 'usuario';
        document.body.classList.add('user-mode');
        document.body.classList.remove('admin-view');
        document.getElementById('logout-btn').style.display = "block";
        
        const pIndex = personal.findIndex(p => p.documento === user);
        if(pIndex !== -1) {
            verDetalle(pIndex);
            document.getElementById('details-section').style.display = 'block';
            document.getElementById('login-section').style.display = 'none';
        } else {
            alert("Error: Ficha de carné no encontrada.");
        }
    } else {
        alert("Usuario o contraseña incorrectos.");
    }
}

// ================= REGISTRO =================
async function registrarNuevoUsuario() {
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
        const nuevaFicha = { 
            nombre: nom, 
            documento: doc, 
            rh: "O+", 
            foto: "", 
            firma: "",
            status: "aspirante", 
            fase1_docs: { hojaVida: null, certEstudio: null, certBachiller: null },
            graduado: false,
            fechaIngreso: "",
            fechaInactivo: "",
            carnetAprobado: false,
            owner: doc 
        };

        try {
            await db.collection("usuarios").doc(doc).set(nuevoUsuario);
            await db.collection("patrulleros").doc(doc).set(nuevaFicha);
            
            usuariosApp.push(nuevoUsuario);
            personal.push(nuevaFicha);

            alert("Registro exitoso. Ahora puedes iniciar sesión.");
            
            document.getElementById('reg-nombre').value = "";
            document.getElementById('reg-doc').value = "";
            document.getElementById('reg-email').value = "";
            document.getElementById('reg-pass').value = "";
            cambiarSeccion('login-section');
        } catch (error) {
            alert("Error al registrar: " + error.message);
        }
    } else {
        alert("Por favor completa todos los campos.");
    }
}

// ================= RECUPERACIÓN DE CONTRASEÑA =================
let codigoRecuperacionTemp = "123456"; 

function enviarCodigoRecuperacion() {
    const email = document.getElementById('rec-email').value;
    if(!email) return alert("Ingrese un correo válido.");
    const usuarioExiste = usuariosApp.find(u => u.email === email);
    if(!usuarioExiste) return alert("Correo no encontrado en el sistema.");
    alert(`Se ha enviado un código de recuperación al correo: ${email}\n(Código: 123456)`);
    document.getElementById('codigo-group').style.display = "block";
}

async function cambiarPasswordRecuperada() {
    const email = document.getElementById('rec-email').value;
    const codigo = document.getElementById('rec-codigo').value;
    const nuevaPass = document.getElementById('rec-nueva-pass').value;

    if(codigo === codigoRecuperacionTemp && nuevaPass.length > 3) {
        let userIndex = usuariosApp.findIndex(u => u.email === email);
        if(userIndex !== -1) {
            usuariosApp[userIndex].pass = nuevaPass;
            await db.collection("usuarios").doc(usuariosApp[userIndex].doc).update({ pass: nuevaPass });
            alert("Contraseña actualizada exitosamente.");
            cambiarSeccion('login-section');
            document.getElementById('codigo-group').style.display = "none";
        }
    } else {
        alert("Código incorrecto o contraseña muy corta.");
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
            claseEstado = 'bg-activo'; textoEstado = 'Activo';
        } else if(p.status === 'aspirante') {
            claseEstado = 'bg-aspirante'; textoEstado = 'Aspirante';
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
}

async function cambiarEstado(index) {
    let p = personal[index];
    if(p.status === 'aspirante' && (!p.graduado || !p.carnetAprobado)) {
        if(!confirm("Advertencia: El usuario no ha completado las 3 fases. ¿Forzar cambio a ACTIVO?")) return;
    }

    if(p.status === 'activo') {
        p.status = 'inactivo';
        p.fechaInactivo = new Date().toISOString().split('T')[0]; 
    } else {
        p.status = 'activo';
        p.fechaInactivo = ""; 
        if(!p.fechaIngreso) p.fechaIngreso = new Date().toISOString().split('T')[0];
    }
    
    await actualizarPatrulleroEnNubeSoloDato(p.documento, p);
    renderizarLista();
}

async function nuevoPatrullero() {
    let docTemp = "TEMP-" + new Date().getTime();
    let nuevoP = { 
        nombre: "NUEVO REGISTRO", documento: docTemp, rh: "O+", foto: "", firma: "",
        status: "aspirante", fase1_docs: { hojaVida: null, certEstudio: null, certBachiller: null },
        graduado: false, fechaIngreso: "", carnetAprobado: false
    };
    personal.push(nuevoP);
    await db.collection("patrulleros").doc(docTemp).set(nuevoP);
    renderizarLista();
    verDetalle(personal.length - 1);
}

// ================= SISTEMA DE FASES =================
function toggleFase(idFase) {
    const element = document.getElementById(idFase + '-content');
    element.style.display = element.style.display === "block" ? "none" : "block";
}

function subirArchivoFase(input, tipoDoc) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            personal[indexActual].fase1_docs[tipoDoc] = e.target.result;
            await actualizarPatrulleroEnNubeSoloDato(personal[indexActual].documento, personal[indexActual]);
            actualizarUIFases();
            alert("Archivo subido correctamente.");
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function eliminarArchivoFase(tipoDoc) {
    if(confirm("¿Quieres borrar este documento?")) {
        personal[indexActual].fase1_docs[tipoDoc] = null;
        await actualizarPatrulleroEnNubeSoloDato(personal[indexActual].documento, personal[indexActual]);
        let inputFile = document.getElementById('input-' + tipoDoc); 
        if(inputFile) inputFile.value = ""; 
        actualizarUIFases();
        alert("Documento eliminado. Ya puedes cargar el correcto.");
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

async function marcarGraduado() {
    const p = personal[indexActual];
    if(!p.fase1_docs.hojaVida || !p.fase1_docs.certEstudio || !p.fase1_docs.certBachiller) {
        if(!confirm("Alerta: Faltan documentos. ¿Desea forzar la graduación?")) return;
    }
    p.graduado = true;
    await actualizarPatrulleroEnNubeSoloDato(p.documento, p);
    actualizarUIFases();
    alert("Usuario marcado como Graduado (@). Fase 2 completada.");
}

async function guardarFechaIngreso(fecha) {
    personal[indexActual].fechaIngreso = fecha;
    await actualizarPatrulleroEnNubeSoloDato(personal[indexActual].documento, personal[indexActual]);
}

function actualizarUIFases() {
    const p = personal[indexActual];
    const docs = ['hojaVida', 'certEstudio', 'certBachiller'];
    docs.forEach(doc => {
        const span = document.getElementById(`estado-${doc}`);
        const btnD = document.getElementById(`btn-descarga-${doc}`);
        if(p.fase1_docs && p.fase1_docs[doc]) {
            span.innerText = "✓ Archivo Cargado"; span.style.color = "#2ecc71";
            btnD.style.display = "inline-block";
        } else {
            span.innerText = "✗ Pendiente"; span.style.color = "#e74c3c";
            btnD.style.display = "none";
        }
    });

    if(p.graduado) {
        document.getElementById('msg-fase2-user').innerText = "✅ ¡Felicidades, te has graduado exitosamente!";
        document.getElementById('msg-fase2-user').style.color = "#2ecc71";
        document.getElementById('btn-marcar-graduado').innerText = "Ya está Graduado";
        document.getElementById('btn-marcar-graduado').style.background = "#555";
    } else {
        document.getElementById('msg-fase2-user').innerText = "⏳ Aún no estás graduado. Espera la validación.";
        document.getElementById('msg-fase2-user').style.color = "#aaa";
        document.getElementById('btn-marcar-graduado').innerText = "Marcar como GRADUADO (@)";
        document.getElementById('btn-marcar-graduado').style.background = "var(--gold)";
    }

    document.getElementById('admin-fecha-ingreso').value = p.fechaIngreso || "";
    const panelCarnet = document.getElementById('panel-edicion-carnet');
    if(p.graduado) {
        panelCarnet.classList.remove('seccion-bloqueada');
        document.getElementById('fase3-content').innerHTML = '<p style="color:#2ecc71;">✅ Fase 3 desbloqueada.</p>';
    } else {
        panelCarnet.classList.add('seccion-bloqueada');
        document.getElementById('fase3-content').innerHTML = '<p style="color:#e74c3c;">⏳ Debes completar la graduación.</p>';
    }

    document.getElementById('check-consentimiento').checked = p.carnetAprobado;
    validarConsentimiento(); 
}

// ================= GESTIÓN DEL CARNÉ =================
function validarConsentimiento() {
    if (usuarioActual.rol === 'admin') {
        const check = document.getElementById('check-consentimiento');
        if(check) check.parentElement.parentElement.style.display = 'none';
    }

    const isChecked = document.getElementById('check-consentimiento').checked;
    const btnGuardar = document.getElementById('btn-guardar-carnet');
    const btnDescargar = document.getElementById('btn-descargar-pdf');
    const isAdmin = document.body.classList.contains('admin-view');

    if(isChecked || isAdmin) {
        btnGuardar.style.opacity = "1"; btnGuardar.style.pointerEvents = "auto";
    } else {
        btnGuardar.style.opacity = "0.5"; btnGuardar.style.pointerEvents = "none";
    }

    if(personal[indexActual].carnetAprobado) {
        btnGuardar.innerText = "ACTUALIZAR DATOS DEL CARNÉ";
        btnDescargar.style.display = "block";
    } else {
        btnGuardar.innerText = "GUARDAR DATOS DEL CARNÉ";
        btnDescargar.style.display = "none";
    }
}

async function guardarCarnetAutorizado() {
    personal[indexActual].carnetAprobado = true;
    await actualizarPatrulleroEnNubeSoloDato(personal[indexActual].documento, personal[indexActual]);
    alert("Carné generado y guardado exitosamente en el sistema.");
    validarConsentimiento();
}

function verDetalle(index) {
    indexActual = index;
    const p = personal[index];
    
    if(!p.fase1_docs) p.fase1_docs = { hojaVida: null, certEstudio: null, certBachiller: null };
    if(p.graduado === undefined) p.graduado = false;
    if(p.carnetAprobado === undefined) p.carnetAprobado = (p.status === 'activo');

    document.getElementById('edit-name').value = p.nombre;
    document.getElementById('edit-doc-num').value = p.documento;
    document.getElementById('edit-rh').value = p.rh || "O+";
    
    document.getElementById('preview-photo').src = p.foto || "https://via.placeholder.com/150";
    document.getElementById('preview-signature').src = p.firma || "";

    aplicarConfigGlobal(); 
    updateLivePreview();
    actualizarUIFases();

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

    generarQR(doc);
}

function cargarImagen(input, tipo) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            if(tipo === 'foto') {
                document.getElementById('preview-photo').src = e.target.result;
                personal[indexActual].foto = e.target.result;
            } else if(tipo === 'firma') {
                document.getElementById('preview-signature').src = e.target.result;
                personal[indexActual].firma = e.target.result;
            }
            await actualizarPatrulleroEnNubeSoloDato(personal[indexActual].documento, personal[indexActual]);
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function quitarImagen(tipo) {
    if(confirm(`¿Seguro que deseas eliminar la firma?`)) {
        if(tipo === 'firma') {
            document.getElementById('preview-signature').src = "";
            personal[indexActual].firma = "";
            document.getElementById('input-firma').value = "";
        }
        await actualizarPatrulleroEnNubeSoloDato(personal[indexActual].documento, personal[indexActual]);
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

// ================= UTILIDADES Y CONFIG GLOBAL =================
async function guardarConfigGlobal() {
    const nuevoNom = document.getElementById('global-pres-nombre').value;
    const nuevoCC = document.getElementById('global-pres-cc').value;
    const nuevoTel = document.getElementById('global-pres-tel').value;

    if(nuevoNom && nuevoCC && nuevoTel) {
        configGlobal = { nombre: nuevoNom, cc: nuevoCC, tel: nuevoTel };
        await db.collection("configuracion").doc("global").set(configGlobal);
        aplicarConfigGlobal();
        alert("Configuración de autoridad actualizada correctamente en la nube.");
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

function logout() { location.reload(); }

async function eliminarPatrullero() { 
    if(confirm("¿Estás seguro de eliminar permanentemente este registro?")) { 
        let docAEliminar = personal[indexActual].documento;
        await db.collection("patrulleros").doc(docAEliminar).delete();
        personal.splice(indexActual, 1); 
        showDashboard(); 
    }
}

// ================= FIREBASE SINCRONIZACIÓN MANUAL E INTERNA =================
async function actualizarPatrulleroEnNubeSoloDato(docId, datos) {
    try {
        await db.collection("patrulleros").doc(docId).set(datos);
    } catch(e) {
        console.error("Error silencioso Firebase:", e);
    }
}

function actualizarPatrulleroEnNube() {
    if (indexActual === null || !personal[indexActual]) {
        alert("Primero selecciona un patrullero.");
        return;
    }
    const p = personal[indexActual];
    
    db.collection("patrulleros").doc(p.documento).set(p)
    .then(() => {
        alert("¡Datos sincronizados exitosamente con la nube de Firebase!");
        generarQR(p.documento);
    })
    .catch((error) => {
        console.error("Error al sincronizar:", error);
        alert("Error al conectar con Firebase. Revisa las reglas.");
    });
}

// ================= SISTEMA DE CÓDIGO QR Y VISOR PÚBLICO =================
function generarQR(documento) {
    const qrImg = document.getElementById('qr-code-img');
    if(!qrImg) return;

    if(!documento || documento === "000.000") {
        qrImg.style.display = "none";
        return;
    }

    const baseUrl = window.location.href.split('?')[0];
    const publicUrl = `${baseUrl}?view=${documento}`;
    
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}`;
    qrImg.onload = () => { qrImg.style.display = "block"; };
}

window.addEventListener('DOMContentLoaded', (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    const documentoEscaneado = urlParams.get('view');

    if (documentoEscaneado) {
        mostrarVisorPublico(documentoEscaneado);
        aplicarSeguridadVisor();
    } else {
        cargarDatosNube();
    }
});

async function mostrarVisorPublico(docBuscado) {
    document.body.innerHTML = "<h2 style='color:white; text-align:center; margin-top:50px;'>Verificando en la Nube...</h2>"; 
    document.body.style.display = "flex";
    document.body.style.flexDirection = "column";
    document.body.style.alignItems = "center";
    document.body.style.justifyContent = "center";
    document.body.style.background = "#0f0f0f";
    document.body.style.color = "white";
    document.body.style.padding = "20px";
    document.body.style.fontFamily = "'Segoe UI', sans-serif";

    try {
        const docRef = await db.collection("patrulleros").doc(docBuscado).get();
        let htmlRespuesta = "";

        if (!docRef.exists) {
            htmlRespuesta = `
                <div style="background: #c0392b; padding: 25px; border-radius: 10px; text-align: center; max-width: 400px; border: 2px solid #ff4757;">
                    <h2 style="color: white; margin:0 0 15px 0;">⚠️ ALERTA DE SEGURIDAD</h2>
                    <p style="font-size: 16px;">Este patrullero <b>NO EXISTE</b> en la base de datos oficial.</p>
                </div>
            `;
        } else {
            let p = docRef.data();
            if (p.status === "inactivo" || p.status === "aspirante") {
                htmlRespuesta = `
                    <div style="background: #e74c3c; padding: 20px; border-radius: 10px; text-align: center; max-width: 400px; margin-bottom: 25px; box-shadow: 0 0 15px rgba(231, 76, 60, 0.4);">
                        <h2 style="color: white; margin:0 0 10px 0;">🛑 ESTADO: INACTIVO</h2>
                        <p style="font-size: 16px;">El patrullero <b>${p.nombre}</b> se encuentra inactivo.</p>
                        <p style="font-size: 14px; font-weight: bold; color: #ffcccc;">Su carné es INVÁLIDO en este momento.</p>
                    </div>
                    ${generarCarnetSeguroHTML(p)}
                `;
            } else if (p.status === "activo") {
                let tiempo = calcularTiempoActivo(p.fechaIngreso, p.fechaInactivo, p.status);
                htmlRespuesta = `
                    <div style="background: #27ae60; padding: 20px; border-radius: 10px; text-align: center; max-width: 400px; margin-bottom: 25px; box-shadow: 0 0 15px rgba(39, 174, 96, 0.4);">
                        <h2 style="color: white; margin:0 0 10px 0;">✅ ESTADO: ACTIVO</h2>
                        <p style="font-size: 16px;">El patrullero <b>${p.nombre}</b> está debidamente autorizado.</p>
                        <p style="font-size: 15px; font-weight: bold; color: #d1ffd6;">${tiempo}</p>
                    </div>
                    ${generarCarnetSeguroHTML(p)}
                `;
            }
        }
        document.body.innerHTML = htmlRespuesta;
    } catch (e) {
        document.body.innerHTML = "<div style='color:red;'>Error al conectar con la base de datos central.</div>";
    }
}

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
    <p style="color:#777; font-size:12px; margin-top: 20px; text-align:center;">🔒 Documento oficial. Prohibida su copia o descarga.</p>
    `;
}

function aplicarSeguridadVisor() {
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'u' || e.key === 'i')) {
            e.preventDefault();
            alert("Acción de seguridad bloqueada.");
        }
    });
    document.addEventListener('dragstart', event => event.preventDefault());
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
}