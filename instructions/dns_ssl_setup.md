# DNS en SSL Setup Instructies voor dekunstvanwerken.nl

Dit document bevat alle stappen die nog uitgevoerd moeten worden om de website
live te zetten met HTTPS.

**Server IP:** `37.97.226.65`  
**IPv6:** `2a01:7c8:fffd:131:5054:ff:fed2:288a`

---

## Status Overzicht

- [ ] Stap 1: DNS configureren bij TransIP
- [ ] Stap 2: Nginx server block aanmaken
- [ ] Stap 3: Certbot installeren
- [ ] Stap 4: SSL certificaat aanvragen
- [ ] Stap 5: Verificatie

---

## Stap 1: DNS Configureren bij TransIP (HANDMATIG)

**Dit moet je zelf doen in het TransIP controlepaneel.**

1. Ga naar https://www.transip.nl/cp/
2. Log in met je account
3. Ga naar **Domeinen** → **dekunstvanwerken.nl** → **DNS**
4. Pas de volgende records aan (of voeg ze toe):

| Type | Naam | Inhoud                                    | TTL |
|------|------|-------------------------------------------|-----|
| A    | @    | 37.97.226.65                              | 300 |
| A    | www  | 37.97.226.65                              | 300 |
| AAAA | @    | 2a01:7c8:fffd:131:5054:ff:fed2:288a       | 300 |
| AAAA | www  | 2a01:7c8:fffd:131:5054:ff:fed2:288a       | 300 |

**Let op:** Verwijder eventuele bestaande A records die naar andere IP's wijzen!

**Wachttijd:** 5-30 minuten voor DNS propagatie.

**Controleer met:**
```bash
host dekunstvanwerken.nl
# Moet tonen: dekunstvanwerken.nl has address 37.97.226.65
```

---

## Stap 2: Nginx Server Block Aanmaken

Voer dit commando uit om het configuratiebestand aan te maken:

```bash
sudo tee /etc/nginx/sites-available/dekunstvanwerken.nl << 'EOF'
# Nginx configuratie voor dekunstvanwerken.nl
server {
    listen 80;
    listen [::]:80;
    
    server_name dekunstvanwerken.nl www.dekunstvanwerken.nl;
    
    root /var/www/dekunstvanwerken.nl;
    index index.html;
    
    access_log /var/log/nginx/dekunstvanwerken.nl.access.log;
    error_log /var/log/nginx/dekunstvanwerken.nl.error.log;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF
```

Activeer de configuratie:

```bash
sudo ln -s /etc/nginx/sites-available/dekunstvanwerken.nl /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Stap 3: Certbot Installeren

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

---

## Stap 4: SSL Certificaat Aanvragen

**BELANGRIJK:** Dit werkt pas als de DNS correct is geconfigureerd!

Controleer eerst of DNS werkt:
```bash
host dekunstvanwerken.nl
# Moet 37.97.226.65 tonen
```

Als DNS correct is, vraag het certificaat aan:
```bash
sudo certbot --nginx -d dekunstvanwerken.nl -d www.dekunstvanwerken.nl
```

Certbot vraagt om:
1. Je e-mailadres (voor verlengingsnotificaties)
2. Akkoord met de voorwaarden
3. Of je HTTP naar HTTPS wilt redirecten (kies JA)

---

## Stap 5: Verificatie

### Test HTTPS
Open in je browser:
- https://dekunstvanwerken.nl
- https://www.dekunstvanwerken.nl

Je zou een groen slotje moeten zien.

### Controleer automatische verlenging
```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## Troubleshooting

### DNS werkt niet na 30 minuten?
- Controleer of je de juiste records hebt ingesteld
- Verwijder oude A records die naar andere IP's wijzen
- Gebruik https://dnschecker.org om propagatie te controleren

### Certbot geeft een fout?
- Controleer of poort 80 open is: `sudo ufw status`
- Controleer of nginx draait: `sudo systemctl status nginx`
- Bekijk de error log: `sudo tail -f /var/log/nginx/dekunstvanwerken.nl.error.log`

### Website toont 403 Forbidden?
- Controleer bestandsrechten: `ls -la /var/www/dekunstvanwerken.nl/`
- Fix met: `sudo chown -R www-data:www-data /var/www/dekunstvanwerken.nl/`

---

## Snelle Samenvatting (Copy-Paste Ready)

Als DNS al werkt, voer deze commando's achter elkaar uit:

```bash
# Stap 2: Nginx config
sudo tee /etc/nginx/sites-available/dekunstvanwerken.nl << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name dekunstvanwerken.nl www.dekunstvanwerken.nl;
    root /var/www/dekunstvanwerken.nl;
    index index.html;
    access_log /var/log/nginx/dekunstvanwerken.nl.access.log;
    error_log /var/log/nginx/dekunstvanwerken.nl.error.log;
    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

# Activeer config
sudo ln -s /etc/nginx/sites-available/dekunstvanwerken.nl /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Stap 3: Installeer certbot
sudo apt update && sudo apt install certbot python3-certbot-nginx -y

# Stap 4: SSL certificaat (interactief)
sudo certbot --nginx -d dekunstvanwerken.nl -d www.dekunstvanwerken.nl
```
