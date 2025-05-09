

document.getElementById('fetchDniButton').addEventListener('click', async () => {
  const dniNumber = document.getElementById('dniInput').value;
  try {
    const response = await fetch(`http://localhost:3000/api/dni/${dniNumber}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    renderDniInfo(data);
  } catch (error) {
    console.error('Error fetching DNI data:', error);
    document.getElementById('dniInfo').innerText = 'Error fetching DNI data';
  }
});

function renderDniInfo(data) {
  const dniInfoElement = document.getElementById('dniInfo');
  dniInfoElement.innerHTML = `
    <p><strong>Nombre:</strong> ${data.nombres}</p>
    <p><strong>Apellido:</strong> ${data.apellidoPaterno}</p>
    <p><strong>DNI:</strong> ${data.numeroDocumento}</p>
     <p><strong>Dígito Verificador:</strong> ${data.digitoVerificador}</p>
  `;
}