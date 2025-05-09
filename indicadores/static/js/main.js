document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('upload-form').addEventListener('submit', function(event) {
        event.preventDefault();

        var formData = new FormData();
        var fileInput = document.getElementById('file-input');
        if (fileInput.files.length === 0) {
            document.getElementById('message').innerHTML = '<div class="alert alert-danger">Por favor, selecciona un archivo</div>';
            return;
        }
        formData.append('file', fileInput.files[0]);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                document.getElementById('resultados').innerHTML = data.html;
                addNpsClickHandlers(data.comments);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error: ' + error.message);
        });
    });

    function addNpsClickHandlers(comments) {
        document.querySelectorAll('.nps-value').forEach(function(element) {
            element.addEventListener('click', function() {
                var instructor = element.dataset.instructor;
                var curso = element.dataset.curso;
                var commentData = comments[instructor][curso];
                var modalBody = document.getElementById('modal-body');
                modalBody.innerHTML = `
                    <h5>Promotores</h5>
                    <p>${commentData.promotores.join('<br>')}</p>
                    <h5>Neutros</h5>
                    <p>${commentData.neutros.join('<br>')}</p>
                    <h5>Detractores</h5>
                    <p>${commentData.detractores.join('<br>')}</p>
                `;
                $('#commentsModal').modal('show');
            });
        });
    }
});
