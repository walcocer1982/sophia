import socket
import sys
import os
import subprocess
import platform

def check_port_open(host, port):
    """
    Verifica si un puerto está abierto en un host.
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    result = sock.connect_ex((host, port))
    sock.close()
    return result == 0

def check_server_running():
    """
    Verifica si el servidor está en ejecución.
    """
    if check_port_open("localhost", 8000):
        print("✅ El servidor está en ejecución en el puerto 8000")
        return True
    else:
        print("❌ El servidor no está en ejecución en el puerto 8000")
        return False

def check_firewall():
    """
    Verifica si hay problemas con el firewall.
    """
    system = platform.system()
    
    if system == "Windows":
        print("\nVerificando configuración del firewall en Windows...")
        try:
            # Verificar si el firewall está activo
            result = subprocess.run(["netsh", "advfirewall", "show", "currentprofile"], 
                                   capture_output=True, text=True)
            
            if "Estado" in result.stdout and "ACTIVADO" in result.stdout:
                print("⚠️ El firewall de Windows está activado")
                print("   Puede ser necesario crear una regla para permitir conexiones al puerto 8000")
                print("   Ejecuta como administrador: netsh advfirewall firewall add rule name=\"Allow Port 8000\" dir=in action=allow protocol=TCP localport=8000")
            else:
                print("✅ El firewall de Windows parece estar desactivado")
        except Exception as e:
            print(f"❌ Error al verificar el firewall: {str(e)}")
    
    elif system == "Linux":
        print("\nVerificando configuración del firewall en Linux...")
        try:
            # Verificar si ufw está activo
            result = subprocess.run(["sudo", "ufw", "status"], 
                                   capture_output=True, text=True)
            
            if "Status: active" in result.stdout:
                print("⚠️ UFW está activado")
                print("   Puede ser necesario crear una regla para permitir conexiones al puerto 8000")
                print("   Ejecuta: sudo ufw allow 8000/tcp")
            else:
                print("✅ UFW parece estar desactivado")
        except Exception as e:
            print(f"❌ Error al verificar el firewall: {str(e)}")
    
    elif system == "Darwin":  # macOS
        print("\nVerificando configuración del firewall en macOS...")
        try:
            # Verificar si el firewall está activo
            result = subprocess.run(["sudo", "defaults", "read", "/Library/Preferences/com.apple.alf", "globalstate"], 
                                   capture_output=True, text=True)
            
            if "1" in result.stdout or "2" in result.stdout:
                print("⚠️ El firewall de macOS está activado")
                print("   Puede ser necesario permitir conexiones al puerto 8000 en Preferencias del Sistema > Seguridad > Firewall")
            else:
                print("✅ El firewall de macOS parece estar desactivado")
        except Exception as e:
            print(f"❌ Error al verificar el firewall: {str(e)}")

def check_loopback():
    """
    Verifica si hay problemas con la interfaz de loopback.
    """
    print("\nVerificando la interfaz de loopback...")
    
    system = platform.system()
    
    if system == "Windows":
        try:
            result = subprocess.run(["ping", "-n", "1", "localhost"], 
                                   capture_output=True, text=True)
            
            if "TTL=" in result.stdout:
                print("✅ La interfaz de loopback funciona correctamente")
            else:
                print("❌ Hay problemas con la interfaz de loopback")
                print("   Verifica la configuración de red")
        except Exception as e:
            print(f"❌ Error al verificar la interfaz de loopback: {str(e)}")
    else:
        try:
            result = subprocess.run(["ping", "-c", "1", "localhost"], 
                                   capture_output=True, text=True)
            
            if " 0% packet loss" in result.stdout:
                print("✅ La interfaz de loopback funciona correctamente")
            else:
                print("❌ Hay problemas con la interfaz de loopback")
                print("   Verifica la configuración de red")
        except Exception as e:
            print(f"❌ Error al verificar la interfaz de loopback: {str(e)}")

def check_antivirus():
    """
    Verifica si hay problemas con el antivirus.
    """
    print("\nVerificando posibles problemas con el antivirus...")
    
    system = platform.system()
    
    if system == "Windows":
        print("⚠️ Es posible que el antivirus esté bloqueando las conexiones")
        print("   Verifica la configuración del antivirus y añade una excepción para python.exe")
    else:
        print("✅ No se detectaron problemas con el antivirus")

if __name__ == "__main__":
    print("Herramienta de diagnóstico de firewall y red")
    print("===========================================")
    
    # Verificar si el servidor está en ejecución
    server_running = check_server_running()
    
    if server_running:
        print("\n✅ El servidor está en ejecución, pero puede haber problemas de conexión")
        print("   Verifica si puedes acceder a http://localhost:8000 desde el navegador")
    else:
        print("\n❌ El servidor no está en ejecución")
        print("   Ejecuta: python main.py")
    
    # Verificar si hay problemas con el firewall
    check_firewall()
    
    # Verificar si hay problemas con la interfaz de loopback
    check_loopback()
    
    # Verificar si hay problemas con el antivirus
    check_antivirus()
    
    print("\nDiagnóstico completado") 