/* ===== FORM.JS =====
 * Quote form validation and FormSubmit.co submission
 * Sends emails to contact.thegardenco@gmail.com
 */

function initForm() {
  var form = document.getElementById('quoteForm');
  var successEl = document.getElementById('quoteSuccess');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    // Clear previous errors
    form.querySelectorAll('.form-group--error').forEach(function(g) {
      g.classList.remove('form-group--error');
    });

    // Validate
    var isValid = true;
    var required = form.querySelectorAll('[required]');
    required.forEach(function(input) {
      if (!input.value.trim()) {
        input.closest('.form-group').classList.add('form-group--error');
        isValid = false;
      }
    });

    // Email format
    var emailInput = form.querySelector('#email');
    if (emailInput.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
      emailInput.closest('.form-group').classList.add('form-group--error');
      isValid = false;
    }

    if (!isValid) {
      var firstError = form.querySelector('.form-group--error');
      if (firstError) {
        gsap.fromTo(firstError, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
        var focusEl = firstError.querySelector('input, select, textarea');
        if (focusEl) focusEl.focus();
      }
      return;
    }

    // Show loading
    var submitBtn = form.querySelector('.quote-form__submit');
    submitBtn.classList.add('btn--loading');
    submitBtn.disabled = true;

    // Submit to FormSubmit.co
    var formData = new FormData(form);

    fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    })
    .then(function(response) {
      if (response.ok) {
        // Animate form out
        gsap.to(form, {
          opacity: 0,
          y: -20,
          duration: 0.5,
          ease: 'power2.in',
          onComplete: function() {
            form.style.display = 'none';
            successEl.classList.add('active');
            gsap.from(successEl, {
              opacity: 0,
              y: 20,
              duration: 0.6,
              ease: 'power3.out'
            });
          }
        });
      } else {
        throw new Error('Form submission failed');
      }
    })
    .catch(function(error) {
      submitBtn.classList.remove('btn--loading');
      submitBtn.disabled = false;
      var errorMsg = document.createElement('p');
      errorMsg.textContent = 'Something went wrong. Please try again or email us at contact.thegardenco@gmail.com';
      errorMsg.style.cssText = 'color: var(--color-error); font-size: var(--font-small); margin-top: 0.75rem;';
      submitBtn.parentNode.insertBefore(errorMsg, submitBtn.nextSibling);
      gsap.from(errorMsg, { opacity: 0, y: 10, duration: 0.4 });
      setTimeout(function() { errorMsg.remove(); }, 5000);
    });
  });
}

// ===== TESTIMONIAL CAROUSEL =====
function initTestimonials() {
  var testimonials = document.querySelectorAll('.testimonial');
  var dots = document.querySelectorAll('.testimonial__dot');
  if (!testimonials.length) return;

  var current = 0;
  var interval;

  function showTestimonial(index) {
    var outgoing = testimonials[current];
    var incoming = testimonials[index];

    if (current === index) return;

    gsap.to(outgoing, {
      opacity: 0,
      y: -15,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: function() {
        outgoing.classList.remove('active');
        incoming.classList.add('active');
        gsap.fromTo(incoming,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
        );
      }
    });

    dots[current].classList.remove('active');
    dots[index].classList.add('active');
    current = index;
  }

  dots.forEach(function(dot, i) {
    dot.addEventListener('click', function() {
      showTestimonial(i);
      resetInterval();
    });
  });

  function resetInterval() {
    clearInterval(interval);
    interval = setInterval(function() {
      showTestimonial((current + 1) % testimonials.length);
    }, 6000);
  }

  resetInterval();
}
