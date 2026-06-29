# EduReach Contact Backend Setup

The repository now contains the website-side backend files. The remaining setup happens in Google Sheets, Google Apps Script and Vercel.

The completed flow is:

1. the website posts to `/api/contact`;
2. the Vercel Function securely forwards the enquiry to Google Apps Script;
3. Google Apps Script saves it in a Google Sheet;
4. the client receives a confirmation email;
5. `edureach70@gmail.com` receives the full enquiry.

The client confirmation email displays only:

- `edureach70@gmail.com`
- `081 218 1963`

It does not display a physical address.

## 1. Create the Google Sheet

1. In Google Drive, create a spreadsheet called **EduReach Website Enquiries**.
2. Open the spreadsheet.
3. Choose **Extensions → Apps Script**.
4. Replace the contents of `Code.gs` with the repository file at `google-apps-script/Code.gs`.
5. Save the project as **EduReach Enquiry Backend**.

The script creates an `Enquiries` tab and its headings automatically after the first valid submission.

## 2. Create one shared secret

On Windows PowerShell, generate a secret with:

```powershell
([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
```

Copy the result. Use the exact same value in Google Apps Script and Vercel.

### Add it to Google Apps Script

1. Open **Project Settings** in Apps Script.
2. Under **Script Properties**, add:
   - Property: `EDUREACH_BACKEND_SECRET`
   - Value: the generated secret
3. Save the property.

Do not put this secret in `site-config.js`, `index.html`, GitHub, or any browser-side file.

## 3. Deploy the Apps Script web app

1. Choose **Deploy → New deployment**.
2. Select **Web app**.
3. Set **Execute as** to **Me**.
4. Set access to **Anyone**.
5. Deploy and approve the requested Google permissions.
6. Copy the deployed URL ending in `/exec`.

## 4. Add Vercel environment variables

Open the EduReach project in Vercel, then go to **Settings → Environment Variables** and add:

| Name | Value |
|---|---|
| `GOOGLE_APPS_SCRIPT_URL` | The Apps Script `/exec` URL |
| `EDUREACH_BACKEND_SECRET` | The same secret from step 2 |

Apply them to Production, Preview and Development, then redeploy the website.

## 5. Test the completed flow

1. Open the deployed EduReach website.
2. Complete the form using an email address you can check.
3. Submit it once.
4. Confirm that:
   - the website displays “Thank you. Your message has been sent.”;
   - a new row appears in the `Enquiries` sheet;
   - the client receives a confirmation email;
   - `edureach70@gmail.com` receives the full enquiry.

You can also open `/api/contact` on the deployed site. It should return a small JSON health response.

## Security included

- The Apps Script URL and shared secret stay in Vercel environment variables.
- Required fields and email format are checked server-side.
- Field lengths are limited.
- A honeypot accepts obvious bot submissions without saving them.
- Spreadsheet-formula injection is neutralised.
- Browser responses do not expose secrets or detailed internal errors.
