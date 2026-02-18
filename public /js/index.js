document.addEventListener("DOMContentLoaded", () => {

    const button = document.getElementById('button');
    const email_user = document.getElementById('user');
    const password_user = document.getElementById('password');
    const registro = document.getElementById('registro');
    const formRegistro = document.getElementById('formRegistro');

    // LOGIN
    if (button) {
        button.addEventListener('click', async (event) => {
            event.preventDefault();

            try {
                const response = await fetch(
                    `http://localhost:5001/registros?correo=${email_user.value}&password=${password_user.value}`
                );

                const data = await response.json();

                if (data.length > 0) {
                    const user = data[0];

                    // Guardar sesión
                    localStorage.setItem('session', 'yes');
                    localStorage.setItem('role', user.role);
                    localStorage.setItem('correo', user.correo);

                    // Redirección
                    window.location.href = "./index.html";

                } else {
                    alert("Usuario o contraseña incorrectos");
                }

            } catch (error) {
                console.error("Error:", error);
                alert("Error al conectar con el servidor");
            }
        });
    }

    // ABRIR MODAL REGISTRO
    if (registro) {
        registro.addEventListener('click', () => {
            const modal = new bootstrap.Modal(
                document.getElementById('modalRegistro')
            );
            modal.show();
        });
    }

    // REGISTRAR USUARIO
    

});
