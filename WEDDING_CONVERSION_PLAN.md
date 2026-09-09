# Wedding landing page conversion plan

## Implemented

- Replace the large IMG_0014 celebration photo with the existing wedding service photo. Frame it at up to 400 × 500 CSS pixels on desktop and scale for smaller screens; never stretch it to the height of the text column.
- Keep the wedding hero and three existing wedding films (service, garden cocktail hour, reception). Remove the generic espresso clip and gallery photos with no clear wedding context.
- Make films visitor-controlled, pause other films when one plays, and pause playback when the film leaves view or the tab is hidden. Keep lazy loading and native controls.
- Use “Check your wedding date” for the primary CTA and clearly explain that availability and pricing are followed up by email. This is an inquiry, not instant availability or a reservation.
- Use navigation to the wedding sections. Preserve other services and the wider gallery in the footer.
- Replace repeated benefit cards with a compact PEOPLE press mention accurately identifying its birthday-event context. Do not imply wedding coverage or endorsement.
- Reduce excess spacing and the mobile inquiry introduction. Keep phone and venue optional and the unconfirmed-date option.
- Preserve consent-aware Lead tracking and campaign attribution; add a wedding film play event without personal data.

## Verification

- Check layouts at 390, 768 and 1440 pixels, image loading, no horizontal overflow, anchor positions and sticky CTA hiding at the form.
- Exercise the date-unconfirmed option and successful submission with intercepted requests so QA sends no real inquiry.
- Check that only one wedding film plays at a time and none starts automatically.
- Validate HTML, run existing form/consent/SEO tests, inspect Lighthouse and audit the deployed pages.

## Evaluate after the ads launch

Use the wedding URL with campaign and creative UTMs. Evaluate qualified wedding inquiries and resulting bookings, alongside form starts and accepted submissions. Treat design changes as hypotheses, not a promise of higher conversion. Once there is enough traffic, test one major variable at a time, such as the primary headline or video versus still hero, while keeping the offer and campaign comparable.

Optional later improvements require real business information: verified wedding reviews, approved starting prices, or documented venue/event case studies. Do not invent these.
