# Kwara State 2027 Poll: Interview Capture

Single-page web app (`index.html`) for enumerators to capture the phone-poll questionnaire, with enumerator and admin logins,
voter-register lookup by phone number, skip logic, rotated candidate order, Senate list routing by district, and Excel export.

## Set up (about 10 minutes)
1. **Backend.** Create a NEW Google Sheet. Extensions > Apps Script. Replace the code with `backend/Code.gs`. Save.
   Deploy > New deployment > Web app. Execute as: **Me**. Who has access: **Anyone**. Copy the Web app URL (ends in `/exec`).
2. **Connect.** Put the URL in `config.json`: `{ "server": "https://script.google.com/macros/s/XXXX/exec" }`
3. **Publish.** Settings > Pages > Deploy from a branch > `main` / root. Open the site.
4. **Create the admin** on first visit (needs the setup code at the top of `Code.gs`), then in Admin: upload the voter register,
   add enumerator logins.

Voter register columns: Name, Phone, Gender, Age group, LGA, Ward, Polling unit.

With `config.json` empty the site runs in TEST MODE (data stays in the browser). Do not use test mode for real interviews.
After editing `Code.gs`, create a new version of the deployment (Deploy > Manage deployments > pencil > New version).

## Privacy
This repository holds code only. Never commit the voter register, responses, Excel exports or the Sheet contents.
Keep the Google Sheet private: it holds names, phone numbers, vote intentions, religion and ethnicity.
