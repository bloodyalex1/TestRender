// 1. FUNDAMENTAL: Definir el contenedor principal al principio
const mainContainer = document.getElementById("main-content");
let uploadedFiles = [];

// 2. Función de navegación
function navigateTo(templateId) {
    const template = document.getElementById(templateId);
    
    // Validamos que el template exista para que no de error
    if (!template) return;

    const content = template.content.cloneNode(true);
    mainContainer.innerHTML = "";
    mainContainer.appendChild(content);

    if (templateId === "temp-form") {
        document.getElementById("link-solicitudes").addEventListener("click", (e) => {
            e.preventDefault();
            navigateTo("temp-list");
        });

        setupDragAndDrop();
        setupDynamicForm(); 
    } else if (templateId === "temp-list") {
        // No olvide el evento para volver al form desde la lista
        document.getElementById("btn-volver-form").addEventListener("click", () => {
            navigateTo("temp-form");
        });
    }
}

// 3. LAS FUNCIONES DE APOYO (DynamicForm, DragAndDrop, etc.)
function setupDynamicForm() {
    const mainSelect = document.getElementById("main-reason");
    const container = document.getElementById("dynamic-select-container");

    const options = {
        excusas: ["Médica", "Laboral", "Calamidad Doméstica", "Otro"],
        certificados: ["Certificado de Estudios", "Certificado de Notas", "Certificado de Asistencia"]
    };

    if (mainSelect) {
        mainSelect.addEventListener("change", (e) => {
            const val = e.target.value;
            container.innerHTML = ""; 

            if (options[val]) {
                const label = document.createElement("label");
                label.className = "text-white-50 small mb-2 d-block"; // d-block para que baje
                label.innerText = `Seleccione tipo de ${val}:`;

                const select = document.createElement("select");
                select.className = "form-select custom-input mb-3";
                
                options[val].forEach(opt => {
                    const o = document.createElement("option");
                    o.value = opt.toLowerCase().replace(/\s/g, "-");
                    o.innerText = opt;
                    select.appendChild(o);
                });

                container.appendChild(label);
                container.appendChild(select);
            }
        });
    }
}

function setupDragAndDrop() {
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    const fileListContainer = document.getElementById("file-list");
    
    if (!dropZone) return;

    uploadedFiles = []; 

    dropZone.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (e) => {
        addFiles(e.target.files);
    });

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("border-primary");
    });

    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("border-primary"));

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("border-primary");
        addFiles(e.dataTransfer.files);
    });

    function addFiles(newFiles) {
        for (let file of newFiles) {
            if (!uploadedFiles.some(f => f.name === file.name)) {
                uploadedFiles.push(file);
                renderFileList();
            }
        }
    }

    function renderFileList() {
        fileListContainer.innerHTML = "";
        uploadedFiles.forEach((file, index) => {
            const badge = document.createElement("div");
            badge.className = "badge bg-dark border border-secondary p-2 d-flex align-items-center gap-2";
            badge.style.borderRadius = "8px";
            badge.innerHTML = `
                <span class="small text-truncate" style="max-width: 150px;">${file.name}</span>
                <i class="bi bi-x-circle-fill text-danger cursor-pointer" onclick="removeFile(${index})"></i>
            `;
            fileListContainer.appendChild(badge);
        });
    }

    window.removeFile = (index) => {
        uploadedFiles.splice(index, 1);
        renderFileList();
    };
}

// 4. CARGA INICIAL: Si no pone esto, el navegador no sabe por dónde empezar
window.onload = () => navigateTo("temp-form");