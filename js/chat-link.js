(function () {
  'use strict';

  if (document.querySelector('[data-chat-link]')) return;

  var link = document.createElement('a');
  link.className = 'chat-link';
  link.dataset.chatLink = 'sms';
  link.href = 'sms:+15155120266?body=' + encodeURIComponent('Hi! I’m planning an event and would love a coffee cart quote.');
  link.setAttribute('aria-label', 'Chat with us by text message');
  link.innerHTML = '<span class="chat-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.1 8.1 0 0 1-8.5 7.5 9.6 9.6 0 0 1-4.1-.9L3 20l1.8-4.7A7.5 7.5 0 0 1 4 11.5 8.1 8.1 0 0 1 12.5 4 8.1 8.1 0 0 1 21 11.5Z"></path></svg></span><span class="chat-link__copy"><span>Chat with us</span><small>Questions about your event? Text us.</small></span>';
  document.body.appendChild(link);
}());
