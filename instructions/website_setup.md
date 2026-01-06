# Website Setup Documentation: dekunstvanwerken.nl

This document explains the steps taken to install and design the landing page for dekunstvanwerken.nl. This serves as a guide for future developers or AI assistants.

## Overview
The website `dekunstvanwerken.nl` has been transformed from a basic "Hello World" page to a professional, business-oriented landing page. The design focuses on Arbo-services, whitelabel solutions, and lead generation via a contact form.

## Directory Structure
The files for this website are located at:
- **Root Directory:** `/var/www/dekunstvanwerken.nl/`
- **Main Entry Point:** `/var/www/dekunstvanwerken.nl/index.html` (Full landing page structure)
- **Styling:** `/var/www/dekunstvanwerken.nl/style.css` (Custom CSS with blue-white theme)
- **Legal:** `/var/www/dekunstvanwerken.nl/klachten.html` (Complaints procedure)
- **Upload Directory:** `/var/www/dekunstvanwerken.nl/upload/` (Assets and work materials)

## Implementation Details

### 1. HTML5 Structure (`index.html`)
The page is built using semantic HTML5 and includes the following sections:
- **Navigation:** Links to internal sections.
- **Hero:** Main value proposition.
- **Services:** Detailed overview of Arbo-tasks (Verzuim, RI&E, PAGO, Keuringen, Bedrijfsarts).
- **Werkwijze:** (New) Explanation of the in-house software methodology to prevent vendor lock-in.
- **Whitelabel:** Information about B2B partnerships.
- **Contact Form:** Lead capture for interested parties.
- **Footer:** Copyright and links to legal documents.

### 2. Styling (`style.css`)
- **Theme:** Professional blue and white color scheme.
- **Responsive:** Uses Flexbox and CSS Grid to ensure the site looks good on all devices.
- **Performance:** Pure CSS without external libraries or frameworks for fast loading times.

### 3. Arbo Services
The service descriptions are based on the legal requirements as defined by the Dutch "Arboportaal". It covers the mandatory tasks every employer must organize.

### 4. Complaints Procedure (`klachten.html`)
Fulfills the legal requirement for healthcare/wellbeing providers (Wkkgz) by providing information about the complaints officer via Stichting DOKh.

## Future Considerations
- **Form Handling:** Currently, the contact form uses `action="#"`. A backend script (e.g., PHP or a serverless function) needs to be implemented to actually send the emails.
- **Assets:** Placeholder images or Unsplash links can be replaced with real company photos.
- **SSL:** Ensure HTTPS is enabled via Let's Encrypt for the domain.
