/* ===== FORM.JS =====
 * Quote form validation and FormSubmit.co submission
 * Sends emails to contact.thegardenco@gmail.com
 */

function initForm() {
  var form = document.getElementById('quoteForm');
  var successEl = document.getElementById('quoteSuccess');

  document.querySelectorAll('.booking-link').forEach(function(link) {
    link.addEventListener('click', function() {
      if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', 'BookingLinkClick', {
          content_name: 'Coffee Cart Event Consultation',
          page_path: window.location.pathname
        });
      }
    });
  });

  if (!form) return;
  var dateUnknown = form.querySelector('[data-date-unconfirmed]');
  var eventDate = form.querySelector('#event-date');
  if (eventDate) {
    var today = new Date();
    var localToday = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
    eventDate.min = localToday.toISOString().slice(0, 10);
  }
  if (dateUnknown && eventDate) {
    function syncDateRequirement() {
      eventDate.disabled = dateUnknown.checked;
      eventDate.required = !dateUnknown.checked;
    }
    dateUnknown.addEventListener('change', syncDateRequirement);
    syncDateRequirement();
  }
  var formStarted = false;
  form.addEventListener('input', function() {
    if (formStarted) return;
    formStarted = true;
    if (typeof window.gardenTrack === 'function') window.gardenTrack('FormStart');
  });

  // Preserve ad and search attribution in every quote email without exposing
  // tracking details in the visible form.
  var searchParams = new URLSearchParams(window.location.search);
  var attributionFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  attributionFields.forEach(function(fieldName) {
    var value = searchParams.get(fieldName);
    if (!value) return;
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = fieldName;
    input.value = value.slice(0, 180);
    form.appendChild(input);
  });

  var pageInput = document.createElement('input');
  pageInput.type = 'hidden';
  pageInput.name = 'landing-page';
  pageInput.value = window.location.origin + window.location.pathname;
  form.appendChild(pageInput);

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (form.dataset.submitting === 'true') return;

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
      if (typeof window.gardenTrack === 'function') {
        window.gardenTrack('FormValidationError', { error_count: form.querySelectorAll('.form-group--error').length });
      }
      var firstError = form.querySelector('.form-group--error');
      if (firstError) {
        var focusEl = firstError.querySelector('input, select, textarea');
        if (focusEl) focusEl.focus();
      }
      return;
    }

    // Show loading
    var submitBtn = form.querySelector('.quote-form__submit');
    submitBtn.classList.add('btn--loading');
    submitBtn.disabled = true;
    form.dataset.submitting = 'true';
    if (typeof window.gardenTrack === 'function') window.gardenTrack('FormSubmitAttempt');

    // Submit to FormSubmit.co
    var formData = new FormData(form);

    var submitUrl = form.action.replace('https://formsubmit.co/', 'https://formsubmit.co/ajax/');
    fetch(submitUrl, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    })
    .then(function(response) {
      if (!response.ok) throw new Error('Form submission failed');
      return response.json();
    })
    .then(function(result) {
      if (result.success === true || result.success === 'true') {
        if (typeof window.gardenTrack === 'function') window.gardenTrack('FormSuccess');
        // Count accepted inquiries, not button clicks or calendar views.
        if (typeof window.fbq === 'function' && window.gardenAdvertisingAllowed && window.gardenAdvertisingAllowed()) {
          var eventId = 'garden_lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
          var eventTypeInput = form.querySelector('#event-type');
          var eventType = eventTypeInput ? eventTypeInput.value : 'other';
          window.fbq('track', 'Lead', {
            content_name: 'Event Quote Request',
            content_category: eventType
          }, {
            eventID: eventId
          });

          // Send the same event ID server-side so Meta can deduplicate it.
          fetch('/.netlify/functions/meta-lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
            body: JSON.stringify({
              eventId: eventId,
              advertisingConsent: true,
              eventSourceUrl: window.location.origin + window.location.pathname,
              eventType: eventType,
              email: form.querySelector('#email').value,
              phone: form.querySelector('#phone') ? form.querySelector('#phone').value : '',
              fbp: getCookieValue('_fbp'),
              fbc: getCookieValue('_fbc')
            })
          }).catch(function() {
            // Tracking must never block a successful quote request.
          });
        }

        // The booking step appears immediately, without an animated layout shift.
        form.style.display = 'none';
        successEl.classList.add('active');
        mountBookingScheduler(successEl);
        successEl.setAttribute('tabindex', '-1');
        successEl.focus({ preventScroll: true });
        successEl.scrollIntoView({ behavior: 'instant', block: 'start' });
      } else {
        throw new Error('Form submission failed');
      }
    })
    .catch(function(error) {
      submitBtn.classList.remove('btn--loading');
      submitBtn.disabled = false;
      delete form.dataset.submitting;
      if (typeof window.gardenTrack === 'function') window.gardenTrack('FormSubmitError');
      var errorMsg = document.createElement('p');
      errorMsg.textContent = 'Something went wrong. Please try again or email us at contact.thegardenco@gmail.com';
      errorMsg.style.cssText = 'color: var(--color-error); font-size: var(--font-small); margin-top: 0.75rem;';
      submitBtn.parentNode.insertBefore(errorMsg, submitBtn.nextSibling);
      errorMsg.setAttribute('role', 'alert');
      setTimeout(function() { errorMsg.remove(); }, 5000);
    });
  });
}

function mountBookingScheduler(successEl) {
  var container = successEl ? successEl.querySelector('[data-booking-scheduler]') : null;
  if (!container || container.querySelector('iframe')) return;

  var iframe = document.createElement('iframe');
  iframe.src = container.getAttribute('data-booking-url');
  iframe.title = 'Choose a time for your Garden Coffee consultation';
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('loading', 'eager');
  iframe.addEventListener('load', function() {
    var loadingEl = container.querySelector('.booking-scheduler__loading');
    if (loadingEl) loadingEl.remove();
  });
  container.appendChild(iframe);

  if (typeof window.fbq === 'function') {
    window.fbq('trackCustom', 'BookingCalendarShown', {
      content_name: 'Coffee Cart Event Consultation',
      page_path: window.location.pathname
    });
  }
}

function getCookieValue(name) {
  var prefix = name + '=';
  var cookies = document.cookie ? document.cookie.split(';') : [];
  for (var i = 0; i < cookies.length; i += 1) {
    var cookie = cookies[i].trim();
    if (cookie.indexOf(prefix) === 0) {
      return decodeURIComponent(cookie.slice(prefix.length));
    }
  }
  return '';
}
