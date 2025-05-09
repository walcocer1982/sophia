export interface DniRequest {
    numero: string;
}

export interface DniResponse {
    success: boolean;
    data?: {
        dni: string;
        nombres: string;
        apellidos: string;
        fechaNacimiento: string;
        sexo: string;
    };
    error?: string;
}