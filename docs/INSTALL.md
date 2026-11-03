> Historical 18.3 documentation. For the current release, see START_HERE_18.4.0.md, QA_REPORT_18.4.0.md and KNOWN_ISSUES_18.4.md.

# Running Rowanvale

1. Export a JSON backup in your currently used copy. Export a ZIP backup too if you need to transfer cached artwork to another computer.
2. Extract the entire new ZIP. Do not run files from inside the ZIP viewer.
3. Stop the older server window before starting this copy. The launcher cannot replace a server already using port 8080.
4. Run START_ROWANVALE_WINDOWS.bat from the top folder. Node.js 18+ is required; tested here with Node 26 and Chrome.
5. Open http://localhost:8080 and verify version 18.2.0. Keep the browser profile and address consistent. Different origins have separate browser storage.
6. If moving from file:/// or another browser origin, import your exported JSON through Data & Beta.

The launcher opens the browser only once this copy starts listening. If port 8080 is occupied, stop the old copy and retry. Do not clear browser data as an update step.

Optional provider settings: copy app/.env.example to app/.env and supply your configuration. .env is private and is not distributed in these archives.

For macOS/Linux, open a terminal in app/ and run node server.js, then visit http://localhost:8080. No npm installation is needed for the basic runtime. Those platforms were not exercised in this pass.

The folder contains code and bundled assets. Your private workspace lives in browser storage, not in these folders. Keep regular exported backups somewhere outside the application folder.
