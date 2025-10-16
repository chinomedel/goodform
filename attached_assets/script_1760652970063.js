// Comportamiento para avanzar entre pasos
function nextStep(stepNumber) {
    // Ocultar paso actual
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });

    // Mostrar siguiente paso
    document.getElementById('step' + stepNumber).classList.add('active');

    document.querySelectorAll('.rayita').forEach(step => {
        step.classList.remove('active-rayita');
    });
    document.getElementById('rayita'+stepNumber).classList.add('active-rayita');
    // Actualizar indicadores
    updateIndicators(stepNumber);

    // Ocultar header (logo + rayitas) en el paso 3
    const headerSteps = document.getElementById('header-steps');
    const textoH1PanelIzquierdo = document.getElementById('panel-izquierdo-h1');
    const kastorH2 = document.getElementById('kastor-h2');
    const textoFooter = document.getElementById('texto-footer');
    const check = document.getElementById('check');
    if (headerSteps) {
        if (stepNumber === 3) {
            headerSteps.style.display = 'none';
            textoH1PanelIzquierdo.style.display = 'none';
            kastorH2.style.display = 'block';
            textoFooter.style.display = 'none';
            check.style.display = 'block';
        } else {
            headerSteps.style.display = 'block';
            
        }
    }
}

//Slider javascript
function updateNPSValue() {
    const slider = document.getElementById('npsRange');
    const value = slider.value;
    const min = slider.min;
    const max = slider.max;
    const progress = (value - min) / (max - min) * 100;
    
    // Para navegadores WebKit
    slider.style.setProperty('--progress', progress + '%');
    
    // Tu código existente aquí...
}
// Comportamiento Estrellas pregunta 2
const stars = document.querySelectorAll('.star');
const satisfactionInput = document.getElementById('satisfaction');

stars.forEach(star => {
    star.addEventListener('mouseover', function () {
        const value = this.getAttribute('data-value');
        stars.forEach(s => {
            s.classList.toggle('hovered', s.getAttribute('data-value') <= value);
        });
    });

    star.addEventListener('mouseout', function () {
        stars.forEach(s => s.classList.remove('hovered'));
    });

    star.addEventListener('click', function () {
        const value = this.getAttribute('data-value');
        satisfactionInput.value = value;
        stars.forEach(s => {
            s.classList.toggle('selected', s.getAttribute('data-value') <= value);
        });
    });
});


        function updateIndicators(currentStep) {
            // Actualizar círculos de paso
            for (let i = 1; i <= 3; i++) {
                const indicator = document.getElementById('indicator' + i);
                indicator.classList.remove('active', 'completed');
                const logo = document.getElementById('logo');
                
                if (i < currentStep) {
                    indicator.classList.add('completed');
                    indicator.textContent = '✓';

                } else if (i === currentStep) {
                    indicator.classList.add('active');
                    if (i < 3) indicator.textContent = i;
                } else {
                    indicator.textContent = i;
                }
            }
        }

        function updateCharCount(fieldId, countId) {
            const field = document.getElementById(fieldId);
            const count = document.getElementById(countId);
            count.textContent = field.value.length;
        }

        function submitSurvey() {
            // Aquí puedes agregar la lógica para enviar los datos
            const surveyData = {
                nps: document.querySelector('input[name="recomendacion"]:checked')?.value,
                satisfaction: document.querySelector('input[name="satisfaction"]:checked')?.value,
                useful: document.getElementById('useful').value,
                improve: document.getElementById('improve').value,
                additional: document.getElementById('additional').value
            };

            console.log('Datos de la encuesta:', surveyData);

            // Mostrar página de agradecimiento
            nextStep(3);
        }
        // Capturar envío del formulario
document.getElementById('customForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  // Envía los datos usando la función entregada
  const result = await submitCustomForm(data);

  if (result.success) {
    console.log('Formulario enviado con éxito');
    nextStep(3); // Mostrar pantalla de agradecimiento
  } else {
    console.error('Error al enviar:', result.error);
  }
});
