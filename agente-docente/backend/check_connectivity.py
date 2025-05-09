import socket
import sys
import os
import requests
import time

def check_port_open(host, port):
    """
    Verifica si un puerto está abierto en un host.
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    result = sock.connect_ex((host, port))
    sock.close()
    return result == 0

def check_backend_running():
    """
    Verifica si el backend está en ejecución.
    """
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

def check_connectivity():
    """
    Verifica la conectividad entre el frontend y el backend.
    """
    print("Verificando conectividad del backend...")
    
    # Verificar si el puerto 8000 está abierto
    if not check_port_open("localhost", 8000):
        print("ERROR: El puerto 8000 no está abierto. El backend no está en ejecución.")
        print("Solución: Ejecuta el backend con 'python main.py'")
        return False
    
    # Verificar si el backend responde
    if not check_backend_running():
        print("ERROR: El backend está en ejecución pero no responde correctamente.")
        print("Solución: Verifica los logs del backend para identificar errores.")
        return False
    
    print("✅ El backend está en ejecución y responde correctamente.")
    
    # Verificar CORS
    try:
        headers = {
            "Origin": "http://localhost:3000"
        }
        response = requests.options("http://localhost:8000/api/pdf/upload", headers=headers, timeout=5)
        if "Access-Control-Allow-Origin" in response.headers:
            print("✅ CORS está configurado correctamente.")
        else:
            print("ADVERTENCIA: CORS podría no estar configurado correctamente.")
            print("Solución: Verifica la configuración CORS en main.py")
    except requests.exceptions.RequestException:
        print("ADVERTENCIA: No se pudo verificar la configuración CORS.")
    
    return True

if __name__ == "__main__":
    print("Herramienta de diagnóstico de conectividad")
    print("=========================================")
    
    if check_connectivity():
        print("\nDiagnóstico completado: Todo parece estar funcionando correctamente.")
        sys.exit(0)
    else:
        print("\nDiagnóstico completado: Se encontraron problemas de conectividad.")
        sys.exit(1) 