export interface DniFormData {
    numero: string;
}

export interface DniResult {
    estado: string;
    mensaje: string;
    data: {
        dni: string;
        nombres: string;
        apellidos: string;
        fechaNacimiento: string;
        sexo: string;
    };
}